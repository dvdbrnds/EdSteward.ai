# EdSteward.ai - API Gateway Infrastructure

# API Gateway REST API
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "EdSteward.ai API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# API Gateway Authorizer using Cognito
resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "cognito-authorizer"
  rest_api_id            = aws_api_gateway_rest_api.api.id
  type                   = "COGNITO_USER_POOLS"
  provider_arns          = [aws_cognito_user_pool.main.arn]
  identity_source        = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 300
}

# API Gateway Resources

# /validate resource
resource "aws_api_gateway_resource" "validate" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "validate"
}

# /validate/batch resource
resource "aws_api_gateway_resource" "validate_batch" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.validate.id
  path_part   = "batch"
}

# /regulations resource
resource "aws_api_gateway_resource" "regulations" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "regulations"
}

# /regulations/{regulationId} resource
resource "aws_api_gateway_resource" "regulation" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.regulations.id
  path_part   = "{regulationId}"
}

# /regulations/{regulationId}/versions resource
resource "aws_api_gateway_resource" "versions" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.regulation.id
  path_part   = "versions"
}

# /regulations/{regulationId}/versions/{versionNumber} resource
resource "aws_api_gateway_resource" "version" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.versions.id
  path_part   = "{versionNumber}"
}

# /regulations/{regulationId}/diff resource
resource "aws_api_gateway_resource" "diff" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.regulation.id
  path_part   = "diff"
}

# /versions resource
resource "aws_api_gateway_resource" "version_management" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "versions"
}

# /versions/{regulationId} resource
resource "aws_api_gateway_resource" "version_regulation" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.version_management.id
  path_part   = "{regulationId}"
}

# /versions/{regulationId}/check resource
resource "aws_api_gateway_resource" "version_check" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.version_regulation.id
  path_part   = "check"
}

# /versions/{regulationId}/accept resource
resource "aws_api_gateway_resource" "version_accept" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.version_regulation.id
  path_part   = "accept"
}

# /certificates resource
resource "aws_api_gateway_resource" "certificates" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "certificates"
}

# /certificates/{certificateId} resource
resource "aws_api_gateway_resource" "certificate" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.certificates.id
  path_part   = "{certificateId}"
}

# /certificates/{certificateId}/verify resource
resource "aws_api_gateway_resource" "certificate_verify" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.certificate.id
  path_part   = "verify"
}

# /audit-logs resource
resource "aws_api_gateway_resource" "audit_logs" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "audit-logs"
}

# /audit-logs/{auditId} resource
resource "aws_api_gateway_resource" "audit_log" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.audit_logs.id
  path_part   = "{auditId}"
}

# /status resource
resource "aws_api_gateway_resource" "status" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "status"
}

# API Methods

# POST /validate
resource "aws_api_gateway_method" "validate_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.validate.id
  http_method   = "POST"
  authorization_type = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

resource "aws_api_gateway_integration" "validate_post" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.validate.id
  http_method = aws_api_gateway_method.validate_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.primary_mcp_orchestrator.invoke_arn
}

# POST /validate/batch
resource "aws_api_gateway_method" "validate_batch_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.validate_batch.id
  http_method   = "POST"
  authorization_type = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

resource "aws_api_gateway_integration" "validate_batch_post" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.validate_batch.id
  http_method = aws_api_gateway_method.validate_batch_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.primary_mcp_orchestrator.invoke_arn
}

# GET /regulations
resource "aws_api_gateway_method" "regulations_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.regulations.id
  http_method   = "GET"
  authorization_type = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.querystring.page"        = false
    "method.request.querystring.limit"       = false
    "method.request.querystring.category"    = false
    "method.request.querystring.jurisdiction" = false
    "method.request.querystring.query"        = false
    "method.request.querystring.tags"         = false
    "method.request.querystring.active"       = false
  }
}

resource "aws_api_gateway_integration" "regulations_get" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.regulations.id
  http_method = aws_api_gateway_method.regulations_get.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.primary_mcp_orchestrator.invoke_arn
}

