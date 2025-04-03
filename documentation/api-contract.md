# API Contract

## 1. Overview

This document defines the RESTful API contract for the Compliance Tracker MCP system. The API provides endpoints for managing regulations, performing validations, tracking versions, and integrating with frontend systems including the existing Replit frontend.

## 2. API Versioning

- All API endpoints are prefixed with `/api/v1/`
- API versions follow semantic versioning principles
- New versions are introduced for breaking changes
- Multiple versions may be supported simultaneously during transition periods

## 3. Authentication & Authorization

### 3.1 Authentication Methods

The API supports the following authentication methods:

- **Cognito JWT Tokens** - Primary authentication method
- **API Keys** - For service-to-service communication
- **Client Certificates** - For sensitive operations (optional)

### 3.2 Authorization Model

- Role-based access control (RBAC) with fine-grained permissions
- Tenant isolation ensures data separation
- Scoped access tokens for limiting API access

### 3.3 Authentication Endpoints

#### Get Token

```
POST /api/v1/auth/token
```

Request:
```json
{
  "username": "string",
  "password": "string",
  "tenant": "string"
}
```

Response:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Refresh Token

```
POST /api/v1/auth/refresh
```

Request:
```json
{
  "refresh_token": "string"
}
```

Response:
```json
{
  "access_token": "string",
  "expires_in": 3600
}
```

## 4. Common Patterns

### 4.1 Request/Response Format

All API requests and responses use JSON format with UTF-8 encoding.

### 4.2 Pagination

Paginated endpoints follow this pattern:

Request:
```
GET /api/v1/resources?page=0&size=20&sort=field,direction
```

Response:
```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5,
  "first": true,
  "last": false,
  "sort": [
    {
      "property": "field",
      "direction": "ASC|DESC"
    }
  ]
}
```

### 4.3 Error Handling

All errors follow a consistent format:

```json
{
  "status": 400,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field error"
  },
  "timestamp": "ISO-timestamp",
  "path": "/api/v1/path/to/resource",
  "traceId": "string"
}
```

## 5. Core Endpoints

### 5.1 Regulation Management

#### List Regulations

```
GET /api/v1/regulations
```

Parameters:
- `category` - Filter by category
- `status` - Filter by status
- `q` - Search text
- Standard pagination parameters

