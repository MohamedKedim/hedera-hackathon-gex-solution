# terraform-onboarding/variables.tf
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "onboarding"
}

variable "subdomain" {
  description = "Subdomain for onboarding app"
  type        = string
  default     = "auth"
}

variable "domain_name" {
  description = "Domain name for onboarding app"
  type        = string
  default     = "greenearthx.io"
}


# Database variables
variable "db_name" {
  description = "Database name for onboarding app"
  type        = string
  default     = "onboarding_db"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "Password for onboarding database"
  type        = string
  sensitive   = true
}

# ECS variables
variable "ecs_task_cpu" {
  description = "CPU units for ECS tasks"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory for ECS tasks"
  type        = number
  default     = 512
}

variable "app_count" {
  description = "Number of app instances"
  type        = number
  default     = 1
}

# OAuth variables (will be stored in Secrets Manager)
variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

# Email variables
variable "EMAIL_USER" {
  description = "Email user for sending emails"
  type        = string
  sensitive   = true
}

variable "MICROSOFT_CLIENT_ID" {
  description = "Microsoft OAuth Client ID"
  type        = string
  sensitive   = true
  
}

variable "MICROSOFT_CLIENT_SECRET" {
  description = "Microsoft OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "MICROSOFT_TENANT_ID" {
  description = "Microsoft OAuth Tenant ID"
  type        = string
  sensitive   = true
}

variable "MICROSOFT_REFRESH_TOKEN" {
  description = "Microsoft OAuth Refresh Token"
  type        = string
  sensitive   = true
  
}

variable "email_pass" {
  description = "Email password/app password"
  type        = string
  sensitive   = true
}

# reCAPTCHA variables
variable "recaptcha_site_key" {
  description = "reCAPTCHA site key"
  type        = string
  sensitive   = true
}

variable "recaptcha_secret_key" {
  description = "reCAPTCHA secret key"
  type        = string
  sensitive   = true
}

# Application secrets
variable "jwt_secret" {
  description = "JWT secret for onboarding application"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth secret"
  type        = string
  sensitive   = true
}

# Geomap integration variables
variable "geomap_url" {
  description = "Geomap application URL"
  type        = string
}

variable "geomap_jwt_secret" {
  description = "JWT secret for Geomap integration"
  type        = string
  sensitive   = true
}

variable "geomap_app_url" {
  description = "Geomap app URL for integration"
  type        = string
}
