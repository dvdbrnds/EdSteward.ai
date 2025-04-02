# EdSteward.ai

A Model Context Protocol (MCP) system for regulatory validation with serverless architecture.

## Overview

EdSteward.ai provides an automated solution for validating regulatory compliance in educational institutions. The system uses a Model Context Protocol (MCP) approach where each regulation has its own validator, enabling precise and efficient validation with minimal human intervention.

## Key Features

- **MCP Architecture**: Independent validation services for each regulation
- **Three-Level Validation**: From simple text comparison to complex contextual analysis
- **Version Control**: Built-in tracking for regulatory changes with acceptance workflow
- **Audit Trail**: Comprehensive logging of all validation activities
- **Attestation Certificates**: Formal validation records with cryptographic signing
- **AWS Serverless Architecture**: Scalable, maintainable, and cost-effective

## Project Structure

- `infrastructure/`: Infrastructure as Code (Terraform)
- `src/`: Source code
  - `lambda/`: AWS Lambda functions
  - `common/`: Shared code and utilities
- `database/`: Database schemas and migrations
- `documentation/`: Project documentation

## Getting Started

Documentation for setup and deployment is available in the `documentation/` directory.
