/**
 * Validator Module
 * Responsible for cross-checking multiple sources and determining the "true" value.
 */

/**
 * Analyzes results from multiple sources for a single data point.
 * - Calculates average.
 * - Identifies outliers based on tolerance %.
 * - Determines consensus value.
 * 
 * @param {Array} results - Array of fetch results from various sources.
 * @param {number} tolerancePercent - Allowed deviation from average (e.g., 1.5).
 * @returns {Object} - Validated data point.
 */
function validateDataPoint(results, tolerancePercent) {
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  if (successfulResults.length === 0) {
    return {
      status: 'error',
      message: 'All sources failed',
      errors: failedResults
    };
  }

  const values = successfulResults.map(r => r.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;

  // Identify outliers
  const outliers = [];
  const consensusValues = [];

  values.forEach((val, index) => {
    const deviation = Math.abs(val - average) / average * 100;
    const sourceInfo = successfulResults[index];
    
    if (deviation > tolerancePercent) {
      outliers.push({
        ...sourceInfo,
        deviation: deviation.toFixed(2) + '%'
      });
    } else {
      consensusValues.push(val);
    }
  });

  // Recalculate average based on consensus values if outliers existed
  let finalValue = average;
  let confidence = 'high';
  
  if (outliers.length > 0) {
    if (consensusValues.length > 0) {
      // Trust the majority/consensus
      const consensusSum = consensusValues.reduce((a, b) => a + b, 0);
      finalValue = consensusSum / consensusValues.length;
      confidence = 'medium'; // Some disagreement
    } else {
      // All values are outliers? (Rare, but possible if tolerance is too tight)
      confidence = 'low'; 
    }
  }

  return {
    status: 'success',
    value: finalValue,
    average: average,
    confidence: confidence,
    sourceCount: successfulResults.length,
    outlierCount: outliers.length,
    sources: successfulResults,
    outliers: outliers,
    errors: failedResults,
    timestamp: new Date().toLocaleString('en-HK', { timeZone: 'Asia/Shanghai' })
  };
}

module.exports = { validateDataPoint };
