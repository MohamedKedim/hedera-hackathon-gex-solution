# terraform-shared/route53.tf
# Route53 configuration uncommented

resource "aws_route53_zone" "main" {
    name         = var.domain_name
}

data "aws_route53_zone" "main" {
    name         = var.domain_name
    private_zone = false
}

# # Export the zone information for use by apps
output "route53_zone_id" {
    description = "Route53 zone ID"
    value       = aws_route53_zone.main.zone_id
}

output "route53_zone_name" {
    description = "Route53 zone name"
    value       = aws_route53_zone.main.name
}