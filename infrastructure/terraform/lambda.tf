# EdSteward.ai - Lambda Function Infrastructure

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-${var.environment}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# IAM policy for Lambda execution
resource "aws_iam_policy" "lambda_execution_policy" {
  name        = "${var.project_name}-${var.environment}-lambda-execution-policy"
  description = "IAM policy for Lambda execution"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement",
          "rds-data:BatchExecuteStatement"
        ]
        Resource = [
          aws_rds_cluster.aurora.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.documents.arn,
          "${aws_s3_bucket.documents.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_execution_policy.arn
}

# CloudWatch Log Group for Lambda functions
resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = toset([
    "primary-mcp-orchestrator",
    "level1-validator",
    "version-control",
    "audit-log"
  ])

  name              = "/aws/lambda/${var.project_name}-${var.environment}-${each.value}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Function    = each.value
    Terraform   = "true"
  }
}

# Lambda function: Primary MCP Orchestrator
resource "aws_lambda_function" "primary_mcp_orchestrator" {
  function_name = "${var.project_name}-${var.environment}-primary-mcp-orchestrator"
  description   = "Primary MCP Orchestrator for regulation validation"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  s3_bucket = aws_s3_bucket.lambda_code.id
  s3_key    = aws_s3_object.primary_mcp_orchestrator_code.key

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      DB_SECRET_ARN           = aws_secretsmanager_secret.db_credentials.arn
      DOCUMENTS_BUCKET_NAME   = aws_s3_bucket.documents.id
      LEVEL1_VALIDATOR_ARN    = aws_lambda_function.level1_validator.arn
      VERSION_CONTROL_ARN     = aws_lambda_function.version_control.arn
      AUDIT_LOG_ARN           = aws_lambda_function.audit_log.arn
      LOG_LEVEL               = var.environment == "prod" ? "info" : "debug"
    }
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs["primary-mcp-orchestrator"]
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Function    = "primary-mcp-orchestrator"
    Terraform   = "true"
  }
}

# Lambda function: Level 1 Validator
resource "aws_lambda_function" "level1_validator" {
  function_name = "${var.project_name}-${var.environment}-level1-validator"
  description   = "Level 1 Validator for static text regulations"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  s3_bucket = aws_s3_bucket.lambda_code.id
  s3_key    = aws_s3_object.level1_validator_code.key

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      DB_SECRET_ARN          = aws_secretsmanager_secret.db_credentials.arn
      DOCUMENTS_BUCKET_NAME  = aws_s3_bucket.documents.id
      AUDIT_LOG_ARN          = aws_lambda_function.audit_log.arn
      LOG_LEVEL              = var.environment == "prod" ? "info" : "debug"
      ENABLE_CACHE           = "true"
      CACHE_TTL_SECONDS      = "3600"
    }
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs["level1-validator"]
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Function    = "level1-validator"
    Terraform   = "true"
  }
}

# Lambda function: Version Control
resource "aws_lambda_function" "version_control" {
  function_name = "${var.project_name}-${var.environment}-version-control"
  description   = "Version Control Service for regulation changes"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  s3_bucket = aws_s3_bucket.lambda_code.id
  s3_key    = aws_s3_object.version_control_code.key

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      DB_SECRET_ARN          = aws_secretsmanager_secret.db_credentials.arn
      DOCUMENTS_BUCKET_NAME  = aws_s3_bucket.documents.id
      AUDIT_LOG_ARN          = aws_lambda_function.audit_log.arn
      LOG_LEVEL              = var.environment == "prod" ? "info" : "debug"
    }
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs["version-control"]
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Function    = "version-control"
    Terraform   = "true"
  }
}

# Lambda function: Audit Log
resource "aws_lambda_function" "audit_log" {
  function_name = "${var.project_name}-${var.environment}-audit-log"
  description   = "Audit Logging Service for system events"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  s3_bucket = aws_s3_bucket.lambda_code.id
  s3_key    = aws_s3_object.audit_log_code.key

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      DB_SECRET_ARN          = aws_secretsmanager_secret.db_credentials.arn
      LOG_LEVEL              = var.environment == "prod" ? "info" : "debug"
    }
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs["audit-log"]
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Function    = "audit-log"
    Terraform   = "true"
  }
}

# Lambda code storage bucket
resource "aws_s3_bucket" "lambda_code" {
  bucket = "${var.project_name}-${var.environment}-lambda-code"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

resource "aws_s3_bucket_versioning" "lambda_code" {
  bucket = aws_s3_bucket.lambda_code.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_code" {
  bucket = aws_s3_bucket.lambda_code.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "lambda_code" {
  bucket = aws_s3_bucket.lambda_code.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lambda code objects (placeholder - will be replaced by CI/CD pipeline)
resource "aws_s3_object" "primary_mcp_orchestrator_code" {
  bucket  = aws_s3_bucket.lambda_code.id
  key     = "primary-mcp-orchestrator/bundle.zip"
  source  = "../placeholder/bundle.zip"
  etag    = filemd5("../placeholder/bundle.zip")
}

resource "aws_s3_object" "level1_validator_code" {
  bucket  = aws_s3_bucket.lambda_code.id
  key     = "level1-validator/bundle.zip"
  source  = "../placeholder/bundle.zip"
  etag    = filemd5("../placeholder/bundle.zip")
}

resource "aws_s3_object" "version_control_code" {
  bucket  = aws_s3_bucket.lambda_code.id
  key     = "version-control/bundle.zip"
  source  = "../placeholder/bundle.zip"
  etag    = filemd5("../placeholder/bundle.zip")
}

resource "aws_s3_object" "audit_log_code" {
  bucket  = aws_s3_bucket.lambda_code.id
  key     = "audit-log/bundle.zip"
  source  = "../placeholder/bundle.zip"
  etag    = filemd5("../placeholder/bundle.zip")
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_primary_mcp" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.primary_mcp_orchestrator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*"
}
