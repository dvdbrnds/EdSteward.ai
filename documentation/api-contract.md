# EdSteward.ai API Contract

## Overview

This document defines the API contract between the EdSteward.ai backend services and client applications such as the existing Replit frontend. The API follows RESTful principles with JSON as the primary data exchange format.

## Base URL

**Development Environment:** `https://api-dev.edsteward.ai/v1`
**Production Environment:** `https://api.edsteward.ai/v1`

## Authentication

All API requests (except public endpoints) require authentication using JSON Web Tokens (JWT).

### Headers

```
Authorization: Bearer <jwt_token>
```

JWT tokens are obtained through the Cognito authentication endpoints.

## Rate Limiting

API requests are subject to rate limiting:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1617304800
```

## Versioning

The API is versioned through the URL path. The current version is `v1`.

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters or payload |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "field_with_error",
      "reason": "Specific error information"
    },
    "requestId": "uuid-for-tracking"
  }
}
```

## Endpoints

### Authentication

#### POST /auth/login

Authenticate with username and password.

**Request:**

```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "userId": "user-uuid"
}
```

#### POST /auth/refresh

Refresh access token using refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

#### POST /auth/logout

Log out and invalidate tokens.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Regulations

#### GET /regulations

List all regulations with optional filtering.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `category`: Filter by category
- `jurisdiction`: Filter by jurisdiction
- `query`: Search term for title and content
- `tags`: Comma-separated list of tags
- `active`: Boolean to filter by active status

**Response:**

```json
{
  "data": [
    {
      "regulationId": "uuid",
      "title": "Regulation Title",
      "citation": "Official Citation",
      "jurisdiction": "Federal",
      "authority": "Department of Education",
      "category": "Academic Standards",
      "effectiveDate": "2023-01-01",
      "isActive": true,
      "tags": ["academics", "standards"],
      "currentVersion": "1.2.3",
      "lastUpdated": "2023-03-15T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 135,
    "pages": 7
  }
}
```

#### GET /regulations/{regulationId}

Get detailed information about a specific regulation.

**Response:**

```json
{
  "regulationId": "uuid",
  "title": "Regulation Title",
  "citation": "Official Citation",
  "jurisdiction": "Federal",
  "authority": "Department of Education",
  "category": "Academic Standards",
  "effectiveDate": "2023-01-01",
  "isActive": true,
  "tags": ["academics", "standards"],
  "currentVersion": "1.2.3",
  "versions": [
    {
      "versionNumber": "1.2.3",
      "effectiveDate": "2023-01-01",
      "isCurrent": true
    },
    {
      "versionNumber": "1.2.2",
      "effectiveDate": "2022-07-15",
      "isCurrent": false
    }
  ],
  "metadata": {
    "additionalProperty": "value"
  },
  "createdAt": "2022-12-01T10:00:00Z",
  "updatedAt": "2023-03-15T14:30:00Z"
}
```

#### GET /regulations/{regulationId}/versions/{versionNumber}

Get a specific version of a regulation with full content.

**Response:**

```json
{
  "regulationId": "uuid",
  "versionId": "uuid",
  "versionNumber": "1.2.3",
  "content": "Full text content of the regulation...",
  "contentFormat": "markdown",
  "contentHash": "sha256-hash",
  "changeSummary": "Summary of changes from previous version",
  "changeType": "minor",
  "effectiveDate": "2023-01-01",
  "supersededDate": null,
  "isCurrent": true,
  "publishedAt": "2022-12-15T09:00:00Z",
  "approvalStatus": "published",
  "sourceUrl": "https://example.gov/regulation-source",
  "structure": [
    {
      "sectionType": "chapter",
      "sectionNumber": "1",
      "title": "General Provisions",
      "content": "Chapter content...",
      "children": [
        {
          "sectionType": "article",
          "sectionNumber": "1.1",
          "title": "Purpose",
          "content": "Article content..."
        }
      ]
    }
  ]
}
```