Response:
```json
{
  "content": [
    {
      "id": "uuid",
      "code": "string",
      "title": "string",
      "description": "string",
      "category": {
        "id": "uuid",
        "name": "string"
      },
      "validationLevel": 1-3,
      "currentVersion": "string",
      "lastUpdated": "ISO-timestamp",
      "status": "string"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

#### Get Regulation

```
GET /api/v1/regulations/{id}
```

Response:
```json
{
  "id": "uuid",
  "code": "string",
  "title": "string",
  "description": "string",
  "sourceUrl": "string",
  "sourceAuthority": "string",
  "applicableFrom": "ISO-date",
  "applicableUntil": "ISO-date",
  "category": {
    "id": "uuid",
    "name": "string"
  },
  "validationLevel": 1-3,
  "currentVersion": "string",
  "versions": [
    {
      "version": "string",
      "publishedAt": "ISO-timestamp",
      "status": "string"
    }
  ],
  "metadata": {},
  "tags": [],
  "isActive": true,
  "createdAt": "ISO-timestamp",
  "updatedAt": "ISO-timestamp"
}
```

#### Create Regulation

```
POST /api/v1/regulations
```

Request:
```json
{
  "code": "string",
  "title": "string",
  "description": "string",
  "sourceUrl": "string",
  "sourceAuthority": "string",
  "applicableFrom": "ISO-date",
  "applicableUntil": "ISO-date",
  "categoryId": "uuid",
  "validationLevel": 1-3,
  "content": "string",
  "structuredContent": {},
  "metadata": {},
  "tags": []
}
```

Response:
```json
{
  "id": "uuid",
  "code": "string",
  "version": "1.0.0",
  "message": "Regulation created successfully"
}
```

#### Update Regulation

```
PUT /api/v1/regulations/{id}
```

Request: Similar to create with additional version information.

Response:
```json
{
  "id": "uuid",
  "code": "string",
  "version": "string",
  "message": "Regulation updated successfully"
}
```

### 5.2 Regulation Versions

#### List Regulation Versions

```
GET /api/v1/regulations/{id}/versions
```

Response:
```json
{
  "content": [
    {
      "id": "uuid",
      "version": "string",
      "changeSummary": "string",
      "changeType": "MAJOR|MINOR|PATCH|EDITORIAL",
      "publishedAt": "ISO-timestamp",
      "effectiveFrom": "ISO-date",
      "effectiveUntil": "ISO-date",
      "status": "DRAFT|PUBLISHED|SUPERSEDED|DEPRECATED",
      "isCurrent": true
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

#### Get Regulation Version

```
GET /api/v1/regulations/{id}/versions/{version}
```

Response:
```json
{
  "id": "uuid",
  "version": "string",
  "content": "string",
  "structuredContent": {},
  "changeSummary": "string",
  "changeType": "MAJOR|MINOR|PATCH|EDITORIAL",
  "diffFromPrevious": {},
  "publishedAt": "ISO-timestamp",
  "effectiveFrom": "ISO-date",
  "effectiveUntil": "ISO-date",
  "status": "DRAFT|PUBLISHED|SUPERSEDED|DEPRECATED",
  "isCurrent": true,
  "hash": "string",
  "validationArtifacts": {}
}
```

#### Compare Regulation Versions

```
GET /api/v1/regulations/{id}/versions/compare?from={version1}&to={version2}
```

Response:
```json
{
  "fromVersion": "string",
  "toVersion": "string",
  "changeType": "MAJOR|MINOR|PATCH|EDITORIAL",
  "changeSummary": "string",
  "differences": [
    {
      "type": "ADDITION|DELETION|MODIFICATION",
      "path": "string",
      "oldValue": "string",
      "newValue": "string"
    }
  ]
}
```

### 5.3 Validation

#### Validate Content

```
POST /api/v1/validate
```

Request:
```json
{
  "regulationId": "uuid",
  "regulationVersion": "string",
  "validationLevel": 1-3,
  "content": {
    "text": "string",
    "metadata": {}
  },
  "options": {
    "strictMode": true,
    "includeDetails": true
  }
}
```

Response:
```json
{
  "requestId": "uuid",
  "regulationId": "uuid",
  "regulationVersion": "string",
  "timestamp": "ISO-timestamp",
  "status": "VALID|INVALID|PARTIAL|ERROR",
  "certaintyLevel": 1-5,
  "details": {
    "validatedSections": [],
    "invalidSections": [],
    "warnings": [],
    "suggestions": []
  },
  "attestation": {
    "certificateId": "uuid",
    "validUntil": "ISO-timestamp"
  }
}
```

#### Get Validation Result

```
GET /api/v1/validations/{id}
```

Response: Detailed validation result object

### 5.4 Attestation Certificates

#### Get Attestation Certificate

```
GET /api/v1/attestations/{id}
```

Response:
```json
{
  "id": "uuid",
  "validationResultId": "uuid",
  "certificateContent": "string",
  "issuedAt": "ISO-timestamp",
  "validUntil": "ISO-timestamp",
  "status": "ACTIVE|REVOKED|EXPIRED",
  "issuer": "string",
  "regulationInfo": {
    "id": "uuid",
    "code": "string",
    "title": "string",
    "version": "string"
  }
}
```

#### Verify Attestation Certificate

```
POST /api/v1/attestations/{id}/verify
```

Response:
```json
{
  "id": "uuid",
  "isValid": true,
  "verificationTimestamp": "ISO-timestamp",
  "validationDetails": {}
}
```

## 6. Multi-Tenant Management

### 6.1 Tenant Management

#### List Tenants (Admin only)

```
GET /api/v1/tenants
```

#### Get Tenant (Admin only)

```
GET /api/v1/tenants/{id}
```

#### Create Tenant (Admin only)

```
POST /api/v1/tenants
```

Request:
```json
{
  "name": "string",
  "code": "string",
  "domain": "string",
  "settings": {},
  "metadata": {}
}
```

#### Update Tenant (Admin only)

```
PUT /api/v1/tenants/{id}
```

### 6.2 Tenant Configuration

#### Get Tenant Configuration

```
GET /api/v1/config
```

Response: Tenant-specific configuration

#### Update Tenant Configuration

```
PUT /api/v1/config
```

Request: Tenant configuration object

## 7. Self-Compliance Endpoints

### 7.1 Self-Compliance Status

#### Get System Compliance Status

```
GET /api/v1/self-compliance/status
```

Response:
```json
{
  "overallStatus": "COMPLIANT|PARTIALLY_COMPLIANT|NON_COMPLIANT",
  "lastAssessmentDate": "ISO-timestamp",
  "complianceByCategory": [
    {
      "category": "string",
      "status": "COMPLIANT|PARTIALLY_COMPLIANT|NON_COMPLIANT",
      "regulationCount": 10,
      "compliantCount": 8
    }
  ]
}
```

#### Get System Compliance Details

```
GET /api/v1/self-compliance/regulations
```

Response: List of self-compliance regulation statuses

### 7.2 External Validation

#### Initiate External Validation

```
POST /api/v1/external-validation
```

Request:
```json
{
  "validationType": "SOC2|HIPAA|GDPR|OTHER",
  "validationRequestor": "string",
  "validationParameters": {}
}
```

Response: Validation initialization information

## 8. Analytics and Reporting

### 8.1 Compliance Analytics

#### Get Compliance Statistics

```
GET /api/v1/analytics/compliance
```

Parameters:
- `period` - Time period for analysis
- `category` - Filter by category

Response: Compliance statistics

### 8.2 Audit Log Access

#### Query Audit Logs

```
GET /api/v1/audit-logs
```

Parameters:
- `eventType` - Filter by event type
- `entityType` - Filter by entity type
- `from` - Start date (ISO format)
- `to` - End date (ISO format)
- `userId` - Filter by user ID
- Standard pagination parameters

Response:
```json
{
  "content": [
    {
      "id": "uuid",
      "eventType": "string",
      "eventCategory": "string",
      "entityType": "string",
      "entityId": "uuid",
      "userId": "uuid",
      "eventTimestamp": "ISO-timestamp",
      "summary": "string",
      "eventDetails": {}
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

### 8.3 Reporting

#### Generate Compliance Report

```
POST /api/v1/reports/compliance
```

Request:
```json
{
  "reportType": "SUMMARY|DETAILED|ATTESTATION",
  "periodStart": "ISO-date",
  "periodEnd": "ISO-date",
  "categories": ["string"],
  "format": "PDF|EXCEL|JSON"
}
```

Response:
```json
{
  "reportId": "uuid",
  "status": "GENERATING|READY|FAILED",
  "downloadUrl": "string"
}
```

#### Get Report Status

```
GET /api/v1/reports/{id}
```

Response: Report status information

## 9. LVAIC Beta Testing Endpoints

### 9.1 Cross-Institutional Analytics

#### Get Anonymized Compliance Patterns

```
GET /api/v1/analytics/patterns
```

Parameters:
- `category` - Filter by regulation category
- `period` - Time period for analysis

Response:
```json
{
  "patterns": [
    {
      "pattern": "string",
      "occurrenceCount": 25,
      "institutionTypeDistribution": {},
      "regulationCategories": {},
      "validationLevels": {}
    }
  ]
}
```

### 9.2 Beta Feedback Management

#### Submit Beta Feedback

```
POST /api/v1/beta/feedback
```

Request:
```json
{
  "feedbackType": "BUG|FEATURE_REQUEST|GENERAL",
  "title": "string",
  "description": "string",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "module": "string",
  "screenshots": ["base64 encoded"],
  "metadata": {}
}
```

Response: Feedback submission confirmation

#### List Beta Feedback

```
GET /api/v1/beta/feedback
```

Response: List of feedback items with status

## 10. Frontend Integration Endpoints

### 10.1 Version Control Notification

#### Get Pending Regulation Updates

```
GET /api/v1/updates/pending
```

Response:
```json
{
  "pendingUpdates": [
    {
      "regulationId": "uuid",
      "regulationCode": "string",
      "regulationTitle": "string",
      "currentVersion": "string",
      "newVersion": "string",
      "changeType": "MAJOR|MINOR|PATCH|EDITORIAL",
      "changeSummary": "string",
      "publishedAt": "ISO-timestamp"
    }
  ],
  "pendingCount": 5
}
```

#### Accept Regulation Update

```
POST /api/v1/updates/accept
```

Request:
```json
{
  "regulationId": "uuid",
  "version": "string",
  "acceptanceNotes": "string"
}
```

Response: Acceptance confirmation

### 10.2 Frontend Configuration

#### Get Frontend Configuration

```
GET /api/v1/frontend/config
```

Response:
```json
{
  "apiEndpoints": {},
  "validationLevels": {},
  "categoryConfigurations": {},
  "uiCustomizations": {},
  "featureFlags": {}
}
```

## 11. Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_FAILED` | Authentication credentials invalid |
| `AUTHORIZATION_FAILED` | Not authorized to perform operation |
| `VALIDATION_FAILED` | Input validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `VERSION_CONFLICT` | Resource version conflict |
| `TENANT_NOT_FOUND` | Tenant not found |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `INVALID_REGULATION` | Regulation validation failed |
| `ATTESTATION_EXPIRED` | Attestation certificate expired |

## 12. Webhook Integration

### 12.1 Webhook Registration

#### Register Webhook

```
POST /api/v1/webhooks
```

Request:
```json
{
  "url": "string",
  "events": ["REGULATION_UPDATED", "VALIDATION_COMPLETED"],
  "description": "string",
  "secret": "string",
  "isActive": true
}
```

Response: Webhook registration confirmation

### 12.2 Webhook Events

| Event | Description |
|-------|-------------|
| `REGULATION_CREATED` | New regulation created |
| `REGULATION_UPDATED` | Regulation updated |
| `VALIDATION_COMPLETED` | Validation process completed |
| `ATTESTATION_ISSUED` | New attestation certificate issued |
| `ATTESTATION_REVOKED` | Attestation certificate revoked |
| `COMPLIANCE_STATUS_CHANGED` | Compliance status changed |

## 13. Rate Limiting

- Default rate limits are enforced on all API endpoints
- Rate limits vary by endpoint sensitivity and resource requirements
- Rate limit information is included in response headers
- Rate limit exceeded errors return status code 429

## 14. API Documentation Access

Interactive API documentation is available at `/docs` when running in development mode.