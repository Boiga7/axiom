---
type: concept
category: cloud
para: resource
tags: [blue-green, deployment, canary, rolling, kubernetes, argocd, feature-flags]
sources: []
updated: 2026-05-01
tldr: Zero-downtime deployment patterns with instant rollback capability.
---

# Blue-Green and Advanced Deployment Strategies

Zero-downtime deployment patterns with instant rollback capability.

---

## Strategy Comparison

```
Strategy        Downtime  Rollback speed  Resource cost  Risk
────────────────────────────────────────────────────────────
Recreate        Yes       Minutes         1×             High
Rolling         No        Slow            1×             Medium
Blue-Green      No        Instant         2×             Low
Canary          No        Instant         1.05-1.2×      Very low
Shadow          No        N/A             2×             None (observe only)

Choose:
  Blue-Green  →  stateless services, databases already migrated, need instant rollback
  Canary      →  risk-averse, want gradual confidence, have good observability
  Rolling     →  stateless, can tolerate mixed versions, minimal extra cost
```

---

## Blue-Green on Kubernetes with ArgoCD

```yaml
# argo-rollout.yaml — blue-green strategy
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  replicas: 4
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:{{ .Values.image.tag }}
          ports:
            - containerPort: 8000
  strategy:
    blueGreen:
      activeService: order-service-active
      previewService: order-service-preview
      autoPromotionEnabled: false          # manual promotion gate
      prePromotionAnalysis:
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: order-service-preview
      postPromotionAnalysis:
        templates:
          - templateName: success-rate
---
apiVersion: v1
kind: Service
metadata:
  name: order-service-active
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: order-service-preview
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8000
```

```bash
# Promotion workflow
kubectl argo rollouts promote order-service          # promote green to active
kubectl argo rollouts abort order-service            # abort — traffic stays on blue
kubectl argo rollouts undo order-service             # rollback to previous
kubectl argo rollouts status order-service --watch   # observe state machine
```

---

## Blue-Green on AWS ECS with CodeDeploy

```python
# CDK: ECS blue-green via CodeDeploy
from aws_cdk import (
    aws_ecs as ecs,
    aws_codedeploy as codedeploy,
    aws_elasticloadbalancingv2 as elbv2,
)

# Two target groups — one per colour
blue_tg = elbv2.ApplicationTargetGroup(self, "BlueTG",
    vpc=vpc, port=8000, protocol=elbv2.ApplicationProtocol.HTTP,
    health_check=elbv2.HealthCheck(path="/health/live"),
)
green_tg = elbv2.ApplicationTargetGroup(self, "GreenTG",
    vpc=vpc, port=8000, protocol=elbv2.ApplicationProtocol.HTTP,
    health_check=elbv2.HealthCheck(path="/health/live"),
)

# ECS service with CODE_DEPLOY deployment controller
service = ecs.FargateService(self, "OrderService",
    cluster=cluster,
    task_definition=task_def,
    deployment_controller=ecs.DeploymentController(
        type=ecs.DeploymentControllerType.CODE_DEPLOY,
    ),
    load_balancers=[
        ecs.EcsTarget(
            container_name="order-service",
            container_port=8000,
            new_target_group_id="blue",
            listener=ecs.ListenerConfig.application_listener(
                listener, protocol=elbv2.ApplicationProtocol.HTTP,
            ),
        )
    ],
)

# CodeDeploy deployment group
deployment_group = codedeploy.EcsDeploymentGroup(self, "DeploymentGroup",
    service=service,
    blue_green_deployment_config=codedeploy.EcsBlueGreenDeploymentConfig(
        listener=listener,
        blue_target_group=blue_tg,
        green_target_group=green_tg,
        deployment_approval_wait_time=Duration.hours(1),   # manual bake time
        terminate_blue_instances_on_deployment_success=codedeploy.TrafficRoutingConfig(
            type=codedeploy.TrafficRoutingType.ALL_AT_ONCE,
        ),
    ),
)
```

---

## Feature Flags as Deployment Gate

```python
# Use feature flags (LaunchDarkly / Unleash / Flagsmith) to decouple deploy from release.
# Blue-green moves traffic; flags control feature visibility.

import ldclient
from ldclient import Context

ld_client = ldclient.get()

def is_new_checkout_enabled(user_id: str) -> bool:
    context = Context.builder(user_id).kind("user").build()
    return ld_client.variation("new-checkout-flow", context, False)

# Deployment pattern:
# 1. Deploy new code to green (feature off)
# 2. Smoke test green with feature off (safe)
# 3. Enable feature flag for 5% of users on green
# 4. Monitor metrics, then ramp to 100%
# 5. Shift all traffic to green
# 6. Keep blue on standby for 24h, then terminate
```

---

## Analysis Templates — Automated Promotion Gates

```yaml
# argo-rollout-analysis.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 30s
      count: 5
      successCondition: result[0] >= 0.99     # 99% success rate required
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{
              service="{{args.service-name}}",
              status!~"5.."
            }[2m])) /
            sum(rate(http_requests_total{
              service="{{args.service-name}}"
            }[2m]))
    - name: p99-latency
      interval: 30s
      count: 5
      successCondition: result[0] <= 0.5      # 500ms p99 threshold
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99,
              rate(http_request_duration_seconds_bucket{
                service="{{args.service-name}}"
              }[2m])
            )
```

---

## Common Failure Cases

**Green environment not receiving production-equivalent traffic during bake time**
Why: Green is tested in isolation or with synthetic traffic; real user patterns (session cookies, large payloads, authenticated flows) only appear after the full cutover.
Detect: Error rate spikes within the first 5 minutes after promotion that were absent during bake.
Fix: Route a small slice of real traffic to green during bake using `previewService` weighted routing, or use canary instead of pure blue-green for stateful-heavy flows.

**Active service selector not updating after Argo Rollouts promotion**
Why: A misconfigured `activeService` name in the Rollout spec causes the active Service's selector to remain pointing at the old (blue) pods after promotion.
Detect: `kubectl argo rollouts get rollout <name>` shows `Status: Healthy` but live traffic still returns old responses; check `kubectl get svc order-service-active -o yaml` and confirm pod selector hash.
Fix: Verify the `activeService` and `previewService` fields in the Rollout spec exactly match the Service resource names; re-apply the corrected spec and re-promote.

**Database schema incompatibility between blue and green versions**
Why: Green deploys a schema migration (column rename, type change) that blue cannot tolerate; if rollback is triggered, blue writes corrupt data or crashes.
Detect: Blue pods emit schema validation errors or ORM mapping failures immediately after rollback.
Fix: Enforce expand-contract migrations: green must be backward-compatible with blue's schema for the entire bake window; only run destructive DDL after blue is fully terminated.

**CodeDeploy deployment stuck waiting for ELB health checks on green**
Why: The green task definition's health check path or port does not match the ALB target group configuration, causing targets to remain unhealthy indefinitely.
Detect: CodeDeploy console shows deployment in `Created` state with `Waiting for ELB health check` beyond the expected timeout.
Fix: Confirm the ALB target group health check path (`/health/live`) and port match the container's exposed port; verify the security group allows the ALB to reach the green tasks on that port.

## Connections

[[cloud-hub]] · [[cloud/argo-rollouts]] · [[cloud/argocd]] · [[cloud/kubernetes]] · [[cloud/aws-ecs]] · [[cloud/github-actions]] · [[cloud/gitops-patterns]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
