'use strict';

/**
 * compare-results.js
 * Diffs accessibility violations between the base branch and the PR branch.
 *
 * Input: two arrays of violation objects using the shared 7-field schema:
 *   { ruleId, severity, message, page, element, suggestedFix, fingerprint }
 *
 * Output:
 *   {
 *     newIssues:       violations in PR but not in base  (regressions)
 *     existingIssues:   violations present in both
 *     fixedIssues:     violations in base but not in PR  (improvements)
 *     counts:          numeric totals, including a per-severity breakdown
 *     stats:           compatibility shape used by the action runner
 *   }
 */

const SEVERITY_ORDER = ['critical', 'serious', 'moderate', 'minor'];

function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}

/**
 * Sort by severity (most severe first), then page, then ruleId,
 * so reports are stable and deterministic.
 */
function sortViolations(list) {
  return [...list].sort((a, b) => {
    return (
      severityRank(a.severity) - severityRank(b.severity) ||
      String(a.page).localeCompare(String(b.page)) ||
      String(a.ruleId).localeCompare(String(b.ruleId)) ||
      String(a.fingerprint).localeCompare(String(b.fingerprint))
    );
  });
}

/**
 * Remove duplicates by fingerprint (keeps the first occurrence).
 * Skips entries that are missing a fingerprint.
 */
function indexByFingerprint(violations) {
  const map = new Map();
  for (const v of violations) {
    if (!v || typeof v.fingerprint !== 'string' || v.fingerprint === '') {
      continue;
    }
    if (!map.has(v.fingerprint)) {
      map.set(v.fingerprint, v);
    }
  }
  return map;
}

function countBySeverity(list) {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of list) {
    if (Object.prototype.hasOwnProperty.call(counts, v.severity)) {
      counts[v.severity] += 1;
    }
  }
  return counts;
}

/**
 * @param {Array} baseViolations - violations from the base branch
 * @param {Array} prViolations   - violations from the PR branch
 */
function compareResults(baseViolations = [], prViolations = []) {
  if (!Array.isArray(baseViolations) || !Array.isArray(prViolations)) {
    throw new TypeError(
      'compareResults expects two arrays: (baseViolations, prViolations)'
    );
  }

  const baseMap = indexByFingerprint(baseViolations);
  const prMap = indexByFingerprint(prViolations);

  const newIssues = [];
  const unchangedIssues = [];
  const fixedIssues = [];

  for (const [fingerprint, violation] of prMap) {
    if (baseMap.has(fingerprint)) {
      unchangedIssues.push(violation);
    } else {
      newIssues.push(violation);
    }
  }

  for (const [fingerprint, violation] of baseMap) {
    if (!prMap.has(fingerprint)) {
      fixedIssues.push(violation);
    }
  }

  const sortedNew = sortViolations(newIssues);
  const sortedFixed = sortViolations(fixedIssues);
  const sortedUnchanged = sortViolations(unchangedIssues);

  return {
    newIssues: sortedNew,
    existingIssues: sortedUnchanged,
    unchangedIssues: sortedUnchanged,
    fixedIssues: sortedFixed,
    counts: {
      base: baseMap.size,
      pr: prMap.size,
      new: sortedNew.length,
      fixed: sortedFixed.length,
      unchanged: sortedUnchanged.length,
      newBySeverity: countBySeverity(sortedNew),
    },
    stats: {
      newCount: sortedNew.length,
      existingCount: sortedUnchanged.length,
      fixedCount: sortedFixed.length,
    },
  };
}

module.exports = { compareResults, SEVERITY_ORDER };
