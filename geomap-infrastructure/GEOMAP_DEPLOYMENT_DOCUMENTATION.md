# Geomap Deployment

## Abstract

This document presents a comprehensive analysis of the infrastructure deployment architecture for the GreenEarthX (GEX) project, specifically focusing on the deployment of two primary applications: the Geomap application and the Onboarding application. The deployment strategy leverages Amazon Web Services (AWS) cloud infrastructure, employing Infrastructure as Code (IaC) principles through Terraform, containerization via Docker, and continuous integration/continuous deployment (CI/CD) pipelines through GitHub Actions.

## 1. Introduction

The GreenEarthX project implements a distributed web application architecture designed to support geospatial data visualization and user management functionalities. The deployment infrastructure consists of three primary components:

1. **Shared Infrastructure Module** (`terraform-shared/`)
2. **Geomap Application Deployment** (`terraform-geomap/`)
3. **Onboarding Application Deployment** (`terraform-onboarding/`)

Each component follows cloud-native best practices, emphasizing scalability, security, and maintainability through modern DevOps methodologies.

## 2. Infrastructure Architecture

### 2.1 Shared Infrastructure Foundation

The shared infrastructure module (`terraform-shared/`) establishes the foundational AWS resources utilized by both applications. This module implements a three-tier network architecture:

#### Network Architecture
- **Virtual Private Cloud (VPC)**: Provides isolated network environment with configurable CIDR blocks
- **Multi-Availability Zone Design**: Implements high availability across multiple AWS availability zones
- **Subnet Stratification**:
  - **Public Subnets**: Host Application Load Balancers (ALB) and NAT Gateways
  - **Private Subnets**: Host containerized applications without direct internet access
  - **Database Subnets**: Isolated tier for RDS database instances

#### Key Infrastructure Components
```terraform
# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}
```

The architecture implements Network Address Translation (NAT) gateways for outbound internet connectivity from private subnets, ensuring secure communication while maintaining isolation.

### 2.2 State Management

The infrastructure employs remote state management using AWS S3 backend:

```terraform
backend "s3" {
  bucket = "terraform-geomap-state"
  key    = "shared/terraform.tfstate"
  region = "us-west-1"
}
```

This configuration ensures:
- State consistency across team members
- Centralized state storage with versioning
- Prevention of concurrent modifications

## 3. Application Deployment Architecture

### 3.1 Containerization Strategy

Both applications utilize Docker containerization with the following specifications:

#### Container Runtime Environment
- **Base Runtime**: Node.js 18 LTS
- **Application Framework**: Next.js (React-based)
- **Container Port**: 3000
- **Process Management**: Production-optimized Node.js processes

### 3.2 Amazon ECS (Elastic Container Service) Implementation

The deployment leverages AWS Fargate serverless compute engine:

#### ECS Cluster Configuration
```terraform
resource "aws_ecs_cluster" "geomap" {
  name = "${var.app_name}-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
```

#### Task Definition Specifications
- **CPU Allocation**: Configurable (default: 256 CPU units)
- **Memory Allocation**: Configurable (default: 512 MB)
- **Network Mode**: `awsvpc` for enhanced security
- **Launch Type**: `FARGATE` for serverless execution

### 3.3 Load Balancing and Traffic Management

#### Application Load Balancer (ALB)
Each application deploys with dedicated ALB configuration:

- **Health Check Endpoints**: Automated container health monitoring
- **Target Group Management**: Dynamic service discovery
- **SSL/TLS Termination**: HTTPS enforcement with AWS Certificate Manager integration

### 3.4 Service Discovery and Networking

Applications communicate through:
- **Private Subnets**: All application containers operate in private subnets
- **Security Groups**: Restrictive firewall rules limiting inter-service communication
- **Service Mesh**: ECS service discovery for internal communication

## 4. Database Architecture

### 4.1 Amazon RDS Implementation

Each application maintains separate RDS instances:

#### Database Configuration
- **Engine**: PostgreSQL (recommended for geospatial applications)
- **Multi-AZ Deployment**: High availability configuration
- **Subnet Group**: Dedicated database subnets for network isolation
- **Backup Strategy**: Automated backups with point-in-time recovery

### 4.2 Connection Management

Database connectivity is managed through:
- **AWS Secrets Manager**: Secure credential storage
- **Connection Pooling**: Application-level connection optimization
- **SSL Encryption**: In-transit encryption for database connections

## 5. Security Architecture

### 5.1 Identity and Access Management (IAM)

The deployment implements principle of least privilege through:

#### ECS Execution Role
```terraform
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.app_name}-ecs-execution-role"
  
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
```

#### Task Role Permissions
- **Secrets Manager Access**: Read-only access to application secrets
- **CloudWatch Logs**: Write permissions for application logging
- **ECR Access**: Pull permissions for container images

### 5.2 Secrets Management

AWS Secrets Manager integration provides:
- **Environment Variable Injection**: Secure runtime configuration
- **Automatic Rotation**: Configurable secret rotation policies
- **Audit Logging**: CloudTrail integration for access monitoring

#### Secret Configuration Example
```terraform
secrets = [
  {
    name      = "DATABASE_URL"
    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DATABASE_URL::"
  }
]
```

### 5.3 Network Security

Implementation includes:
- **Security Groups**: Application and database tier isolation
- **NACLs**: Additional network-level access control
- **VPC Flow Logs**: Network traffic monitoring and analysis

## 6. CI/CD Pipeline Architecture

### 6.1 GitHub Actions Integration

