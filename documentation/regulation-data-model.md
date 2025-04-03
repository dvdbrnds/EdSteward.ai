# Regulation Data Model

## 1. Overview

This document defines the data model for storing and managing regulations within the Compliance Tracker MCP system. The model is designed to support versioning, multi-tenancy, audit logging, and the generation of attestation certificates.

## 2. Core Entities

### 2.1 Tenant

```
Table: tenants
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Institution name |
| code | String | Unique institution code |
| created_at | Timestamp | Creation timestamp |
| updated_at | Timestamp | Last update timestamp |
| status | Enum | ACTIVE, INACTIVE, SUSPENDED |
| domain | String | Custom domain for white-labeling |
| settings | JSONB | Tenant-specific settings |
| parent_tenant_id | UUID | For organizational hierarchies (optional) |
| meta_data | JSONB | Additional tenant metadata |

### 2.2 Regulation Category

```
Table: regulation_categories
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| name | String | Category name |
| description | String | Category description |
| parent_id | UUID | Parent category (optional) |
| validation_level | Integer | Default validation level (1-3) |
| created_at | Timestamp | Creation timestamp |
| updated_at | Timestamp | Last update timestamp |
| is_system | Boolean | Whether this is a system-defined category |

### 2.3 Regulation

```
Table: regulations
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| category_id | UUID | Foreign key to regulation_categories |
| code | String | Unique regulation identifier |
| title | String | Regulation title |
| description | Text | Regulation description |
| source_url | String | Link to original regulation source |
| source_authority | String | Issuing authority |
| applicable_from | Date | Start date of applicability |
| applicable_until | Date | End date of applicability (optional) |
| criticality | Enum | HIGH, MEDIUM, LOW |
| validation_level | Integer | Required validation level (1-3) |
| review_frequency | Interval | Required review frequency |
| last_review_date | Timestamp | Last review timestamp |
| next_review_date | Timestamp | Next scheduled review |
| metadata | JSONB | Additional regulation metadata |
| tags | String[] | Searchable tags |
| is_active | Boolean | Whether regulation is currently active |
| created_at | Timestamp | Creation timestamp |
| updated_at | Timestamp | Last update timestamp |
| created_by | UUID | User who created the regulation |
| updated_by | UUID | User who last updated the regulation |
| external_system_refs | JSONB | References to external systems |
| self_compliance_relevance | JSONB | Relevance for system self-compliance |

### 2.4 Regulation Version

```
Table: regulation_versions
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| regulation_id | UUID | Foreign key to regulations table |
| tenant_id | UUID | Foreign key to tenants table |
| version | String | Semantic version (MAJOR.MINOR.PATCH) |
| content | Text | Full regulation text content |
| structured_content | JSONB | Structured regulation data |
| change_summary | Text | Human-readable change description |
| change_type | Enum | MAJOR, MINOR, PATCH, EDITORIAL |
| diff_from_previous | JSONB | Detailed diff from previous version |
| published_at | Timestamp | Official publication timestamp |
| effective_from | Date | When version becomes effective |
| effective_until | Date | When version expires (optional) |
| status | Enum | DRAFT, PUBLISHED, SUPERSEDED, DEPRECATED |
| is_current | Boolean | Whether this is the current version |
| is_baseline | Boolean | Whether this is an immutable baseline |
| created_at | Timestamp | Creation timestamp |
| updated_at | Timestamp | Last update timestamp |
| created_by | UUID | User who created the version |
| updated_by | UUID | User who last updated the version |
| hash | String | Content hash for integrity verification |
| validation_artifacts | JSONB | Supporting validation artifacts |

### 2.5 Regulation Acceptance

```
Table: regulation_acceptances
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| regulation_version_id | UUID | Foreign key to regulation_versions |
| tenant_id | UUID | Foreign key to tenants table |
| accepted_at | Timestamp | Acceptance timestamp |
| accepted_by | UUID | User who accepted the version |
| acceptance_notes | Text | Notes regarding the acceptance |
| frontend_version | String | Frontend version that accepted |
| acceptor_role | String | Role of the accepting user |
| is_overridden | Boolean | Whether acceptance was overridden |
| override_reason | Text | Reason for override (if applicable) |
| created_at | Timestamp | Creation timestamp |
| metadata | JSONB | Additional acceptance metadata |

### 2.6 Validation Result

```
Table: validation_results
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| regulation_version_id | UUID | Foreign key to regulation_versions |
| tenant_id | UUID | Foreign key to tenants table |
| request_id | UUID | Original validation request ID |
| validation_level | Integer | Applied validation level (1-3) |
| status | Enum | VALID, INVALID, PARTIAL, ERROR |
| certainty_level | Integer | Confidence level (1-5) |
| valid_sections | JSONB | Sections that passed validation |
| invalid_sections | JSONB | Sections that failed validation |
| warnings | JSONB | Non-critical validation concerns |
| suggestions | JSONB | Improvement suggestions |
| validation_timestamp | Timestamp | When validation occurred |
| validator_id | String | Identifier for validator component |
| execution_time_ms | Integer | Processing time in milliseconds |
| attestation_id | UUID | Related attestation (if generated) |
| created_at | Timestamp | Creation timestamp |
| metadata | JSONB | Additional validation metadata |
| analytics_data | JSONB | Data collected for future analysis |