# GET /status (public endpoint)
resource "aws_api_gateway_method" "status_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.status.id
  http_method   = "GET"
  authorization_type = "NONE"
}

resource "aws_api_gateway_integration" "status_get" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.status.id
  http_method = aws_api_gateway_method.status_get.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.primary_mcp_orchestrator.invoke_arn
}

# Enable CORS for all resources
module "cors" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"
  
  api_id          = aws_api_gateway_rest_api.api.id
  api_resource_id = aws_api_gateway_resource.validate.id
  allow_origin    = var.allowed_origins
  allow_methods   = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  allow_headers   = ["Authorization", "Content-Type"]
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "api" {
  depends_on = [
    aws_api_gateway_integration.validate_post,
    aws_api_gateway_integration.validate_batch_post,
    aws_api_gateway_integration.regulations_get,
    aws_api_gateway_integration.status_get
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = ""

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "v1" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.api_gateway_stage_name

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format          = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }

  xray_tracing_enabled = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# API Gateway Stage Settings
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.v1.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
    data_trace_enabled = var.environment != "prod"
    throttling_rate_limit  = var.api_gateway_throttling_rate_limit
    throttling_burst_limit = var.api_gateway_throttling_burst_limit
    caching_enabled = var.environment == "prod"
    cache_ttl_in_seconds = 300
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${aws_api_gateway_rest_api.api.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# API Gateway Domain Name (custom domain)
resource "aws_api_gateway_domain_name" "api" {
  count = var.environment == "prod" ? 1 : 0

  domain_name              = "api.edsteward.ai"
  regional_certificate_arn = aws_acm_certificate.api[0].arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# API Gateway Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "api" {
  count = var.environment == "prod" ? 1 : 0

  api_id      = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.v1.stage_name
  domain_name = aws_api_gateway_domain_name.api[0].domain_name
  base_path   = var.api_gateway_stage_name
}

# ACM Certificate for API Gateway custom domain
resource "aws_acm_certificate" "api" {
  count = var.environment == "prod" ? 1 : 0

  domain_name       = "api.edsteward.ai"
  validation_method = "DNS"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Route53 record for API Gateway custom domain
resource "aws_route53_record" "api" {
  count = var.environment == "prod" ? 1 : 0

  name    = aws_api_gateway_domain_name.api[0].domain_name
  type    = "A"
  zone_id = data.aws_route53_zone.main[0].id

  alias {
    name                   = aws_api_gateway_domain_name.api[0].regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api[0].regional_zone_id
    evaluate_target_health = false
  }
}

# Route53 Zone data source (for production)
data "aws_route53_zone" "main" {
  count = var.environment == "prod" ? 1 : 0

  name = "edsteward.ai"
}

# CloudWatch Alarms for API Gateway
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This alarm monitors API Gateway 5XX errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.api.name
    Stage   = aws_api_gateway_stage.v1.stage_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  alarm_description   = "This alarm monitors API Gateway 4XX errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.api.name
    Stage   = aws_api_gateway_stage.v1.stage_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "This alarm monitors API Gateway latency"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  
  dimensions = {
    ApiName = aws_api_gateway_rest_api.api.name
    Stage   = aws_api_gateway_stage.v1.stage_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# SNS Topic for Alerts (production only)
resource "aws_sns_topic" "alerts" {
  count = var.environment == "prod" ? 1 : 0

  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# SNS Topic Subscription for Email Alerts (production only)
resource "aws_sns_topic_subscription" "email_alerts" {
  count = var.environment == "prod" && length(var.budget_notification_emails) > 0 ? length(var.budget_notification_emails) : 0

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.budget_notification_emails[count.index]
}

# Outputs
output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.v1.stage_name}"
}

output "api_gateway_custom_domain" {
  description = "Custom domain name for the API Gateway"
  value       = var.environment == "prod" ? aws_api_gateway_domain_name.api[0].domain_name : null
}