#### GET /regulations/{regulationId}/diff

Get differences between two versions of a regulation.

**Query Parameters:**

- `from`: Source version number (required)
- `to`: Target version number (required)
- `format`: Diff format (options: "inline", "side-by-side", "unified", default: "unified")

**Response:**

```json
{
  "regulationId": "uuid",
  "fromVersion": "1.2.2",
  "toVersion": "1.2.3",
  "changes": [
    {
      "type": "addition",
      "sectionNumber": "2.3",
      "content": {
        "previous": null,
        "current": "New section content..."
      }
    },
    {
      "type": "modification",
      "sectionNumber": "1.1",
      "content": {
        "previous": "Original content...",
        "current": "Modified content..."
      }
    }
  ],
  "changeSummary": "Human-readable summary of changes",
  "changeType": "minor",
  "diffFormat": "unified"
}
```

### Validation

#### POST /validate

Submit a regulation for validation.

**Request:**

```json
{
  "regulationId": "uuid",
  "regulationVersion": "1.2.3",
  "regulationContent": {
    "text": "Full text of regulation as implemented in frontend",
    "metadata": {
      "source": "Citation source",
      "effectiveDate": "2023-01-01",
      "jurisdiction": "Federal",
      "category": "Academic Standards",
      "tags": ["tag1", "tag2"]
    }
  },
  "validationLevel": 1,
  "options": {
    "requireCertainty": 4,
    "includeEvidence": true,
    "checkVersionChanges": true
  }
}
```

**Response:**

```json
{
  "requestId": "uuid-request-identifier",
  "timestamp": "2023-04-02T20:31:00Z",
  "status": "success",
  "data": {
    "regulationId": "uuid",
    "regulationVersion": "1.2.3",
    "authorityVersion": "1.3.0",
    "validationResult": {
      "isValid": true,
      "certaintyLevel": 5,
      "validationTimestamp": "2023-04-02T20:31:00Z",
      "validationLevel": 1,
      "evidence": {
        "textMatch": 98.7,
        "checksum": "sha256-hash-value",
        "matchedSections": [
          {
            "clientSection": "Section 1.a",
            "authoritySection": "Section 1.a",
            "matchLevel": 100
          }
        ]
      }
    },
    "versionStatus": {
      "hasChanges": true,
      "changesUrl": "/api/regulations/uuid/diff?from=1.2.3&to=1.3.0",
      "changeDescription": "Human-readable description of changes",
      "changeSeverity": "minor",
      "effectiveDate": "2023-05-01"
    },
    "attestationCertificate": {
      "certificateId": "cert-identifier",
      "issuedAt": "2023-04-02T20:31:00Z",
      "expiresAt": "2023-07-02T20:31:00Z",
      "validatedBy": "validator-identifier",
      "certificateUrl": "/api/certificates/cert-identifier"
    }
  }
}
```

#### POST /validate/batch

Submit multiple regulations for validation in a single request.

**Request:**

```json
{
  "regulations": [
    {
      "regulationId": "uuid-1",
      "regulationVersion": "1.2.3",
      "regulationContent": { /* regulation content */ },
      "validationLevel": 1
    },
    {
      "regulationId": "uuid-2",
      "regulationVersion": "1.0.1",
      "regulationContent": { /* regulation content */ },
      "validationLevel": 1
    }
  ],
  "options": {
    "requireCertainty": 4,
    "includeEvidence": true,
    "checkVersionChanges": true
  }
}
```

**Response:**

```json
{
  "requestId": "uuid-request-identifier",
  "timestamp": "2023-04-02T20:31:00Z",
  "status": "success",
  "data": [
    {
      "regulationId": "uuid-1",
      /* validation result for first regulation */
    },
    {
      "regulationId": "uuid-2",
      /* validation result for second regulation */
    }
  ]
}
```

### Version Management

#### GET /versions/{regulationId}/check

Check for updates to a regulation.

**Query Parameters:**

