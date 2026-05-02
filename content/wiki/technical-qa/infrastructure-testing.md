---
type: concept
category: technical-qa
para: resource
tags: [infrastructure-testing, terraform, checkov, terratest, compliance, iac]
sources: []
updated: 2026-05-01
tldr: "Testing infrastructure-as-code before it reaches production: static validation, compliance scanning, and live end-to-end infrastructure tests."
---

# Infrastructure Testing

Testing infrastructure-as-code before it reaches production: static validation, compliance scanning, and live end-to-end infrastructure tests. Broken infra causes harder-to-diagnose failures than broken app code.

---

## Testing Layers for IaC

```
Layer 1 — Static (< 30 seconds):
  - Terraform validate: syntax and provider schema
  - tflint: best practices and deprecated APIs
  - Checkov: security and compliance rules

Layer 2 — Plan analysis (< 2 minutes):
  - terraform plan in CI with sentinel/OPA policies
  - Detect unexpected resource destruction
  - Cost estimation (Infracost)

Layer 3 — Live tests (5-30 minutes, destroy after):
  - Terratest: spin up real resources, assert behaviour, teardown
  - Kitchen-Terraform (legacy Chef ecosystem)
  - Pulumi Automation API tests

Layer 4 — Contract tests:
  - Output variable contracts (consumers of infra modules)
  - DNS resolution, TLS cert validity, health endpoint
```

---

## Terraform Validation in CI

```yaml
# .github/workflows/infra-validate.yaml
name: Infrastructure Validation

on:
  pull_request:
    paths: ["infra/**"]

jobs:
  validate:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/

    steps:
    - uses: actions/checkout@v4

    - uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: "1.7.0"

    - name: Terraform init
      run: terraform init -backend=false

    - name: Terraform validate
      run: terraform validate

    - name: tflint
      uses: terraform-linters/setup-tflint@v4
    - run: tflint --config .tflint.hcl

    - name: Checkov security scan
      uses: bridgecrewio/checkov-action@v12
      with:
        directory: infra/
        framework: terraform
        soft_fail: false
        output_format: github_failed_only

    - name: Infracost estimate
      uses: infracost/actions/setup@v3
    - run: infracost breakdown --path . --format json --out-file /tmp/infracost.json
    - uses: infracost/actions/comment@v3
      with:
        path: /tmp/infracost.json
        behavior: update
```

---

## Checkov Custom Policies

```python
# checks/custom/ensure_s3_encryption.py
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class S3ServerSideEncryptionEnabled(BaseResourceCheck):
    def __init__(self):
        name = "Ensure S3 bucket has server-side encryption"
        id = "CUSTOM_S3_001"
        supported_resources = ["aws_s3_bucket"]
        categories = [CheckCategories.ENCRYPTION]
        super().__init__(name=name, id=id, categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        encryption = conf.get("server_side_encryption_configuration")
        if encryption:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = S3ServerSideEncryptionEnabled()
```

---

## Terratest — Go Integration Tests

```go
// infra/test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestVPCModule(t *testing.T) {
    t.Parallel()

    terraformOptions := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "vpc_cidr":     "10.0.0.0/16",
            "environment":  "test",
            "region":       "eu-west-1",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    require.NotEmpty(t, vpcID)

    // Verify VPC exists in AWS
    vpc := aws.GetVpcById(t, vpcID, "eu-west-1")
    assert.Equal(t, "10.0.0.0/16", aws.GetCidrBlockOfVpc(t, vpc))

    // Verify subnets created
    privateSubnets := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Len(t, privateSubnets, 3)   // one per AZ

    publicSubnets := terraform.OutputList(t, terraformOptions, "public_subnet_ids")
    assert.Len(t, publicSubnets, 3)
}
```

---

## Python Pulumi Automation API Tests

```python
# tests/infra/test_lambda_stack.py
import pytest
import pulumi
from pulumi import automation as auto

@pytest.fixture(scope="module")
def stack():
    stack = auto.create_or_select_stack(
        stack_name="test",
        work_dir="infra/lambda",
        opts=auto.LocalWorkspaceOptions(env_vars={
            "AWS_REGION": "eu-west-1",
            "PULUMI_CONFIG_PASSPHRASE": "test",
        }),
    )
    stack.up(on_output=print)
    yield stack
    stack.destroy(on_output=print)
    stack.workspace.remove_stack("test")

def test_lambda_function_exists(stack):
    outputs = stack.outputs()
    function_name = outputs["function_name"].value
    assert function_name.startswith("myapp-")

def test_lambda_has_correct_runtime(stack, lambda_client):
    outputs = stack.outputs()
    config = lambda_client.get_function_configuration(
        FunctionName=outputs["function_name"].value
    )
    assert config["Runtime"] == "python3.12"
    assert config["Timeout"] == 30
    assert config["MemorySize"] == 512
```

---

## OPA Policy for Terraform Plans

```rego
# policies/required_tags.rego
package terraform.analysis

import future.keywords.contains
import future.keywords.if

deny contains msg if {
    resource := input.resource_changes[_]
    resource.change.actions[_] == "create"
    resource.type == "aws_instance"
    not resource.change.after.tags.Environment
    msg := sprintf("EC2 instance %v missing required Environment tag", [resource.address])
}

deny contains msg if {
    resource := input.resource_changes[_]
    resource.change.actions[_] == "create"
    resource.type == "aws_s3_bucket"
    not resource.change.after.tags.Owner
    msg := sprintf("S3 bucket %v missing required Owner tag", [resource.address])
}
```

---

## Connections
[[tqa-hub]] · [[technical-qa/security-automation]] · [[technical-qa/chaos-engineering]] · [[cloud/gitops-patterns]] · [[cloud/platform-engineering]] · [[cloud/cloud-security]]
