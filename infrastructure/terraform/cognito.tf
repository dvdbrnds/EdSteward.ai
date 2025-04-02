# EdSteward.ai - Cognito Authentication Infrastructure

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-users"
  
  # Username attributes and aliases
  username_attributes = ["email"]
  alias_attributes    = ["preferred_username"]
  
  # Auto-verification settings
  auto_verified_attributes = var.verify_email ? ["email"] : []
  
  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }
  
  # Multi-factor authentication
  mfa_configuration = "OPTIONAL"
  
  # Advanced security features
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }
  
  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  
  # Email configuration
  email_configuration {
    email_sending_account = var.email_sending_account
  }
  
  # Verification messages
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your EdSteward.ai verification code"
    email_message        = "Your verification code is {####}. This code will expire in 24 hours."
  }

  # Administrative messages
  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "Your temporary password for EdSteward.ai"
      email_message = "Your username is {username} and temporary password is {####}. Please change your password on first login."
      sms_message   = "Your username is {username} and temporary password is {####}."
    }
  }
  
  # Lambda triggers
  # Uncomment and configure these when Lambda functions are available
  #lambda_config {
  #  pre_sign_up         = aws_lambda_function.pre_sign_up.arn
  #  post_confirmation   = aws_lambda_function.post_confirmation.arn
  #  pre_authentication  = aws_lambda_function.pre_authentication.arn
  #  post_authentication = aws_lambda_function.post_authentication.arn
  #}

  # Schemas
  schema {
    name                     = "given_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 1
      max_length = 255
    }
  }
  
  schema {
    name                     = "family_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 1
      max_length = 255
    }
  }

  schema {
    name                     = "organization"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 1
      max_length = 255
    }
  }
  
  schema {
    name                     = "role"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 1
      max_length = 255
    }
  }

  # For multi-tenant deployments
  dynamic "schema" {
    for_each = var.enable_multi_tenancy ? [1] : []
    content {
      name                     = "tenant_id"
      attribute_data_type      = "String"
      developer_only_attribute = false
      mutable                  = true
      required                 = false
      string_attribute_constraints {
        min_length = 1
        max_length = 255
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito custom domain for production
resource "aws_cognito_user_pool_domain" "custom" {
  count = var.environment == "prod" ? 1 : 0
  
  domain          = "auth.edsteward.ai"
  certificate_arn = aws_acm_certificate.auth[0].arn
  user_pool_id    = aws_cognito_user_pool.main.id
}

# ACM Certificate for Cognito custom domain
resource "aws_acm_certificate" "auth" {
  count = var.environment == "prod" ? 1 : 0
  
  domain_name       = "auth.edsteward.ai"
  validation_method = "DNS"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  provider = aws.us-east-1  # ACM certificates for Cognito must be in us-east-1
}

# Route53 record for Cognito custom domain validation
resource "aws_route53_record" "auth_validation" {
  count = var.environment == "prod" ? 1 : 0
  
  name    = tolist(aws_acm_certificate.auth[0].domain_validation_options)[0].resource_record_name
  type    = tolist(aws_acm_certificate.auth[0].domain_validation_options)[0].resource_record_type
  zone_id = data.aws_route53_zone.main[0].id
  records = [tolist(aws_acm_certificate.auth[0].domain_validation_options)[0].resource_record_value]
  ttl     = 60
}

# ACM Certificate Validation
resource "aws_acm_certificate_validation" "auth" {
  count = var.environment == "prod" ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.auth[0].arn
  validation_record_fqdns = [aws_route53_record.auth_validation[0].fqdn]
  
  provider = aws.us-east-1  # Must match the certificate region
}

# Route53 record for Cognito custom domain
resource "aws_route53_record" "auth_alias" {
  count = var.environment == "prod" ? 1 : 0
  
  name    = "auth.edsteward.ai"
  type    = "A"
  zone_id = data.aws_route53_zone.main[0].id
  
  alias {
    name                   = aws_cognito_user_pool_domain.custom[0].cloudfront_distribution_arn
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront's hosted zone ID
    evaluate_target_health = false
  }
}

# Cognito Resource Server for API scopes
resource "aws_cognito_resource_server" "api" {
  identifier   = "https://api.edsteward.ai"
  name         = "EdSteward API"
  user_pool_id = aws_cognito_user_pool.main.id
  
  # Define API scopes
  scope {
    scope_name        = "regulations.read"
    scope_description = "Read regulations"
  }
  
  scope {
    scope_name        = "regulations.write"
    scope_description = "Create and update regulations"
  }
  
  scope {
    scope_name        = "validation.execute"
    scope_description = "Execute validation operations"
  }
  
  scope {
    scope_name        = "versions.manage"
    scope_description = "Manage regulation versions"
  }
  
  scope {
    scope_name        = "certificates.read"
    scope_description = "Read attestation certificates"
  }
  
  scope {
    scope_name        = "audit.read"
    scope_description = "Read audit logs"
  }
  
  # Admin-only scopes
  scope {
    scope_name        = "users.manage"
    scope_description = "Manage users"
  }
  
  scope {
    scope_name        = "system.manage"
    scope_description = "Manage system settings"
  }
}

# Cognito App Client for Replit Frontend
resource "aws_cognito_user_pool_client" "frontend" {
  name                         = "${var.project_name}-${var.environment}-frontend"
  user_pool_id                 = aws_cognito_user_pool.main.id
  generate_secret              = true
  refresh_token_validity       = 30
  access_token_validity        = 1
  id_token_validity            = 1
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
  
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
  
  allowed_oauth_flows = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = concat(
    ["openid", "email", "profile"],
    [for scope in aws_cognito_resource_server.api.scope_identifiers : scope]
  )
  
  callback_urls = [
    "https://edsteward-frontend.replit.app/auth/callback",
    "http://localhost:3000/auth/callback"
  ]
  logout_urls = [
    "https://edsteward-frontend.replit.app/auth/logout",
    "http://localhost:3000/auth/logout"
  ]
  
  supported_identity_providers = ["COGNITO"]
  
  prevent_user_existence_errors = "ENABLED"
}

# Cognito App Client for Admin Portal
resource "aws_cognito_user_pool_client" "admin" {
  name                         = "${var.project_name}-${var.environment}-admin"
  user_pool_id                 = aws_cognito_user_pool.main.id
  generate_secret              = true
  refresh_token_validity       = 30
  access_token_validity        = 1
  id_token_validity            = 1
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
  
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
  
  allowed_oauth_flows = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = concat(
    ["openid", "email", "profile"],
    [for scope in aws_cognito_resource_server.api.scope_identifiers : scope]
  )
  
  callback_urls = var.environment == "prod" ? [
    "https://admin.edsteward.ai/auth/callback",
    "http://localhost:3001/auth/callback"
  ] : [
    "http://localhost:3001/auth/callback"
  ]
  
  logout_urls = var.environment == "prod" ? [
    "https://admin.edsteward.ai/auth/logout",
    "http://localhost:3001/auth/logout"
  ] : [
    "http://localhost:3001/auth/logout"
  ]
  
  supported_identity_providers = ["COGNITO"]
  
  prevent_user_existence_errors = "ENABLED"
}

# Cognito Identity Pool for federated identities
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}_${var.environment}_identity_pool"
  allow_unauthenticated_identities = false
  allow_classic_flow               = true
  
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.frontend.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }
  
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.admin.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Terraform   = "true"
  }
}

