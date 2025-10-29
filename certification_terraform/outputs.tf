output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_app_subnet_id" {
  description = "The ID of the private application subnet"
  value       = aws_subnet.private_app.id
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "webapp_service_name" {
  description = "The name of the webapp ECS service"
  value       = aws_ecs_service.webapp.name
}

output "extractor_service_name" {
  description = "The name of the extractor ECS service"
  value       = aws_ecs_service.extractor.name
}

output "webapp_task_definition_arn" {
  description = "The ARN of the webapp task definition"
  value       = aws_ecs_task_definition.webapp.arn
}

output "extractor_task_definition_arn" {
  description = "The ARN of the extractor task definition"
  value       = aws_ecs_task_definition.extractor.arn
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.pdf_storage.bucket
}

output "webapp_public_ip_command" {
  description = "Command to get the webapp's public IP when running"
  value       = "aws ecs describe-tasks --cluster ${aws_ecs_cluster.main.name} --tasks $(aws ecs list-tasks --cluster ${aws_ecs_cluster.main.name} --service-name ${aws_ecs_service.webapp.name} --query 'taskArns[0]' --output text) --query 'tasks[0].containers[0].networkInterfaces[0].publicIp' --output text"
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "ocr_plausibility_service_name" {
  description = "The name of the OCR Plausibility ECS service"
  value       = aws_ecs_service.ocr_plausibility.name
}

output "plausibility_service_name" {
  description = "The name of the Plausibility Check ECS service"
  value       = aws_ecs_service.plausibility.name
}

output "ocr_plausibility_task_definition_arn" {
  description = "The ARN of the OCR Plausibility task definition"
  value       = aws_ecs_task_definition.ocr_plausibility.arn
}

output "plausibility_task_definition_arn" {
  description = "The ARN of the Plausibility Check task definition"
  value       = aws_ecs_task_definition.plausibility.arn
}

output "ecr_ocr_plausibility_repository_url" {
  description = "ECR repository URL for OcrPlausibilityCheck"
  value       = aws_ecr_repository.ocr_plausibility.repository_url
}

output "ecr_plausibility_repository_url" {
  description = "ECR repository URL for PlausibilityCheck"
  value       = aws_ecr_repository.plausibility.repository_url
}

output "ocr_plausibility_internal_url" {
  description = "Internal URL for OcrPlausibilityCheck service"
  value       = "http://${aws_service_discovery_service.ocr_plausibility.name}.${aws_service_discovery_private_dns_namespace.main.name}:8000"
}

output "plausibility_internal_url" {
  description = "Internal URL for PlausibilityCheck service"
  value       = "http://${aws_service_discovery_service.plausibility.name}.${aws_service_discovery_private_dns_namespace.main.name}:8001"
}