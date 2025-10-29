# PlausibilityCheck - Terraform Deployment

This Terraform module deploys the PlausibilityCheck FastAPI service to AWS ECS.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 VPC (Existing)                      │
│                                                     │
│  ┌────────────────┐        ┌─────────────────────┐│
│  │ Public Subnet  │        │  Private Subnet     ││
│  │                │        │                     ││
│  │ ┌───────────┐  │        │  ┌──────────────┐  ││
│  │ │  Webapp   │──┼────────┼─▶│Plausibility  │  ││
│  │ │  :3000    │  │        │  │    :8001      │  ││
│  │ └───────────┘  │        │  └──────────────┘  ││
│  └────────────────┘        └─────────────────────┘│
│                                                     │
│  Service Discovery: plausibility.nextjs-pdf-       │
│  extractor.local:8001                               │
└─────────────────────────────────────────────────────┘
```

## What This Creates

- ✅ Security Group (allows port 8001 from webapp)
- ✅ ECR Repository for Docker images
- ✅ ECS Task Definition (512 CPU, 1024 MB RAM)
- ✅ ECS Service in private subnet
- ✅ Service Discovery (DNS-based)
- ✅ CloudWatch Log Group
- ✅ CodeBuild Project
- ✅ CodePipeline (GitHub → Build → Deploy)
- ✅ S3 Bucket for pipeline artifacts
- ✅ IAM Roles and Policies

## Prerequisites

1. **Existing Infrastructure:**
   - VPC
   - Private subnet
   - ECS cluster
   - Service discovery namespace
   - GitHub connection (CodeStar)

2. **GitHub Repository:**
   - Repository with Dockerfile and buildspec.yml
   - Connected to AWS via CodeStar

3. **AWS CLI configured** with profile: `AdministratorAccess-975232045453`

## Configuration

### Step 1: Edit `terraform.tfvars`

Update these values:

```hcl
# Change this to your GitHub username
github_owner = "your-github-username"

# Update if you renamed the repo
github_repo = "PlausibilityCheck"
```

### Step 2: Verify buildspec.yml

Ensure you have `buildspec.yml` in the repository root:

```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
  build:
    commands:
      - echo Build started on `date`
      - docker build -t $ECR_REPOSITORY_URI:$IMAGE_TAG .
  post_build:
    commands:
      - echo Pushing Docker image...
      - docker push $ECR_REPOSITORY_URI:$IMAGE_TAG
      - printf '[{"name":"%s-plausibility","imageUri":"%s"}]' $PROJECT_NAME $ECR_REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

## Deployment

### Initialize Terraform

```bash
cd /Users/medbnk/GEX/PlausibilityCheck/terraform
terraform init
```

### Plan the Deployment

```bash
terraform plan
```

Expected output:
```
Plan: 16 to add, 0 to change, 0 to destroy.
```

### Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted.

### Deployment Time

- **Terraform apply:** ~3 minutes
- **First pipeline run:** ~5 minutes (builds Docker image)

## Verify Deployment

### Check ECS Service

```bash
aws ecs describe-services \
  --cluster nextjs-pdf-extractor-cluster \
  --services nextjs-pdf-extractor-plausibility \
  --region us-west-1
```

### Check Service Discovery

```bash
aws servicediscovery discover-instances \
  --namespace-name nextjs-pdf-extractor.local \
  --service-name plausibility \
  --region us-west-1
```

### Check Logs

```bash
aws logs tail /ecs/nextjs-pdf-extractor-plausibility --follow --region us-west-1
```

### Test from Webapp

The webapp can now call:
```
http://plausibility.nextjs-pdf-extractor.local:8001
```

## CI/CD Pipeline

### Trigger Build

Push to `main` branch:

```bash
git add .
git commit -m "Update service"
git push origin main
```

This automatically:
1. Triggers CodePipeline
2. Builds Docker image
3. Pushes to ECR
4. Deploys to ECS

### Monitor Pipeline

```bash
aws codepipeline get-pipeline-state \
  --name nextjs-pdf-extractor-plausibility-pipeline \
  --region us-west-1
```

Or visit: AWS Console → CodePipeline

## Updating the Service

### Scale the Service

```bash
# Scale to 2 tasks
aws ecs update-service \
  --cluster nextjs-pdf-extractor-cluster \
  --service nextjs-pdf-extractor-plausibility \
  --desired-count 2 \
  --region us-west-1
```

## Troubleshooting

### Service Not Starting

Check logs:
```bash
aws logs tail /ecs/nextjs-pdf-extractor-plausibility --follow
```

### Build Failing

Check CodeBuild logs:
```bash
aws codebuild list-builds-for-project \
  --project-name nextjs-pdf-extractor-plausibility-build \
  --region us-west-1
```

### Cannot Connect from Webapp

Check security groups:
```bash
aws ec2 describe-security-groups \
  --filters "Name=tag:Service,Values=plausibility" \
  --region us-west-1
```

## Cleanup

To remove all resources:

```bash
terraform destroy
```

**Warning:** This will delete all created resources.

## Outputs

After deployment:

```bash
terraform output
```

Shows:
- Service name
- ECR repository URL
- Internal service URL
- Security group ID
- CloudWatch log group

## Cost Estimate

Monthly costs (us-west-1):
- **ECS Fargate (1 task):** ~$8-10
- **ECR storage:** ~$1
- **CloudWatch Logs:** ~$0.50
- **S3 (pipeline artifacts):** ~$0.10
- **CodePipeline:** $1 per pipeline
- **CodeBuild:** $0.005/minute (only during builds)

**Total:** ~$11-13/month
