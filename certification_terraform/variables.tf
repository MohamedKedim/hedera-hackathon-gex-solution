variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-west-1"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "nextjs-pdf-extractor"
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "The CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_app_subnet_cidr" {
  description = "The CIDR block for the private application subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_db_subnet_cidr" {
  description = "The CIDR block for the private database subnet"
  type        = string
  default     = "10.0.3.0/24"
}

variable "rds_database_name" {
  description = "The name of the database in the existing RDS instance"
  type        = string
}

variable "github_owner" {
  description = "The GitHub owner"
  type        = string
}

variable "github_repo_webapp" {
  description = "The GitHub repository name for the webapp"
  type        = string
}

variable "github_repo_extractor" {
  description = "The GitHub repository name for the extractor"
  type        = string
}

variable "github_branch" {
  description = "The GitHub branch to use"
  type        = string
  default     = "main"
}

variable "github_token_ssm_param" {
  description = "The SSM parameter name for the GitHub OAuth token (e.g., /nextjs/github/token)"
  type        = string
}

# New FastAPI Services Variables
variable "github_repo_ocr_plausibility" {
  description = "The GitHub repository name for OcrPlausibilityCheck"
  type        = string
  default     = "OcrPlausibilityCheck"
}

variable "github_repo_plausibility" {
  description = "The GitHub repository name for PlausibilityCheck"
  type        = string
  default     = "PlausibilityCheck"
}

# LLM Configuration for OcrPlausibilityCheck
variable "llm_api_key" {
  description = "LLM API key for OCR refinement"
  type        = string
  sensitive   = true
}

variable "llm_api_url" {
  description = "LLM API URL"
  type        = string
  default     = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
}

variable "llm_model" {
  description = "LLM model name"
  type        = string
  default     = "gemini-2.0-flash"
}

variable "use_llm_refinement" {
  description = "Whether to use LLM refinement"
  type        = string
  default     = "true"
}