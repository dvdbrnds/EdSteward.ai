/**
 * EdSteward.ai - Request Validation Module
 * 
 * This module handles validation of incoming API requests to ensure
 * they meet the required format and structure before processing.
 */

/**
 * Validate a request against the MCP protocol specification
 * 
 * @param {Object} request - Request object to validate
 * @param {string} requestType - Type of request ('validation', 'batchValidation', 'versionCheck', etc.)
 * @returns {Object} Validation result with isValid flag and any errors
 */
function validateRequest(request, requestType) {
  // Basic request validation
  if (!request) {
    return {
      isValid: false,
      errors: [{ field: 'request', message: 'Request body is required' }]
    };
  }
  
  // Specific validation based on request type
  switch (requestType) {
    case 'validation':
      return validateValidationRequest(request);
    case 'batchValidation':
      return validateBatchValidationRequest(request);
    case 'versionCheck':
      return validateVersionCheckRequest(request);
    case 'versionAcceptance':
      return validateVersionAcceptanceRequest(request);
    default:
      return {
        isValid: false,
        errors: [{ field: 'requestType', message: `Unknown request type: ${requestType}` }]
      };
  }
}

/**
 * Validate a single validation request
 * 
 * @param {Object} request - Validation request
 * @returns {Object} Validation result
 */
