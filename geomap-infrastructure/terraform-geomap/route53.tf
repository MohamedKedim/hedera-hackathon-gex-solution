# terraform-geomap/route53.tf

# # DNS Record for Application
resource "aws_route53_record" "geomap" {
  zone_id = data.terraform_remote_state.shared.outputs.route53_zone_id
  name    = "${var.subdomain}.${data.terraform_remote_state.shared.outputs.domain_name}"
  type    = "A"

   alias {
     name                   = aws_lb.geomap.dns_name
     zone_id                = aws_lb.geomap.zone_id
     evaluate_target_health = true
   }

#   depends_on = [aws_acm_certificate_validation.geomap]
 }

# Route53 and SSL configuration uncommented

# SSL Certificate
resource "aws_acm_certificate" "geomap" {
  domain_name       = "${var.subdomain}.${data.terraform_remote_state.shared.outputs.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.app_name}-cert"
    Environment = var.environment
  }
}

# Certificate Validation Records
resource "aws_route53_record" "geomap_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.geomap.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.terraform_remote_state.shared.outputs.route53_zone_id
}

# Certificate Validation
resource "aws_acm_certificate_validation" "geomap" {
  certificate_arn         = aws_acm_certificate.geomap.arn
  validation_record_fqdns = [for record in aws_route53_record.geomap_cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}