- `currentVersion`: Current version in the frontend (required)
- `lastCheckedTimestamp`: Last time updates were checked (ISO 8601 format)

**Response:**

```json
{
  "regulationId": "uuid",
  "clientVersion": "1.2.3",
  "authorityVersion": "1.3.0",
  "hasChanges": true,
  "changeTimestamp": "2023-03-15T09:45:00Z",
  "changes": [
    {
      "type": "addition",
      "section": "Section 2.c",
      "description": "Added new compliance requirement",
      "severity": "major"
    },
    {
      "type": "modification",
      "section": "Section 5.a",
      "description": "Changed reporting deadline",
      "severity": "minor"
    }
  ],
  "diffUrl": "/api/regulations/uuid/diff?from=1.2.3&to=1.3.0",
  "effectiveDate": "2023-05-01",
  "acceptanceRequired": true,
  "acceptanceDeadline": "2023-04-30T23:59:59Z"
}
```

#### POST /versions/{regulationId}/accept

Record acceptance of a regulation version update.

**Request:**

```json
{
  "currentVersion": "1.2.3",
  "acceptedVersion": "1.3.0",
  "acceptedBy": "user-uuid",
  "comments": "Optional user comments on acceptance"
}
```

**Response:**

```json
{
  "success": true,
  "acceptanceId": "uuid",
  "regulationId": "uuid",
  "fromVersion": "1.2.3",
  "toVersion": "1.3.0",
  "acceptedBy": "user-uuid",
  "acceptedAt": "2023-04-02T15:30:00Z"
}
```

### Certificates

#### GET /certificates/{certificateId}

Get details of an attestation certificate.

**Response:**

```json
{
  "certificateId": "uuid",
  "validationId": "uuid",
  "regulationId": "uuid",
  "regulationVersion": "1.2.3",
  "issuedAt": "2023-04-02T20:31:00Z",
  "expiresAt": "2023-07-02T20:31:00Z",
  "issuer": "EdSteward.ai Validation Authority",
  "cryptographicSignature": "signature-data",
  "revocationStatus": "active",
  "metadata": {
    "validationLevel": 1,
    "certaintyLevel": 5
  }
}
```

#### GET /certificates

List attestation certificates with optional filtering.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `regulationId`: Filter by regulation
- `status`: Filter by status (active, revoked, expired)

**Response:**

