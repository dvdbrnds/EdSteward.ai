# EdSteward.ai Architecture Diagram

```mermaid
graph TD
    subgraph "Frontend - Replit"
        UI[React UI Components]
        Pages[Page Components]
        Hooks[Custom React Hooks]
        ReactQuery[TanStack React Query]
        Forms[React Hook Form + Zod]
        Routing[Wouter Routing]
        State[Client State Management]
    end

    subgraph "API Layer"
        APIGateway[AWS API Gateway]
        Authorizer[Cognito Authorizer]
        
        subgraph "Authentication"
            Cognito[Amazon Cognito]
            UserPools[User Pools]
            IdentityPools[Identity Pools]
        end
    end

    subgraph "MCP Orchestration Layer"
        PrimaryMCP[Primary MCP Orchestrator]
        RegClassifier[Regulation Classifier]
        ValidationRouter[Validation Request Router]
        ResponseAggregator[Response Aggregator]
    end

    subgraph "Validation Services"
        Level1MCP[Level 1 Validation - Static Text]
        Level2MCP[Level 2 Validation - Semi-structured]
        Level3MCP[Level 3 Validation - Complex Rules]
        
        subgraph "Validation Tools"
            TextCompare[Text Comparison]
            PatternMatch[Pattern Matching]
            Checksums[Checksum Validation]
            Cache[Validation Cache]
        end
    end

    subgraph "Version Control System"
        VersionControl[Version Control Service]
        DiffGen[Diff Generation]
        ChangeNotif[Change Notification]
        AcceptTrack[Acceptance Tracking]
    end

    subgraph "Audit System"
        AuditLog[Audit Logging]
        EventTypes[Audit Event Types]
        AuditStorage[Audit Storage]
        QLDB[Amazon QLDB]
    end

    subgraph "Data Layer"
        Aurora[Aurora PostgreSQL]
        Schema[Database Schema]
        Migrations[Schema Migrations]
        Secrets[AWS Secrets Manager]
        S3[S3 Document Storage]
    end

    %% Frontend to API connections
    ReactQuery -->|API Requests| APIGateway
    APIGateway --> Authorizer
    Authorizer --> Cognito
    
    %% API to Orchestration Layer
    APIGateway --> PrimaryMCP
    PrimaryMCP --> RegClassifier
    PrimaryMCP --> ValidationRouter
    PrimaryMCP --> ResponseAggregator
    
    %% Orchestration to Validation Services
    ValidationRouter --> Level1MCP
    ValidationRouter --> Level2MCP
    ValidationRouter --> Level3MCP
    
    %% Validation Tools connections
    Level1MCP --> TextCompare
    Level1MCP --> Checksums
    Level2MCP --> PatternMatch
    Level1MCP --> Cache
    Level2MCP --> Cache
    
    %% Version Control connections
    PrimaryMCP --> VersionControl
    VersionControl --> DiffGen
    VersionControl --> ChangeNotif
    VersionControl --> AcceptTrack
    ChangeNotif -->|Change Notifications| ReactQuery
    
    %% Audit System connections
    PrimaryMCP --> AuditLog
    Level1MCP --> AuditLog
    Level2MCP --> AuditLog
    Level3MCP --> AuditLog
    VersionControl --> AuditLog
    AuditLog --> EventTypes
    AuditLog --> AuditStorage
    AuditStorage --> QLDB
    
    %% Data Layer connections
    PrimaryMCP --> Aurora
    Level1MCP --> Aurora
    Level2MCP --> Aurora
    Level3MCP --> Aurora
    VersionControl --> Aurora
    AuditStorage --> Aurora
    Aurora --> Schema
    Aurora --> Migrations
    PrimaryMCP --> S3
    Aurora --> Secrets
```

## System Flow Overview

```mermaid
sequenceDiagram
    participant User
    participant Replit as Replit Frontend
    participant API as API Gateway
    participant MCP as Primary MCP
    participant Validators as Validation Services
    participant VC as Version Control
    participant DB as Aurora PostgreSQL
    participant Audit as Audit System

    User->>Replit: Submit Regulation for Validation
    Replit->>API: POST /api/validate
    API->>MCP: Route Validation Request
    
    MCP->>MCP: Classify Regulation
    MCP->>Validators: Route to Appropriate Validator
    Validators->>DB: Retrieve Reference Regulation
    DB-->>Validators: Return Regulation Data
    
    Validators->>Validators: Perform Validation
    Validators-->>MCP: Return Validation Results
    
    MCP->>VC: Check for Version Changes
    VC->>DB: Compare Versions
    DB-->>VC: Version Data
    
    alt Version Change Detected
        VC->>VC: Generate Human-readable Diff
        VC-->>MCP: Return Version Change Info
    end
    
    MCP->>Audit: Log Validation Event
    Audit->>DB: Store Audit Record
    
    MCP-->>API: Complete Response
    API-->>Replit: Validation Results + Version Info
    Replit->>User: Display Results
    
    alt Version Changes Present
        Replit->>User: Prompt for Change Acceptance
        User->>Replit: Accept/Reject Changes
        Replit->>API: POST /api/versions/accept
        API->>VC: Record User Decision
        VC->>DB: Update Acceptance Status
    end
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Replit as Replit Frontend
    participant API as API Gateway
    participant Cognito
    participant DB as Aurora PostgreSQL

    User->>Replit: Submit Login Credentials
    Replit->>Cognito: Initiate Authentication
    Cognito->>Cognito: Validate Credentials
    
    alt Authentication Success
        Cognito-->>Replit: Return JWT Tokens
        Replit->>Replit: Store Tokens
        Replit->>User: Redirect to Dashboard
    else Authentication Failure
        Cognito-->>Replit: Authentication Failed
        Replit->>User: Display Error Message
    end
    
    User->>Replit: Access Protected Resource
    Replit->>API: Request with Bearer Token
    API->>Cognito: Validate Token
    Cognito-->>API: Token Validation Result
    
    alt Valid Token
        API->>DB: Authorized Request
        DB-->>API: Response Data
        API-->>Replit: Protected Resource
        Replit->>User: Display Protected Data
    else Invalid Token
        API-->>Replit: 401 Unauthorized
        Replit->>Cognito: Refresh Token
        alt Token Refresh Success
            Cognito-->>Replit: New Access Token
            Replit->>API: Retry with New Token
            API->>DB: Authorized Request
            DB-->>API: Response Data
            API-->>Replit: Protected Resource
            Replit->>User: Display Protected Data
        else Token Refresh Failure
            Cognito-->>Replit: Refresh Failed
            Replit->>User: Prompt for Re-login
        end
    end
```

These diagrams provide a visual representation of the system architecture and key workflows in the EdSteward.ai MCP Platform.
