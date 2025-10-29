# Variables for PlausibilityCheck Terraform Module

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-1"
}

variable "aws_profile" {
  description = "AWS CLI profile"
  type        = string
  default     = "AdministratorAccess-975232045453"
}

variable "project_name" {
  description = "Project name (used for resource naming)"
  type        = string
  default     = "nextjs-pdf-extractor"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Existing Infrastructure IDs
variable "vpc_id" {
  description = "Existing VPC ID"
  type        = string
}

variable "private_subnet_id" {
  description = "Existing private subnet ID"
  type        = string
}

variable "webapp_sg_id" {
  description = "Existing webapp security group ID (for ingress rules)"
  type        = string
}

variable "ecs_cluster_name" {
  description = "Existing ECS cluster name"
  type        = string
}

variable "service_discovery_namespace" {
  description = "Existing service discovery namespace"
  type        = string
  default     = "nextjs-pdf-extractor.local"
}

variable "codestar_connection_arn" {
  description = "Existing CodeStar connection ARN for GitHub"
  type        = string
}

# ECS Task Configuration
variable "task_cpu" {
  description = "CPU units for the task"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Memory for the task"
  type        = string
  default     = "1024"
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

# GitHub Configuration
variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "PlausibilityCheck"
}

variable "github_branch" {
  description = "GitHub branch to track"
  type        = string
  default     = "main"
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}
