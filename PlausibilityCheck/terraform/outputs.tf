# Outputs for PlausibilityCheck

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.plausibility.name
}

output "task_definition_arn" {
  description = "Task definition ARN"
  value       = aws_ecs_task_definition.plausibility.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.plausibility.repository_url
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.plausibility.id
}

output "service_discovery_arn" {
  description = "Service discovery ARN"
  value       = aws_service_discovery_service.plausibility.arn
}

output "internal_url" {
  description = "Internal service URL (via service discovery)"
  value       = "http://plausibility.${var.service_discovery_namespace}:8001"
}

output "pipeline_name" {
  description = "CodePipeline name"
  value       = aws_codepipeline.plausibility.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.plausibility.name
}
