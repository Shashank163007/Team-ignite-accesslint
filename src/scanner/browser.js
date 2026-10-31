'use strict';

const { chromium } = require('playwright');

/**
 * Launch headless Chromium.
 *
 * @param {object} [options]
 * @param {number} [options.launchTimeoutMs=30000]
 * @param {number} [options.navigationTimeoutMs=30000]
 * @param {number} [options.timeoutMs=10000]
 * @param {function} [options.onError]
 * @returns {Promise<object>} Browser session with newPage and close methods.
 */
async function launchBrowser({
  launchTimeoutMs = 30_000,
  navigationTimeoutMs = 30_000,
  timeoutMs = 10_000,
  onError,
} = {}) {
  for (const [name, value] of Object.entries({ launchTimeoutMs, navigationTimeoutMs, timeoutMs })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive finite number`);
    }
  }
  if (onError !== undefined && typeof onError !== 'function') {
    throw new TypeError('onError must be a function');
  }

  const report = async (message, url = '') => {
    let page = '';
    try {
      const parsed = new URL(url);
      if (['http:', 'https:'].includes(parsed.protocol)) page = parsed.pathname;
    } catch {
      // Launch/disconnect errors have no page URL.
    }
    const error = { stage: 'browser', page, message };
    try {
      if (onError) await onError(error);
      else console.error('[accesslint:browser]', error);
    } catch (callbackError) {
      // A failing reporter must not create an unhandled rejection in an event listener.
      console.error('[accesslint:browser]', error, callbackError);
    }
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: launchTimeoutMs });
  } catch (error) {
    await report(error.message);
    throw error;
  }

  let closing = false;
  let closePromise;
  browser.on('disconnected', () => {
    if (!closing) void report('Browser disconnected unexpectedly');
  });

  const session = {
    browser,
    async newPage() {
      if (closing || !browser.isConnected()) {
        throw new Error('Browser is closed or disconnected');
      }
      let page;
      try {
        page = await browser.newPage();
        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(navigationTimeoutMs);
        page.on('crash', () => {
          void report('Page crashed; close this page and continue with a new page', page.url());
          void page.close().catch((err) => report(err.message, page.url()));
        });
        return page;
      } catch (error) {
        if (page) await page.close().catch(() => {});
        await report(error.message);
        throw error;
      }
    },
    async close() {
      if (!closePromise) {
        closing = true;
        closePromise = browser.close().catch(async (error) => {
          await report(error.message);
          throw error;
        });
      }
      return closePromise;
    },
  };

  return session;
}

/**
 * Create a full browser session with an initialized default page.
 * Matches expectations for src/action/index.js and tests/verify-pipeline.js.
 *
 * @param {object} [options]
 * @returns {Promise<object>} Session containing browser, page, newPage, and close.
 */
async function createBrowserSession(options = {}) {
  const session = await launchBrowser(options);
  const page = await session.newPage();
  session.page = page;
  return session;
}

/**
 * Close an active browser session cleanly.
 *
 * @param {object} session
 */
async function closeBrowserSession(session) {
  if (!session) return;
  if (typeof session.close === 'function') {
    await session.close();
  } else if (session.browser && typeof session.browser.close === 'function') {
    await session.browser.close();
  }
}

module.exports = {
  launchBrowser,
  createBrowserSession,
  closeBrowserSession,
};
