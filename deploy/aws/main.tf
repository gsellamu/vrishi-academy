# =============================================================================
# VRishi Academy -- AWS Infrastructure (App Runner + Free Tier)
# =============================================================================
# Cost-optimized for single-user / pre-revenue phase.
# Scales to production when customers arrive.
#
# Architecture:
#   App Runner (3 services, auto-TLS, scale-to-zero via pause)
#     academy-user      — auth, profiles
#     academy-progress  — drills, sessions, coaching
#     academy-grader    — AI rubric grading
#   RDS PostgreSQL 16   (db.t4g.micro — FREE TIER 12 months)
#   ElastiCache Redis 7 (cache.t4g.micro — FREE TIER 12 months)
#   SSM Parameter Store (secrets — FREE, no Secrets Manager cost)
#   ECR                 (images — 500 MB free)
#
# Monthly cost:
#   Active:  ~$8/mo  (3 services provisioned at 0.25 vCPU / 512 MB)
#   Paused:  ~$0/mo  (aws apprunner pause-service --service-arn <arn>)
#   DB/Redis: $0/mo  (free tier, 12 months)
#
# Usage:
#   cd deploy/aws
#   terraform init
#   terraform plan -var="github_org=YOUR_ORG" -var="github_repo=YOUR_REPO"
#   terraform apply
#
# Pause all services when not practicing:
#   for svc in academy-user academy-progress academy-grader; do
#     arn=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$svc'].ServiceArn" --output text)
#     aws apprunner pause-service --service-arn "$arn"
#   done
#
# Resume:
#   for svc in academy-user academy-progress academy-grader; do
#     arn=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$svc'].ServiceArn" --output text)
#     aws apprunner resume-service --service-arn "$arn"
#   done
# =============================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Uncomment for remote state:
  # backend "s3" {
  #   bucket         = "vrishi-terraform-state"
  #   key            = "academy/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "vrishi-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      project     = "vrishi-academy"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Data sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }

locals {
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 2)
  prefix     = "academy-${var.environment}"

  services = {
    user     = { name = "academy-user",     ecr_name = "vrishi-academy/user-svc" }
    progress = { name = "academy-progress", ecr_name = "vrishi-academy/progress-svc" }
    grader   = { name = "academy-grader",   ecr_name = "vrishi-academy/grader-svc" }
  }
}

# =============================================================================
# VPC (minimal — private subnets only, no IGW/NAT)
# =============================================================================
# App Runner handles internet connectivity at the platform level.
# The VPC exists solely so RDS and Redis are in a private network,
# reachable by App Runner through a VPC Connector.
# No NAT Gateway = $0 networking cost.

resource "aws_vpc" "academy" {
  cidr_block           = "10.10.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.prefix}-vpc" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.academy.id
  cidr_block        = "10.10.${count.index + 1}.0/24"
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.prefix}-private-${count.index + 1}" }
}

# =============================================================================
# Security Groups
# =============================================================================

resource "aws_security_group" "app_runner" {
  name_prefix = "${local.prefix}-apprunner-"
  vpc_id      = aws_vpc.academy.id
  description = "App Runner VPC Connector — outbound to RDS and Redis"

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
    description     = "PostgreSQL"
  }

  egress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
    description     = "Redis"
  }

  tags = { Name = "${local.prefix}-apprunner-sg" }

  lifecycle { create_before_destroy = true }
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.prefix}-rds-"
  vpc_id      = aws_vpc.academy.id
  description = "RDS PostgreSQL — inbound from App Runner only"

  tags = { Name = "${local.prefix}-rds-sg" }

  lifecycle { create_before_destroy = true }
}

resource "aws_security_group_rule" "rds_from_apprunner" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.app_runner.id
  description              = "PostgreSQL from App Runner"
}

resource "aws_security_group" "redis" {
  name_prefix = "${local.prefix}-redis-"
  vpc_id      = aws_vpc.academy.id
  description = "ElastiCache Redis — inbound from App Runner only"

  tags = { Name = "${local.prefix}-redis-sg" }

  lifecycle { create_before_destroy = true }
}

resource "aws_security_group_rule" "redis_from_apprunner" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.app_runner.id
  description              = "Redis from App Runner"
}

# =============================================================================
# SSM Parameter Store (secrets — $0, replaces Secrets Manager)
# =============================================================================

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/academy/${var.environment}/db-password"
  type  = "SecureString"
  value = random_password.db_password.result

  tags = { Name = "${local.prefix}-db-password" }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/academy/${var.environment}/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result

  tags = { Name = "${local.prefix}-jwt-secret" }
}

resource "aws_ssm_parameter" "invite_code" {
  name  = "/academy/${var.environment}/invite-code"
  type  = "SecureString"
  value = "CHANGE_ME_AFTER_APPLY"

  tags = { Name = "${local.prefix}-invite-code" }

  lifecycle { ignore_changes = [value] }
}

# After apply, set the real invite code:
#   aws ssm put-parameter --name "/academy/production/invite-code" \
#     --value "YOUR_CODE" --type SecureString --overwrite

# =============================================================================
# ECR Repositories
# =============================================================================

resource "aws_ecr_repository" "services" {
  for_each = local.services

  name                 = each.value.ecr_name
  image_tag_mutability = "MUTABLE"
  force_delete         = var.environment != "production"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.prefix}-${each.key}-ecr" }
}

resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# =============================================================================
# RDS PostgreSQL (FREE TIER: db.t4g.micro, 750 hrs/mo, 12 months)
# =============================================================================

