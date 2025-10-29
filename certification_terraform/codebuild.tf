# CodeBuild Project for Webapp
resource "aws_codebuild_project" "webapp" {
  name          = "${var.project_name}-webapp-build"
  description   = "Builds the Next.js webapp Docker image"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 60

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
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
      value = aws_ecr_repository.webapp.repository_url
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/${var.github_owner}/${var.github_repo_webapp}.git"
    git_clone_depth = 1
    buildspec       = "buildspec-webapp.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.project_name}-webapp"
      stream_name = "build"
    }
  }
}

# CodeBuild Project for Extractor
resource "aws_codebuild_project" "extractor" {
  name          = "${var.project_name}-extractor-build"
  description   = "Builds the AI PDF Extractor Docker image"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 60

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
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
      value = aws_ecr_repository.extractor.repository_url
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/${var.github_owner}/${var.github_repo_extractor}.git"
    git_clone_depth = 1
    buildspec       = "buildspec-extractor.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.project_name}-extractor"
      stream_name = "build"
    }
  }
}

# CodeBuild Project for OcrPlausibilityCheck
resource "aws_codebuild_project" "ocr_plausibility" {
  name          = "${var.project_name}-ocr-plausibility-build"
  description   = "Builds the OcrPlausibilityCheck Docker image"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 60

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/standard:5.0"
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
      value = aws_ecr_repository.ocr_plausibility.repository_url
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/${var.github_owner}/${var.github_repo_ocr_plausibility}.git"
    git_clone_depth = 1
    buildspec       = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.project_name}-ocr-plausibility"
      stream_name = "build"
    }
  }
}

# CodeBuild Project for PlausibilityCheck
resource "aws_codebuild_project" "plausibility" {
  name          = "${var.project_name}-plausibility-build"
  description   = "Builds the PlausibilityCheck Docker image"
  service_role  = aws_iam_role.codebuild_role.arn
  build_timeout = 60

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
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
    type            = "GITHUB"
    location        = "https://github.com/${var.github_owner}/${var.github_repo_plausibility}.git"
    git_clone_depth = 1
    buildspec       = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.project_name}-plausibility"
      stream_name = "build"
    }
  }
}

# IAM Role for CodeBuild (No changes needed here based on the error)
resource "aws_iam_role" "codebuild_role" {
  name = "${var.project_name}-codebuild-role"

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
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${var.project_name}-codebuild-policy"
  role = aws_iam_role.codebuild_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "ssm:GetParameters"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.github_token_ssm_param}"
      },
      {
        // ADD THIS NEW STATEMENT FOR S3 ACCESS
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetBucketVersioning",
          "s3:PutObject"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.pipeline_artifacts.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.pipeline_artifacts.bucket}/*"
        ]
      }
    ]
  })
}