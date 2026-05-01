---
type: concept
category: cloud
para: resource
tags: [alb, nlb, global-accelerator, target-groups, weighted-routing, health-checks, sticky-sessions]
sources: []
updated: 2026-05-01
---

# Advanced Load Balancing on AWS

ALB, NLB, Global Accelerator, and traffic management patterns for high-availability architectures.

---

## ALB vs NLB

```
ALB (Application Load Balancer):
  Layer: 7 (HTTP/HTTPS/WebSocket/gRPC)
  Routing: path-based, host-based, header-based, query string
  Target types: IP, instance, Lambda
  Use for: microservices, REST APIs, WebSocket, gRPC, content-based routing

NLB (Network Load Balancer):
  Layer: 4 (TCP/UDP/TLS)
  Routing: port-based only
  Target types: IP, instance, ALB
  Performance: ultra-low latency (100μs), millions of requests/second
  Use for: gaming, IoT, financial trading, static IP requirement, TCP passthrough

Both:
  - Free tier of health checks
  - Integration with AWS Certificate Manager (TLS termination)
  - Access logs to S3
  - Connection draining (deregistration delay)
```

---

## ALB Advanced Routing (CDK)

```python
from aws_cdk import (
    aws_elasticloadbalancingv2 as elbv2,
    aws_ec2 as ec2,
)

alb = elbv2.ApplicationLoadBalancer(self, "ALB",
    vpc=vpc,
    internet_facing=True,
    deletion_protection=True,
)

# Main HTTPS listener
listener = alb.add_listener("HTTPS",
    port=443,
    certificates=[cert],
    default_action=elbv2.ListenerAction.fixed_response(
        404, content_type="application/json",
        message_body='{"error": "not found"}',
    ),
)

# Route /api/v1/* to v1 service
v1_tg = elbv2.ApplicationTargetGroup(self, "V1TG",
    vpc=vpc, port=8000, protocol=elbv2.ApplicationProtocol.HTTP,
    health_check=elbv2.HealthCheck(path="/health/live", healthy_http_codes="200"),
    deregistration_delay=Duration.seconds(30),
)

listener.add_action("V1Route",
    priority=10,
    conditions=[elbv2.ListenerCondition.path_patterns(["/api/v1/*"])],
    action=elbv2.ListenerAction.forward([v1_tg]),
)

# Route /api/v2/* to v2 service with weighted target groups (canary)
v2_stable_tg = elbv2.ApplicationTargetGroup(self, "V2StableTG", ...)
v2_canary_tg = elbv2.ApplicationTargetGroup(self, "V2CanaryTG", ...)

listener.add_action("V2Route",
    priority=20,
    conditions=[elbv2.ListenerCondition.path_patterns(["/api/v2/*"])],
    action=elbv2.ListenerAction.weighted_forward([
        elbv2.WeightedTargetGroup(target_group=v2_stable_tg, weight=90),
        elbv2.WeightedTargetGroup(target_group=v2_canary_tg, weight=10),   # 10% canary
    ]),
)

# Redirect HTTP → HTTPS
alb.add_listener("HTTP",
    port=80,
    default_action=elbv2.ListenerAction.redirect(
        protocol="HTTPS", port="443", permanent=True,
    ),
)
```

---

## Health Checks

```python
# ALB health check config
health_check = elbv2.HealthCheck(
    path="/health/ready",           # use /ready not /live for LB health
    port="traffic-port",
    protocol=elbv2.Protocol.HTTP,
    healthy_http_codes="200",
    interval=Duration.seconds(30),
    timeout=Duration.seconds(5),
    healthy_threshold_count=2,     # 2 consecutive successes = healthy
    unhealthy_threshold_count=3,   # 3 consecutive failures = unhealthy
)

# Health check endpoint (FastAPI)
@app.get("/health/ready")
async def readiness() -> dict:
    """Returns 200 only when the service is ready to handle traffic."""
    # Check DB connection
    try:
        await db.execute("SELECT 1")
    except Exception:
        raise HTTPException(503, "Database unavailable")

    # Check cache
    try:
        await redis.ping()
    except Exception:
        raise HTTPException(503, "Cache unavailable")

    return {"status": "ready"}

# /live is for the orchestrator (K8s liveness probe)
# /ready is for the load balancer (traffic routing)
# Never check external dependencies in /live — only in /ready
```

---

## Sticky Sessions (Session Affinity)

```python
# Enable sticky sessions for stateful applications
tg = elbv2.ApplicationTargetGroup(self, "StatefulTG",
    vpc=vpc,
    port=8000,
    stickiness_cookie_duration=Duration.days(1),   # ALB-managed cookie
)

# Duration-based stickiness (for OIDC-authenticated apps)
tg = elbv2.ApplicationTargetGroup(self, "OIDCStatefulTG",
    vpc=vpc,
    port=8000,
    stickiness_cookie_name="AWSALBAPP",   # application-based cookie
    stickiness_cookie_duration=Duration.hours(8),
)

# Note: sticky sessions reduce the effectiveness of load balancing.
# Design stateless services where possible — store session in Redis instead.
```

---

## Global Accelerator

```
AWS Global Accelerator routes traffic through AWS's private backbone,
not the public internet. Dramatically reduces latency for global users.

Use case:
  - Multi-region active-active
  - Need static Anycast IP addresses (firewall whitelisting)
  - Non-HTTP protocols that ALB doesn't support

Typical latency improvement: 20-50% for users > 500km from the nearest region.
Cost: ~$0.025/hour + data transfer premium over standard CloudFront.
```

```python
from aws_cdk import aws_globalaccelerator as ga, aws_globalaccelerator_endpoints as ga_endpoints

accelerator = ga.Accelerator(self, "GlobalAccelerator")

listener = accelerator.add_listener("Listener",
    port_ranges=[ga.PortRange(from_port=443, to_port=443)],
    protocol=ga.ConnectionProtocol.TCP,
)

# Add ALB endpoints in two regions
listener.add_endpoint_group("EU",
    endpoints=[
        ga_endpoints.ApplicationLoadBalancerEndpoint(eu_alb, weight=128)
    ],
    region="eu-west-1",
)

listener.add_endpoint_group("US",
    endpoints=[
        ga_endpoints.ApplicationLoadBalancerEndpoint(us_alb, weight=128)
    ],
    region="us-east-1",
)
```

---

## Connection Draining

```python
# Deregistration delay: keep targets in service while in-flight requests complete
tg = elbv2.ApplicationTargetGroup(self, "TG",
    vpc=vpc,
    port=8000,
    deregistration_delay=Duration.seconds(30),   # default is 300s — usually too long
)

# For zero-downtime deployments:
# 1. ALB marks old target as draining (no new connections)
# 2. In-flight requests complete within deregistration_delay
# 3. Old target is deregistered
# 4. New target receives traffic

# If your requests complete in < 5s: use deregistration_delay=10
# If your service has long-running operations: increase to 60-120s
# Match to your p99 request duration + a buffer
```

---

## Connections

[[cloud-hub]] · [[cloud/aws-ecs]] · [[cloud/kubernetes]] · [[cloud/blue-green-deployment]] · [[cloud/aws-api-gateway]] · [[cloud/cloud-networking]]
