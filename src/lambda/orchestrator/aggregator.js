/**
 * EdSteward.ai - Results Aggregator Module
 * 
 * This module is responsible for aggregating validation results from 
 * multiple validators and preparing the final response.
 */

/**
 * Aggregate validation results from multiple sources
 * 
 * @param {Array<Object>} results - Array of validation results
 * @returns {Object} Aggregated results with summary
 */
function aggregateResults(results) {
  if (!results || results.length === 0) {
    return {
      summary: {
        totalCount: 0,
        successCount: 0,
        failureCount: 0,
        averageCertainty: 0
      },
      results: []
    };
  }

  // Count successes and failures
  let successCount = 0;
  let failureCount = 0;
  let totalCertainty = 0;
  let validCertaintyCount = 0;

  // Process each result
  results.forEach(result => {
    if (result && result.data && result.data.validationResult) {
      if (result.data.validationResult.isValid) {
        successCount++;
      } else {
        failureCount++;
      }

      // Track certainty for average calculation
      if (result.data.validationResult.certaintyLevel) {
        totalCertainty += result.data.validationResult.certaintyLevel;
        validCertaintyCount++;
      }
    } else if (result && result.error) {
      failureCount++;
    }
  });

  // Calculate average certainty
  const averageCertainty = validCertaintyCount > 0 
    ? Math.round((totalCertainty / validCertaintyCount) * 10) / 10 
    : 0;

  // Create summary object
  const summary = {
    totalCount: results.length,
    successCount,
    failureCount,
    averageCertainty,
    successRate: results.length > 0 
      ? Math.round((successCount / results.length) * 100) 
      : 0
  };

  return {
    summary,
    results
  };
}

/**
 * Aggregate version control results
 * 
 * @param {Array<Object>} versionResults - Array of version check results
 * @returns {Object} Aggregated version information
 */
function aggregateVersionResults(versionResults) {
  if (!versionResults || versionResults.length === 0) {
    return {
      hasChanges: false,
      changeCount: 0,
      changes: []
    };
  }

  // Count regulations with changes
  let regulationsWithChanges = 0;
  let totalChanges = 0;
  const allChanges = [];

  // Process each result
  versionResults.forEach(result => {
    if (result && result.hasChanges) {
      regulationsWithChanges++;
      
      if (result.changes && Array.isArray(result.changes)) {
        totalChanges += result.changes.length;
        
        // Add changes to the aggregate list
        result.changes.forEach(change => {
          allChanges.push({
            ...change,
            regulationId: result.regulationId
          });
        });
      }
    }
  });

  // Create summary object
  return {
    hasChanges: regulationsWithChanges > 0,
    changeCount: totalChanges,
    regulationsWithChanges,
    regulationsChecked: versionResults.length,
    changes: allChanges,
    changeRate: versionResults.length > 0 
      ? Math.round((regulationsWithChanges / versionResults.length) * 100) 
      : 0
  };
}

/**
 * Format aggregate results for API response
 * 
 * @param {Object} aggregatedResults - Aggregated validation results
 * @param {string} requestId - Request identifier
 * @param {boolean} includeDetails - Whether to include full details
 * @returns {Object} Formatted API response
 */
function formatResultsForResponse(aggregatedResults, requestId, includeDetails = true) {
  const { summary, results } = aggregatedResults;
  
  const response = {
    requestId,
    timestamp: new Date().toISOString(),
    status: 'success',
    summary
  };
  
  // Include detailed results if requested
  if (includeDetails) {
    response.results = results;
  }
  
  return response;
}

/**
 * Merge multiple validation results for a single regulation
 * 
 * @param {Array<Object>} results - Array of validation results
 * @returns {Object} Merged validation result
 */
function mergeValidationResults(results) {
  if (!results || results.length === 0) {
    return {
      isValid: false,
      certaintyLevel: 0,
      validationTimestamp: new Date().toISOString(),
      validationLevel: 0,
      evidence: {}
    };
  }
  
  // If only one result, return it
  if (results.length === 1) {
    return results[0];
  }
  
  // Determine overall validity
  // A regulation is valid only if all validators agree it is valid
  const isValid = results.every(result => result.isValid);
  
  // Calculate minimum certainty level
  // The overall certainty is limited by the least certain validator
  const minCertainty = Math.min(...results.map(result => result.certaintyLevel || 0));
  
  // Find the highest validation level
  const maxValidationLevel = Math.max(...results.map(result => result.validationLevel || 0));
  
  // Get the most recent timestamp
  const timestamps = results
    .map(result => result.validationTimestamp)
    .filter(ts => ts)
    .map(ts => new Date(ts));
  
  const latestTimestamp = timestamps.length > 0 
    ? new Date(Math.max(...timestamps)).toISOString() 
    : new Date().toISOString();
  
  // Merge evidence from all validators
  const mergedEvidence = {};
  
  results.forEach((result, index) => {
    if (result.evidence) {
      Object.entries(result.evidence).forEach(([key, value]) => {
        // If the key already exists, append the validator index
        const evidenceKey = mergedEvidence[key] ? `${key}_validator${index + 1}` : key;
        mergedEvidence[evidenceKey] = value;
      });
    }
  });
  
  // Add validation summary to evidence
  mergedEvidence.validatorCount = results.length;
  mergedEvidence.validatorsAgreed = isValid;
  
  // Create merged result
  return {
    isValid,
    certaintyLevel: minCertainty,
    validationTimestamp: latestTimestamp,
    validationLevel: maxValidationLevel,
    evidence: mergedEvidence,
    individualResults: results.map(r => ({
      isValid: r.isValid,
      certaintyLevel: r.certaintyLevel,
      validationLevel: r.validationLevel
    }))
  };
}

