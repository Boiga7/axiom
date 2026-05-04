---
type: concept
category: cloud
para: resource
tags: [fargate, ecs, serverless-containers, task-definition, networking, spot]
sources: []
updated: 2026-05-01
tldr: Serverless compute engine for containers — run ECS or EKS workloads without managing EC2 instances.
---

# AWS Fargate

Serverless compute engine for containers. Run ECS or EKS workloads without managing EC2 instances.

---

## Fargate vs EC2 Launch Type

```
Dimension           Fargate                         EC2
─────────────────────────────────────────────────────────
Server management   None                            Full (patching, scaling)
Startup time        10-30s (task level)             AMI boot + task
Cost model          vCPU + memory per second        Instance size
Spot support        Yes (FARGATE_SPOT, ~70% off)    Yes (Spot EC2)
GPU workloads       No                              Yes (GPU instance types)
Visibility          Limited host metrics            Full host metrics
Networking          awsvpc (each task = ENI)        bridge/host/awsvpc
Max task size       16 vCPU / 120 GB               Instance limit
Persistent storage  Ephemeral (20GB) or EFS         Instance store or EBS

Use Fargate: microservices, batch processing, burst workloads, teams without infra expertise
Use EC2:     GPU workloads, very high throughput, specific OS requirements, cost optimisation at scale
```

---

## Task Definition

```json
{
  "family": "order-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/orderServiceTaskRole",
  "containerDefinitions": [
    {
      "name": "order-service",
      "image": "123456789.dkr.ecr.eu-west-1.amazonaws.com/order-service:latest",
      "portMappings": [{ "containerPort": 8000, "protocol": "tcp" }],
      "environment": [
        { "name": "ENVIRONMENT", "value": "prod" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:123456789:secret:prod/order-service/db-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/order-service",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health/live || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "readonlyRootFilesystem": true,
      "linuxParameters": {
        "initProcessEnabled": true
      }
    }
  ]
}
```

---

## CDK: Fargate Service with Load Balancer

```python
from aws_cdk import (
    aws_ecs as ecs,
    aws_ecs_patterns as patterns,
    aws_ec2 as ec2,
    aws_ecr as ecr,
)

cluster = ecs.Cluster(self, "OrderCluster",
    vpc=vpc,
    container_insights=True,
)

# ApplicationLoadBalancedFargateService is the standard pattern
service = patterns.ApplicationLoadBalancedFargateService(
    self, "OrderService",
    cluster=cluster,
    cpu=512,
    memory_limit_mib=1024,
    desired_count=2,
    task_image_options=patterns.ApplicationLoadBalancedTaskImageOptions(
        image=ecs.ContainerImage.from_ecr_repository(
            ecr.Repository.from_repository_name(self, "Repo", "order-service"),
            tag="latest",
        ),
        container_port=8000,
        environment={"ENVIRONMENT": "prod"},
        secrets={
            "DATABASE_URL": ecs.Secret.from_secrets_manager(db_secret),
        },
        enable_logging=True,
    ),
    public_load_balancer=True,
    health_check_grace_period=Duration.seconds(60),
)

# Health check path
service.target_group.configure_health_check(
    path="/health/live",
    healthy_http_codes="200",
)

# Auto-scaling
scaling = service.service.auto_scale_task_count(max_capacity=20, min_capacity=2)
scaling.scale_on_cpu_utilization("CpuScaling",
    target_utilization_percent=70,
    scale_in_cooldown=Duration.seconds(60),
    scale_out_cooldown=Duration.seconds(30),
)
scaling.scale_on_request_count("RequestScaling",
    requests_per_target=1000,
    target_group=service.target_group,
)
```

---

## Spot Fargate for Cost Reduction

```python
# Capacity provider strategy: 80% Spot, 20% on-demand fallback
cluster = ecs.Cluster(self, "Cluster", vpc=vpc)
cluster.enable_fargate_capacity_providers()

service = ecs.FargateService(self, "BatchService",
    cluster=cluster,
    task_definition=task_def,
    desired_count=10,
    capacity_provider_strategies=[
        ecs.CapacityProviderStrategy(
            capacity_provider="FARGATE_SPOT",
            weight=4,
            base=0,
        ),
        ecs.CapacityProviderStrategy(
            capacity_provider="FARGATE",
            weight=1,
            base=1,     # always keep 1 on-demand task running
        ),
    ],
)

# CRITICAL: handle SIGTERM for Spot interruption (2-minute warning)
# In your application (Python FastAPI example):
import signal, asyncio

shutdown_event = asyncio.Event()

def handle_sigterm(*args):
    print("SIGTERM received — draining connections...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, handle_sigterm)
```

