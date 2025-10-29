# terraform-geomap/secrets-manager.tf
# Secrets Manager for Application Secrets
resource "aws_secretsmanager_secret" "geomap_app_secrets" {
  name        = "${var.app_name}-app-secrets"
  description = "Application secrets for ${var.app_name} app"

  tags = {
    Name        = "${var.app_name}-app-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "geomap_app_secrets" {
  secret_id = aws_secretsmanager_secret.geomap_app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL               = "postgresql://postgres:${var.db_password}@${aws_db_instance.geomap.endpoint}/${var.db_name}"
    GEOMAP_JWT_SECRET          = var.geomap_jwt_secret
    RECAPTCHA_SECRET_KEY       = var.recaptcha_secret_key
    EMAIL_PASS                 = var.email_password
    EMAIL_USER                = var.EMAIL_USER
    MICROSOFT_CLIENT_ID       = var.MICROSOFT_CLIENT_ID
    MICROSOFT_CLIENT_SECRET   = var.MICROSOFT_CLIENT_SECRET
    MICROSOFT_TENANT_ID       = var.MICROSOFT_TENANT_ID
    MICROSOFT_REFRESH_TOKEN   = var.MICROSOFT_REFRESH_TOKEN
    })

  depends_on = [aws_db_instance.geomap, aws_lb.geomap]
}