# IAM Role for authenticated users
resource "aws_iam_role" "authenticated" {
  name = "${var.project_name}-${var.environment}-cognito-authenticated"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        },
        Action = "sts:AssumeRoleWithWebIdentity",
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          },
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
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

# IAM Role for unauthenticated users
resource "aws_iam_role" "unauthenticated" {
  name = "${var.project_name}-${var.environment}-cognito-unauthenticated"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        },
        Action = "sts:AssumeRoleWithWebIdentity",
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          },
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
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

# IAM Policy for authenticated users
resource "aws_iam_policy" "authenticated" {
  name        = "${var.project_name}-${var.environment}-cognito-authenticated"
  description = "IAM policy for authenticated Cognito users"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ],
        Resource = [
          aws_s3_bucket.documents.arn,
          "${aws_s3_bucket.documents.arn}/*"
        ]
      }
    ]
  })
}

# IAM Policy for unauthenticated users (minimal permissions)
resource "aws_iam_policy" "unauthenticated" {
  name        = "${var.project_name}-${var.environment}-cognito-unauthenticated"
  description = "IAM policy for unauthenticated Cognito users"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "cognito-sync:*"
        ],
        Resource = [
          "*"
        ]
      }
    ]
  })
}

# Attach policies to roles
resource "aws_iam_role_policy_attachment" "authenticated" {
  role       = aws_iam_role.authenticated.name
  policy_arn = aws_iam_policy.authenticated.arn
}

resource "aws_iam_role_policy_attachment" "unauthenticated" {
  role       = aws_iam_role.unauthenticated.name
  policy_arn = aws_iam_policy.unauthenticated.arn
}

# Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id
  
  roles = {
    "authenticated"   = aws_iam_role.authenticated.arn
    "unauthenticated" = aws_iam_role.unauthenticated.arn
  }
  
  # Role mapping for different types of users (e.g., admin, regular user)
  role_mapping {
    identity_provider         = "${aws_cognito_user_pool.main.endpoint}:${aws_cognito_user_pool_client.admin.id}"
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Rules"
    
    mapping_rule {
      claim      = "cognito:groups"
      match_type = "Contains"
      role_arn   = aws_iam_role.authenticated.arn
      value      = "admin"
    }
  }
}

# Cognito User Groups
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator group with full access"
  precedence   = 1
}

resource "aws_cognito_user_group" "validator" {
  name         = "validator"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Validator group with regulation validation permissions"
  precedence   = 2
}

resource "aws_cognito_user_group" "editor" {
  name         = "editor"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Editor group with regulation editing permissions"
  precedence   = 3
}

resource "aws_cognito_user_group" "viewer" {
  name         = "viewer"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Viewer group with read-only permissions"
  precedence   = 4
}

# Outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  description = "Cognito App Client ID for frontend"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = aws_cognito_identity_pool.main.id
}

output "cognito_domain" {
  description = "Cognito domain for authentication"
  value       = var.environment == "prod" ? "https://${aws_cognito_user_pool_domain.custom[0].domain}" : "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}
