# terraform-geomap/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Configure remote backend for state management
  backend "s3" {
    bucket = "terraform-geomap-state"  # Replace with your bucket name
    key    = "geomap/terraform.tfstate"
    region = "us-west-1"
    
    # Optional: DynamoDB table for state locking
    # dynamodb_table = "terraform-locks"
    # encrypt        = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "AdministratorAccess-975232045453"
}

# Reference shared infrastructure
data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "terraform-geomap-state"  # Replace with your bucket name
    key    = "shared/terraform.tfstate"
    region = var.aws_region
  }
}

# Data sources
data "aws_caller_identity" "current" {}
