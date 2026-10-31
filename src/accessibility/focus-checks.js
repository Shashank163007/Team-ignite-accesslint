const DEFAULT_PAGE = '/index.html';

function normalizePage(page) {
  return typeof page === 'string' && page.trim() ? page.trim() : DEFAULT_PAGE;
}

function normalizeSelector(selector) {
  return typeof selector === 'string' && selector.trim() ? selector.trim() : null;
}

function focusViolation(result, page) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const element = normalizeSelector(result.selector);
  const normalizedPage = normalizePage(page);

  if (!element || result.focusable !== true || result.visible !== false) {
    return null;
  }

  const ruleId = 'visible-focus';

  return {
    ruleId,
    severity: 'serious',
    message: 'Focusable elements must have a visible focus indicator.',
    page: normalizedPage,
    element,
    suggestedFix: 'Add a clearly visible :focus or :focus-visible style.',
    fingerprint: `${normalizedPage}::${ruleId}::${element}`,
  };
}

/**
 * Normalize verified focus-check results.
 *
 * Each result must identify a selector and explicitly report whether the
 * element is focusable and whether its focus indicator is visible. Missing
 * information is ignored instead of being reported as a failure.
 *
 * @param {Array<object>} results Verified results from the browser checker.
 * @param {string} page Page path associated with the check.
 * @returns {Array<object>} Violations containing exactly seven fields.
 */
function normalizeFocusResults(results, page = DEFAULT_PAGE) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((result) => focusViolation(result, page))
    .filter(Boolean);
}

module.exports = {
  normalizeFocusResults,
};
