/**
 * EdSteward.ai - Validation Router Module
 * 
 * This module is responsible for routing validation requests to the appropriate
 * validation services based on the regulation classification.
 */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

// Environment variables - these would be set in the Lambda configuration
const LEVEL1_VALIDATOR_ARN = process.env.LEVEL1_VALIDATOR_ARN;
const LEVEL2_VALIDATOR_ARN = process.env.LEVEL2_VALIDATOR_ARN;
const LEVEL3_VALIDATOR_ARN = process.env.LEVEL3_VALIDATOR_ARN;

/**
 * Route a validation request to the appropriate validator
 * 
 * @param {Object} params - Routing parameters
 * @param {Object} params.classification - Regulation classification
 * @param {Object} params.regulation - Regulation data
 * @param {Object} params.regulationContent - Regulation content to validate
 * @param {number} params.validationLevel - Requested validation level
 * @param {Object} params.options - Validation options
 * @returns {Promise<Object>} Validation result
 */
async function routeToValidator(params) {
  const { classification, regulation, regulationContent, validationLevel, options } = params;
  
  console.log(`Routing validation request for regulation ${regulation.regulation_id} to level ${validationLevel} validator`);
  
  // Determine which validator to use based on the classification
  let validatorArn;
  switch (validationLevel) {
    case 1:
      validatorArn = LEVEL1_VALIDATOR_ARN;
      break;
    case 2:
      validatorArn = LEVEL2_VALIDATOR_ARN || LEVEL1_VALIDATOR_ARN; // Fallback to Level 1 if Level 2 not available
      break;
    case 3:
      validatorArn = LEVEL3_VALIDATOR_ARN || LEVEL2_VALIDATOR_ARN || LEVEL1_VALIDATOR_ARN; // Fallback hierarchy
      break;
    default:
      validatorArn = LEVEL1_VALIDATOR_ARN;
  }
  
  // If no validator is available, perform a basic validation
  if (!validatorArn) {
    console.log('No validator available, performing basic validation');
    return performBasicValidation(regulation, regulationContent, options);
  }
  
  // Prepare the payload for the validator
  const payload = {
    action: 'validate',
    regulationId: regulation.regulation_id,
    regulationTitle: regulation.title,
    regulationCategory: regulation.category,
    regulationJurisdiction: regulation.jurisdiction,
    authorityVersion: regulation.current_version,
    clientContent: regulationContent,
    options
  };
  
  // Invoke the validator Lambda function
  try {
    const invokeParams = {
      FunctionName: validatorArn,
      InvocationType: 'RequestResponse', // Synchronous invocation
      Payload: JSON.stringify(payload)
    };
    
    console.log(`Invoking validator: ${validatorArn}`);
    const response = await lambda.invoke(invokeParams).promise();
    
    // Check for Lambda execution errors
    if (response.FunctionError) {
      console.error(`Validator execution error: ${response.FunctionError}`);
      console.error(`Error payload: ${response.Payload}`);
      throw new Error(`Validator execution failed: ${response.FunctionError}`);
    }
    
    // Parse validation result
    const result = JSON.parse(response.Payload);
    console.log(`Validation result received: ${JSON.stringify(result)}`);
    
    return result;
  } catch (error) {
    console.error(`Error invoking validator: ${error.message}`);
    
    // Fallback to basic validation in case of errors
    console.log('Falling back to basic validation due to error');
    return performBasicValidation(regulation, regulationContent, options);
  }
}

/**
 * Perform a basic validation when no validator is available or as a fallback
 * 
 * @param {Object} regulation - Regulation data
 * @param {Object} regulationContent - Regulation content to validate
 * @param {Object} options - Validation options
 * @returns {Object} Basic validation result
 */
function performBasicValidation(regulation, regulationContent, options) {
  console.log('Performing basic validation');
  
  // Extract content text
  const contentText = regulationContent.text || '';
  
  // Perform very basic validation (text existence check)
  const isValid = contentText.length > 0;
  
  // Determine certainty level (very low for basic validation)
  const certaintyLevel = isValid ? 2 : 1;
  
  return {
    isValid,
    certaintyLevel,
    validationTimestamp: new Date().toISOString(),
    validationLevel: 1,
    evidence: {
      textExists: contentText.length > 0,
      // Basic text metrics for evidence
      metrics: {
        contentLength: contentText.length,
        wordCount: contentText.split(/\s+/).length,
        hasPunctuation: /[.,;:!?]/.test(contentText)
      }
    }
  };
}

/**
 * Route a batch of validation requests
 * 
 * @param {Array<Object>} batch - Batch of validation requests
 * @returns {Promise<Array<Object>>} Batch validation results
 */
async function routeBatchValidation(batch) {
  // Process each validation request in parallel
  const validationPromises = batch.map(item => routeToValidator(item));
  return Promise.all(validationPromises);
}

/**
 * Determine the best routing strategy based on the request
 * 
 * @param {Object} request - Validation request
 * @returns {string} Routing strategy ('direct', 'batch', or 'sequential')
 */
function determineRoutingStrategy(request) {
  // If it's a single validation request
  if (!request.batch) {
    return 'direct';
  }
  
  // If it's a small batch, process in parallel
  if (request.batch.length <= 10) {
    return 'batch';
  }
  
  // For larger batches, process sequentially to avoid Lambda throttling
  return 'sequential';
}

/**
 * Check if the validator is available
 * 
 * @param {string} validatorArn - ARN of the validator function
 * @returns {Promise<boolean>} True if the validator is available
 */
async function isValidatorAvailable(validatorArn) {
  if (!validatorArn) {
    return false;
  }
  
  try {
    // Call the validator with a ping action to check availability
    const invokeParams = {
      FunctionName: validatorArn,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({ action: 'ping' })
    };
    
    const response = await lambda.invoke(invokeParams).promise();
    return !response.FunctionError;
  } catch (error) {
    console.error(`Error checking validator availability: ${error.message}`);
    return false;
  }
}

module.exports = {
  routeToValidator,
  routeBatchValidation,
  determineRoutingStrategy,
  isValidatorAvailable
};
