# terraform-geomap/variables.tf
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
  default     = "geomap"
}

variable "subdomain" {
  description = "Subdomain for geomap app"
  type        = string
  default     = "geomap"
}

# Database variables
variable "db_name" {
  description = "Database name for geomap app"
  type        = string
  default     = "geomap_db"
}

variable "next_auth_url" {
  description = "NextAuth URL for geomap application"
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "Password for geomap database"
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

# Application secrets
variable "geomap_jwt_secret" {
  description = "JWT secret for geomap application"
  type        = string
  sensitive   = true
}

variable "onboarding_app_url" {
  description = "URL for onboarding application"
  type        = string
}

variable "next_public_onboarding_url" {
  description = "Public URL for onboarding application"
  type        = string
}

variable "geomap_url" {
  description = "URL for geomap application"
  type        = string
}

variable "recaptcha_secret_key" {
  description = "Secret key for reCAPTCHA"
  type        = string
  sensitive   = true
}
variable "email_password" {
  description = "Email password for sending emails"
  type        = string
  sensitive   = true 
}
variable "EMAIL_USER" {
  description = "Email user for sending emails"
  type        = string
}

variable "admin_emails" {
  description = "List of admin email addresses"
  type        = list(string)
  default     = []
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