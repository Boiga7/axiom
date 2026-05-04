---
type: concept
category: cloud
para: resource
tags: [terraform, iac, infrastructure-as-code, hcl, modules, state]
sources: []
updated: 2026-05-01
tldr: Infrastructure as Code tool by HashiCorp (now part of IBM, with community fork OpenTofu under MPL 2.0). Declare infrastructure in HCL, run plan-apply-destroy.
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

Reusable units of configuration. Treat modules like functions. Single responsibility, well-defined interface.

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

Use **Terraform Registry** for community modules: `source = "terraform-aws-modules/vpc/aws"`. Pin versions with `version = "5.8.1"`. Never use unversioned community modules in production.

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

Community fork of Terraform under MPL 2.0 (Terraform moved to BSL in 2023). Drop-in replacement. Same HCL, same providers, same CLI. Choose OpenTofu for new projects if licence is a concern.

```bash
# Install
brew install opentofu
tofu init && tofu plan && tofu apply
```

---

## Common Failure Cases

**`terraform apply` succeeds but the state file is corrupted due to a concurrent apply**
Why: two CI pipelines ran `terraform apply` simultaneously; the S3 backend was configured but the DynamoDB lock table was missing or misconfigured, so both writes raced and one partially overwrote the state.
Detect: subsequent `terraform plan` outputs `Error: error reading state: ...` or shows resources as needing creation that already exist; the S3 state file size is suspiciously small.
Fix: restore the state from S3 versioning (enable S3 versioning on the state bucket before anything else); add the missing DynamoDB lock table; never run concurrent applies without locking.

**`terraform plan` shows a resource will be destroyed and recreated unexpectedly**
Why: a resource property that forces replacement (e.g., `name`, `availability_zone`, `encrypted`) was changed in the module or provider update, and Terraform cannot update it in-place.
Detect: `plan` output shows `-/+` beside the resource with `forces replacement` annotation; the change was unintentional or from a provider version bump.
Fix: use `terraform state mv` to rename the resource if only the logical name changed; for provider-forced replacements, pin the provider version until the impact is assessed; use `lifecycle { prevent_destroy = true }` on critical stateful resources.

**Sensitive variable leaks into the plan output or state file**
Why: a `variable` of type `string` that holds a password or API key was not marked `sensitive = true`, so Terraform echoes it in the plan output and stores it in plaintext in the state file.
Detect: `terraform plan` output or `terraform state show` displays literal secret values; CI logs contain the secret.
Fix: mark all secret variables `sensitive = true`; use Vault or Secrets Manager data sources rather than variables for secrets; encrypt the state bucket with KMS and restrict state file access via IAM.

**Module version bump destroys and recreates a managed resource due to provider changes**
Why: a community module was updated (e.g., `terraform-aws-modules/vpc/aws` from 4.x to 5.x), and the new version renames or removes a resource logical name, causing Terraform to see it as a different resource.
Detect: `terraform plan` after updating the `version` constraint shows a large number of resource deletions and recreations; the plan diff is dominated by the module's internal resources.
Fix: read the module's upgrade guide before bumping the version; use `terraform state mv` to rename resources to the new module's internal paths; test module upgrades in a non-production workspace first.

## Connections

- [[cloud/aws-core]] — the AWS resources Terraform provisions
- [[cloud/aws-cdk]] — alternative code-first IaC (TypeScript/Python, generates CloudFormation)
- [[cloud/github-actions]] — CI/CD pipeline that runs Terraform plan/apply
- [[cloud/secrets-management]] — never store secrets in tfvars; use Vault or Secrets Manager
- [[cloud/kubernetes]] — terraform-aws-eks module for EKS cluster provisioning
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
