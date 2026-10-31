'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { compareResults } = require('../src/comparison/compare-results');

async function loadModule(modulePath) {
  return import(pathToFileURL(path.resolve(__dirname, modulePath)).href);
}

async function main() {
  const browser = await loadModule('../src/scanner/browser.js');
  const axe = await loadModule('../src/scanner/axe-runner.js');
  const keyboard = await loadModule('../src/accessibility/keyboard-checks.js');
  const formatter = require('../src/reporter/formatter');

  const fixtureRoot = path.join(__dirname, 'fixtures');
  const fixture = require('fs').readdirSync(fixtureRoot)
    .filter((file) => file.endsWith('.html'))
    .sort()[0];
  if (!fixture) throw new Error('No HTML fixture found in tests/fixtures');

  const fixturePath = path.join(fixtureRoot, fixture);
  const pagePath = `/fixtures/${fixture}`;
  const sessionFactory = browser.createBrowserSession || browser.launchBrowser;
  if (!sessionFactory) throw new Error('Browser module exports neither createBrowserSession nor launchBrowser');

  const session = await sessionFactory();
  const page = session.page || await session.newPage();
  try {
    await page.goto(pathToFileURL(fixturePath).href);
    const invoke = (fn) => fn({ page, pagePath });
    const axeFn = axe.runAxe || axe.runAxeScan;
    const keyboardFn = keyboard.runKeyboardChecks;
    if (!axeFn || !keyboardFn) throw new Error('Required audit exports are missing');

    const axeIssues = await invoke(axeFn);
    const keyboardIssues = await invoke(keyboardFn);
    const totalViolations = [...axeIssues, ...keyboardIssues];
    const diff = compareResults([], totalViolations);
    const format = formatter.formatPRComment || formatter.formatReport;
    if (!format) throw new Error('Formatter exports neither formatPRComment nor formatReport');
    const comment = format(diff);

    console.log(`Fixture: ${fixture}`);
    console.log(`Detected violations: ${totalViolations.length}`);
    console.log(`Diff stats: ${JSON.stringify(diff.counts || diff.stats)}`);
    console.log(`Formatted comment preview:\n${comment.slice(0, 500)}`);
  } finally {
    if (session.close) await session.close();
    else if (browser.closeBrowserSession) await browser.closeBrowserSession(session);
    else await page.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
