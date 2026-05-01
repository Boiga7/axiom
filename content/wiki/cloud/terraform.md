---
type: concept
category: cloud
para: resource
tags: [terraform, iac, infrastructure-as-code, hcl, modules, state]
sources: []
updated: 2026-05-01
---

# Terraform

Infrastructure as Code tool by HashiCorp (now part of IBM, with community fork OpenTofu under MPL 2.0). Declare infrastructure in HCL, run plan-apply-destroy. Provider ecosystem covers 3,000+ cloud resources.

---

## Core Concepts

### HCL Syntax

```hcl
# main.tf
terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "data" {
  bucket = "${var.project}-data-${var.environment}"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "environment" {
  type    = string
}

variable "project" {
  type    = string
}

output "bucket_name" {
  value = aws_s3_bucket.data.id
}
```

### The Lifecycle

```bash
terraform init      # download providers and modules
terraform validate  # check syntax
terraform plan      # show what will change (diff)
terraform apply     # make it so (prompts for confirmation)
terraform destroy   # tear everything down
```

`plan` is your safety net — always read it before `apply`. In CI/CD, use `terraform plan -out=tfplan` and `terraform apply tfplan` to ensure the apply uses the exact plan that was reviewed.

---

## State Management

State tracks the mapping between your HCL config and real cloud resources. Non-negotiable rules:

**Remote state with locking** — never use local state for shared environments.

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-tfstate"
    key            = "production/main/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "terraform-state-lock"  # prevents concurrent applies
    encrypt        = true
  }
}
```

```bash
# Create the lock table once
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

GCS backend for GCP teams. Azure Blob Storage backend for Azure.

### State Commands

```bash
terraform state list                        # list all tracked resources
terraform state show aws_instance.web       # inspect a resource
terraform state mv aws_instance.old aws_instance.new  # rename without destroy
terraform state rm aws_s3_bucket.legacy     # stop managing (don't delete the real resource)
terraform import aws_s3_bucket.existing my-existing-bucket  # bring existing into state
```

---

## Modules

Reusable units of configuration. Treat modules like functions — single responsibility, well-defined interface.

```
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
  rds/
    main.tf
    variables.tf
    outputs.tf
```

```hcl
# environments/prod/main.tf
module "vpc" {
  source = "../../modules/vpc"

  cidr_block   = "10.0.0.0/16"
  az_count     = 3
  environment  = "prod"
}

module "database" {
  source = "../../modules/rds"

  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  instance_class = "db.r6i.large"
}
```

Use **Terraform Registry** for community modules: `source = "terraform-aws-modules/vpc/aws"`. Pin versions with `version = "5.8.1"` — never use unversioned community modules in production.

---

## Workspaces

Separate state files for different environments using the same config.

```bash
terraform workspace new staging
terraform workspace select production
terraform workspace list
```

```hcl
locals {
  instance_type = terraform.workspace == "production" ? "m6i.large" : "t3.micro"
}
```

Alternative (and often better) pattern: separate directories per environment, each with their own backend config. Clearer state isolation, no risk of accidentally applying to the wrong workspace.

---

## Variables and Secrets

```hcl
# terraform.tfvars (never commit if it contains secrets)
environment = "production"
db_password = "..."   # bad — don't do this

# Better: use environment variables
# TF_VAR_db_password=... terraform apply
```

Never hardcode secrets in HCL. Pass via:
- Environment variables (`TF_VAR_<name>`)
- AWS Secrets Manager / HashiCorp Vault (use data sources to read at apply time)
- CI/CD secret stores

---

## Data Sources

Read existing infrastructure without managing it.

```hcl
data "aws_vpc" "existing" {
  tags = {
    Name = "main-vpc"
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}
```

---

## CI/CD Integration

```yaml
# .github/workflows/terraform.yml
jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/terraform-ci
          aws-region: eu-west-1
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.0"
      - run: terraform init
      - run: terraform plan -out=tfplan
      - run: terraform apply tfplan
        if: github.ref == 'refs/heads/main'
```

---

## OpenTofu

Community fork of Terraform under MPL 2.0 (Terraform moved to BSL in 2023). Drop-in replacement — same HCL, same providers, same CLI. Choose OpenTofu for new projects if licence is a concern.

```bash
# Install
brew install opentofu
tofu init && tofu plan && tofu apply
```

---

## Connections

- [[cloud/aws-core]] — the AWS resources Terraform provisions
- [[cloud/aws-cdk]] — alternative code-first IaC (TypeScript/Python, generates CloudFormation)
- [[cloud/github-actions]] — CI/CD pipeline that runs Terraform plan/apply
- [[cloud/secrets-management]] — never store secrets in tfvars; use Vault or Secrets Manager
- [[cloud/kubernetes]] — terraform-aws-eks module for EKS cluster provisioning