---

## Networking — awsvpc Mode

```
Every Fargate task gets its own ENI (Elastic Network Interface).
This means:
  - Each task has its own private IP address
  - Security groups apply at task level (not host level)
  - VPC flow logs capture per-task traffic
  - Subnet IP exhaustion is a real concern at scale (use /24+ subnets)

Task placement across subnets:
  ECS spreads tasks across subnets in the same AZ for HA.
  Use private subnets for tasks; public subnets for the ALB only.
  
ENI Trunking:
  Default: 2 ENIs per EC2 host (not relevant for Fargate)
  Fargate: 1 ENI per task, managed by AWS — no config required
```

---

## EFS Persistent Storage

```python
import aws_cdk.aws_efs as efs

# Shared file system across Fargate tasks
file_system = efs.FileSystem(self, "SharedFS",
    vpc=vpc,
    lifecycle_policy=efs.LifecyclePolicy.AFTER_14_DAYS,
    performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
    throughput_mode=efs.ThroughputMode.BURSTING,
    removal_policy=RemovalPolicy.RETAIN,
)

# Mount in task definition
volume = ecs.Volume(
    name="shared-data",
    efs_volume_configuration=ecs.EfsVolumeConfiguration(
        file_system_id=file_system.file_system_id,
        transit_encryption="ENABLED",
        authorization_config=ecs.AuthorizationConfig(
            access_point_id=access_point.access_point_id,
            iam="ENABLED",
        ),
    ),
)

task_def.add_volume(volume)
container.add_mount_points(ecs.MountPoint(
    source_volume="shared-data",
    container_path="/app/data",
    read_only=False,
))
```

---

## Common Failure Cases

**Fargate Spot task terminated mid-job with no graceful shutdown**
Why: Spot interruption sends `SIGTERM` and gives 2 minutes to drain, but the application has no signal handler and exits immediately, losing in-flight work.
Detect: batch jobs show incomplete output in S3; ECS events show `SIGTERM` as the stop reason with very short `lastStatus` durations.
Fix: implement a `SIGTERM` handler (see `handle_sigterm` example above) that marks the task as draining, finishes in-flight work, and checkpoints state before exiting.

**Task exits with code 137 (OOM kill)**
Why: the container exceeded the memory limit declared in the task definition; Linux OOM-killed the process.
Detect: ECS `StopCode: OutOfMemoryError` in task stopped events; container exit code 137.
Fix: increase `memory` in the task definition, or profile the app to find the leak; also set `memoryReservation` lower than `memory` to allow soft sharing while keeping a hard cap.

**EFS mount times out at task startup**
Why: the EFS mount target's security group does not allow inbound NFS (2049/TCP) from the Fargate task's security group, or the EFS access point IAM policy is misconfigured.
Detect: task fails to start with `ResourceInitializationError: failed to invoke EFS utils commands to set up EFS volumes` or hangs at mount.
Fix: add inbound 2049/TCP from the task security group to the EFS mount target security group, and confirm the access point has `iam: ENABLED` with a matching IAM permission in the task role.

**Health check grace period too short — service restarts loop**
Why: the default `healthCheckGracePeriod` (0 seconds for manual config) causes the ALB to mark new tasks unhealthy before the app finishes initializing, triggering ECS to replace them.
Detect: ECS service events show continuous task replacement; ALB target group shows tasks cycling between `initial` and `unhealthy`.
Fix: set `healthCheckGracePeriod` to at least as long as your app's slowest cold start (typically 30–120 seconds for JVM apps, 10–30 seconds for Python/Node).

## Connections

[[cloud-hub]] · [[cloud/aws-ecs]] · [[cloud/docker]] · [[cloud/kubernetes]] · [[cloud/container-security]] · [[cloud/finops-cost-management]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
