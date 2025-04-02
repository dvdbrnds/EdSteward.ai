# Regulation Data Model

## Overview

The regulation data model defines the structure for storing and managing regulatory data within the EdSteward.ai platform. The model supports comprehensive versioning, change tracking, and auditing of all regulatory content.

## Core Entities

### 1. Regulation

The primary entity representing a distinct regulation.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| regulation_id | UUID | Unique identifier for the regulation |
| title | String | Official title of the regulation |
| citation | String | Official citation format |
| jurisdiction | String | Geographic/administrative scope (Federal, State, Local) |
| authority | String | Issuing authority or agency |
| category | String | Topical categorization |
| effective_date | Date | When the regulation came into effect |
| is_active | Boolean | Whether the regulation is currently in force |
| tags | Array[String] | Searchable keywords |
| created_at | Timestamp | When the record was created |
| updated_at | Timestamp | When the record was last updated |
| created_by | UUID | User who created the record |
| metadata | JSON | Additional regulation-specific metadata |

#### SQL Definition

```sql
CREATE TABLE regulations (
    regulation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    citation VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    authority VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_regulations_category ON regulations(category);
CREATE INDEX idx_regulations_jurisdiction ON regulations(jurisdiction);
CREATE INDEX idx_regulations_tags ON regulations USING GIN(tags);
CREATE INDEX idx_regulations_metadata ON regulations USING GIN(metadata);
```

### 2. Regulation Version

Represents a specific version of a regulation, tracking changes over time.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| version_id | UUID | Unique identifier for the version |
| regulation_id | UUID | Reference to the parent regulation |
| version_number | String | Semantic version number (MAJOR.MINOR.PATCH) |
| content | Text | Full text content of the regulation version |
| content_format | String | Format of the content (e.g., markdown, html, plain) |
| content_hash | String | Cryptographic hash of the content for verification |
| change_summary | Text | Human-readable summary of changes from previous version |
| change_type | String | Type of change (major, minor, patch) |
| effective_date | Date | When this version became effective |
| superseded_date | Date | When this version was superseded (null if current) |
| is_current | Boolean | Whether this is the current version |
| published_by | UUID | User who published this version |
| published_at | Timestamp | When this version was published |
| approval_status | String | Workflow status (draft, approved, published) |
| approved_by | UUID | User who approved this version |
| approved_at | Timestamp | When this version was approved |
| source_url | String | Link to authoritative source document |
| change_rationale | Text | Reason for the changes in this version |

#### SQL Definition

```sql
CREATE TABLE regulation_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(regulation_id),
    version_number VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    content_format VARCHAR(50) DEFAULT 'markdown',
    content_hash VARCHAR(128) NOT NULL,
    change_summary TEXT,
    change_type VARCHAR(20) CHECK (change_type IN ('major', 'minor', 'patch')),
    effective_date DATE NOT NULL,
    superseded_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    published_by UUID REFERENCES users(user_id),
    published_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'published', 'rejected')),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    source_url VARCHAR(512),
    change_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_regulation_versions_regulation_version ON regulation_versions(regulation_id, version_number);
CREATE INDEX idx_regulation_versions_is_current ON regulation_versions(regulation_id, is_current);
CREATE INDEX idx_regulation_versions_approval_status ON regulation_versions(approval_status);
```

### 3. Regulation Structure

Represents the structured components of a regulation for more precise validation.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| structure_id | UUID | Unique identifier for the structure element |
| version_id | UUID | Reference to the regulation version |
| section_type | String | Type of section (chapter, article, paragraph, etc.) |
| section_number | String | Hierarchical identifier (e.g., "1.2.3") |
| parent_id | UUID | Reference to parent structure (for hierarchical organization) |
| title | String | Section title or heading |
| content | Text | Content of this specific section |
| content_hash | String | Hash of the section content |
| sequence | Integer | Order within parent section |
| metadata | JSON | Additional section-specific metadata |

#### SQL Definition

```sql
CREATE TABLE regulation_structures (
    structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES regulation_versions(version_id),
    section_type VARCHAR(50) NOT NULL,
    section_number VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES regulation_structures(structure_id),
    title VARCHAR(512),
    content TEXT NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    sequence INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regulation_structures_version ON regulation_structures(version_id);
CREATE INDEX idx_regulation_structures_parent ON regulation_structures(parent_id);
CREATE INDEX idx_regulation_structures_section_number ON regulation_structures(version_id, section_number);
```

### 4. Validation Results

Stores the results of validation operations performed by the MCP system.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| validation_id | UUID | Unique identifier for the validation result |
| regulation_id | UUID | Reference to the validated regulation |
| frontend_version | String | Version as presented by the frontend |
| authority_version | String | Authoritative version from the backend |
| validation_level | Integer | Level of validation performed (1-3) |
| is_valid | Boolean | Whether validation passed |
| certainty_level | Integer | Confidence level of the validation (1-5) |
| evidence | JSON | Supporting evidence for the validation result |
| validator_id | UUID | Reference to the MCP that performed validation |
| validation_timestamp | Timestamp | When validation was performed |
| request_id | UUID | Reference to the original validation request |
| client_id | String | Identifier of the requesting client |
| certificate_id | UUID | Reference to attestation certificate (if generated) |
| notes | Text | Additional validation notes |

#### SQL Definition

