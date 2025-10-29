# terraform-geomap/rds.tf
# RDS Instance for Geomap App - PostgreSQL
resource "aws_db_instance" "geomap" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "17.5"
  instance_class = var.db_instance_class
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = var.db_name
  username = "postgres"
  password = var.db_password

  vpc_security_group_ids = [data.terraform_remote_state.shared.outputs.rds_security_group_id]
  db_subnet_group_name   = data.terraform_remote_state.shared.outputs.db_subnet_group_name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.app_name}-database"
    Environment = var.environment
  }
}
