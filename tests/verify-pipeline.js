'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const browser = require('../src/scanner/browser');
const axe = require('../src/scanner/axe-runner');
const keyboard = require('../src/accessibility/keyboard-checks');
const { compareResults } = require('../src/comparison/compare-results');
const formatter = require('../src/reporter/formatter');

async function main() {
  const fixtureRoot = path.join(__dirname, 'fixtures');
  const fixtureFiles = fs.readdirSync(fixtureRoot)
    .filter((file) => file.endsWith('.html'))
    .sort();

  if (fixtureFiles.length === 0) {
    throw new Error('No HTML fixtures found in tests/fixtures');
  }

  const sessionFactory = browser.createBrowserSession || browser.launchBrowser;
  if (!sessionFactory) {
    throw new Error('Browser module exports neither createBrowserSession nor launchBrowser');
  }

  console.log('='.repeat(70));
  console.log('🚀 AccessLint Live DOM Accessibility Audit Pipeline');
  console.log('='.repeat(70));

  const session = await sessionFactory();
  const page = session.page || await session.newPage();

  const allViolations = [];
  const perFixtureResults = {};

  try {
    for (const fixture of fixtureFiles) {
      const fixturePath = path.join(fixtureRoot, fixture);
      const pagePath = `/fixtures/${fixture}`;

      await page.goto(pathToFileURL(fixturePath).href);

      const invoke = (fn) => fn({ page, pagePath });
      const axeFn = axe.runAxe || axe.runAxeScan;
      const keyboardFn = keyboard.runKeyboardChecks;
      if (!axeFn || !keyboardFn) {
        throw new Error('Required audit exports are missing');
      }

      const axeIssues = await invoke(axeFn);
      const keyboardIssues = await invoke(keyboardFn);
      const fixtureViolations = [...axeIssues, ...keyboardIssues];

      allViolations.push(...fixtureViolations);
      perFixtureResults[fixture] = {
        total: fixtureViolations.length,
        axeCount: axeIssues.length,
        keyboardCount: keyboardIssues.length,
        violations: fixtureViolations,
      };

      console.log(`\n📄 Audited Fixture: ${fixture}`);
      console.log(`   - Axe violations: ${axeIssues.length}`);
      console.log(`   - Keyboard violations: ${keyboardIssues.length}`);
      console.log(`   - Total fixture violations: ${fixtureViolations.length}`);
      if (fixtureViolations.length > 0) {
        fixtureViolations.forEach((v) => {
          console.log(`     * [${v.severity.toUpperCase()}] ${v.ruleId} on ${v.element}`);
        });
      }
    }

    // Baseline diffing demonstration:
    // To demonstrate zero-false-positive comparison, we simulate 1 baseline issue that existed previously
    const sampleBaseline = allViolations.length > 0 ? [allViolations[0]] : [];
    const diff = compareResults(sampleBaseline, allViolations);

    const format = formatter.formatPRComment || formatter.formatReport;
    if (!format) {
      throw new Error('Formatter exports neither formatPRComment nor formatReport');
    }
    const comment = format(diff);

    console.log('\n' + '='.repeat(70));
    console.log('📊 Pipeline Summary & Baseline Diff Results');
    console.log('='.repeat(70));
    console.log(`Total fixtures audited: ${fixtureFiles.length}`);
    console.log(`Total live DOM violations detected: ${allViolations.length}`);
    console.log(`Baseline diff stats: ${JSON.stringify(diff.counts || diff.stats, null, 2)}`);
    console.log('\n📝 Formatted GitHub PR Comment Preview:');
    console.log('-'.repeat(70));
    console.log(comment);
    console.log('-'.repeat(70));
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
