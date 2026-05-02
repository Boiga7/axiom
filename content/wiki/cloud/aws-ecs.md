---
type: concept
category: cloud
para: resource
tags: [aws, ecs, fargate, containers, task-definition, service]
sources: []
updated: 2026-05-01
tldr: AWS-native container orchestration. Simpler than Kubernetes — no control plane to manage, no YAML manifests.
---

# AWS ECS — Elastic Container Service

AWS-native container orchestration. Simpler than Kubernetes. No control plane to manage, no YAML manifests. Two launch types: Fargate (serverless, AWS manages the EC2) and EC2 (you manage the underlying instances).

---

## Core Concepts

**Task Definition** — a blueprint. Declares the container image, CPU, memory, port mappings, environment variables, IAM role, logging config. Versioned; new deployments use a new revision.

**Task** — a running instance of a task definition. Ephemeral. Equivalent to a K8s Pod.

**Service** — keeps N tasks running. Handles rolling deployments, health checks, load balancer registration. Equivalent to a K8s Deployment + Service.

**Cluster** — logical grouping of tasks and services. One cluster per environment is common.

---

## Fargate vs EC2 Launch Type

| | Fargate | EC2 |
|--|--|--|
| Node management | AWS managed | You manage EC2 instances |
| Pricing | Per vCPU/GB-second | EC2 instance pricing |
| Startup time | ~30s cold start | Faster (node pre-warmed) |
| Cost at scale | Higher | Lower (Reserved Instances) |
| Use case | Default; variable workloads | High scale, GPU, spot-heavy |

---

## Task Definition

```json
{
  "family": "my-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/my-api-task-role",
  "containerDefinitions": [{
    "name": "api",
    "image": "123456789.dkr.ecr.eu-west-1.amazonaws.com/my-api:1.2.3",
    "portMappings": [{"containerPort": 8000, "protocol": "tcp"}],
    "environment": [{"name": "ENV", "value": "production"}],
    "secrets": [{
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:eu-west-1:123456789:secret:prod/db"
    }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/my-api",
        "awslogs-region": "eu-west-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }]
}
```

**executionRoleArn** — ECS agent uses this to pull images from ECR and read Secrets Manager. **taskRoleArn** — the app uses this at runtime (e.g., S3 access, SQS).

---

## Service with ALB

```bash
aws ecs create-service \
  --cluster production \
  --service-name my-api \
  --task-definition my-api:42 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-private-1,subnet-private-2],
    securityGroups=[sg-api],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,
    containerName=api,containerPort=8000" \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
```

Rolling deployment: `maximumPercent=200` allows double the task count during deployment; `minimumHealthyPercent=100` means zero downtime.

---

## Auto Scaling

```bash
# Register the ECS service as a scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/production/my-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 20

# Scale on CPU utilisation
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/production/my-api \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

---

## ECR — Elastic Container Registry

Private Docker registry managed by AWS. IAM-authenticated. Lifecycle policies remove old images automatically.

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.eu-west-1.amazonaws.com

# Push image
docker tag my-api:latest 123456789.dkr.ecr.eu-west-1.amazonaws.com/my-api:1.2.3
docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/my-api:1.2.3

# Lifecycle policy — keep last 10 images
aws ecr put-lifecycle-policy \
  --repository-name my-api \
  --lifecycle-policy-text '{"rules":[{"rulePriority":1,"selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}'
```

---

## Common Failure Cases

**Tasks fail to start with "CannotPullContainerError"**
Why: the task execution role lacks `ecr:GetAuthorizationToken` or `ecr:BatchGetImage` permissions, or the task is in a private subnet without a NAT Gateway or VPC endpoint for ECR.
Detect: ECS service events show `CannotPullContainerError: ... no basic auth credentials` or `RequestError: send request failed`.
Fix: verify `ecsTaskExecutionRole` has the `AmazonECSTaskExecutionRolePolicy` managed policy attached, and confirm the subnet has internet access (via NAT) or Interface VPC Endpoints for `ecr.api` and `ecr.dkr`.

**Service rolls back immediately — health check failing during deployment**
Why: the new task revision starts but fails the ALB health check before `minimumHealthyPercent` is maintained; ECS drains it and the service reverts to the previous revision.
Detect: ECS events show repeated `service ... has stopped N running tasks` followed by rollback; ALB target group shows the new task as `unhealthy`.
Fix: check the container logs for startup errors; if the app needs more init time, increase `healthCheck.startPeriod` in the task definition and the ALB health check grace period.

**Secrets not injected — task crashes with missing env var**
Why: the `secrets` array in the task definition references a Secrets Manager ARN that the task execution role cannot access, so ECS fails to inject the value and the container starts without it.
Detect: ECS event `ResourceInitializationError: unable to pull secrets or registry auth: execution resource retrieval failed`.
Fix: add `secretsmanager:GetSecretValue` (and `kms:Decrypt` if the secret is KMS-encrypted) to the `executionRoleArn`'s policy for the exact secret ARN.

**Service stuck at desired count due to ENI exhaustion**
Why: each Fargate task in `awsvpc` mode consumes one ENI; if the subnet's available IP addresses are exhausted, new tasks cannot be placed.
Detect: ECS placement failures with `Timeout waiting for network interface to be attached` or the subnet shows 0 available IPs in the VPC console.
Fix: use a larger subnet CIDR (at least `/24` for services with >20 tasks), or distribute tasks across multiple subnets.

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/docker]] · [[cloud/cloud-networking]] · [[cloud/secrets-management]] · [[cloud/github-actions]]
