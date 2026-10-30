import { chromium } from 'playwright';

/** Launch headless Chromium. S1 owns page navigation and must await close() in finally. */
export async function launchBrowser({
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

  return {
    async newPage() {
      if (closing || !browser.isConnected()) {
        throw new Error('Browser is closed or disconnected');
      }
      let page;
      try {
        // Each page owns an isolated context; page.close() also releases that context.
        page = await browser.newPage();
        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(navigationTimeoutMs);
        page.on('crash', () => {
          void report('Page crashed; close this page and continue with a new page', page.url());
          void page.close().catch((error) => report(error.message, page.url()));
        });
        return page;
      } catch (error) {
        if (page) await page.close().catch(() => {});
        await report(error.message);
        throw error;
      }
    },
    close() {
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
}
