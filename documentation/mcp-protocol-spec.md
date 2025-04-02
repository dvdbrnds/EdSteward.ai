# Model Context Protocol (MCP) Specification

## Overview

The Model Context Protocol (MCP) defines the standard interface and communication patterns for regulation validation services within the EdSteward.ai platform. This document specifies how validation requests are formatted, processed, and responded to across the system.

## Core Concepts

### 1. Protocol Versioning

The MCP protocol uses semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes that require client updates
- MINOR: Backward-compatible feature additions
- PATCH: Backward-compatible bug fixes

The current protocol version is **1.0.0**.

### 2. Validation Levels

The MCP system supports three levels of validation complexity:

#### Level 1: Static Text Validation
- Simple text comparison with checksums
- Used for regulations that rarely change (e.g., foundational laws)
- Optimized for bulk processing
- High certainty assessments

#### Level 2: Semi-structured Validation
- Pattern matching and contextual validation
- Used for regulations with moderate complexity
- Supports partial matching and fuzzy comparison
- Medium to high certainty assessments

#### Level 3: Complex Validation
- Rule-based analysis with context awareness
- Used for regulations that require interpretation
- May include human review integration
- Variable certainty assessments

### 3. Validation Certainty Framework

Each validation result includes a certainty assessment:

| Level | Description | Certainty Range | Required Evidence |
|-------|-------------|----------------|-------------------|
| 5 | High Certainty | 95-100% | Direct text match or cryptographic verification |
| 4 | Strong Confidence | 85-94% | Pattern match with minimal variation |
| 3 | Moderate Confidence | 70-84% | Semantic equivalence with context awareness |
| 2 | Low Confidence | 50-69% | Partial match requiring human review |
| 1 | Uncertain | <50% | Significant discrepancies detected |

## Request Format

### Validation Request

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:30:00Z",
  "requestType": "validation",
  "clientId": "frontend-identifier",
  "payload": {
    "regulationId": "reg-identifier",
    "regulationVersion": "1.2.3",
    "regulationContent": {
      "text": "Full text of regulation as implemented in frontend",
      "metadata": {
        "source": "Citation source",
        "effectiveDate": "2025-01-01",
        "jurisdiction": "Federal/State/Local",
        "category": "Category identifier",
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
}
```

### Version Check Request

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:30:00Z",
  "requestType": "versionCheck",
  "clientId": "frontend-identifier",
  "payload": {
    "regulationId": "reg-identifier",
    "regulationVersion": "1.2.3",
    "lastCheckedTimestamp": "2025-03-01T12:00:00Z"
  }
}
```

### Acceptance Request

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:30:00Z",
  "requestType": "versionAcceptance",
  "clientId": "frontend-identifier",
  "payload": {
    "regulationId": "reg-identifier",
    "currentVersion": "1.2.3",
    "acceptedVersion": "1.3.0",
    "acceptedBy": "user-identifier",
    "comments": "Optional user comments on acceptance"
  }
}
```

## Response Format

### Validation Response

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:31:00Z",
  "responseType": "validationResult",
  "status": "success",
  "payload": {
    "regulationId": "reg-identifier",
    "regulationVersion": "1.2.3",
    "authorityVersion": "1.3.0",
    "validationResult": {
      "isValid": true,
      "certaintyLevel": 5,
      "validationTimestamp": "2025-04-02T20:31:00Z",
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
      "changesUrl": "/api/regulations/reg-identifier/diff?from=1.2.3&to=1.3.0",
      "changeDescription": "Human-readable description of changes",
      "changeSeverity": "minor",
      "effectiveDate": "2025-05-01"
    },
    "attestationCertificate": {
      "certificateId": "cert-identifier",
      "issuedAt": "2025-04-02T20:31:00Z",
      "expiresAt": "2025-07-02T20:31:00Z",
      "validatedBy": "validator-identifier",
      "certificateUrl": "/api/certificates/cert-identifier",
      "cryptographicSignature": "signature-data"
    }
  }
}
```

### Error Response

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:31:00Z",
  "responseType": "error",
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "payload.regulationContent",
      "reason": "Specific error information",
      "suggestion": "How to fix the error"
    }
  }
}
```

### Version Check Response

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:31:00Z",
  "responseType": "versionCheckResult",
  "status": "success",
  "payload": {
    "regulationId": "reg-identifier",
    "clientVersion": "1.2.3",
    "authorityVersion": "1.3.0",
    "hasChanges": true,
    "changeTimestamp": "2025-03-15T09:45:00Z",
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
    "diffUrl": "/api/regulations/reg-identifier/diff?from=1.2.3&to=1.3.0",
    "effectiveDate": "2025-05-01",
    "acceptanceRequired": true,
    "acceptanceDeadline": "2025-04-30T23:59:59Z"
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| PROTOCOL_VERSION_MISMATCH | Unsupported protocol version | 400 |
| INVALID_PAYLOAD | Malformed request payload | 400 |
| REGULATION_NOT_FOUND | Regulation ID not recognized | 404 |
| VALIDATION_FAILED | Unable to complete validation | 422 |
| UNAUTHORIZED | Authentication/authorization failure | 401 |
| INTERNAL_ERROR | Server-side processing error | 500 |
| RATE_LIMIT_EXCEEDED | Too many requests from client | 429 |

## Protocol Extensions

### Batch Validation

The protocol supports batch validation of multiple regulations in a single request:

```json
{
  "protocolVersion": "1.0.0",
  "requestId": "uuid-request-identifier",
  "timestamp": "2025-04-02T20:30:00Z",
  "requestType": "batchValidation",
  "clientId": "frontend-identifier",
  "payload": {
    "regulations": [
      {
        "regulationId": "reg-identifier-1",
        "regulationVersion": "1.2.3",
        "regulationContent": { /* regulation content */ },
        "validationLevel": 1
      },
      {
        "regulationId": "reg-identifier-2",
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
}
```

### Webhook Notifications

The system can send webhook notifications for validation events:

```json
{
  "protocolVersion": "1.0.0",
  "eventId": "uuid-event-identifier",
  "timestamp": "2025-04-02T20:31:00Z",
  "eventType": "regulationChanged",
  "payload": {
    "regulationId": "reg-identifier",
    "previousVersion": "1.2.3",
    "newVersion": "1.3.0",
    "changeDescription": "Human-readable description of changes",
    "changeSeverity": "minor",
    "effectiveDate": "2025-05-01",
    "acceptanceRequired": true,
    "acceptanceDeadline": "2025-04-30T23:59:59Z"
  }
}
```

## Implementation Guidelines

1. All requests and responses must include the protocol version
2. All timestamps must be in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)
3. Request IDs should be UUIDs used for tracking and correlation
4. Validation services should implement appropriate caching
5. Error responses should provide actionable information
6. Version checking should be implemented for all validations
7. Certainty levels must be calculated and included in responses
8. All validation events must be logged in the audit system