```sql
CREATE TABLE validation_results (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(regulation_id),
    frontend_version VARCHAR(20) NOT NULL,
    authority_version VARCHAR(20) NOT NULL,
    validation_level INTEGER NOT NULL CHECK (validation_level BETWEEN 1 AND 3),
    is_valid BOOLEAN NOT NULL,
    certainty_level INTEGER NOT NULL CHECK (certainty_level BETWEEN 1 AND 5),
    evidence JSONB NOT NULL DEFAULT '{}',
    validator_id UUID NOT NULL,
    validation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_id UUID NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    certificate_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_validation_results_regulation ON validation_results(regulation_id);
CREATE INDEX idx_validation_results_request ON validation_results(request_id);
CREATE INDEX idx_validation_results_certificate ON validation_results(certificate_id);
CREATE INDEX idx_validation_results_timestamp ON validation_results(validation_timestamp);
```

### 5. Attestation Certificates

Represents official validation attestations generated by the system.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| certificate_id | UUID | Unique identifier for the certificate |
| validation_id | UUID | Reference to the validation result |
| regulation_id | UUID | Reference to the validated regulation |
| regulation_version | String | Version of the regulation attested |
| issued_at | Timestamp | When the certificate was issued |
| expires_at | Timestamp | When the certificate expires |
| issuer | String | Identifier of the issuing authority |
| cryptographic_signature | Text | Digital signature of certificate contents |
| revocation_status | String | Current status (active, expired, revoked) |
| revocation_reason | Text | Reason for revocation (if applicable) |
| revoked_at | Timestamp | When certificate was revoked (if applicable) |
| revoked_by | UUID | User who revoked the certificate (if applicable) |
| metadata | JSON | Additional certificate-specific metadata |

#### SQL Definition

```sql
CREATE TABLE attestation_certificates (
    certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id UUID NOT NULL REFERENCES validation_results(validation_id),
    regulation_id UUID NOT NULL REFERENCES regulations(regulation_id),
    regulation_version VARCHAR(20) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    cryptographic_signature TEXT NOT NULL,
    revocation_status VARCHAR(20) DEFAULT 'active' CHECK (revocation_status IN ('active', 'expired', 'revoked')),
    revocation_reason TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(user_id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attestation_certificates_validation ON attestation_certificates(validation_id);
CREATE INDEX idx_attestation_certificates_regulation ON attestation_certificates(regulation_id, regulation_version);
CREATE INDEX idx_attestation_certificates_status ON attestation_certificates(revocation_status);
CREATE INDEX idx_attestation_certificates_expiry ON attestation_certificates(expires_at);
```

### 6. Version Acceptance

Tracks frontend acceptance of regulation version changes.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| acceptance_id | UUID | Unique identifier for the acceptance record |
| regulation_id | UUID | Reference to the regulation |
| from_version | String | Previous version number |
| to_version | String | New version number |
| accepted_by | UUID | User who accepted the change |
| accepted_at | Timestamp | When the change was accepted |
| client_id | String | Identifier of the client system |
| acceptance_notes | Text | Notes provided during acceptance |
| acceptance_evidence | JSON | Supporting evidence for acceptance |

#### SQL Definition

```sql
CREATE TABLE version_acceptances (
    acceptance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(regulation_id),
    from_version VARCHAR(20) NOT NULL,
    to_version VARCHAR(20) NOT NULL,
    accepted_by UUID NOT NULL REFERENCES users(user_id),
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    client_id VARCHAR(255) NOT NULL,
    acceptance_notes TEXT,
    acceptance_evidence JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_version_acceptances_regulation ON version_acceptances(regulation_id);
CREATE INDEX idx_version_acceptances_user ON version_acceptances(accepted_by);
CREATE INDEX idx_version_acceptances_versions ON version_acceptances(regulation_id, from_version, to_version);
```

### 7. Audit Logs

Comprehensive tracking of all system activities for compliance and security.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| audit_id | UUID | Unique identifier for the audit record |
| event_type | String | Type of event being logged |
| entity_type | String | Type of entity affected (regulation, version, etc.) |
| entity_id | UUID | Identifier of the affected entity |
| user_id | UUID | User who performed the action |
| client_id | String | Client system identifier |
| ip_address | String | Source IP address |
| action | String | Action performed (create, update, delete, etc.) |
| timestamp | Timestamp | When the event occurred |
| previous_state | JSON | Entity state before the action |
| new_state | JSON | Entity state after the action |
| metadata | JSON | Additional event-specific metadata |

#### SQL Definition

```sql
CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID,
    client_id VARCHAR(255),
    ip_address VARCHAR(45),
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    previous_state JSONB,
    new_state JSONB,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event_action ON audit_logs(event_type, action);
```

## Entity Relationships

The following diagram illustrates the key relationships between entities in the data model:

```
Regulation
    ├── Regulation Version (1-to-many)
    │       ├── Regulation Structure (1-to-many)
    │       └── Validation Result (1-to-many)
    │              └── Attestation Certificate (1-to-1)
    └── Version Acceptance (1-to-many)

All Entities --> Audit Logs (1-to-many)
```

## Versioning Strategy

Regulation versions follow semantic versioning principles:

1. MAJOR version changes: Significant content changes that alter meaning or compliance requirements
2. MINOR version changes: Additions that don't change existing meaning
3. PATCH version changes: Corrections, clarifications, or formatting changes

## Data Security Considerations

1. All sensitive regulation data is encrypted at rest
2. Cryptographic checksums verify content integrity
3. Comprehensive audit logging captures all changes
4. QLDB implementation provides immutable audit trail
5. Digital signatures on attestation certificates
6. Row-level security enforces tenant isolation in multi-tenant deployments
