/**
 * EdSteward.ai - Primary MCP Orchestrator
 * 
 * This Lambda function serves as the primary orchestrator for the MCP (Model Context Protocol)
 * system. It receives validation requests, routes them to the appropriate validators,
 * and aggregates the results.
 */

const AWS = require('aws-sdk');
const { getDbConnection } = require('./db');
const { validateRequest } = require('./validation');
const { classifyRegulation } = require('./classifier');
const { routeToValidator } = require('./router');
const { aggregateResults } = require('./aggregator');
const { createAuditEvent } = require('./audit');

// Initialize AWS services
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();

// Environment variables
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';
const DB_SECRET_ARN = process.env.DB_SECRET_ARN;
const DOCUMENTS_BUCKET_NAME = process.env.DOCUMENTS_BUCKET_NAME;
const LEVEL1_VALIDATOR_ARN = process.env.LEVEL1_VALIDATOR_ARN;
const VERSION_CONTROL_ARN = process.env.VERSION_CONTROL_ARN;
const AUDIT_LOG_ARN = process.env.AUDIT_LOG_ARN;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Response headers
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // Replace with proper CORS configuration
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};

/**
 * Lambda handler function
 */
exports.handler = async (event, context) => {
  console.log(`Request received: ${JSON.stringify(event)}`);

  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ message: 'CORS preflight successful' })
      };
    }

    // Handle different types of requests based on the path and method
    if (event.resource === '/validate' && event.httpMethod === 'POST') {
      return await handleValidationRequest(event, context);
    } else if (event.resource === '/validate/batch' && event.httpMethod === 'POST') {
      return await handleBatchValidationRequest(event, context);
    } else if (event.resource === '/regulations' && event.httpMethod === 'GET') {
      return await handleRegulationsListRequest(event, context);
    } else if (event.resource === '/regulations/{regulationId}' && event.httpMethod === 'GET') {
      return await handleRegulationDetailRequest(event, context);
    } else if (event.resource === '/status' && event.httpMethod === 'GET') {
      return await handleStatusRequest(event, context);
    } else {
      // Unsupported path or method
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'The requested resource was not found',
            requestId: context.awsRequestId
          }
        })
      };
    }
  } catch (error) {
    console.error('Error handling request:', error);
    
    // Create audit event for error
    try {
      await createAuditEvent({
        eventType: 'request.error',
        entityType: 'request',
        entityId: context.awsRequestId,
        action: 'error',
        metadata: {
          error: error.message,
          stack: error.stack,
          resource: event.resource,
          httpMethod: event.httpMethod
        }
      });
    } catch (auditError) {
      console.error('Error creating audit event:', auditError);
    }
    
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: context.awsRequestId
        }
      })
    };
  }
};

/**
 * Handle a validation request
 */
async function handleValidationRequest(event, context) {
  const requestTimestamp = new Date().toISOString();
  const requestId = context.awsRequestId;
  
  // Parse request body
  const body = JSON.parse(event.body);
  
  // Validate request format
  const validationResult = validateRequest(body, 'validation');
  if (!validationResult.isValid) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request format',
          details: validationResult.errors,
          requestId
        }
      })
    };
  }
  
  // Extract request parameters
  const { regulationId, regulationVersion, regulationContent, validationLevel = 1, options = {} } = body;
  
  // Create audit event for validation request
  await createAuditEvent({
    eventType: 'validation.requested',
    entityType: 'regulation',
    entityId: regulationId,
    action: 'validate',
    metadata: {
      regulationVersion,
      validationLevel,
      options
    }
  });
  
  // Retrieve regulation details from database
  const db = await getDbConnection(DB_SECRET_ARN);
  const regulation = await db.getRegulation(regulationId);
  
  if (!regulation) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({
        error: {
          code: 'REGULATION_NOT_FOUND',
          message: `Regulation with ID ${regulationId} not found`,
          requestId
        }
      })
    };
  }
  
  // Classify regulation to determine appropriate validation approach
  const classification = await classifyRegulation(regulation, validationLevel);
  
  // Route to appropriate validator based on classification
  const validationResponse = await routeToValidator({
    classification,
    regulation,
    regulationContent,
    validationLevel,
    options
  });
  
  // Check for version changes if requested
  let versionStatus = null;
  if (options.checkVersionChanges) {
    // Call version control service
    const versionControlParams = {
      FunctionName: VERSION_CONTROL_ARN,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        action: 'checkVersion',
        regulationId,
        clientVersion: regulationVersion,
        timestamp: requestTimestamp
      })
    };
    
    const versionControlResponse = await lambda.invoke(versionControlParams).promise();
    versionStatus = JSON.parse(versionControlResponse.Payload);
  }
  
  // Prepare response
  const responsePayload = {
    requestId,
    timestamp: new Date().toISOString(),
    status: 'success',
    data: {
      regulationId,
      regulationVersion,
      authorityVersion: regulation.currentVersion,
      validationResult: validationResponse
    }
  };
  
  // Add version status if available
  if (versionStatus) {
    responsePayload.data.versionStatus = versionStatus;
  }
  
  // Add attestation certificate if validation was successful
  if (validationResponse.isValid && validationResponse.certaintyLevel >= 4) {
    // Generate attestation certificate
    const certificateParams = {
      regulationId,
      regulationVersion,
      validationResult: validationResponse,
      validatedBy: context.functionName,
      requestId
    };
    
    const certificate = await generateCertificate(certificateParams);
    responsePayload.data.attestationCertificate = certificate;
  }
  
  // Create audit event for validation result
  await createAuditEvent({
    eventType: 'validation.completed',
    entityType: 'regulation',
    entityId: regulationId,
    action: 'validate',
    metadata: {
      regulationVersion,
      validationLevel,
      isValid: validationResponse.isValid,
      certaintyLevel: validationResponse.certaintyLevel,
      requestId
    }
  });
  
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(responsePayload)
  };
}

