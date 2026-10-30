const AXE_TIMEOUT_MS = 30_000;

const textOr = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;
const shadowTarget = (target) => Array.isArray(target)
  ? target.map(shadowTarget).join(' >>> ')
  : String(target);

/** Scan an already navigated page; preserve the caller's path as the comparison key. */
export async function runAxe({ page, pagePath, onError } = {}) {
  let timer;
  try {
    if (typeof pagePath !== 'string' || !pagePath.startsWith('/') || pagePath.startsWith('//') || /[?#\\]/.test(pagePath)) {
      throw new TypeError('pagePath must be a path-only string without a host, query, or fragment');
    }
    const scan = async () => {
      // Import inside the guarded operation so package/injection failures use onError too.
      const { default: axe } = await import('axe-core');
      // Reinjection uses the installed version and resets axe for repeat scans.
      // Inject frames as well so axe can collect their violations from the top page.
      await Promise.all(page.frames().map((frame) => frame.evaluate(axe.source)));
      return page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
    };
    const results = await Promise.race([
      scan(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Axe scan timed out after ${AXE_TIMEOUT_MS} ms; close this page before continuing`)), AXE_TIMEOUT_MS);
      }),
    ]);
    const violations = new Map();
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        // Preserve target order: outer entries cross frames; inner arrays cross shadow roots.
        const element = node.target.map(shadowTarget).join(' >> ');
        const ruleId = String(violation.id);
        const fingerprint = `${pagePath}::${ruleId}::${element}`;
        if (violations.has(fingerprint)) continue;
        violations.set(fingerprint, {
          ruleId,
          severity: textOr(violation.impact, 'minor'),
          message: textOr(violation.help, textOr(violation.description, `Accessibility rule failed: ${ruleId}`)),
          page: pagePath,
          element,
          suggestedFix: textOr(node.failureSummary, textOr(violation.help, `Review the element and correct the ${ruleId} accessibility violation.`)),
          fingerprint,
        });
      }
    }
    return [...violations.values()].sort((a, b) => a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0);
  } catch (error) {
    const diagnostic = { stage: 'axe', page: pagePath, message: error instanceof Error ? error.message : String(error) };
    try {
      if (typeof onError === 'function') await onError(diagnostic);
      else console.error('[accesslint:axe]', diagnostic);
    } catch (callbackError) {
      console.error('[accesslint:axe]', diagnostic, callbackError);
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}
