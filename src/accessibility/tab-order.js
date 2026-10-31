const DEFAULT_PAGE = '/index.html';

function normalizePage(page) {
  return typeof page === 'string' && page.trim() ? page.trim() : DEFAULT_PAGE;
}

function normalizeSelector(selector) {
  return typeof selector === 'string' && selector.trim() ? selector.trim() : null;
}

function tabOrderViolation(result, page) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const element = normalizeSelector(result.selector);
  const normalizedPage = normalizePage(page);
  const expectedIndex = Number.isInteger(result.expectedIndex) ? result.expectedIndex : null;
  const actualIndex = Number.isInteger(result.actualIndex) ? result.actualIndex : null;

  if (
    !element
    || result.focusable !== true
    || expectedIndex === null
    || actualIndex === null
    || expectedIndex === actualIndex
  ) {
    return null;
  }

  const ruleId = 'tab-order';

  return {
    ruleId,
    severity: 'moderate',
    message: 'Focusable elements should follow a predictable tab order.',
    page: normalizedPage,
    element,
    suggestedFix: 'Arrange focusable elements in a logical DOM and tab order.',
    fingerprint: `${normalizedPage}::${ruleId}::${element}`,
  };
}

/**
 * Normalize results from a browser-observed tab sequence.
 *
 * The caller supplies both the expected and observed positions. This module
 * does not infer a failure from DOM order alone and ignores hidden, disabled,
 * non-focusable, or incomplete results.
 *
 * @param {Array<object>} results Browser-observed tab-order results.
 * @param {string} page Page path associated with the check.
 * @returns {Array<object>} Violations containing exactly seven fields.
 */
function normalizeTabOrderResults(results, page = DEFAULT_PAGE) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((result) => tabOrderViolation(result, page))
    .filter(Boolean);
}

module.exports = {
  normalizeTabOrderResults,
};