### 2.7 Attestation Certificate

```
Table: attestation_certificates
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| validation_result_id | UUID | Foreign key to validation_results |
| tenant_id | UUID | Foreign key to tenants table |
| certificate_content | Text | Full certificate content |
| signature | Text | Cryptographic signature |
| issued_at | Timestamp | Issuance timestamp |
| valid_until | Timestamp | Expiration timestamp |
| status | Enum | ACTIVE, REVOKED, EXPIRED |
| revocation_reason | Text | Reason if revoked |
| revocation_timestamp | Timestamp | When revoked (if applicable) |
| issuer | String | Certificate issuing authority |
| fingerprint | String | Certificate fingerprint |
| created_at | Timestamp | Creation timestamp |
| metadata | JSONB | Additional certificate metadata |

### 2.8 Audit Log

```
Table: audit_logs
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| event_type | String | Type of audit event |
| event_category | String | Category of event |
| entity_type | String | Type of entity being audited |
| entity_id | UUID | ID of entity being audited |
| user_id | UUID | User who triggered the event |
| client_ip | String | IP address of client |
| user_agent | String | User agent information |
| event_timestamp | Timestamp | When the event occurred |
| event_details | JSONB | Detailed event information |
| created_at | Timestamp | Creation timestamp |
| system_metadata | JSONB | Additional system metadata |
| is_self_compliance | Boolean | Whether related to system compliance |

### 2.9 Self-Compliance Record

```
Table: self_compliance_records
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants table |
| regulation_id | UUID | Foreign key to regulations table |
| status | Enum | COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT |
| assessment_date | Timestamp | When assessment occurred |
| assessed_by | String | Component that performed assessment |
| compliance_details | JSONB | Detailed compliance information |
| remediation_plan | JSONB | Plan to address non-compliance |
| remediation_deadline | Timestamp | Deadline for remediation |
| reassessment_date | Timestamp | Scheduled reassessment date |
| created_at | Timestamp | Creation timestamp |
| updated_at | Timestamp | Last update timestamp |

## 3. Database Schema Design

### 3.1 Schema Overview

The data model is separated into at least two schemas:

1. **operational_schema** - Contains runtime operational data including validation results and audit logs
2. **regulatory_schema** - Contains the regulation definitions, versions, and attestations

### 3.2 Multi-Tenant Design

The system uses a discriminator column approach for multi-tenancy:

- All tables contain a `tenant_id` column
- Database roles and row-level security policies enforce tenant isolation
- Shared tables use tenant discriminator for filtering
- Indexes are created on tenant_id + other commonly filtered fields

### 3.3 Schema Evolution

- All schema changes are versioned and tracked
- Migration scripts maintain backward compatibility
- Schema versioning follows semantic versioning

## 4. Data Lifecycle Management

### 4.1 Regulation Versioning

1. Regulations maintain a full version history
2. New versions are created rather than updating existing records
3. Version comparisons generate human-readable diffs
4. Current version flag indicates active version

### 4.2 Audit Records Retention

1. Audit logs are retained according to configurable policy
2. Immutable storage using QLDB or similar technology
3. High-value audit events archived for extended periods

### 4.3 Data Archival

1. Older regulation versions archived to cold storage
2. Archived data remains accessible for compliance purposes
3. Archive and retrieval processes maintain data integrity

## 5. Data Access Patterns

### 5.1 Common Queries

1. Retrieve current regulation version by code
2. Fetch regulation history with version differences
3. Search regulations by criteria
4. Retrieve validation results by regulation

### 5.2 Performance Considerations

1. Indexing strategy for multi-tenant queries
2. Materialized views for common reporting queries
3. Partitioning for audit logs and validation results
4. Caching strategy for frequently accessed regulations

## 6. Data Collection for Analysis

### 6.1 Analytics Schema

A separate analytics schema will store anonymized data for future analysis:

```
Table: compliance_patterns
```

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| regulation_category | String | Anonymized category |
| validation_pattern | JSONB | Pattern of validation results |
| occurrence_count | Integer | Number of occurrences |
| first_observed | Timestamp | First observation timestamp |
| last_observed | Timestamp | Last observation timestamp |
| institution_type | String | Anonymized institution type |
| metadata | JSONB | Additional anonymized metadata |

### 6.2 Data Privacy

1. All collected data is anonymized at collection time
2. Tenant-identifying information is removed
3. Aggregate statistics replace individual records
4. Data collection is governed by configurable policies

## 7. Access Control

### 7.1 Role-Based Access Control

1. System defines roles with specific data access permissions
2. Row-level security enforces tenant isolation
3. Column-level security protects sensitive fields
4. Function-based access control for data operations

### 7.2 Data Encryption

1. Encryption at rest for all regulatory data
2. Encryption in transit for all API communications
3. Field-level encryption for sensitive attributes
4. Key management aligned with security best practices