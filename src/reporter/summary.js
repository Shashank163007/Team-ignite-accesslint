'use strict';

/**
 * summary.js
 * Builds the headline text and the pass/fail decision from the
 * output of compareResults().
 *
 * Input (from compare-results.js):
 *   { newIssues, fixedIssues, unchangedIssues, counts }
 *
 * Output of buildSummary():
 *   {
 *     status:      'pass' | 'fail'
 *     passed:      boolean
 *     headline:    short one-line verdict
 *     text:        Markdown block to show at the top of the PR comment
 *     failingCount: number of new issues at or above the fail threshold
 *     threshold:   the severity level used for the decision
 *   }
 */

const SEVERITY_ORDER = ['critical', 'serious', 'moderate', 'minor'];
const DEFAULT_FAIL_ON = 'serious'; // fail on new serious or critical issues

function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Count new issues by severity, ignoring unknown severities. */
function countBySeverity(list) {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const issue of list) {
    if (Object.prototype.hasOwnProperty.call(counts, issue.severity)) {
      counts[issue.severity] += 1;
    }
  }
  return counts;
}

/**
 * Decide whether the PR should fail.
 * A new issue fails the check if its severity is at or above `failOn`.
 * failOn = 'none' means never fail (report only).
 */
function countFailingIssues(newIssues, failOn) {
  if (failOn === 'none') {
    return 0;
  }
  const limit = severityRank(failOn);
  return newIssues.filter((issue) => severityRank(issue.severity) <= limit)
    .length;
}

/** "2 critical, 1 serious" style breakdown, only non-zero levels. */
function describeSeverities(counts) {
  const bits = SEVERITY_ORDER.filter((level) => counts[level] > 0).map(
    (level) => `${counts[level]} ${level}`
  );
  return bits.join(', ');
}

/**
 * @param {object} comparison - result of compareResults()
 * @param {object} [options]
 * @param {string} [options.failOn='serious'] - 'critical' | 'serious' |
 *                                              'moderate' | 'minor' | 'none'
 */
function buildSummary(comparison, options = {}) {
  const safe = comparison || {};
  const newIssues = safe.newIssues || [];
  const fixedIssues = safe.fixedIssues || [];
  const unchangedIssues = safe.unchangedIssues || [];

  const requested = options.failOn;
  const failOn =
    requested === 'none' || SEVERITY_ORDER.includes(requested)
      ? requested
      : DEFAULT_FAIL_ON;

  const newCounts = countBySeverity(newIssues);
  const failingCount = countFailingIssues(newIssues, failOn);
  const passed = failingCount === 0;

  let headline;
  if (newIssues.length === 0) {
    headline = '✅ No new accessibility issues introduced.';
  } else if (passed) {
    headline = `⚠️ ${pluralize(
      newIssues.length,
      'new issue'
    )} found, but none at or above the fail threshold.`;
  } else {
    headline = `❌ ${pluralize(
      failingCount,
      'new blocking issue'
    )} introduced by this PR.`;
  }

  const lines = [`**${headline}**`, ''];

  lines.push('| New | Fixed | Unchanged |');
  lines.push('| :---: | :---: | :---: |');
  lines.push(
    `| ${newIssues.length} | ${fixedIssues.length} | ${unchangedIssues.length} |`
  );
  lines.push('');

  if (newIssues.length > 0) {
    lines.push(`New issues by severity: ${describeSeverities(newCounts)}`);
    lines.push('');
  }

  if (fixedIssues.length > 0) {
    lines.push(
      `🎉 This PR fixed ${pluralize(fixedIssues.length, 'issue')}. Nice work!`
    );
    lines.push('');
  }

  if (failOn === 'none') {
    lines.push('_Check mode: report only (never fails the build)._');
  } else {
    lines.push(`_Fails the check on new **${failOn}** or more severe issues._`);
  }

  return {
    status: passed ? 'pass' : 'fail',
    passed,
    headline,
    text: lines.join('\n').trim(),
    failingCount,
    threshold: failOn,
  };
}

module.exports = { buildSummary, DEFAULT_FAIL_ON, SEVERITY_ORDER };