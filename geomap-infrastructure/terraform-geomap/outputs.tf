# terraform-geomap/outputs.tf
# ECR Repository Output
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.geomap.repository_url
}

# Application URL - using ALB DNS for testing
output "application_url" {
  description = "URL of the geomap application (ALB DNS)"
  value       = "http://${aws_lb.geomap.dns_name}"
}

# Load Balancer DNS
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.geomap.dns_name
}

# Database Endpoint
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.geomap.endpoint
  sensitive   = true
}

# GitHub Actions Access Keys
output "github_actions_access_key_id" {
  description = "Access Key ID for GitHub Actions"
  value       = aws_iam_access_key.github_actions.id
  sensitive   = true
}

output "github_actions_secret_access_key" {
  description = "Secret Access Key for GitHub Actions"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}