resource "aws_db_subnet_group" "academy" {
  name       = "${local.prefix}-db"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.prefix}-db-subnet" }
}

resource "aws_db_instance" "academy" {
  identifier     = "${local.prefix}-pg"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  db_name  = "academy"
  username = "academy"
  password = random_password.db_password.result

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.academy.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false
  port                   = 5432

  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:05:00-sun:06:00"

  deletion_protection       = var.environment == "production"
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.prefix}-final" : null

  performance_insights_enabled = false

  tags = { Name = "${local.prefix}-pg" }
}

# =============================================================================
# ElastiCache Redis (FREE TIER: cache.t4g.micro, 750 hrs/mo, 12 months)
# =============================================================================

resource "aws_elasticache_subnet_group" "academy" {
  name       = "${local.prefix}-redis"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.prefix}-redis-subnet" }
}

resource "aws_elasticache_replication_group" "academy" {
  replication_group_id = "${local.prefix}-redis"
  description          = "VRishi Academy rate limiting and session cache"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  engine_version       = "7.1"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.academy.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = false

  maintenance_window      = "sun:05:00-sun:06:00"
  snapshot_window         = "03:00-04:00"
  snapshot_retention_limit = 1

  tags = { Name = "${local.prefix}-redis" }
}

# =============================================================================
# IAM Roles for App Runner
# =============================================================================

# Access role — lets App Runner pull images from ECR
resource "aws_iam_role" "app_runner_ecr" {
  name = "${local.prefix}-apprunner-ecr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
    }]
  })

  tags = { Name = "${local.prefix}-apprunner-ecr" }
}

resource "aws_iam_role_policy_attachment" "app_runner_ecr" {
  role       = aws_iam_role.app_runner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Instance role — lets containers read SSM secrets at runtime
resource "aws_iam_role" "app_runner_instance" {
  name = "${local.prefix}-apprunner-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
    }]
  })

  tags = { Name = "${local.prefix}-apprunner-instance" }
}

resource "aws_iam_role_policy" "app_runner_ssm" {
  name = "${local.prefix}-ssm-read"
  role = aws_iam_role.app_runner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameters",
        "ssm:GetParameter",
      ]
      Resource = [
        aws_ssm_parameter.db_password.arn,
        aws_ssm_parameter.jwt_secret.arn,
        aws_ssm_parameter.invite_code.arn,
      ]
    }]
  })
}

# =============================================================================
# App Runner
# =============================================================================

resource "aws_apprunner_vpc_connector" "academy" {
  vpc_connector_name = "${local.prefix}-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.app_runner.id]

  tags = { Name = "${local.prefix}-vpc-connector" }
}

resource "aws_apprunner_auto_scaling_configuration_version" "academy" {
  auto_scaling_configuration_name = "${local.prefix}-scaling"
  min_size        = 1
  max_size        = var.max_instances
  max_concurrency = 50

  tags = { Name = "${local.prefix}-autoscaling" }
}

resource "aws_apprunner_service" "services" {
  for_each = local.services

  service_name = each.value.name

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.app_runner_ecr.arn
    }

    image_repository {
      image_repository_type = "ECR"
      image_identifier      = "${aws_ecr_repository.services[each.key].repository_url}:latest"

      image_configuration {
        port = "8000"

        runtime_environment_variables = {
          ACADEMY_ENV  = var.environment
          DB_HOST      = aws_db_instance.academy.address
          DB_SSL       = "true"
          REDIS_URL    = "rediss://${aws_elasticache_replication_group.academy.primary_endpoint_address}:6379/3"
          CORS_ORIGINS = "https://www.vrishihypno.com,https://academy.vrishihypno.com"

          JWT_ALGORITHM          = "HS256"
          ACCESS_TOKEN_MINUTES   = "60"
          REFRESH_TOKEN_DAYS     = "7"
          ACADEMY_OPEN_REGISTRATION = "false"
          MAX_LOGIN_ATTEMPTS     = "5"
          LOCKOUT_MINUTES        = "15"
        }

        runtime_environment_secrets = {
          ACADEMY_DB_PASSWORD = aws_ssm_parameter.db_password.arn
          JWT_SECRET_KEY      = aws_ssm_parameter.jwt_secret.arn
          ACADEMY_INVITE_CODE = aws_ssm_parameter.invite_code.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.service_cpu
    memory            = var.service_memory
    instance_role_arn = aws_iam_role.app_runner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.academy.arn
    }
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.academy.arn

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/healthz"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 10
  }

  tags = { Name = "${local.prefix}-${each.key}" }

  depends_on = [
    aws_iam_role_policy_attachment.app_runner_ecr,
    aws_iam_role_policy.app_runner_ssm,
  ]
}

# =============================================================================
# GitHub OIDC for CI/CD
# =============================================================================

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_org != "" ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = { Name = "${local.prefix}-github-oidc" }
}

resource "aws_iam_role" "github_deploy" {
  count = var.github_org != "" ? 1 : 0
  name  = "${local.prefix}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github[0].arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
        }
      }
    }]
  })

  tags = { Name = "${local.prefix}-github-deploy" }
}

resource "aws_iam_role_policy" "github_deploy" {
  count = var.github_org != "" ? 1 : 0
  name  = "${local.prefix}-github-deploy-policy"
  role  = aws_iam_role.github_deploy[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECR"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = "*"
      },
      {
        Sid    = "AppRunner"
        Effect = "Allow"
        Action = [
          "apprunner:StartDeployment",
          "apprunner:ListServices",
          "apprunner:DescribeService",
        ]
        Resource = "*"
      },
    ]
  })
}
