/**
 * EdSteward.ai - Database Utility Module
 * 
 * This module provides database connection and operations for the MCP system.
 * It handles connection pooling, query execution, and data access patterns.
 */

const AWS = require('aws-sdk');
const { Pool } = require('pg');

// Keep connection pooled for Lambda container reuse
let dbPool = null;
let dbConfig = null;

/**
 * Get database connection with connection pooling
 * @param {string} secretArn - ARN of the Secrets Manager secret containing database credentials
 * @returns {Object} Database client with query methods
 */
async function getDbConnection(secretArn) {
  // If we already have a connection pool, return the client interface
  if (dbPool) {
    return createDbClient(dbPool);
  }
  
  // If we have the config but no pool, create the pool
  if (dbConfig) {
    dbPool = new Pool(dbConfig);
    return createDbClient(dbPool);
  }
  
  // Otherwise, retrieve the config from Secrets Manager and create the pool
  try {
    const secretsManager = new AWS.SecretsManager();
    const secretResponse = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
    const secret = JSON.parse(secretResponse.SecretString);
    
    dbConfig = {
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      ssl: {
        rejectUnauthorized: false // For AWS RDS, may need to be adjusted
      },
      max: 5, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
    };
    
    dbPool = new Pool(dbConfig);
    
    // Test the connection
    const client = await dbPool.connect();
    try {
      await client.query('SELECT NOW()');
    } finally {
      client.release();
    }
    
    console.log('Database connection successful');
    return createDbClient(dbPool);
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Create a client interface with database operations
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Object} Database client with query methods
 */
function createDbClient(pool) {
  return {
    /**
     * Execute a query with parameters
     * @param {string} text - SQL query text
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(text, params) {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    },
    
    /**
     * Begin a transaction
     * @returns {Promise<Object>} Transaction client
     */
    async beginTransaction() {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        return {
          async query(text, params) {
            return client.query(text, params);
          },
          
          async commit() {
            try {
              await client.query('COMMIT');
            } finally {
              client.release();
            }
          },
          
          async rollback() {
            try {
              await client.query('ROLLBACK');
            } finally {
              client.release();
            }
          }
        };
      } catch (error) {
        client.release();
        throw error;
      }
    },
    
    /**
     * Get regulation by ID
     * @param {string} regulationId - Unique identifier for the regulation
     * @returns {Promise<Object|null>} Regulation data or null if not found
     */
    async getRegulation(regulationId) {
      const query = `
        SELECT r.*, rv.version_number as current_version
        FROM regulations r
        JOIN regulation_versions rv ON r.regulation_id = rv.regulation_id
        WHERE r.regulation_id = $1 AND rv.is_current = true
      `;
      
      const result = await this.query(query, [regulationId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    },
    
    /**
     * Get regulation with all its versions
     * @param {string} regulationId - Unique identifier for the regulation
     * @returns {Promise<Object|null>} Regulation data with versions or null if not found
     */
    async getRegulationWithVersions(regulationId) {
      // First, get the regulation data
      const regulationQuery = `
        SELECT r.*, rv.version_number as current_version
        FROM regulations r
        JOIN regulation_versions rv ON r.regulation_id = rv.regulation_id
        WHERE r.regulation_id = $1 AND rv.is_current = true
      `;
      
      const regulationResult = await this.query(regulationQuery, [regulationId]);
      if (regulationResult.rows.length === 0) {
        return null;
      }
      
      const regulation = regulationResult.rows[0];
      
      // Next, get all versions
      const versionsQuery = `
        SELECT version_id, version_number, effective_date, is_current
        FROM regulation_versions
        WHERE regulation_id = $1
        ORDER BY effective_date DESC
      `;
      
      const versionsResult = await this.query(versionsQuery, [regulationId]);
      regulation.versions = versionsResult.rows;
      
      return regulation;
    },
    
    /**
     * List regulations with filtering and pagination
     * @param {Object} filters - Filter criteria
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} Paginated regulations and total count
     */
    async listRegulations(filters = {}, page = 1, limit = 20) {
      const offset = (page - 1) * limit;
      const params = [];
      
      // Build the WHERE clause based on filters
      let whereClause = '';
      const whereClauses = [];
      
      if (filters.category) {
        params.push(filters.category);
        whereClauses.push(`r.category = $${params.length}`);
      }
      
      if (filters.jurisdiction) {
        params.push(filters.jurisdiction);
        whereClauses.push(`r.jurisdiction = $${params.length}`);
      }
      
      if (filters.query) {
        params.push(`%${filters.query}%`);
        whereClauses.push(`(r.title ILIKE $${params.length} OR r.citation ILIKE $${params.length})`);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        params.push(filters.tags);
        whereClauses.push(`r.tags && $${params.length}::text[]`);
      }
      
      if (filters.active !== undefined) {
        params.push(filters.active);
        whereClauses.push(`r.is_active = $${params.length}`);
      }
      
      if (whereClauses.length > 0) {
        whereClause = `WHERE ${whereClauses.join(' AND ')}`;
      }
      
      // Build the query
      const query = `
        SELECT r.*, rv.version_number as current_version
        FROM regulations r
        JOIN regulation_versions rv ON r.regulation_id = rv.regulation_id
        ${whereClause}
        AND rv.is_current = true
        ORDER BY r.updated_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      // Add pagination parameters
      params.push(limit, offset);
      
      // Execute the query
      const result = await this.query(query, params);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM regulations r
        ${whereClause}
      `;
      
      const countResult = await this.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total, 10);
      
      return {
        regulations: result.rows,
        total
      };
    },
    
    /**
     * Create a certificate record
     * @param {Object} certificate - Certificate data
     * @returns {Promise<Object>} Created certificate
     */
    async createCertificate(certificate) {
      const {
        certificateId,
        validationId,
        regulationId,
        regulationVersion,
        issuedAt,
        expiresAt,
        validatedBy,
        cryptographicSignature,
        certificateUrl
      } = certificate;
      
      const query = `
        INSERT INTO attestation_certificates (
          certificate_id,
          validation_id,
          regulation_id,
          regulation_version,
          issued_at,
          expires_at,
          issuer,
          cryptographic_signature,
          revocation_status,
          metadata,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;
      
      const metadata = {
        certificateUrl
      };
      
      const result = await this.query(query, [
        certificateId,
        validationId,
        regulationId,
        regulationVersion,
        issuedAt,
        expiresAt,
        validatedBy,
        cryptographicSignature,
        'active',
        JSON.stringify(metadata)
      ]);
      
      return result.rows[0];
    },
    
    /**
     * Create an audit log entry
     * @param {Object} auditEvent - Audit event data
     * @returns {Promise<Object>} Created audit log
     */
    async createAuditEvent(auditEvent) {
      const {
        eventType,
        entityType,
        entityId,
        userId,
        clientId,
        ipAddress,
        action,
        previousState,
        newState,
        metadata
      } = auditEvent;
      
      const query = `
        INSERT INTO audit_logs (
          event_type,
          entity_type,
          entity_id,
          user_id,
          client_id,
          ip_address,
          action,
          timestamp,
          previous_state,
          new_state,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
        RETURNING *
      `;
      
      const result = await this.query(query, [
        eventType,
        entityType,
        entityId,
        userId || null,
        clientId || null,
        ipAddress || null,
        action,
        previousState ? JSON.stringify(previousState) : null,
        newState ? JSON.stringify(newState) : null,
        metadata ? JSON.stringify(metadata) : '{}'
      ]);
      
      return result.rows[0];
    },
    
    /**
     * Perform a health check on the database
     * @returns {Promise<boolean>} True if database is healthy
     */
    async healthCheck() {
      await this.query('SELECT 1');
      return true;
    },
    
    /**
     * Close all database connections
     * @returns {Promise<void>}
     */
    async close() {
      if (dbPool) {
        await dbPool.end();
        dbPool = null;
      }
    }
  };
}

module.exports = {
  getDbConnection
};
