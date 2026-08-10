# =============================================================================
# VRishi Academy -- AWS Infrastructure Variables (App Runner Edition)
# =============================================================================

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = contains(["us-east-1", "us-east-2", "us-west-2", "eu-west-1"], var.region)
    error_message = "Region must support App Runner + RDS."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

# -- App Runner compute -------------------------------------------------------

variable "service_cpu" {
  description = "CPU for each App Runner service (256 = 0.25 vCPU)"
  type        = string
  default     = "256"

  validation {
    condition     = contains(["256", "512", "1024", "2048", "4096"], var.service_cpu)
    error_message = "Must be 256, 512, 1024, 2048, or 4096."
  }
}

variable "service_memory" {
  description = "Memory for each App Runner service in MB"
  type        = string
  default     = "512"

  validation {
    condition     = contains(["512", "1024", "2048", "3072", "4096"], var.service_memory)
    error_message = "Must be 512, 1024, 2048, 3072, or 4096."
  }
}

variable "max_instances" {
  description = "Max instances per service for auto-scaling"
  type        = number
  default     = 3
}

# -- Database -----------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class (db.t4g.micro = free tier)"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB (20 = free tier max)"
  type        = number
  default     = 20
}

# -- Redis --------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type (cache.t4g.micro = free tier)"
  type        = string
  default     = "cache.t4g.micro"
}

# -- GitHub OIDC --------------------------------------------------------------

variable "github_org" {
  description = "GitHub org or username for OIDC federation"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repo name (without org)"
  type        = string
  default     = ""
}