```json
{
  "data": [
    {
      "certificateId": "uuid",
      "regulationId": "uuid",
      "regulationVersion": "1.2.3",
      "issuedAt": "2023-04-02T20:31:00Z",
      "expiresAt": "2023-07-02T20:31:00Z",
      "revocationStatus": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

#### POST /certificates/{certificateId}/verify

Verify the authenticity of an attestation certificate.

**Request:**

```json
{
  "certificateId": "uuid",
  "cryptographicSignature": "signature-to-verify"
}
```

**Response:**

```json
{
  "isValid": true,
  "verificationTimestamp": "2023-04-02T21:00:00Z",
  "certificateId": "uuid",
  "certificateStatus": "active",
  "verificationDetails": {
    "signatureValid": true,
    "notExpired": true,
    "notRevoked": true
  }
}
```

### Audit Logs

#### GET /audit-logs

List audit logs with optional filtering.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `entityType`: Filter by entity type (regulation, version, certificate)
- `entityId`: Filter by specific entity
- `eventType`: Filter by event type
- `startDate`: Start date for date range (ISO 8601)
- `endDate`: End date for date range (ISO 8601)
- `userId`: Filter by user who performed action

**Response:**

```json
{
  "data": [
    {
      "auditId": "uuid",
      "eventType": "validation.performed",
      "entityType": "regulation",
      "entityId": "uuid",
      "userId": "user-uuid",
      "action": "validate",
      "timestamp": "2023-04-02T15:30:00Z",
      "summary": "Regulation validated with level 1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 135,
    "pages": 7
  }
}
```

#### GET /audit-logs/{auditId}

Get detailed information about a specific audit log entry.

**Response:**

```json
{
  "auditId": "uuid",
  "eventType": "validation.performed",
  "entityType": "regulation",
  "entityId": "uuid",
  "userId": "user-uuid",
  "clientId": "frontend-id",
  "ipAddress": "192.168.1.1",
  "action": "validate",
  "timestamp": "2023-04-02T15:30:00Z",
  "previousState": {
    /* State before action */
  },
  "newState": {
    /* State after action */
  },
  "metadata": {
    "validationLevel": 1,
    "certaintyLevel": 5,
    "requestId": "original-request-uuid"
  }
}
```

### Webhooks

#### POST /webhooks

Register a webhook endpoint for notifications.

**Request:**

```json
{
  "url": "https://example.com/webhook",
  "secret": "shared-secret-for-signature-verification",
  "events": ["regulation.updated", "validation.performed"],
  "description": "Frontend notification endpoint"
}
```

**Response:**

```json
{
  "webhookId": "uuid",
  "url": "https://example.com/webhook",
  "events": ["regulation.updated", "validation.performed"],
  "description": "Frontend notification endpoint",
  "status": "active",
  "createdAt": "2023-04-02T15:30:00Z"
}
```

#### GET /webhooks

List registered webhooks.

**Response:**

```json
{
  "data": [
    {
      "webhookId": "uuid",
      "url": "https://example.com/webhook",
      "events": ["regulation.updated", "validation.performed"],
      "description": "Frontend notification endpoint",
      "status": "active",
      "lastTriggered": "2023-04-01T10:15:00Z"
    }
  ]
}
```

## Webhook Notifications

When events occur that match a webhook subscription, the system will POST to the registered URL with the following format:

```json
{
  "eventId": "uuid",
  "timestamp": "2023-04-02T15:30:00Z",
  "eventType": "regulation.updated",
  "signature": "HMAC-SHA256-signature",
  "data": {
    /* Event-specific payload */
  }
}
```

The signature is generated using HMAC-SHA256 with the registered webhook secret.

### Webhook Event Types

| Event Type | Description | Payload |
|------------|-------------|---------|
| regulation.created | New regulation created | Regulation details |
| regulation.updated | Regulation updated | Regulation details, version info |
| version.created | New regulation version created | Version details |
| validation.performed | Validation operation completed | Validation result |
| certificate.issued | New attestation certificate issued | Certificate details |
| certificate.revoked | Certificate revoked | Certificate details, revocation reason |
| version.accepted | Version change accepted | Acceptance details |

## CORS Configuration

The API supports CORS for specified origins. For the Replit frontend, the following headers are included in responses:

```
Access-Control-Allow-Origin: https://edsteward-frontend.replit.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

## Pagination

List endpoints support pagination via the `page` and `limit` query parameters. Responses include a pagination object with the following fields:

- `page`: Current page number
- `limit`: Items per page
- `total`: Total number of items
- `pages`: Total number of pages

## Request IDs

All API requests are assigned a unique request ID returned in the response headers:

```
X-Request-ID: uuid-request-identifier
```

This ID should be used for tracking and troubleshooting.

## Caching

Certain endpoints support caching:

- GET /regulations - Cache for 5 minutes
- GET /regulations/{regulationId} - Cache for 5 minutes
- GET /regulations/{regulationId}/versions/{versionNumber} - Cache for 1 hour

Cache control headers are included in responses:

```
Cache-Control: max-age=300
ETag: "etag-identifier"
```

## Client Libraries

EdSteward.ai provides client libraries for easy integration:

- JavaScript/TypeScript: `@edsteward/api-client`
- Python: `edsteward-api-client`

## API Status

The API status can be checked at:

```
GET /status
```

**Response:**

```json
{
  "status": "operational",
  "version": "1.0.0",
  "timestamp": "2023-04-02T20:31:00Z",
  "components": {
    "api": "operational",
    "database": "operational",
    "validation": "operational"
  }
}
```
