---
type: concept
category: cloud
para: resource
tags: [aws, networking, vpc, transit-gateway, private-link, waf, route53]
sources: []
updated: 2026-05-01
tldr: "Beyond basic VPC: multi-VPC architectures, transit gateway, PrivateLink, WAF, DNS failover, and network performance patterns."
---

# AWS Networking — Advanced

Beyond basic VPC: multi-VPC architectures, transit gateway, PrivateLink, WAF, DNS failover, and network performance patterns.

---

## Multi-VPC Architecture

```
When you need multiple VPCs:
  - Environment isolation (prod / staging / dev in separate VPCs)
  - Compliance requirements (PCI DSS scope isolation)
  - Multi-region deployments
  - Separate teams with different security postures

Connection options:
  VPC Peering:        Direct peer, simple, but N*(N-1)/2 for N VPCs — doesn't scale
  Transit Gateway:    Hub-and-spoke, single attachment per VPC, scales to 5000 VPCs
  PrivateLink:        Expose a specific service, not full VPC access
  VPN/Direct Connect: On-premise to AWS
```

---

## Transit Gateway

```bash
# Create Transit Gateway
aws ec2 create-transit-gateway \
  --description "Central hub for all VPCs" \
  --options '{"DefaultRouteTableAssociation": "enable",
               "DefaultRouteTablePropagation": "enable",
               "AutoAcceptSharedAttachments": "disable"}'

# Attach VPCs
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-01234567890abcdef \
  --vpc-id vpc-prod-01 \
  --subnet-ids subnet-private-a subnet-private-b

aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-01234567890abcdef \
  --vpc-id vpc-staging-01 \
  --subnet-ids subnet-priv-stg-a subnet-priv-stg-b

# Route table entry: prod → staging (if cross-environment access needed)
aws ec2 create-transit-gateway-route \
  --transit-gateway-route-table-id tgw-rtb-prod \
  --destination-cidr-block 10.1.0.0/16 \
  --transit-gateway-attachment-id tgw-attach-staging
```

---

## AWS PrivateLink — Service Access Without Internet

```
PrivateLink: expose a service in one VPC securely to another VPC (or on-prem).
Traffic never traverses the internet. No VPC peering, no route table changes.

Use cases:
  - SaaS vendors exposing APIs to customer VPCs
  - Accessing AWS services (S3, Secrets Manager) from private subnets without NAT Gateway
  - Internal microservices with strict network isolation
```

```bash
# Create VPC Endpoint for S3 (gateway endpoint — free)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-prod-01 \
  --service-name com.amazonaws.eu-west-1.s3 \
  --vpc-endpoint-type Gateway \
  --route-table-ids rtb-private-a rtb-private-b

# Create VPC Endpoint for Secrets Manager (interface endpoint — hourly charge)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-prod-01 \
  --service-name com.amazonaws.eu-west-1.secretsmanager \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-private-a subnet-private-b \
  --security-group-ids sg-endpoints
```

---

## Route 53 — Advanced Routing

```python
import boto3

route53 = boto3.client("route53")
HOSTED_ZONE_ID = "Z1234567890ABC"

# Latency-based routing — route to lowest latency region
route53.change_resource_record_sets(
    HostedZoneId=HOSTED_ZONE_ID,
    ChangeBatch={"Changes": [
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "api.myapp.com",
                "Type": "A",
                "SetIdentifier": "eu-west-1",
                "Region": "eu-west-1",
                "AliasTarget": {
                    "HostedZoneId": "Z...",  # ALB hosted zone ID
                    "DNSName": "alb-eu.elb.amazonaws.com",
                    "EvaluateTargetHealth": True,
                }
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "api.myapp.com",
                "Type": "A",
                "SetIdentifier": "us-east-1",
                "Region": "us-east-1",
                "AliasTarget": {
                    "HostedZoneId": "Z...",
                    "DNSName": "alb-us.elb.amazonaws.com",
                    "EvaluateTargetHealth": True,
                }
            }
        }
    ]}
)

# Failover routing — primary/secondary
route53.change_resource_record_sets(
    HostedZoneId=HOSTED_ZONE_ID,
    ChangeBatch={"Changes": [
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "api.myapp.com",
                "Type": "A",
                "SetIdentifier": "primary",
                "Failover": "PRIMARY",
                "HealthCheckId": "hc-12345",
                "AliasTarget": {
                    "DNSName": "primary-alb.elb.amazonaws.com",
                    "EvaluateTargetHealth": True,
                    "HostedZoneId": "Z...",
                }
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "api.myapp.com",
                "Type": "A",
                "SetIdentifier": "secondary",
                "Failover": "SECONDARY",
                "AliasTarget": {
                    "DNSName": "dr-alb.elb.amazonaws.com",
                    "EvaluateTargetHealth": False,
                    "HostedZoneId": "Z...",
                }
            }
        }
    ]}
)
```

