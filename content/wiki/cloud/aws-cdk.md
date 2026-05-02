---
type: concept
category: cloud
para: resource
tags: [aws-cdk, cdk, iac, cloudformation, typescript, constructs, stacks]
sources: []
updated: 2026-05-01
tldr: AWS Cloud Development Kit. Define AWS infrastructure in TypeScript, Python, Java, or Go.
---

# AWS CDK

AWS Cloud Development Kit. Define AWS infrastructure in TypeScript, Python, Java, or Go. CDK synthesises down to CloudFormation templates. You get all CloudFormation's reliability with a proper programming language instead of YAML.

---

## CDK vs Terraform vs CloudFormation

| | CDK | Terraform | CloudFormation |
|--|--|--|--|
| Language | TS/Python/Java/Go | HCL | JSON/YAML |
| Abstraction | L1/L2/L3 constructs | Resource blocks | Resource blocks |
| State | CloudFormation stacks | `.tfstate` file | CF stack state |
| Provider scope | AWS only | 3,000+ providers | AWS only |
| Best for | AWS-native teams; constructs save boilerplate | Multi-cloud; mature ecosystem | Already invested in CF |

CDK's winning argument: L2/L3 constructs encode AWS best practices by default. A single `new ApplicationLoadBalancedFargateService()` creates the ECS cluster, Fargate service, task definition, ALB, security groups, IAM roles, and target group. All correctly wired.

---

## Core Concepts

**App** — root of the CDK app. One app, many stacks.

**Stack** — unit of deployment (maps to one CloudFormation stack). Owns a set of constructs.

**Construct** — a cloud component. Three levels:
- **L1 (Cfn*)** — 1:1 CloudFormation resource. `CfnBucket`, `CfnInstance`. Full control, maximum boilerplate.
- **L2** — opinionated resource with sensible defaults. `Bucket`, `Function`, `Vpc`. This is what you use 90% of the time.
- **L3 (Patterns)** — higher-order patterns. `ApplicationLoadBalancedFargateService`, `ServerlessRestApi`. One construct = dozens of resources.

---

## Getting Started

```bash
npm install -g aws-cdk
cdk init app --language typescript
```

```
my-cdk-app/
├── bin/
│   └── my-cdk-app.ts    # App entry point; instantiates stacks
├── lib/
│   └── my-stack.ts      # Stack definitions
├── cdk.json             # CDK config
└── package.json
```

---

## TypeScript Stack Example

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class MyApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket — encryption and versioning on by default with L2
    const bucket = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Lambda function
    const handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('src/'),
      handler: 'main.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant Lambda read/write to the bucket (creates IAM policy automatically)
    bucket.grantReadWrite(handler);

    // API Gateway REST API
    const api = new apigateway.RestApi(this, 'MyApi', {
      restApiName: 'My Service',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    api.root.addMethod('ANY', new apigateway.LambdaIntegration(handler));
  }
}
```

---

## Python Stack Example

```python
from aws_cdk import (
    Stack, Duration, RemovalPolicy,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_rds as rds,
    aws_ec2 as ec2,
)
from constructs import Construct

class DatabaseStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        vpc = ec2.Vpc(self, "AppVpc",
            max_azs=3,
            nat_gateways=1,
        )

        db = rds.DatabaseInstance(self, "Postgres",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_16_2
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
            multi_az=True,
            allocated_storage=100,
            deletion_protection=True,
            removal_policy=RemovalPolicy.RETAIN,
        )
```

---

## L3 Pattern — Fargate Service with ALB

```typescript
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';

const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'MyFargateService', {
  cluster,
  memoryLimitMiB: 1024,
  cpu: 512,
  taskImageOptions: {
    image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
    containerPort: 80,
  },
  publicLoadBalancer: true,
  desiredCount: 2,
  healthCheckGracePeriod: cdk.Duration.seconds(60),
});

// Auto-scaling
const scaling = loadBalancedFargateService.service.autoScaleTaskCount({
  maxCapacity: 10,
  minCapacity: 2,
});
scaling.scaleOnCpuUtilization('CpuScaling', { targetUtilizationPercent: 70 });
```

This one construct creates: VPC (if not provided), ECS cluster, Fargate task definition, Fargate service, ALB, ALB listener, target group, security groups, CloudWatch log group, IAM task role, IAM execution role.

---

## CDK Workflow

```bash
# Synthesise CloudFormation (dry-run)
cdk synth

