# terraform-onboarding/alb.tf
# Application Load Balancer for Onboarding App
resource "aws_lb" "onboarding" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [data.terraform_remote_state.shared.outputs.alb_security_group_id]
  subnets            = data.terraform_remote_state.shared.outputs.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name        = "${var.app_name}-alb"
    Environment = var.environment
  }
}

# Target Group
resource "aws_lb_target_group" "onboarding" {
  name        = "${var.app_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.terraform_remote_state.shared.outputs.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "${var.app_name}-target-group"
    Environment = var.environment
  }
}

# ALB Listener HTTP (no redirect to HTTPS for testing)
resource "aws_lb_listener" "onboarding_http" {
  load_balancer_arn = aws_lb.onboarding.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"  # Permanent redirect
    }
  }
}


#HTTPS listener commented out for testing - no SSL certificate needed
resource "aws_lb_listener" "onboarding_https" {
  load_balancer_arn = aws_lb.onboarding.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.onboarding.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.onboarding.arn
  }
}