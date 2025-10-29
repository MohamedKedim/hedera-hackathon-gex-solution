# AWS Provider configuration
provider "aws" {
  region  = "us-west-1"
  profile = "AdministratorAccess-975232045453"
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Subnets
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "us-west-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

resource "aws_subnet" "private_app" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnet_cidr
  availability_zone = "us-west-1a"

  tags = {
    Name = "${var.project_name}-private-app-subnet"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_app" {
  subnet_id      = aws_subnet.private_app.id
  route_table_id = aws_route_table.private.id
}

# S3 VPC Endpoint
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-west-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "${var.project_name}-s3-endpoint"
  }
}

resource "aws_subnet" "public2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.4.0/24"
  availability_zone       = "us-west-1c"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-2"
  }
}

resource "aws_route_table_association" "public2" {
  subnet_id      = aws_subnet.public2.id
  route_table_id = aws_route_table.public.id
}

# Update DB subnet group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.public.id, aws_subnet.public2.id]
}

# Security Groups
resource "aws_security_group" "webapp" {
  name        = "${var.project_name}-webapp-sg"
  description = "Security group for Next.js webapp"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-webapp-sg"
  }
}

resource "aws_security_group" "extractor" {
  name        = "${var.project_name}-extractor-sg"
  description = "Security group for AI PDF Extractor"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.webapp.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-extractor-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Public access for your DB tool
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# Security Group for OcrPlausibilityCheck
resource "aws_security_group" "ocr_plausibility" {
  name        = "${var.project_name}-ocr-plausibility-sg"
  description = "Security group for OcrPlausibilityCheck service"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.webapp.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ocr-plausibility-sg"
  }
}

# Security Group for PlausibilityCheck
resource "aws_security_group" "plausibility" {
  name        = "${var.project_name}-plausibility-sg"
  description = "Security group for PlausibilityCheck service"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [aws_security_group.webapp.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-plausibility-sg"
  }
}

# RDS Instance (Free Tier)
resource "aws_db_instance" "main" {
  identifier              = "${var.project_name}-db"
  engine                  = "postgres"
  engine_version          = "17.2" # Latest free-tier compatible
  instance_class          = "db.t3.micro" # Free tier
  allocated_storage       = 20 # Free tier minimum
  username                = "postgres"
  password                = "medbnk000"
  db_name                 = var.rds_database_name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = true
  skip_final_snapshot     = true
  multi_az                = false
  backup_retention_period = 0 # No backups to stay free
  storage_encrypted       = false # Free tier compatible
db_subnet_group_name    = aws_db_subnet_group.main.name
  tags = {
    Name = "${var.project_name}-db"
  }
}

# S3 Bucket
resource "aws_s3_bucket" "pdf_storage" {
  bucket = "${var.project_name}-pdf-storage-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "${var.project_name}-pdf-storage"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

resource "aws_s3_bucket_public_access_block" "pdf_storage" {
  bucket = aws_s3_bucket.pdf_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Roles
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-task-execution-role"

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
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "webapp_task_role" {
  name = "${var.project_name}-webapp-task-role"

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
}
resource "aws_iam_role_policy" "ecs_task_execution_ssm_policy" {
  name = "${var.project_name}-ecs-task-execution-ssm-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "kms:Decrypt"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/nextjs-pdf-extractor/*",
          "arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:key/*"
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "webapp_task_policy" {
  name = "${var.project_name}-webapp-task-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          aws_s3_bucket.pdf_storage.arn,
          "${aws_s3_bucket.pdf_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/nextjs-pdf-extractor/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "webapp_task_policy_attachment" {
  role       = aws_iam_role.webapp_task_role.name
  policy_arn = aws_iam_policy.webapp_task_policy.arn
}

resource "aws_iam_role" "extractor_task_role" {
  name = "${var.project_name}-extractor-task-role"

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
}

resource "aws_iam_policy" "extractor_task_policy" {
  name = "${var.project_name}-extractor-task-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          aws_s3_bucket.pdf_storage.arn,
          "${aws_s3_bucket.pdf_storage.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "extractor_task_policy_attachment" {
  role       = aws_iam_role.extractor_task_role.name
  policy_arn = aws_iam_policy.extractor_task_policy.arn
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "webapp" {
  family                   = "${var.project_name}-webapp"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.webapp_task_role.arn

container_definitions = jsonencode([
    {
      name      = "${var.project_name}-webapp"
      image     = "${aws_ecr_repository.webapp.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      # Regular environment variables (non-sensitive)
      environment = [
        {
          name  = "PG_CONNECTION"
          value = "pgsql"
        },
        {
          name  = "PG_HOST"
          value = "nextjs-pdf-extractor-db.c9ss68iashbd.us-west-1.rds.amazonaws.com"
        },
        {
          name  = "PG_PORT"
          value = "5432"
        },
        {
          name  = "PG_DATABASE"
          value = "mydb"
        },
        {
          name  = "PG_USER"
          value = "postgres"
        },
        {
          name  = "AUTH0_ISSUER_BASE_URL"
          value = "https://dev-ydpds2ou8r80ugp5.us.auth0.com"
        },
        {
          name  = "AUTH0_CLIENT_ID"
          value = "g0Pd15wKQKvctBqd11gqNNgTtVldoJFT"
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.pdf_storage.bucket
        },
        {
          name  = "EXTRACTOR_API_URL"
          value = "http://${aws_service_discovery_service.extractor.name}.${aws_service_discovery_private_dns_namespace.main.name}:8000"
        },
        {
          name  = "OCR_PLAUSIBILITY_URL"
          value = "http://${aws_service_discovery_service.ocr_plausibility.name}.${aws_service_discovery_private_dns_namespace.main.name}:8000"
        },
        {
          name  = "PLAUSIBILITY_CHECK_URL"
          value = "http://${aws_service_discovery_service.plausibility.name}.${aws_service_discovery_private_dns_namespace.main.name}:8001"
        },
        {
        name      = "AUTH0_BASE_URL"
        valueFrom = "gexcertification.ddnsking.com"
        }
      ],
      # Sensitive environment variables from SSM
      secrets = [
        {
          name      = "AUTH0_CLIENT_SECRET"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/nextjs-pdf-extractor/auth0-client-secret"
        },
        {
          name      = "AUTH0_SECRET"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/nextjs-pdf-extractor/auth0-secret"
        },
        {
          name      = "PG_PASSWORD"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/nextjs-pdf-extractor/pg-password"
        }
      ],
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.webapp.name
          "awslogs-region"        = "us-west-1"
          "awslogs-stream-prefix" = "webapp"
        }
      }
    }
  ])
}

resource "aws_ecs_task_definition" "extractor" {
  family                   = "${var.project_name}-extractor"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.extractor_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-extractor"
      image     = "${aws_ecr_repository.extractor.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.main.address
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = var.rds_database_name
        },
        {
          name  = "DB_USERNAME"
          value = "postgres"
        },
        {
          name  = "DB_PASSWORD"
          value = "medbnk000"
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.pdf_storage.bucket
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.extractor.name
          "awslogs-region"        = "us-west-1"
          "awslogs-stream-prefix" = "extractor"
        }
      }
    }
  ])
}

