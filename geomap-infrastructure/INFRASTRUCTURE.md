# Terraform Infrastructure Setup - Testing Mode

This repository contains the infrastructure as code for the GeoMap application platform, configured for testing with PostgreSQL databases and ALB DNS (no custom domain required).

## Architecture Overview

```
├── terraform-shared/          # Shared infrastructure (VPC, Security Groups)
├── terraform-onboarding/      # Onboarding app infrastructure  
└── terraform-geomap/         # Geomap app infrastructure
```

## Key Features for Testing

- ✅ **PostgreSQL Databases:** Ready for your PG dumps
- ✅ **ALB DNS Access:** No custom domain needed
- ✅ **HTTP Only:** No SSL/HTTPS complexity for testing
- ✅ **GitHub Actions:** Automated CI/CD pipelines

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** installed (>= 1.0)
3. **AWS CLI** configured
4. **S3 Bucket** for Terraform state storage
5. **PostgreSQL dumps** ready for database restoration

## Deployment Order

### 1. Deploy Shared Infrastructure

```bash
cd terraform-shared
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars if needed (most defaults work for testing)
terraform init
terraform plan
terraform apply
```

### 2. Deploy Onboarding App Infrastructure

```bash
cd terraform-onboarding
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your database password and secrets
terraform init
terraform plan
terraform apply
```

### 3. Deploy Geomap App Infrastructure

```bash
cd terraform-geomap
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your database password and secrets
terraform init
terraform plan
terraform apply
```

## Database Configuration

### PostgreSQL Instances Created

- **Onboarding Database:** `postgresql://postgres:PASSWORD@ENDPOINT/onboarding_db`
- **Geomap Database:** `postgresql://postgres:PASSWORD@ENDPOINT/geomap_db`

### Restore Your Dumps

After deployment, get the database endpoints:

```bash
# Get onboarding database endpoint
cd terraform-onboarding
terraform output database_endpoint

# Get geomap database endpoint  
cd terraform-geomap
terraform output database_endpoint
```

Then restore your PostgreSQL dumps:

```bash
# Example restoration commands
pg_restore -h <ONBOARDING_ENDPOINT> -U postgres -d onboarding_db < onboarding_dump.sql
pg_restore -h <GEOMAP_ENDPOINT> -U postgres -d geomap_db < geomap_dump.sql
```

## Application Access

After deployment, access your applications via ALB DNS:

```bash
# Get application URLs
cd terraform-onboarding
terraform output application_url  # e.g., http://onboarding-alb-123456789.us-west-1.elb.amazonaws.com

cd terraform-geomap  
terraform output application_url   # e.g., http://geomap-alb-123456789.us-west-1.elb.amazonaws.com
```

## Required Configuration

### Before Running Terraform

1. **Create S3 Bucket for State Storage:**
   ```bash
   aws s3 mb s3://terraform-geomap-state
   aws s3api put-bucket-versioning --bucket terraform-geomap-state --versioning-configuration Status=Enabled
   ```

2. **Update Backend Configuration:**
   Update the S3 bucket name in all `main.tf` files to match your bucket.

### GitHub Actions Setup

After Terraform deployment, configure GitHub secrets:

1. Get the access keys from Terraform outputs:
   ```bash
   cd terraform-onboarding
   terraform output github_actions_access_key_id
   terraform output github_actions_secret_access_key
   ```

2. Add these to GitHub repository secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## What's Different in Testing Mode

### ❌ Removed for Testing:
- Route53 DNS configuration
- SSL/TLS certificates (ACM)
- Custom domain names
- HTTPS redirects

### ✅ Simplified for Testing:
- HTTP-only load balancers
- PostgreSQL databases (ready for dumps)
- ALB DNS for direct access
- Minimal required configuration

## Security Features (Still Active)

- **VPC Isolation:** All resources in isolated VPC
- **Private Subnets:** Applications run in private subnets  
- **Security Groups:** Restrictive firewall rules
- **Secrets Manager:** Secure credential storage
- **Database Encryption:** PostgreSQL instances encrypted
- **IAM Roles:** Least privilege access

## Adding Custom Domain Later

When ready for production, you can:

1. Uncomment domain-related variables in `terraform-shared/variables.tf`
2. Uncomment Route53 and ACM resources in `route53.tf` files
3. Update ALB listeners to redirect HTTP → HTTPS
4. Deploy with domain configuration

## Cleanup

To destroy the infrastructure:

```bash
# Destroy in reverse order
cd terraform-geomap && terraform destroy
cd terraform-onboarding && terraform destroy
cd terraform-shared && terraform destroy
```

## Next Steps

1. **Deploy Infrastructure:** Follow deployment order above
2. **Restore Databases:** Use your PostgreSQL dumps
3. **Configure GitHub Actions:** Add AWS credentials to secrets
4. **Test Applications:** Access via ALB DNS URLs
5. **Deploy Code:** Push commits to trigger GitHub Actions

## Support

For issues or questions, please refer to the individual application READMEs or create an issue in the repository.
