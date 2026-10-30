function validateInputs(inputs) {
  const errors = [];

  if (!inputs) {
    return { valid: false, errors: ['Inputs configuration object is required.'] };
  }

  if (!inputs.targetUrl && !inputs.startCommand) {
    errors.push('Either "target-url" or "start-command" must be specified to run accessibility audits.');
  }

  if (!Array.isArray(inputs.routes) || inputs.routes.length === 0) {
    errors.push('"routes" must be a non-empty array of URL paths.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateScanResults(results) {
  if (!Array.isArray(results)) {
    return { valid: false, errors: ['Scan results must be an array of violations.'] };
  }

  const errors = [];
  const requiredFields = ['ruleId', 'severity', 'message', 'page', 'element', 'suggestedFix', 'fingerprint'];

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    if (!item || typeof item !== 'object') {
      errors.push(`Item at index ${i} is not an object.`);
      break;
    }

    for (const field of requiredFields) {
      if (typeof item[field] !== 'string') {
        errors.push(`Item at index ${i} is missing required string property "${field}".`);
        break;
      }
    }

    if (errors.length >= 5) {
      errors.push('Multiple schema violations detected. Truncating further error checks.');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateInputs,
  validateScanResults
};