# Show what will change
cdk diff

# Deploy
cdk deploy

# Deploy specific stack
cdk deploy MyApiStack

# Destroy (careful — respects removalPolicy)
cdk destroy

# Bootstrap (once per account/region — creates CDK assets bucket)
cdk bootstrap aws://123456789012/eu-west-1
```

---

## Cross-Stack References

```typescript
// Producer stack exports a value
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.vpc = new ec2.Vpc(this, 'AppVpc', { maxAzs: 3 });
  }
}

// Consumer stack imports it
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, networkStack: NetworkStack, props?: cdk.StackProps) {
    super(scope, id, props);

    new ecs.Cluster(this, 'Cluster', {
      vpc: networkStack.vpc,     // TypeScript reference; CDK generates CF cross-stack export
    });
  }
}
```

---

## CDK Aspects

Validate or mutate all constructs in a scope. Useful for policy enforcement.

```typescript
// Ensure all S3 buckets have versioning enabled
class BucketVersioningAspect implements cdk.IAspect {
  visit(node: IConstruct): void {
    if (node instanceof s3.CfnBucket) {
      if (!node.versioningConfiguration) {
        cdk.Annotations.of(node).addError('S3 bucket must have versioning enabled');
      }
    }
  }
}

cdk.Aspects.of(app).add(new BucketVersioningAspect());
```

---

## Testing CDK

```typescript
import { Template } from 'aws-cdk-lib/assertions';

test('Lambda function created with correct runtime', () => {
  const app = new cdk.App();
  const stack = new MyApiStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'python3.12',
    MemorySize: 512,
  });
});
```

---

## Common Failure Cases

**`cdk deploy` fails with "Export X cannot be deleted as it is in use by stack Y"**
Why: a cross-stack CloudFormation export is still referenced by a consumer stack; you cannot update or remove the producer stack until the consumer is updated first.
Detect: CloudFormation error `Export ... cannot be deleted` during deploy.
Fix: deploy the consumer stack first (removing or updating its reference to the old export), then redeploy the producer stack; reverse the normal dependency order for this one change.

**`cdk bootstrap` required but not run — "No ECR repository found"**
Why: CDK assets (Lambda code, Docker images) are staged to an S3 bucket and ECR repo created by `cdk bootstrap`; if bootstrap hasn't run in the account/region, asset upload fails.
Detect: `cdk deploy` errors with `No bucket named 'cdk-...'` or `No ECR repository found`.
Fix: run `cdk bootstrap aws://<account>/<region>` once per account/region pair before the first deploy.

**Circular dependency between stacks causes synth to hang or fail**
Why: Stack A passes a value to Stack B, and Stack B also passes a value back to Stack A, creating a CloudFormation circular cross-stack reference.
Detect: `cdk synth` throws `Circular dependency between stacks`.
Fix: extract the shared resource into a third stack that both A and B depend on, breaking the cycle.

**Lambda code changes not deployed — asset hash unchanged**
Why: CDK uses a content hash of the asset directory; if the directory contains compiled artifacts checked into git (e.g., `.pyc` files), non-code changes can invalidate the hash unexpectedly — or vice versa, stale bytecode can prevent a code change from being detected.
Detect: Lambda behavior doesn't change after `cdk deploy` even though source was edited.
Fix: add compiled artifacts to `.cdk-staging` excludes or use `lambda.Code.fromAsset('src/', {exclude: ['**/__pycache__']})` to ensure only source files contribute to the hash.

## Connections

- [[cloud/aws-core]] — the AWS resources CDK provisions
- [[cloud/terraform]] — alternative IaC; Terraform for multi-cloud, CDK for AWS-native
- [[cloud/github-actions]] — CI/CD: `cdk synth` on PR, `cdk deploy` on merge
- [[cloud/kubernetes]] — `aws-cdk-lib/aws-eks` module for EKS cluster provisioning
- [[cloud/secrets-management]] — CDK creates Secrets Manager secrets; never hardcode in stacks