/**
 * Handle a batch validation request
 */
async function handleBatchValidationRequest(event, context) {
  const requestTimestamp = new Date().toISOString();
  const requestId = context.awsRequestId;
  
  // Parse request body
  const body = JSON.parse(event.body);
  
  // Validate request format
  const validationResult = validateRequest(body, 'batchValidation');
  if (!validationResult.isValid) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request format',
          details: validationResult.errors,
          requestId
        }
      })
    };
  }
  
  // Extract request parameters
  const { regulations, options = {} } = body;
  
  // Create audit event for batch validation request
  await createAuditEvent({
    eventType: 'validation.batch.requested',
    entityType: 'batch',
    entityId: requestId,
    action: 'validate',
    metadata: {
      regulationCount: regulations.length,
      options
    }
  });
  
  // Process each regulation in parallel
  const validationPromises = regulations.map(async (regulation) => {
    try {
      // Create individual validation request
      const individualRequest = {
        body: JSON.stringify({
          regulationId: regulation.regulationId,
          regulationVersion: regulation.regulationVersion,
          regulationContent: regulation.regulationContent,
          validationLevel: regulation.validationLevel || 1,
          options
        }),
        resource: '/validate',
        httpMethod: 'POST'
      };
      
      // Process individual validation
      const result = await handleValidationRequest(individualRequest, {
        ...context,
        awsRequestId: `${requestId}-${regulation.regulationId}`
      });
      
      // Parse result
      return JSON.parse(result.body);
    } catch (error) {
      console.error(`Error processing validation for ${regulation.regulationId}:`, error);
      return {
        regulationId: regulation.regulationId,
        error: {
          code: 'VALIDATION_FAILED',
          message: error.message
        }
      };
    }
  });
  
  // Wait for all validations to complete
  const results = await Promise.all(validationPromises);
  
  // Aggregate results
  const aggregatedResults = aggregateResults(results);
  
  // Create audit event for batch validation completion
  await createAuditEvent({
    eventType: 'validation.batch.completed',
    entityType: 'batch',
    entityId: requestId,
    action: 'validate',
    metadata: {
      regulationCount: regulations.length,
      successCount: aggregatedResults.summary.successCount,
      failureCount: aggregatedResults.summary.failureCount,
      requestId
    }
  });
  
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      requestId,
      timestamp: new Date().toISOString(),
      status: 'success',
      data: results
    })
  };
}

/**
 * Handle a regulations list request
 */
