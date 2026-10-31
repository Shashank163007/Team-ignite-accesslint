/**
 * Convert axe-core violations into AccessLint's shared violation shape.
 *
 * This file intentionally does not import a browser or axe-core. The scanner
 * can pass its existing axe.run result to normalizeAxeResults without this
 * module creating a second browser integration.
 */

const SEVERITIES = new Set(['critical', 'serious', 'moderate', 'minor']);

const DEFAULT_PAGE = '/index.html';

function normalizePage(page) {
  return typeof page === 'string' && page.trim() ? page.trim() : DEFAULT_PAGE;
}

function selectorFromNode(node) {
  if (!node || !Array.isArray(node.target)) {
    return null;
  }

  const selector = node.target.find(
    (target) => typeof target === 'string' && target.trim(),
  );

  return selector ? selector.trim() : null;
}

function normalizeSeverity(impact) {
  return SEVERITIES.has(impact) ? impact : 'minor';
}

function normalizeViolation(violation, page) {
  if (!violation || typeof violation !== 'object') {
    return null;
  }

  const ruleId = typeof violation.id === 'string' ? violation.id.trim() : '';
  const message = typeof violation.description === 'string'
    ? violation.description.trim()
    : '';
  const nodes = Array.isArray(violation.nodes) ? violation.nodes : [];

  if (!ruleId || !message) {
    return null;
  }

  return nodes
    .map((node) => {
      const element = selectorFromNode(node);

      if (!element) {
        return null;
      }

      const normalizedPage = normalizePage(page);
      const severity = normalizeSeverity(violation.impact);

      return {
        ruleId,
        severity,
        message,
        page: normalizedPage,
        element,
        suggestedFix: typeof violation.help === 'string' && violation.help.trim()
          ? violation.help.trim()
          : `Fix the ${ruleId} accessibility issue for this element.`,
        fingerprint: `${normalizedPage}::${ruleId}::${element}`,
      };
    })
    .filter(Boolean);
}

/**
 * Normalize axe-core's `violations` array.
 *
 * @param {object|Array} axeResult An axe.run result or its violations array.
 * @param {string} page The page path associated with the scan.
 * @returns {Array<object>} Violations containing exactly seven fields.
 */
function normalizeAxeResults(axeResult, page = DEFAULT_PAGE) {
  const violations = Array.isArray(axeResult)
    ? axeResult
    : axeResult && Array.isArray(axeResult.violations)
      ? axeResult.violations
      : [];

  return violations.flatMap((violation) => normalizeViolation(violation, page));
}

module.exports = {
  normalizeAxeResults,
};
