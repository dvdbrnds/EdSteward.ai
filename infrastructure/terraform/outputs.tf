# EdSteward.ai - Terraform Outputs

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnets
}

# Database Outputs
output "database_endpoint" {
  description = "The endpoint of the RDS Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.aurora.endpoint
  sensitive   = false
}

output "database_name" {
  description = "The name of the database"
  value       = var.db_name
  sensitive   = false
}

output "database_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = false
}

# S3 Outputs
output "documents_bucket_name" {
  description = "Name of the S3 bucket for regulation documents"
  value       = aws_s3_bucket.documents.id
}

output "lambda_code_bucket_name" {
  description = "Name of the S3 bucket for Lambda code"
  value       = aws_s3_bucket.lambda_code.id
}

# Lambda Outputs
output "primary_mcp_orchestrator_function_name" {
  description = "Name of the Primary MCP Orchestrator Lambda function"
  value       = aws_lambda_function.primary_mcp_orchestrator.function_name
}

output "level1_validator_function_name" {
  description = "Name of the Level 1 Validator Lambda function"
  value       = aws_lambda_function.level1_validator.function_name
}

output "version_control_function_name" {
  description = "Name of the Version Control Lambda function"
  value       = aws_lambda_function.version_control.function_name
}

output "audit_log_function_name" {
  description = "Name of the Audit Log Lambda function"
  value       = aws_lambda_function.audit_log.function_name
}

# API Gateway Outputs
output "api_gateway_id" {
  description = "ID of the API Gateway REST API"
  value       = aws_api_gateway_rest_api.api.id
}

output "api_gateway_stage_name" {
  description = "Name of the API Gateway stage"
  value       = aws_api_gateway_stage.v1.stage_name
}

output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.v1.stage_name}"
}

output "api_gateway_custom_domain" {
  description = "Custom domain name for the API Gateway"
  value       = var.environment == "prod" ? aws_api_gateway_domain_name.api[0].domain_name : null
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_frontend_client_id" {
  description = "ID of the Cognito App Client for the frontend"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_admin_client_id" {
  description = "ID of the Cognito App Client for the admin portal"
  value       = aws_cognito_user_pool_client.admin.id
}

output "cognito_identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.id
}

output "cognito_domain" {
  description = "Domain for the Cognito authentication UI"
  value       = var.environment == "prod" ? "https://${aws_cognito_user_pool_domain.custom[0].domain}" : "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

# Security Group Outputs
output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

# Monitoring Outputs
output "api_gateway_log_group" {
  description = "Name of the CloudWatch Log Group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway.name
}

output "lambda_log_groups" {
  description = "Names of the CloudWatch Log Groups for Lambda functions"
  value = {
    primary_mcp_orchestrator = "/aws/lambda/${var.project_name}-${var.environment}-primary-mcp-orchestrator"
    level1_validator         = "/aws/lambda/${var.project_name}-${var.environment}-level1-validator"
    version_control          = "/aws/lambda/${var.project_name}-${var.environment}-version-control"
    audit_log                = "/aws/lambda/${var.project_name}-${var.environment}-audit-log"
  }
}

# Multi-tenancy Outputs
output "multi_tenancy_enabled" {
  description = "Whether multi-tenancy features are enabled"
  value       = var.enable_multi_tenancy
}

output "tenant_isolation_strategy" {
  description = "Strategy for tenant data isolation"
  value       = var.tenant_isolation_strategy
}

# Environment Information
output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region where resources are deployed"
  value       = var.aws_region
}

output "project_name" {
  description = "Project name used for resource naming"
  value       = var.project_name
}

# Deployment Information
output "deployment_timestamp" {
  description = "Timestamp of the deployment"
  value       = timestamp()
}

output "terraform_version" {
  description = "Terraform version used for deployment"
  value       = terraform.version
}

# Combined Frontend Configuration
output "frontend_config" {
  description = "Configuration for the Replit frontend"
  value = {
    api_url                = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.v1.stage_name}"
    cognito_domain         = var.environment == "prod" ? "https://${aws_cognito_user_pool_domain.custom[0].domain}" : "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
    cognito_user_pool_id   = aws_cognito_user_pool.main.id
    cognito_client_id      = aws_cognito_user_pool_client.frontend.id
    cognito_identity_pool_id = aws_cognito_identity_pool.main.id
    region                 = var.aws_region
    api_version            = var.api_gateway_stage_name
    documents_bucket       = aws_s3_bucket.documents.id
    environment            = var.environment
  }
  sensitive = false
}
