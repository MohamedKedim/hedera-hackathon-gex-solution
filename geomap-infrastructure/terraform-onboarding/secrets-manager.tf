# terraform-onboarding/secrets-manager.tf
# Secrets Manager for Application Secrets
resource "aws_secretsmanager_secret" "onboarding_app_secrets" {
  name        = "${var.app_name}-app-secrets"
  description = "Application secrets for ${var.app_name} app"

  tags = {
    Name        = "${var.app_name}-app-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "onboarding_app_secrets" {
  secret_id = aws_secretsmanager_secret.onboarding_app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL              = "postgresql://postgres:${var.db_password}@${aws_db_instance.onboarding.endpoint}/${var.db_name}"
    NEXTAUTH_SECRET           = var.nextauth_secret
    JWT_SECRET                = var.jwt_secret
    GOOGLE_CLIENT_ID          = var.google_client_id
    GOOGLE_CLIENT_SECRET      = var.google_client_secret
    EMAIL_USER                = var.EMAIL_USER
    MICROSOFT_CLIENT_ID       = var.MICROSOFT_CLIENT_ID
    MICROSOFT_CLIENT_SECRET   = var.MICROSOFT_CLIENT_SECRET
    MICROSOFT_TENANT_ID       = var.MICROSOFT_TENANT_ID
    MICROSOFT_REFRESH_TOKEN   = var.MICROSOFT_REFRESH_TOKEN
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY = var.recaptcha_site_key
    RECAPTCHA_SECRET_KEY     = var.recaptcha_secret_key
    GEOMAP_JWT_SECRET       = var.geomap_jwt_secret
  })

  depends_on = [aws_db_instance.onboarding]
}
