# Terraform configuration for PlausibilityCheck FastAPI Service
# This service runs on port 8001 in a private subnet

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# Data sources for existing resources
data "aws_vpc" "existing" {
  id = var.vpc_id
}

data "aws_subnet" "private_app" {
  id = var.private_subnet_id
}

data "aws_security_group" "webapp" {
  id = var.webapp_sg_id
}

data "aws_ecs_cluster" "existing" {
  cluster_name = var.ecs_cluster_name
}

data "aws_service_discovery_dns_namespace" "existing" {
  name = var.service_discovery_namespace
  type = "DNS_PRIVATE"
}

data "aws_caller_identity" "current" {}

# Security Group for PlausibilityCheck
resource "aws_security_group" "plausibility" {
  name        = "${var.project_name}-plausibility-sg"
  description = "Security group for PlausibilityCheck service on port 8001"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [var.webapp_sg_id]
    description     = "Allow access from webapp"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.project_name}-plausibility-sg"
    Environment = var.environment
    Service     = "plausibility"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "plausibility" {
  name              = "/ecs/${var.project_name}-plausibility"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# ECR Repository
resource "aws_ecr_repository" "plausibility" {
  name                 = "${var.project_name}-plausibility"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-plausibility-task-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-plausibility-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# Service Discovery
resource "aws_service_discovery_service" "plausibility" {
  name = "plausibility"

  dns_config {
    namespace_id = data.aws_service_discovery_dns_namespace.existing.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "plausibility" {
  family                   = "${var.project_name}-plausibility"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-plausibility"
      image     = "${aws_ecr_repository.plausibility.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8001
          protocol      = "tcp"
        }
      ]

      environment = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.plausibility.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# ECS Service
resource "aws_ecs_service" "plausibility" {
  name            = "${var.project_name}-plausibility"
  cluster         = data.aws_ecs_cluster.existing.id
  task_definition = aws_ecs_task_definition.plausibility.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_id]
    security_groups  = [aws_security_group.plausibility.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.plausibility.arn
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# IAM Role for CodeBuild
resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-plausibility-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${var.project_name}-plausibility-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.pipeline_artifacts.arn}/*"
      }
    ]
  })
}

# S3 Bucket for Pipeline Artifacts
resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "${var.project_name}-plausibility-pipeline-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CodeBuild Project
resource "aws_codebuild_project" "plausibility" {
  name          = "${var.project_name}-plausibility-build"
  description   = "Builds PlausibilityCheck Docker image"
  service_role  = aws_iam_role.codebuild.arn
  build_timeout = 60

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true

    environment_variable {
      name  = "AWS_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "PROJECT_NAME"
      value = var.project_name
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }

    environment_variable {
      name  = "ECR_REPOSITORY_URI"
      value = aws_ecr_repository.plausibility.repository_url
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.project_name}-plausibility"
      stream_name = "build"
    }
  }

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

# IAM Role for CodePipeline
resource "aws_iam_role" "codepipeline" {
  name = "${var.project_name}-plausibility-pipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${var.project_name}-plausibility-pipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Effect   = "Allow"
        Resource = aws_codebuild_project.plausibility.arn
      },
      {
        Action = [
          "ecs:*"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "iam:PassRole"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "ecs:DescribeTaskDefinition"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "codestar-connections:UseConnection"
        ]
        Effect   = "Allow"
        Resource = var.codestar_connection_arn
      }
    ]
  })
}

# CodePipeline
resource "aws_codepipeline" "plausibility" {
  name     = "${var.project_name}-plausibility-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = var.github_branch
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.plausibility.name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ClusterName = data.aws_ecs_cluster.existing.cluster_name
        ServiceName = aws_ecs_service.plausibility.name
        FileName    = "imagedefinitions.json"
      }
    }
  }

  tags = {
    Environment = var.environment
    Service     = "plausibility"
  }
}