async function handleRegulationsListRequest(event, context) {
  const requestId = context.awsRequestId;
  
  // Extract query parameters
  const queryParams = event.queryStringParameters || {};
  const {
    page = 1,
    limit = 20,
    category,
    jurisdiction,
    query,
    tags,
    active
  } = queryParams;
  
  // Validate parameters
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100); // Cap at 100
  
  if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid pagination parameters',
          requestId
        }
      })
    };
  }
  
  // Build filter object
  const filters = {};
  if (category) filters.category = category;
  if (jurisdiction) filters.jurisdiction = jurisdiction;
  if (query) filters.query = query;
  if (tags) filters.tags = tags.split(',');
  if (active !== undefined) filters.active = active === 'true';
  
  // Create audit event for list request
  await createAuditEvent({
    eventType: 'regulations.listed',
    entityType: 'regulations',
    entityId: requestId,
    action: 'list',
    metadata: {
      filters,
      page: pageNum,
      limit: limitNum
    }
  });
  
  // Retrieve regulations from database
  const db = await getDbConnection(DB_SECRET_ARN);
  const result = await db.listRegulations(filters, pageNum, limitNum);
  
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      data: result.regulations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum)
      }
    })
  };
}

/**
 * Handle a regulation detail request
 */
async function handleRegulationDetailRequest(event, context) {
  const requestId = context.awsRequestId;
  
  // Extract path parameters
  const regulationId = event.pathParameters.regulationId;
  
  // Create audit event for detail request
  await createAuditEvent({
    eventType: 'regulation.viewed',
    entityType: 'regulation',
    entityId: regulationId,
    action: 'view',
    metadata: {
      requestId
    }
  });
  
  // Retrieve regulation details from database
  const db = await getDbConnection(DB_SECRET_ARN);
  const regulation = await db.getRegulationWithVersions(regulationId);
  
  if (!regulation) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({
        error: {
          code: 'REGULATION_NOT_FOUND',
          message: `Regulation with ID ${regulationId} not found`,
          requestId
        }
      })
    };
  }
  
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(regulation)
  };
}

/**
 * Handle a status request
 */
async function handleStatusRequest(event, context) {
  // Check database connection
  let dbStatus = 'operational';
  try {
    const db = await getDbConnection(DB_SECRET_ARN);
    await db.healthCheck();
  } catch (error) {
    console.error('Database health check failed:', error);
    dbStatus = 'degraded';
  }
  
  // Check S3 bucket
  let storageStatus = 'operational';
  try {
    await s3.headBucket({ Bucket: DOCUMENTS_BUCKET_NAME }).promise();
  } catch (error) {
    console.error('S3 health check failed:', error);
    storageStatus = 'degraded';
  }
  
  // Check Lambda functions
  let validationStatus = 'operational';
  try {
    // Invoke Level 1 validator with a ping
    await lambda.invoke({
      FunctionName: LEVEL1_VALIDATOR_ARN,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({ action: 'ping' })
    }).promise();
  } catch (error) {
    console.error('Validation system health check failed:', error);
    validationStatus = 'degraded';
  }
  
  // Determine overall status
  const overall = dbStatus === 'operational' && 
                  storageStatus === 'operational' && 
                  validationStatus === 'operational' ? 'operational' : 'degraded';
  
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      status: overall,
      version: '1.0.0', // Should be dynamically retrieved from package.json or env var
      timestamp: new Date().toISOString(),
      components: {
        api: 'operational',
        database: dbStatus,
        storage: storageStatus,
        validation: validationStatus
      }
    })
  };
}

/**
 * Generate attestation certificate
 */
async function generateCertificate(params) {
  const { regulationId, regulationVersion, validationResult, validatedBy, requestId } = params;
  
  // Set expiration date (90 days from now)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(now.getDate() + 90);
  
  // Generate certificate ID
  const certificateId = `cert-${regulationId}-${regulationVersion}-${Date.now()}`;
  
  // Create certificate record in database
  const db = await getDbConnection(DB_SECRET_ARN);
  
  const certificate = {
    certificateId,
    validationId: requestId,
    regulationId,
    regulationVersion,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    validatedBy,
    cryptographicSignature: 'placeholder', // Would be replaced with actual signature generation
    certificateUrl: `/api/certificates/${certificateId}`
  };
  
  await db.createCertificate(certificate);
  
  // Create audit event for certificate creation
  await createAuditEvent({
    eventType: 'certificate.issued',
    entityType: 'certificate',
    entityId: certificateId,
    action: 'issue',
    metadata: {
      regulationId,
      regulationVersion,
      validationId: requestId,
      expiresAt: expiresAt.toISOString()
    }
  });
  
  return certificate;
}
