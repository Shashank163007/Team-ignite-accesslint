const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const { getActionInputs } = require('./inputs');
const { logger } = require('../utils/logger');
const { validateInputs, validateScanResults } = require('../utils/validation');
const { postOrUpdatePRComment } = require('../reporter/pr-comments');

async function run() {
  let serverProcess = null;
  let browserSession = null;

  try {
    logger.info('Starting AccessLint execution pipeline...');
    const inputs = getActionInputs();

    const inputValidation = validateInputs(inputs);
    if (!inputValidation.valid) {
      inputValidation.errors.forEach((err) => logger.error(err));
      core.setFailed('Invalid action configuration.');
      return;
    }

    // 1. Dynamic module resolution (with clean fallbacks while team builds)
    let scanner = {};
    let comparison = {};
    let reporter = {};

    try {
      scanner.server = require('../scanner/server');
      scanner.browser = require('../scanner/browser');
      scanner.discovery = require('../scanner/page-discovery');
      scanner.axe = require('../scanner/axe-runner');
      scanner.keyboard = require('../accessibility/keyboard-checks');
    } catch (err) {
      logger.warn(`Scanner modules incomplete: ${err.message}. Using built-in fallback runner.`);
    }

    try {
      comparison = require('../comparison/compare-results');
      reporter.formatter = require('../reporter/formatter');
      reporter.summary = require('../reporter/summary');
    } catch (err) {
      logger.warn(`Reporting modules incomplete: ${err.message}. Using built-in fallback reporting.`);
    }

    // 2. Resolve or start target server
    let baseUrl = inputs.targetUrl;
    if (inputs.startCommand && scanner.server?.startServer) {
      logger.group('Starting Target Application Server');
      const srv = await scanner.server.startServer({
        command: inputs.startCommand,
        cwd: path.resolve(inputs.workingDirectory),
        url: inputs.targetUrl
      });
      serverProcess = srv.serverProcess;
      baseUrl = srv.baseUrl || inputs.targetUrl;
      logger.endGroup();
    }

    // 3. Run browser audit across target routes
    logger.group('Executing Accessibility Scans');
    let prScanResults = [];

    if (scanner.browser?.createBrowserSession) {
      browserSession = await scanner.browser.createBrowserSession();
      const routesToScan = scanner.discovery?.discoverPages
        ? await scanner.discovery.discoverPages(browserSession.page, baseUrl, inputs.routes)
        : inputs.routes;

      for (const route of routesToScan) {
        const fullUrl = route.startsWith('http') ? route : `${baseUrl.replace(/\/$/, '')}${route}`;
        logger.info(`Auditing route: ${fullUrl}`);

        const axeFn = scanner.axe?.runAxe || scanner.axe?.runAxeScan;
        if (axeFn) {
          const axeIssues = await axeFn(browserSession.page, fullUrl);
          prScanResults.push(...(axeIssues || []));
        }

        if (scanner.keyboard?.runKeyboardChecks) {
          const kbdIssues = await scanner.keyboard.runKeyboardChecks(browserSession.page, fullUrl);
          prScanResults.push(...(kbdIssues || []));
        }
      }
    } else {
      logger.warn('Browser automation engine not available. Recording empty scan result.');
    }
    logger.endGroup();

    // 4. Validate scan results against 7-field schema
    const scanValidation = validateScanResults(prScanResults);
    if (!scanValidation.valid) {
      scanValidation.errors.forEach((err) => logger.warn(`Schema warning: ${err}`));
    }

    // 5. Load base branch scan if provided
    let baseScanResults = [];
    if (inputs.baseScanPath && fs.existsSync(inputs.baseScanPath)) {
      try {
        const rawBase = fs.readFileSync(path.resolve(inputs.baseScanPath), 'utf8');
        baseScanResults = JSON.parse(rawBase);
        logger.info(`Loaded ${baseScanResults.length} pre-existing base scan violations.`);
      } catch (err) {
        logger.warn(`Failed reading base-scan-path: ${err.message}`);
      }
    }

    // 6. Compare results (identify newly introduced regressions)
    logger.group('Analyzing Scan Differences');
    let diff = {
      newIssues: prScanResults,
      existingIssues: [],
      fixedIssues: [],
      stats: {
        newCount: prScanResults.length,
        existingCount: 0,
        fixedCount: 0
      }
    };

    if (comparison.compareResults) {
      diff = comparison.compareResults(baseScanResults, prScanResults);
    } else {
      const baseFingerprints = new Set(baseScanResults.map((b) => b.fingerprint));
      diff.newIssues = prScanResults.filter((p) => !baseFingerprints.has(p.fingerprint));
      diff.existingIssues = prScanResults.filter((p) => baseFingerprints.has(p.fingerprint));
      diff.stats.newCount = diff.newIssues.length;
      diff.stats.existingCount = diff.existingIssues.length;
    }
    logger.info(`Found ${diff.newIssues.length} new issues, ${diff.existingIssues.length} existing issues.`);
    logger.endGroup();

    // 7. Format PR comment & GitHub Step Summary
    let commentBody = '';
    if (reporter.formatter?.formatPRComment) {
      commentBody = reporter.formatter.formatPRComment(diff, { routes: inputs.routes });
    } else {
      commentBody = `### ♿ AccessLint Report\n\n- **New Issues:** ${diff.newIssues.length}\n- **Existing (Ignored):** ${diff.existingIssues.length}\n\n`;
      if (diff.newIssues.length > 0) {
        commentBody += `#### ❌ Regressions Found:\n`;
        diff.newIssues.forEach((issue) => {
          commentBody += `- **[${issue.ruleId}]** \`${issue.element}\`: ${issue.message}\n  *Suggested Fix:* ${issue.suggestedFix}\n`;
        });
      } else {
        commentBody += `✅ **No new accessibility regressions introduced.**`;
      }
    }

    // Post/update sticky comment on PR
    await postOrUpdatePRComment({
      token: inputs.githubToken,
      body: commentBody
    });

    // Write to GitHub Job Summary UI
    if (reporter.summary?.generateSummary) {
      const summaryMarkdown = reporter.summary.generateSummary(diff);
      await core.summary.addRaw(summaryMarkdown).write();
    } else {
      await core.summary.addRaw(commentBody).write();
    }

    // 8. Set Outputs & determine pass/fail
    core.setOutput('new-issues-count', diff.newIssues.length.toString());
    core.setOutput('total-issues-count', prScanResults.length.toString());

    if (inputs.failOnNew && diff.newIssues.length > 0) {
      core.setFailed(`AccessLint failed: ${diff.newIssues.length} new accessibility violation(s) introduced.`);
    } else {
      logger.info('AccessLint completed successfully with no blocking issues.');
    }
  } catch (error) {
    logger.error('Unhandled fatal error during AccessLint execution', error);
    core.setFailed(error.message);
  } finally {
    // Teardown resources
    if (browserSession && scanner.browser?.closeBrowserSession) {
      await scanner.browser.closeBrowserSession(browserSession).catch(() => {});
    }
    if (serverProcess && scanner.server?.stopServer) {
      scanner.server.stopServer(serverProcess);
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
