# terraform-shared/main.tf
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
    bucket = "terraform-geomap-state" 
    key    = "shared/terraform.tfstate"
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

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
