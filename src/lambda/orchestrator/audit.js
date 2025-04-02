/**
 * EdSteward.ai - Audit Logging Module
 * 
 * This module handles audit logging for all actions in the MCP system.
 * It creates comprehensive, immutable audit records for compliance tracking.
 */

const AWS = require('aws-sdk');
const { getDbConnection } = require('./db');

// Initialize AWS services
const lambda = new AWS.Lambda();

// Environment variables
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';
const DB_SECRET_ARN = process.env.DB_SECRET_ARN;
const AUDIT_LOG_ARN = process.env.AUDIT_LOG_ARN;

/**
 * Create an audit event record
 * 
 * @param {Object} auditEvent - Audit event data
 * @param {string} auditEvent.eventType - Type of event (e.g., 'validation.requested')
 * @param {string} auditEvent.entityType - Type of entity (e.g., 'regulation')
 * @param {string} auditEvent.entityId - Identifier for the entity
 * @param {string} auditEvent.action - Action performed (e.g., 'validate')
 * @param {Object} [auditEvent.metadata] - Additional event metadata
 * @param {string} [auditEvent.userId] - User who performed the action
 * @param {string} [auditEvent.clientId] - Client system identifier
 * @param {string} [auditEvent.ipAddress] - Source IP address
 * @param {Object} [auditEvent.previousState] - Entity state before the action
 * @param {Object} [auditEvent.newState] - Entity state after the action
 * @returns {Promise<Object>} Created audit event record
 */
async function createAuditEvent(auditEvent) {
  console.log(`Creating audit event: ${auditEvent.eventType} for ${auditEvent.entityType}:${auditEvent.entityId}`);
  
  // If we have a dedicated audit logging service, use it
  if (AUDIT_LOG_ARN) {
    try {
      return await createAuditEventViaService(auditEvent);
    } catch (error) {
      console.error(`Error using audit service, falling back to direct DB: ${error.message}`);
      // Fall back to direct DB logging on error
    }
  }
  
  // Otherwise, log directly to the database
  return await createAuditEventDirectly(auditEvent);
}

/**
 * Create an audit event using the dedicated audit logging service
 * 
 * @param {Object} auditEvent - Audit event data
 * @returns {Promise<Object>} Created audit event record
 */
async function createAuditEventViaService(auditEvent) {
  try {
    // Invoke the audit logging service
    const invokeParams = {
      FunctionName: AUDIT_LOG_ARN,
      InvocationType: 'Event', // Asynchronous invocation for better performance
      Payload: JSON.stringify({
        action: 'createAuditEvent',
        auditEvent
      })
    };
    
    const response = await lambda.invoke(invokeParams).promise();
    
    // For async invocation, we won't have the actual audit record
    // Return a simplified response
    return {
      eventType: auditEvent.eventType,
      entityType: auditEvent.entityType,
      entityId: auditEvent.entityId,
      timestamp: new Date().toISOString(),
      logged: true
    };
  } catch (error) {
    console.error(`Error invoking audit service: ${error.message}`);
    throw error;
  }
}

/**
 * Create an audit event directly in the database
 * 
 * @param {Object} auditEvent - Audit event data
 * @returns {Promise<Object>} Created audit event record
 */
async function createAuditEventDirectly(auditEvent) {
  try {
    // Connect to the database
    const db = await getDbConnection(DB_SECRET_ARN);
    
    // Create the audit event record
    return await db.createAuditEvent(auditEvent);
  } catch (error) {
    console.error(`Error creating audit event directly: ${error.message}`);
    
    // If we can't log to the database, log to CloudWatch as a last resort
    console.warn(`AUDIT EVENT: ${JSON.stringify(auditEvent)}`);
    
    // Return a simplified response
    return {
      eventType: auditEvent.eventType,
      entityType: auditEvent.entityType,
      entityId: auditEvent.entityId,
      timestamp: new Date().toISOString(),
      logged: false,
      error: error.message
    };
  }
}

/**
 * Get audit events for an entity
 * 
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Entity identifier
 * @param {Object} [options] - Query options
 * @param {number} [options.limit] - Maximum number of events to return
 * @param {number} [options.offset] - Offset for pagination
 * @param {string} [options.sortBy] - Field to sort by
 * @param {string} [options.sortOrder] - Sort order ('asc' or 'desc')
 * @returns {Promise<Array<Object>>} Audit events for the entity
 */
async function getAuditEvents(entityType, entityId, options = {}) {
  try {
    // Connect to the database
    const db = await getDbConnection(DB_SECRET_ARN);
    
    // Default query options
    const queryOptions = {
      limit: options.limit || 100,
      offset: options.offset || 0,
      sortBy: options.sortBy || 'timestamp',
      sortOrder: options.sortOrder || 'desc'
    };
    
    // Build query
    const query = `
      SELECT *
      FROM audit_logs
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY ${queryOptions.sortBy} ${queryOptions.sortOrder}
      LIMIT $3 OFFSET $4
    `;
    
    // Execute query
    const result = await db.query(query, [
      entityType,
      entityId,
      queryOptions.limit,
      queryOptions.offset
    ]);
    
    return result.rows;
  } catch (error) {
    console.error(`Error retrieving audit events: ${error.message}`);
    throw error;
  }
}

/**
 * Create an authorization audit event
 * 
 * @param {Object} authEvent - Authorization event data
 * @param {string} authEvent.action - Action attempted
 * @param {string} authEvent.resource - Resource accessed
 * @param {string} authEvent.userId - User identifier
 * @param {boolean} authEvent.allowed - Whether access was allowed
 * @param {string} [authEvent.reason] - Reason for denial (if not allowed)
 * @returns {Promise<Object>} Created audit event
 */
async function createAuthorizationAuditEvent(authEvent) {
  return await createAuditEvent({
    eventType: authEvent.allowed ? 'authorization.success' : 'authorization.failure',
    entityType: 'authorization',
    entityId: `${authEvent.userId}:${Date.now()}`,
    action: 'authorize',
    userId: authEvent.userId,
    metadata: {
      resource: authEvent.resource,
      action: authEvent.action,
      allowed: authEvent.allowed,
      reason: authEvent.reason
    }
  });
}

/**
 * Create a system audit event
 * 
 * @param {string} action - System action
 * @param {Object} details - Action details
 * @returns {Promise<Object>} Created audit event
 */
async function createSystemAuditEvent(action, details) {
  return await createAuditEvent({
    eventType: `system.${action}`,
    entityType: 'system',
    entityId: `system:${Date.now()}`,
    action,
    metadata: details
  });
}

module.exports = {
  createAuditEvent,
  getAuditEvents,
  createAuthorizationAuditEvent,
  createSystemAuditEvent
};