---

## WAF Rate Limiting

```python
wafv2 = boto3.client("wafv2", region_name="us-east-1")  # CloudFront WAF must be us-east-1

# Create a rate-based rule (IP-level rate limiting)
response = wafv2.create_web_acl(
    Name="MyAppWAF",
    Scope="CLOUDFRONT",
    DefaultAction={"Allow": {}},
    Rules=[
        {
            "Name": "RateLimitRule",
            "Priority": 1,
            "Action": {"Block": {}},
            "Statement": {
                "RateBasedStatement": {
                    "Limit": 2000,            # max 2000 requests per 5 minutes per IP
                    "AggregateKeyType": "IP",
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": True,
                "CloudWatchMetricsEnabled": True,
                "MetricName": "RateLimitRule",
            },
        },
        {
            "Name": "AWSManagedRulesCore",
            "Priority": 2,
            "OverrideAction": {"None": {}},
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesCommonRuleSet",
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": True,
                "CloudWatchMetricsEnabled": True,
                "MetricName": "CommonRuleSet",
            },
        },
    ],
    VisibilityConfig={
        "SampledRequestsEnabled": True,
        "CloudWatchMetricsEnabled": True,
        "MetricName": "MyAppWAF",
    },
)
```

---

## Network Performance

```
Placement Groups:
  Cluster: physical proximity — lowest latency, highest throughput (10 Gbps+)
           Use: HPC, distributed cache, ML training
  Spread:  different hardware — maximum fault tolerance
           Use: critical services that can't all fail together
  Partition: AZ-level failure isolation + grouped placement
             Use: HDFS, Cassandra, Kafka brokers

Enhanced networking:
  ENA (Elastic Network Adapter): up to 100 Gbps, default on modern instances
  EFA (Elastic Fabric Adapter): for HPC, bypasses OS network stack

Jumbo frames:
  9001 MTU within VPC (vs 1500 default internet)
  Reduces overhead for large data transfers between EC2 instances
```

---

## Common Failure Cases

**Transit Gateway routing loop — VPCs can reach each other unintentionally**
Why: when default route table association and propagation are both enabled, all attached VPCs can route to all others by default; this breaks environment isolation (prod can reach dev).
Detect: a host in the dev VPC can ping or connect to the prod VPC's private IPs.
Fix: disable `DefaultRouteTableAssociation` and `DefaultRouteTablePropagation` at Transit Gateway creation, then create explicit per-environment route tables with only the intended peering routes.

**PrivateLink interface endpoint DNS not resolving inside VPC**
Why: the VPC does not have DNS resolution or DNS hostnames enabled, so the private DNS name for the endpoint is not queryable within the VPC.
Detect: `nslookup secretsmanager.eu-west-1.amazonaws.com` from an EC2 instance returns the public IP, not the endpoint's private IP.
Fix: enable `enableDnsHostnames` and `enableDnsSupport` on the VPC; both must be `true` for private DNS override to work.

**WAF blocking legitimate traffic — AWSManagedRulesCommonRuleSet false positive**
Why: a managed rule (e.g., `SizeRestrictions_BODY` or `CrossSiteScripting_BODY`) is blocking requests with large payloads or special characters that your API legitimately handles.
Detect: CloudWatch WAF metrics show `BlockedRequests` spiking; blocked request samples in the WAF console show the offending rule name and the legitimate request body.
Fix: set the specific managed rule to `Count` mode (override action) rather than blocking, then add a custom rule that allows your known-good traffic pattern before applying the managed rule.

**Route 53 failover not triggering — health check always healthy**
Why: the health check is checking the ALB's `/` path which returns 200 even when the application is degraded, or the health check's IP range is blocked by a security group.
Detect: the primary endpoint is serving errors but Route 53 continues routing traffic to it; the health check console shows `Healthy`.
Fix: configure the health check to call a dedicated `/health/deep` endpoint that tests database connectivity; ensure the Route 53 health check IP ranges (published by AWS) are allowed in the security group.

## Connections
[[cloud-hub]] · [[cloud/cloud-networking]] · [[cloud/cloud-security]] · [[cloud/aws-core]] · [[cloud/disaster-recovery]] · [[cloud/multi-tenancy]]
