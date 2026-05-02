---
type: concept
category: cloud
para: resource
tags: [pulumi, iac, typescript, python, infrastructure-as-code, stacks]
sources: []
updated: 2026-05-01
tldr: Infrastructure as Code using real programming languages. Write AWS/GCP/Azure resources in TypeScript, Python, Go, or .NET.
---

# Pulumi

Infrastructure as Code using real programming languages. Write AWS/GCP/Azure resources in TypeScript, Python, Go, or .NET. Same mental model as Terraform but with loops, functions, classes, and IDE support.

---

## Pulumi vs Terraform

| | Pulumi | Terraform |
|--|--|--|
| Language | TypeScript, Python, Go, .NET | HCL |
| Logic | Full language (loops, conditionals, functions) | Limited (for_each, count) |
| Testing | Unit tests with existing test frameworks | Limited (terratest) |
| State | Pulumi Cloud (free tier) or self-hosted S3 | Local file or Terraform Cloud |
| Provider coverage | 120+ (same Terraform providers, bridged) | 3,000+ native |
| Learning curve | Familiar if you code | Need to learn HCL |

**When to choose Pulumi:** Teams that want to reuse existing code patterns, need complex logic (generating N resources from a list), or want unit-testable infrastructure code.

---

## Python Stack

```bash
pip install pulumi pulumi-aws

pulumi new aws-python    # interactive project scaffold
```

```python
# __main__.py
import pulumi
import pulumi_aws as aws

config = pulumi.Config()
env = config.require("environment")   # pulumi config set environment production

# VPC
vpc = aws.ec2.Vpc("app-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    tags={"Environment": env, "ManagedBy": "pulumi"})

# Subnets — create one per AZ using a loop
azs = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
private_subnets = []
for i, az in enumerate(azs):
    subnet = aws.ec2.Subnet(f"private-{i}",
        vpc_id=vpc.id,
        cidr_block=f"10.0.{i+10}.0/24",
        availability_zone=az,
        tags={"Name": f"private-{az}"})
    private_subnets.append(subnet)

# S3 bucket
bucket = aws.s3.Bucket("data-bucket",
    versioning=aws.s3.BucketVersioningArgs(enabled=True),
    server_side_encryption_configuration=aws.s3.BucketServerSideEncryptionConfigurationArgs(
        rule=aws.s3.BucketServerSideEncryptionConfigurationRuleArgs(
            apply_server_side_encryption_by_default=aws.s3.BucketServerSideEncryptionConfigurationRuleApplyServerSideEncryptionByDefaultArgs(
                sse_algorithm="AES256"))))

pulumi.export("vpc_id", vpc.id)
pulumi.export("bucket_name", bucket.id)
```

---

## TypeScript Stack

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const env = config.require("environment");

const cluster = new aws.ecs.Cluster("app-cluster", {
    name: `app-${env}`,
    settings: [{ name: "containerInsights", value: "enabled" }],
});

// Generate task definitions from a config array
const services = [
    { name: "api", cpu: 512, memory: 1024, port: 8000 },
    { name: "worker", cpu: 256, memory: 512, port: 8001 },
];

services.forEach(svc => {
    const taskDef = new aws.ecs.TaskDefinition(`${svc.name}-task`, {
        family: svc.name,
        requiresCompatibilities: ["FARGATE"],
        networkMode: "awsvpc",
        cpu: String(svc.cpu),
        memory: String(svc.memory),
        containerDefinitions: JSON.stringify([{
            name: svc.name,
            image: `${aws.getCallerIdentityOutput().accountId}.dkr.ecr.eu-west-1.amazonaws.com/${svc.name}:latest`,
            portMappings: [{ containerPort: svc.port }],
        }]),
    });
});
```

---

## Stacks (Environments)

```bash
pulumi stack init production
pulumi stack init staging
pulumi stack select staging

# Set per-stack config
pulumi config set environment staging
pulumi config set aws:region eu-west-1

# Deploy
pulumi up

# Preview (like terraform plan)
pulumi preview

# Destroy
pulumi destroy
```

---

## Unit Testing (Python)

```python
# test_infra.py
import pulumi
from unittest.mock import MagicMock

class MyMocks(pulumi.runtime.Mocks):
    def new_resource(self, args):
        return [args.name + "_id", args.inputs]
    def call(self, args):
        return {}

pulumi.runtime.set_mocks(MyMocks())

import infra  # import your __main__.py

@pulumi.runtime.test
def test_bucket_is_versioned():
    def check_bucket(args):
        bucket_versioning, = args
        assert bucket_versioning["enabled"] == True, "Bucket must have versioning enabled"

    return pulumi.Output.all(infra.bucket.versioning).apply(check_bucket)
```

---

## Connections
[[cloud-hub]] · [[cloud/terraform]] · [[cloud/aws-cdk]] · [[cloud/github-actions]]
