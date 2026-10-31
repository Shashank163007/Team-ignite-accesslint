'use strict';

const KEYBOARD_TIMEOUT_MS = 30_000;
const MAX_TAB_PRESSES = 100;

function normalizeParams(arg1, arg2, arg3) {
  if (arg1 && typeof arg1 === 'object' && ('page' in arg1 || 'pagePath' in arg1)) {
    return { page: arg1.page, pagePath: arg1.pagePath, onError: arg1.onError };
  }
  let pagePath = arg2;
  if (typeof pagePath === 'string') {
    try {
      const parsed = new URL(pagePath);
      pagePath = parsed.pathname;
    } catch {
      // already a path
    }
  }
  return { page: arg1, pagePath, onError: arg3 };
}

/** Check the current light DOM with real key presses; S1 owns navigation and cleanup. */
async function runKeyboardChecks(arg1, arg2, arg3) {
  const { page, pagePath: rawPagePath, onError } = normalizeParams(arg1, arg2, arg3);
  let pagePath = rawPagePath;
  let timer;
  let cancelled = false;
  const report = async (message) => {
    const error = { stage: 'keyboard', page: pagePath, message };
    try {
      if (typeof onError === 'function') await onError(error);
      else console.error('[accesslint:keyboard]', error);
    } catch (callbackError) {
      console.error('[accesslint:keyboard]', error, callbackError);
    }
  };
  const scan = async () => {
    const state = await page.evaluateHandle(() => {
      // Start from the document, restoring the temporary attribute immediately.
      const body = document.body;
      const previousTabindex = body.getAttribute('tabindex');
      body.setAttribute('tabindex', '-1');
      body.focus();
      if (previousTabindex === null) body.removeAttribute('tabindex');
      else body.setAttribute('tabindex', previousTabindex);

      const visible = (el) => el.getClientRects().length > 0
        && getComputedStyle(el).visibility === 'visible'
        && !el.closest('[hidden], [inert]') && !el.matches(':disabled');
      const elements = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"], [onclick], [role="button"], [role="link"], [role="checkbox"], [role="switch"]')].filter(visible);
      const selectorFor = (el) => {
        // Avoid IDs, generated class names and positional selectors entirely.
        let path = '';
        for (let current = el; current; current = current.parentElement) {
          let segment = current.localName;
          for (const attr of ['data-testid', 'name', 'aria-label', 'href', 'type', 'role']) {
            const value = current.getAttribute(attr);
            if (value) segment += `[${attr}="${CSS.escape(value)}"]`;
          }
          path = path ? `${segment} > ${path}` : segment;
          const matches = document.querySelectorAll(path);
          if (matches.length === 1 && matches[0] === el) return path;
        }
        return null;
      };
      const appearance = (el) => {
        const style = getComputedStyle(el);
        const outline = parseFloat(style.outlineWidth) > 0 && !['none', 'hidden'].includes(style.outlineStyle)
          ? `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}` : '';
        return JSON.stringify([outline, style.boxShadow, style.backgroundColor, style.color,
          style.borderTop, style.borderRight, style.borderBottom, style.borderLeft, style.textDecoration]);
      };
      const candidates = elements.map((el) => ({
        selector: selectorFor(el),
        baseline: appearance(el),
        // Explicit exclusions and wrappers with accessible children need not be Tab stops.
        checkReachability: !(el.hasAttribute('tabindex') && Number(el.getAttribute('tabindex')) < 0)
          && ![...el.querySelectorAll('a, button, input, select, textarea, [tabindex]')]
            .some((child) => visible(child) && child.tabIndex >= 0)
          && !el.closest('[role="tablist"], [role="menu"], [role="menubar"], [role="tree"], [role="grid"], [role="listbox"], [role="radiogroup"]')
          && !(el instanceof HTMLInputElement && el.type === 'radio'),
      }));
      return {
        candidates,
        unsupported: [...document.querySelectorAll('*')].some((el) => el.shadowRoot || el.localName === 'iframe'),
        current() {
          // Sample the final focus style without finishing unrelated CSS/keyframe animations.
          for (const animation of document.getAnimations()) {
            if (animation instanceof CSSTransition) {
              try { animation.finish(); } catch { /* A transition may have been cancelled. */ }
            }
          }
          const active = document.activeElement;
          return {
            index: elements.indexOf(active),
            outside: active === document.body || active === document.documentElement || !active,
            appearance: active ? appearance(active) : '',
          };
        },
      };
    });
    try {
      if (cancelled) return [];
      const { candidates, unsupported } = await state.evaluate((value) => ({ candidates: value.candidates, unsupported: value.unsupported }));
      if (candidates.some((candidate) => !candidate.selector)) {
        await report('Note: Some controls have no unique stable selector; their findings are omitted');
      }
      if (unsupported) await report('Note: Keyboard coverage is limited to the light DOM; iframe/shadow contents are not checked');
      const findings = new Map();
      const add = (index, ruleId, severity, message, suggestedFix) => {
        const element = candidates[index]?.selector;
        if (!element) return;
        const fingerprint = `${pagePath}::${ruleId}::${element}`;
        findings.set(fingerprint, { ruleId, severity, message, page: pagePath, element, suggestedFix, fingerprint });
      };
      const visited = new Set();
      const sequence = [];
      let presses = 0;
      let completed = false;
      let uncertain = unsupported;
      const step = async (key) => {
        if (cancelled || presses >= MAX_TAB_PRESSES) return null;
        presses++;
        await page.keyboard.press(key);
        if (cancelled) return null;
        return state.evaluate((value) => value.current());
      };
      while (!cancelled && presses < MAX_TAB_PRESSES) {
        const current = await step('Tab');
        if (!current) break;
        if (current.outside) {
          completed = true;
          break;
        }
        if (current.index < 0) {
          uncertain = true;
          continue;
        }
        const index = current.index;
        if (current.appearance === candidates[index].baseline) {
          add(index, 'keyboard-no-focus-indicator', 'serious', 'Keyboard focus has no detected visual style change.',
            'Add a clearly visible :focus-visible outline or another distinct focus style.');
        }
        if (visited.has(index)) {
          // A normal page traversal passes through the document boundary; a closed cycle may be a trap.
          const cycle = new Set(sequence.slice(sequence.indexOf(index)));
          let escaped = false;
          for (let attempt = 0; attempt <= cycle.size; attempt++) {
            const reverse = await step('Shift+Tab');
            if (!reverse) break;
            if (reverse.outside || !cycle.has(reverse.index)) { escaped = true; break; }
          }
          // Modal focus containment is valid when Escape releases it.
          if (!escaped && !cancelled && presses < MAX_TAB_PRESSES) {
            await page.keyboard.press('Escape');
            const afterEscape = await step('Tab');
            escaped = afterEscape && (afterEscape.outside || !cycle.has(afterEscape.index));
          }
          if (!escaped && presses < MAX_TAB_PRESSES && !cancelled) {
            add(index, 'keyboard-trap', 'critical', 'Focus cycles without an exit using Tab, Shift+Tab or Escape.',
              'Allow keyboard users to leave the control or provide a working Escape action.');
          }
          uncertain = true;
          break;
        }
        visited.add(index);
        sequence.push(index);
      }
      if (cancelled) return [];
      if (presses >= MAX_TAB_PRESSES && !completed) {
        await report('Note: Stopped after 100 Tab presses; reachability is incomplete');
      }
      if (completed && !uncertain) {
        for (let index = 0; index < candidates.length; index++) {
          if (!visited.has(index) && candidates[index].checkReachability) {
            add(index, 'keyboard-unreachable', 'serious', 'Visible interactive control was not reached during a complete Tab traversal.',
              'Use a native keyboard-accessible control and include it in the Tab order, or implement the appropriate widget keyboard pattern.');
          }
        }
      }
      return [...findings.values()].sort((a, b) => a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0);
    } finally {
      await state.dispose();
    }
  };
  try {
    if (typeof pagePath === 'string') {
      try {
        const parsed = new URL(pagePath);
        pagePath = parsed.pathname;
      } catch {}
    }
    if (typeof pagePath !== 'string' || !pagePath.startsWith('/') || pagePath.startsWith('//') || /[?#\\]/.test(pagePath)) {
      throw new TypeError('pagePath must be a path-only string without a host, query, or fragment');
    }
    return await Promise.race([
      scan(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          cancelled = true;
          reject(new Error(`Keyboard checks timed out after ${KEYBOARD_TIMEOUT_MS} ms; close this page before continuing`));
        }, KEYBOARD_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    cancelled = true;
    await report(error instanceof Error ? error.message : String(error));
    return [];
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  runKeyboardChecks,
};
