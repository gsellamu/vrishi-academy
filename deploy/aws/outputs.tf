# =============================================================================
# VRishi Academy -- AWS Infrastructure Outputs
# =============================================================================

# -- App Runner service URLs (auto-TLS, public) ------------------------------

output "service_urls" {
  description = "App Runner service URLs — use these in your frontend config"
  value       = { for k, v in aws_apprunner_service.services : k => "https://${v.service_url}" }
}

output "service_arns" {
  description = "App Runner service ARNs — for pause/resume commands"
  value       = { for k, v in aws_apprunner_service.services : k => v.arn }
}

# -- ECR ---------------------------------------------------------------------

output "ecr_repository_urls" {
  description = "ECR repository URLs for CI/CD"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

# -- Database -----------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.academy.address
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.academy.primary_endpoint_address
  sensitive   = true
}

# -- GitHub OIDC --------------------------------------------------------------

output "github_deploy_role_arn" {
  description = "Set this as AWS_DEPLOY_ROLE_ARN in GitHub Secrets"
  value       = var.github_org != "" ? aws_iam_role.github_deploy[0].arn : "N/A — set github_org and github_repo"
}

# -- Cost management ----------------------------------------------------------

output "pause_all_command" {
  description = "Run this to pause all services ($0 compute when paused)"
  value       = join(" && ", [for k, v in aws_apprunner_service.services : "aws apprunner pause-service --service-arn ${v.arn}"])
}

output "resume_all_command" {
  description = "Run this to resume all services"
  value       = join(" && ", [for k, v in aws_apprunner_service.services : "aws apprunner resume-service --service-arn ${v.arn}"])
}
