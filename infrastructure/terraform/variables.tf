# EdSteward.ai - Infrastructure Variables

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  type        = string
  default     = "edsteward-dev"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "edsteward"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use for the subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# Database Configuration
variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "edsteward"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "edsteward_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

# Lambda Configuration
variable "lambda_runtime" {
  description = "Runtime for Lambda functions"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_memory_size" {
  description = "Memory allocation for Lambda functions in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 30
}

# API Gateway Configuration
variable "api_gateway_stage_name" {
  description = "Name of the API Gateway deployment stage"
  type        = string
  default     = "v1"
}

variable "api_gateway_throttling_rate_limit" {
  description = "API Gateway throttling rate limit"
  type        = number
  default     = 1000
}

variable "api_gateway_throttling_burst_limit" {
  description = "API Gateway throttling burst limit"
  type        = number
  default     = 2000
}

# Cognito Configuration
variable "user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
  default     = "edsteward-users"
}

variable "verify_email" {
  description = "Whether to verify emails for Cognito users"
  type        = bool
  default     = true
}

variable "email_sending_account" {
  description = "Cognito email sending account"
  type        = string
  default     = "COGNITO_DEFAULT"
}

# Multi-tenancy Configuration
variable "enable_multi_tenancy" {
  description = "Whether to enable multi-tenancy features"
  type        = bool
  default     = false
}

variable "tenant_isolation_strategy" {
  description = "Strategy for tenant data isolation"
  type        = string
  default     = "row-based"
  validation {
    condition     = contains(["row-based", "schema-based", "database-based"], var.tenant_isolation_strategy)
    error_message = "Tenant isolation strategy must be one of: row-based, schema-based, database-based."
  }
}

# Logging and Monitoring
variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "enable_enhanced_monitoring" {
  description = "Whether to enable enhanced monitoring for RDS"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Whether to enable Performance Insights for RDS"
  type        = bool
  default     = false
}

# Budget Controls
variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 100
}

variable "budget_notification_emails" {
  description = "Email addresses for budget notifications"
  type        = list(string)
  default     = []
}

# CORS Configuration
variable "allowed_origins" {
  description = "List of origins allowed for CORS"
  type        = list(string)
  default     = ["https://edsteward-frontend.replit.app"]
}