function validateValidationRequest(request) {
  const errors = [];
  
  // Required fields
  if (!request.regulationId) {
    errors.push({ field: 'regulationId', message: 'Regulation ID is required' });
  }
  
  if (!request.regulationVersion) {
    errors.push({ field: 'regulationVersion', message: 'Regulation version is required' });
  }
  
  if (!request.regulationContent) {
    errors.push({ field: 'regulationContent', message: 'Regulation content is required' });
  } else if (!request.regulationContent.text) {
    errors.push({ field: 'regulationContent.text', message: 'Regulation text is required' });
  }
  
  // Optional fields with validation
  if (request.validationLevel !== undefined) {
    if (![1, 2, 3].includes(request.validationLevel)) {
      errors.push({ 
        field: 'validationLevel', 
        message: 'Validation level must be 1, 2, or 3' 
      });
    }
  }
  
  if (request.options) {
    if (request.options.requireCertainty !== undefined) {
      if (![1, 2, 3, 4, 5].includes(request.options.requireCertainty)) {
        errors.push({ 
          field: 'options.requireCertainty', 
          message: 'Required certainty must be between 1 and 5' 
        });
      }
    }
  }
  
  // Check semantic version format
  if (request.regulationVersion && !isValidSemanticVersion(request.regulationVersion)) {
    errors.push({ 
      field: 'regulationVersion', 
      message: 'Regulation version must be in semantic versioning format (e.g., 1.2.3)' 
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate a batch validation request
 * 
 * @param {Object} request - Batch validation request
 * @returns {Object} Validation result
 */
function validateBatchValidationRequest(request) {
  const errors = [];
  
  // Check if regulations array exists
  if (!request.regulations || !Array.isArray(request.regulations)) {
    errors.push({ 
      field: 'regulations', 
      message: 'Regulations must be an array' 
    });
    
    return {
      isValid: false,
      errors
    };
  }
  
  // Check if array is empty
  if (request.regulations.length === 0) {
    errors.push({ 
      field: 'regulations', 
      message: 'Regulations array cannot be empty' 
    });
  }
  
  // Check maximum batch size
  if (request.regulations.length > 50) {
    errors.push({ 
      field: 'regulations', 
      message: 'Batch size cannot exceed 50 regulations' 
    });
  }
  
  // Validate each regulation in the batch
  request.regulations.forEach((regulation, index) => {
    const validationResult = validateValidationRequest(regulation);
    
    if (!validationResult.isValid) {
      validationResult.errors.forEach(error => {
        errors.push({ 
          field: `regulations[${index}].${error.field}`, 
          message: error.message 
        });
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate a version check request
 * 
 * @param {Object} request - Version check request
 * @returns {Object} Validation result
 */
function validateVersionCheckRequest(request) {
  const errors = [];
  
  // Required fields
  if (!request.regulationId) {
    errors.push({ field: 'regulationId', message: 'Regulation ID is required' });
  }
  
  if (!request.currentVersion) {
    errors.push({ field: 'currentVersion', message: 'Current version is required' });
  }
  
  // Check semantic version format
  if (request.currentVersion && !isValidSemanticVersion(request.currentVersion)) {
    errors.push({ 
      field: 'currentVersion', 
      message: 'Current version must be in semantic versioning format (e.g., 1.2.3)' 
    });
  }
  
  // Optional fields with validation
  if (request.lastCheckedTimestamp) {
    if (!isValidISODate(request.lastCheckedTimestamp)) {
      errors.push({ 
        field: 'lastCheckedTimestamp', 
        message: 'Last checked timestamp must be in ISO 8601 format' 
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate a version acceptance request
 * 
 * @param {Object} request - Version acceptance request
 * @returns {Object} Validation result
 */
function validateVersionAcceptanceRequest(request) {
  const errors = [];
  
  // Required fields
  if (!request.currentVersion) {
    errors.push({ field: 'currentVersion', message: 'Current version is required' });
  }
  
  if (!request.acceptedVersion) {
    errors.push({ field: 'acceptedVersion', message: 'Accepted version is required' });
  }
  
  if (!request.acceptedBy) {
    errors.push({ field: 'acceptedBy', message: 'User identifier is required' });
  }
  
  // Check semantic version format
  if (request.currentVersion && !isValidSemanticVersion(request.currentVersion)) {
    errors.push({ 
      field: 'currentVersion', 
      message: 'Current version must be in semantic versioning format (e.g., 1.2.3)' 
    });
  }
  
  if (request.acceptedVersion && !isValidSemanticVersion(request.acceptedVersion)) {
    errors.push({ 
      field: 'acceptedVersion', 
      message: 'Accepted version must be in semantic versioning format (e.g., 1.2.3)' 
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate protocol version
 * 
 * @param {string} version - Protocol version string
 * @returns {boolean} True if the version is supported
 */
function validateProtocolVersion(version) {
  if (!version) {
    return false;
  }
  
  // Currently supported protocol versions
  const supportedVersions = ['1.0.0'];
  
  return supportedVersions.includes(version);
}

/**
 * Check if a string is a valid semantic version
 * 
 * @param {string} version - Version string to check
 * @returns {boolean} True if the version is a valid semantic version
 */
function isValidSemanticVersion(version) {
  if (!version) {
    return false;
  }
  
  // Basic semantic version regex: major.minor.patch
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

/**
 * Check if a string is a valid ISO 8601 date
 * 
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if the date is a valid ISO 8601 date
 */
function isValidISODate(dateString) {
  if (!dateString) {
    return false;
  }
  
  try {
    const date = new Date(dateString);
    return date.toISOString() === dateString;
  } catch (error) {
    return false;
  }
}

/**
 * Validate request headers
 * 
 * @param {Object} headers - HTTP headers
 * @returns {Object} Validation result
 */
function validateHeaders(headers) {
  const errors = [];
  
  // Content-Type validation
  if (headers['Content-Type'] !== 'application/json') {
    errors.push({
      field: 'Content-Type',
      message: 'Content-Type must be application/json'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate API key if required
 * 
 * @param {string} apiKey - API key from request
 * @returns {Object} Validation result
 */
function validateApiKey(apiKey) {
  // This is a placeholder for actual API key validation
  // In a real implementation, this would check against stored keys
  
  if (!apiKey) {
    return {
      isValid: false,
      errors: [{ field: 'x-api-key', message: 'API key is required' }]
    };
  }
  
  // Simulate valid API key check
  const isValidKey = apiKey.length >= 20;
  
  return {
    isValid: isValidKey,
    errors: isValidKey ? undefined : [{ field: 'x-api-key', message: 'Invalid API key' }]
  };
}

/**
 * Construct an error response for invalid requests
 * 
 * @param {Array} errors - Validation errors
 * @param {string} requestId - Request identifier
 * @returns {Object} Error response object
 */
function createErrorResponse(errors, requestId) {
  return {
    error: {
      code: 'INVALID_REQUEST',
      message: 'Invalid request format',
      details: errors,
      requestId
    }
  };
}

/**
 * Validate MCP request payload format
 * 
 * @param {Object} payload - Full MCP request payload
 * @returns {Object} Validation result
 */
function validateMCPPayload(payload) {
  const errors = [];
  
  // Required MCP protocol fields
  if (!payload.protocolVersion) {
    errors.push({ field: 'protocolVersion', message: 'Protocol version is required' });
  } else if (!validateProtocolVersion(payload.protocolVersion)) {
    errors.push({ field: 'protocolVersion', message: 'Unsupported protocol version' });
  }
  
  if (!payload.requestId) {
    errors.push({ field: 'requestId', message: 'Request ID is required' });
  }
  
  if (!payload.timestamp) {
    errors.push({ field: 'timestamp', message: 'Timestamp is required' });
  } else if (!isValidISODate(payload.timestamp)) {
    errors.push({ field: 'timestamp', message: 'Timestamp must be in ISO 8601 format' });
  }
  
  if (!payload.requestType) {
    errors.push({ field: 'requestType', message: 'Request type is required' });
  }
  
  if (!payload.clientId) {
    errors.push({ field: 'clientId', message: 'Client ID is required' });
  }
  
  if (!payload.payload) {
    errors.push({ field: 'payload', message: 'Request payload is required' });
  }
  
  // Validate specific request type if everything else is valid
  if (errors.length === 0 && payload.requestType && payload.payload) {
    const typeValidation = validateRequest(payload.payload, payload.requestType);
    
    if (!typeValidation.isValid && typeValidation.errors) {
      typeValidation.errors.forEach(error => {
        errors.push({
          field: `payload.${error.field}`,
          message: error.message
        });
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = {
  validateRequest,
  validateValidationRequest,
  validateBatchValidationRequest,
  validateVersionCheckRequest,
  validateVersionAcceptanceRequest,
  validateProtocolVersion,
  validateHeaders,
  validateApiKey,
  validateMCPPayload,
  createErrorResponse
};
