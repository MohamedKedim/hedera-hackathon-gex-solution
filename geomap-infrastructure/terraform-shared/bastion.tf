# Bastion Host for Database Access
resource "aws_instance" "bastion" {
  ami           = "ami-097abc400768dbb47" # Amazon Linux 2 latest for us-west-1
  instance_type = "t2.micro"
  
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  key_name                    = var.key_pair_name
  
  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    # Install PostgreSQL 14 from Amazon Linux Extras
    amazon-linux-extras install postgresql14 -y
    # Fallback: Install PostgreSQL 15 from official repo if needed
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    yum install -y postgresql15
    # Add ec2-user to sudoers for debugging
    echo "ec2-user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
    EOF
  
  tags = {
    Name        = "Database Bastion Host"
    Environment = var.environment
  }
}

# Security Group for Bastion Host
resource "aws_security_group" "bastion" {
  name        = "bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = aws_vpc.main.id

  # SSH access from anywhere (restrict to your IP for better security)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] 
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "bastion-security-group"
    Environment = var.environment
  }
}