/**
 * Process validation response before returning to client
 * 
 * @param {Object} validationResult - Raw validation result
 * @param {Object} options - Processing options
 * @returns {Object} Processed validation result
 */
function processValidationResponse(validationResult, options = {}) {
  const { requireCertainty = 1, includeEvidence = true } = options;
  
  // Clone the result to avoid modifying the original
  const processedResult = { ...validationResult };
  
  // Override isValid if certainty level is below requirement
  if (
    processedResult.isValid && 
    processedResult.certaintyLevel < requireCertainty
  ) {
    processedResult.isValid = false;
    processedResult.overrideReason = 'insufficient_certainty';
  }
  
  // Remove evidence if not requested
  if (!includeEvidence) {
    delete processedResult.evidence;
  }
  
  return processedResult;
}

/**
 * Classify validation errors into categories
 * 
 * @param {Array<Object>} errors - Array of validation errors
 * @returns {Object} Categorized errors
 */
function categorizeErrors(errors) {
  if (!errors || errors.length === 0) {
    return {
      critical: [],
      major: [],
      minor: []
    };
  }
  
  // Categorize errors
  const categorized = {
    critical: [],
    major: [],
    minor: []
  };
  
  errors.forEach(error => {
    // Determine severity based on error characteristics
    let severity = 'minor';
    
    // Critical errors
    if (
      error.type === 'contradiction' || 
      error.type === 'omission' ||
      error.type === 'factual_error' ||
      error.impact === 'high'
    ) {
      severity = 'critical';
    } 
    // Major errors
    else if (
      error.type === 'inconsistency' ||
      error.type === 'ambiguity' ||
      error.impact === 'medium'
    ) {
      severity = 'major';
    }
    
    // Add to the appropriate category
    categorized[severity].push(error);
  });
  
  return categorized;
}

/**
 * Generate a human-readable summary of validation results
 * 
 * @param {Object} result - Validation result
 * @returns {string} Human-readable summary
 */
function generateHumanReadableSummary(result) {
  if (!result) {
    return 'No validation result available.';
  }
  
  // Start with the overall status
  let summary = result.isValid 
    ? 'Validation passed successfully. ' 
    : 'Validation failed. ';
  
  // Add certainty information
  const certaintyDescriptions = [
    'with extremely low certainty',
    'with low certainty',
    'with moderate certainty',
    'with high certainty',
    'with very high certainty'
  ];
  
  if (result.certaintyLevel >= 1 && result.certaintyLevel <= 5) {
    summary += `The validation was performed ${certaintyDescriptions[result.certaintyLevel - 1]}. `;
  }
  
  // Add information about validation level
  if (result.validationLevel) {
    const levelDescriptions = [
      'basic text comparison',
      'pattern matching and structural validation',
      'comprehensive contextual analysis'
    ];
    
    if (result.validationLevel >= 1 && result.validationLevel <= 3) {
      summary += `Validation used ${levelDescriptions[result.validationLevel - 1]}. `;
    }
  }
  
  // Add error information if validation failed
  if (!result.isValid && result.errors && result.errors.length > 0) {
    const categorized = categorizeErrors(result.errors);
    
    if (categorized.critical.length > 0) {
      summary += `Found ${categorized.critical.length} critical issue(s) that must be addressed. `;
    }
    
    if (categorized.major.length > 0) {
      summary += `Found ${categorized.major.length} major issue(s) that should be addressed. `;
    }
    
    if (categorized.minor.length > 0) {
      summary += `Found ${categorized.minor.length} minor issue(s) that could be improved. `;
    }
  }
  
  return summary;
}

module.exports = {
  aggregateResults,
  aggregateVersionResults,
  formatResultsForResponse,
  mergeValidationResults,
  processValidationResponse,
  categorizeErrors,
  generateHumanReadableSummary
};