# ECS Task Definition for OcrPlausibilityCheck
resource "aws_ecs_task_definition" "ocr_plausibility" {
  family                   = "${var.project_name}-ocr-plausibility"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.extractor_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-ocr-plausibility"
      image     = "${aws_ecr_repository.ocr_plausibility.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "LLM_API_KEY"
          value = var.llm_api_key
        },
        {
          name  = "LLM_API_URL"
          value = var.llm_api_url
        },
        {
          name  = "LLM_MODEL"
          value = var.llm_model
        },
        {
          name  = "USE_LLM_REFINEMENT"
          value = var.use_llm_refinement
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ocr_plausibility.name
          "awslogs-region"        = "us-west-1"
          "awslogs-stream-prefix" = "ocr-plausibility"
        }
      }
    }
  ])
}

# ECS Task Definition for PlausibilityCheck
resource "aws_ecs_task_definition" "plausibility" {
  family                   = "${var.project_name}-plausibility"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.extractor_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-plausibility"
      image     = "${aws_ecr_repository.plausibility.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8001
          hostPort      = 8001
          protocol      = "tcp"
        }
      ]
      environment = []
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.plausibility.name
          "awslogs-region"        = "us-west-1"
          "awslogs-stream-prefix" = "plausibility"
        }
      }
    }
  ])
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "webapp" {
  name              = "/ecs/${var.project_name}-webapp"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "extractor" {
  name              = "/ecs/${var.project_name}-extractor"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "ocr_plausibility" {
  name              = "/ecs/${var.project_name}-ocr-plausibility"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "plausibility" {
  name              = "/ecs/${var.project_name}-plausibility"
  retention_in_days = 7
}

# ECR Repositories
resource "aws_ecr_repository" "webapp" {
  name                 = "${var.project_name}-webapp"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "extractor" {
  name                 = "${var.project_name}-extractor"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "ocr_plausibility" {
  name                 = "${var.project_name}-ocr-plausibility"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "plausibility" {
  name                 = "${var.project_name}-plausibility"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}.local"
  description = "Private DNS namespace for ECS services"
  vpc         = aws_vpc.main.id
}

resource "aws_service_discovery_service" "webapp" {
  name = "webapp"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
}

resource "aws_service_discovery_service" "extractor" {
  name = "extractor"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
}

resource "aws_service_discovery_service" "ocr_plausibility" {
  name = "ocr-plausibility"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
}

resource "aws_service_discovery_service" "plausibility" {
  name = "plausibility"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
}

# ECS Services
resource "aws_ecs_service" "webapp" {
  name            = "${var.project_name}-webapp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.webapp.arn
  desired_count   = 0 # Start stopped
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public.id]
    security_groups  = [aws_security_group.webapp.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.webapp.arn
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

resource "aws_ecs_service" "extractor" {
  name            = "${var.project_name}-extractor"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.extractor.arn
  desired_count   = 0 # Start stopped
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_app.id]
    security_groups  = [aws_security_group.extractor.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.extractor.arn
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

resource "aws_ecs_service" "ocr_plausibility" {
  name            = "${var.project_name}-ocr-plausibility"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ocr_plausibility.arn
  desired_count   = 0 # Start stopped
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_app.id]
    security_groups  = [aws_security_group.ocr_plausibility.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.ocr_plausibility.arn
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

resource "aws_ecs_service" "plausibility" {
  name            = "${var.project_name}-plausibility"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.plausibility.arn
  desired_count   = 0 # Start stopped
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_app.id]
    security_groups  = [aws_security_group.plausibility.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.plausibility.arn
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# Current AWS Account ID
data "aws_caller_identity" "current" {}