Both applications implement automated deployment pipelines:

#### Onboarding Application Pipeline
```yaml
name: Deploy Onboarding App

on:
  push:
    branches: [main]
    paths: 
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'Dockerfile'
      - 'prisma/**'
```

#### Pipeline Stages

1. **Source Control Trigger**
   - Branch-based triggering (main branch)
   - Path-based filtering for optimized builds
   - Manual workflow dispatch capability

2. **Build Stage**
   - Node.js environment setup (v18)
   - Dependency installation via npm
   - Prisma client generation (onboarding app)
   - Next.js application build with error handling

3. **Containerization**
   - Docker image creation
   - AWS ECR authentication
   - Image tagging and pushing

4. **Deployment**
   - ECS service update with new image
   - Rolling deployment strategy
   - Service stabilization verification

### 6.2 Geomap Application Pipeline

The Geomap pipeline follows similar patterns with simplified build requirements:

```yaml
name: Deploy Geomap App

env:
  AWS_REGION: us-west-1
  ECR_REPOSITORY: geomap-app
  ECS_SERVICE: geomap-service
  ECS_CLUSTER: geomap-cluster
```

#### Key Differences
- **Simplified Build**: No database schema generation requirements
- **Direct Deployment**: Streamlined containerization process
- **Force Deployment**: Immediate service updates with `--force-new-deployment`

### 6.3 Deployment Strategy

Both pipelines implement:
- **Blue-Green Deployment**: Zero-downtime deployments
- **Health Checks**: Automated deployment validation
- **Rollback Capability**: Automatic rollback on deployment failures

## 7. Monitoring and Observability

### 7.1 CloudWatch Integration

Comprehensive logging and monitoring through:

#### Log Management
```terraform
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 30
}
```

- **Structured Logging**: JSON-formatted application logs
- **Log Retention**: 30-day retention policy
- **Log Aggregation**: Centralized log collection per application

### 7.2 Container Insights

ECS Container Insights provides:
- **Resource Utilization Metrics**: CPU, memory, and network monitoring
- **Performance Dashboards**: Pre-built CloudWatch dashboards
- **Anomaly Detection**: Automated performance anomaly identification

### 7.3 Health Monitoring

Application health monitoring includes:
- **ALB Health Checks**: HTTP endpoint monitoring
- **ECS Service Health**: Container-level health verification
- **Database Connectivity**: Connection pool monitoring

## 8. Scalability and Performance

### 8.1 Auto Scaling Configuration

The architecture supports horizontal scaling through:
- **ECS Service Auto Scaling**: CPU and memory-based scaling triggers
- **ALB Target Group Scaling**: Dynamic target registration
- **Database Read Replicas**: Read query distribution (configurable)

### 8.2 Performance Optimization

Performance enhancements include:
- **CDN Integration**: CloudFront distribution for static assets
- **Connection Pooling**: Database connection optimization
- **Container Resource Limits**: Right-sized container specifications

## 9. Disaster Recovery and Backup

### 9.1 Data Protection

The deployment implements comprehensive data protection:
- **RDS Automated Backups**: Daily backups with 7-day retention
- **Cross-Region Replication**: Optional disaster recovery setup
- **Point-in-Time Recovery**: Database restoration to specific timestamps

### 9.2 Infrastructure Recovery

Infrastructure resilience through:
- **Multi-AZ Deployment**: High availability across availability zones
- **Infrastructure as Code**: Rapid environment recreation
- **State Management**: Terraform state backup and recovery

## 10. Cost Optimization

### 10.1 Resource Efficiency

Cost optimization strategies:
- **Fargate Spot**: Cost-effective compute for non-critical workloads
- **Reserved Capacity**: Long-term cost reduction for stable workloads
- **Resource Right-Sizing**: Regular performance analysis and optimization

### 10.2 Monitoring and Alerting

Cost management through:
- **AWS Cost Explorer Integration**: Spending analysis and forecasting
- **Budget Alerts**: Automated cost threshold notifications
- **Resource Tagging**: Granular cost allocation and tracking

## 11. Compliance and Governance

### 11.1 Security Compliance

The architecture addresses common compliance requirements:
- **Data Encryption**: At-rest and in-transit encryption
- **Access Logging**: Comprehensive audit trail
- **Network Segmentation**: Micro-segmentation through security groups

### 11.2 Operational Governance

Governance implementation includes:
- **Resource Tagging Strategy**: Consistent resource identification
- **Change Management**: Infrastructure change tracking through Git
- **Documentation Standards**: Comprehensive infrastructure documentation

## 12. Conclusion

The GreenEarthX deployment architecture represents a modern, cloud-native approach to web application infrastructure. By leveraging AWS managed services, Infrastructure as Code principles, and automated CI/CD pipelines, the system achieves high availability, security, and scalability while maintaining operational simplicity.

The modular design allows for independent scaling and deployment of applications while sharing common infrastructure components. The implementation of comprehensive monitoring, security controls, and automated deployment processes ensures robust operation in production environments.

Future enhancements may include multi-region deployment, advanced monitoring with third-party tools, and implementation of service mesh technologies for enhanced inter-service communication.

## References

1. AWS ECS Best Practices - Amazon Web Services Documentation
2. Terraform AWS Provider Documentation
3. GitHub Actions Workflow Syntax
4. AWS Well-Architected Framework
5. Container Security Best Practices

---

*Document Version: 1.0*  
*Last Updated: September 3, 2025*  
*Prepared for: Academic Documentation*