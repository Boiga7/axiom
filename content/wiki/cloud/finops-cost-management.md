---
type: concept
category: cloud
para: resource
tags: [finops, cost, tagging, budgets, rightsizing, savings-plans, reserved-instances]
sources: []
updated: 2026-05-01
tldr: Engineering discipline for understanding, controlling, and optimising cloud spend.
---

# FinOps and Cloud Cost Management

Engineering discipline for understanding, controlling, and optimising cloud spend.

---

## FinOps Principles

```
Three phases (FinOps Foundation):
  Inform   →  visibility into what you're spending and why
  Optimise →  identify waste, rightsize, commit for discounts
  Operate  →  embed cost accountability into engineering workflows

Key rules:
  1. Tagging is the foundation — untagged resources are invisible costs
  2. Cost follows architecture decisions, not budget decisions
  3. Engineers who create resources should see what they cost
  4. Optimise after you understand, not before
```

---

## Tagging Strategy

```python
# Enforce tags at account level via Service Control Policy
# scp-require-tags.json
SCP_POLICY = {
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "RequireCostTags",
        "Effect": "Deny",
        "Action": [
            "ec2:RunInstances",
            "rds:CreateDBInstance",
            "lambda:CreateFunction",
        ],
        "Resource": "*",
        "Condition": {
            "Null": {
                "aws:RequestTag/team": "true",
                "aws:RequestTag/service": "true",
                "aws:RequestTag/environment": "true",
            }
        }
    }]
}

# Standard tag schema
REQUIRED_TAGS = {
    "team": "platform",           # who owns this resource
    "service": "order-service",   # logical service name
    "environment": "prod",        # prod | staging | dev
    "cost-centre": "CC-1234",     # finance mapping
}
```

```python
# CDK: apply tags to all resources in a stack using Aspects
from aws_cdk import Aspects, Tags

class RequiredTagsAspect(cdk.Aspect):
    def __init__(self, tags: dict[str, str]) -> None:
        self.tags = tags

    def visit(self, node: constructs.IConstruct) -> None:
        if isinstance(node, cdk.Resource):
            for key, value in self.tags.items():
                Tags.of(node).add(key, value)

# Apply to entire app
app = cdk.App()
stack = MyStack(app, "OrderStack")
Aspects.of(stack).add(RequiredTagsAspect({
    "team": "platform",
    "service": "order-service",
    "environment": app.node.try_get_context("env") or "dev",
}))
```

---

## AWS Budgets and Alerts

```python
import boto3

budgets = boto3.client("budgets")

def create_service_budget(account_id: str, service: str, monthly_limit_usd: float,
                          alert_email: str) -> None:
    budgets.create_budget(
        AccountId=account_id,
        Budget={
            "BudgetName": f"{service}-monthly",
            "BudgetLimit": {"Amount": str(monthly_limit_usd), "Unit": "USD"},
            "TimeUnit": "MONTHLY",
            "BudgetType": "COST",
            "CostFilters": {
                "TagKeyValue": [f"user:service${service}"]
            },
        },
        NotificationsWithSubscribers=[
            {
                "Notification": {
                    "NotificationType": "ACTUAL",
                    "ComparisonOperator": "GREATER_THAN",
                    "Threshold": 80,      # alert at 80% of budget
                    "ThresholdType": "PERCENTAGE",
                },
                "Subscribers": [{"SubscriptionType": "EMAIL", "Address": alert_email}],
            },
            {
                "Notification": {
                    "NotificationType": "FORECASTED",
                    "ComparisonOperator": "GREATER_THAN",
                    "Threshold": 100,     # alert if forecasted to exceed
                    "ThresholdType": "PERCENTAGE",
                },
                "Subscribers": [{"SubscriptionType": "EMAIL", "Address": alert_email}],
            },
        ],
    )
```

---

## Cost Explorer — Programmatic Analysis

```python
import boto3
from datetime import date, timedelta

ce = boto3.client("ce", region_name="us-east-1")

def get_cost_by_service(days: int = 30) -> dict[str, float]:
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=days)).isoformat()

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start, "End": end},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        Filter={
            "Tags": {
                "Key": "environment",
                "Values": ["prod"],
            }
        },
    )

    costs = {}
    for result in response["ResultsByTime"]:
        for group in result["Groups"]:
            service = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            costs[service] = costs.get(service, 0) + cost

    return dict(sorted(costs.items(), key=lambda x: x[1], reverse=True))


def get_rightsizing_recommendations() -> list[dict]:
    response = ce.get_rightsizing_recommendation(
        Service="AmazonEC2",
        Configuration={
            "RecommendationTarget": "CROSS_INSTANCE_FAMILY",
            "BenefitsConsidered": True,
        },
    )
    return [
        {
            "instance_id": r["CurrentInstance"]["ResourceId"],
            "current_type": r["CurrentInstance"]["ResourceDetails"]["EC2ResourceDetails"]["InstanceType"],
            "recommended_type": r["RightsizingOptions"][0]["ModifyRecommendationDetail"]["TargetInstances"][0]["ResourceDetails"]["EC2ResourceDetails"]["InstanceType"],
            "monthly_savings": float(r["RightsizingOptions"][0]["ModifyRecommendationDetail"]["TargetInstances"][0]["EstimatedMonthlyGain"]),
        }
        for r in response["RightsizingRecommendations"]
        if r["RightsizingOptions"]
    ]
```

---

## Savings Plans vs Reserved Instances

```
Savings Plans (preferred — more flexible):
  Compute SP:   applies to EC2 (any family/size/region/OS), Fargate, Lambda
                Up to 66% discount vs on-demand
  EC2 Instance SP: applies to a specific EC2 family in a region (higher discount ~72%)
  SageMaker SP: applies to SageMaker ML workloads

Reserved Instances:
  Standard RI:  specific instance type, region, OS — up to 72% discount
  Convertible RI: can exchange for different type — up to 54% discount
  More rigid than Savings Plans; use when you have very stable, predictable workloads

Commitment terms: 1-year (lower discount) or 3-year (higher discount)
Payment: All upfront (best discount), partial upfront, no upfront

Strategy:
  1. Run on-demand for 2-3 months to establish baseline
  2. Use Compute Savings Plans for first 40-60% of stable spend
  3. Cover remainder with on-demand + Spot where possible
  4. Review quarterly — purchase in small tranches, not one big commitment
```

---

## Spot Instances

```python
# CDK: ECS service with Spot Fargate capacity provider
fargate_spot = ecs.FargateService(self, "SpotService",
    cluster=cluster,
    task_definition=task_def,
    capacity_provider_strategies=[
        ecs.CapacityProviderStrategy(
            capacity_provider="FARGATE_SPOT",
            weight=4,           # 80% Spot
            base=0,
        ),
        ecs.CapacityProviderStrategy(
            capacity_provider="FARGATE",
            weight=1,           # 20% on-demand fallback
            base=1,             # always keep at least 1 on-demand task
        ),
    ],
)
# Spot Fargate is ~70% cheaper than on-demand.
# Use for: batch processing, stateless web tiers with graceful shutdown (SIGTERM handler)
# Avoid for: databases, stateful workloads, tasks that can't tolerate 2-min interruption notice
```

---

## Cost Dashboard in CloudWatch

```python
# Emit daily cost as a custom metric for dashboarding
import schedule
import time

def emit_daily_costs() -> None:
    costs = get_cost_by_service(days=1)
    cw = boto3.client("cloudwatch")

    for service_name, cost in costs.items():
        cw.put_metric_data(
            Namespace="FinOps",
            MetricData=[{
                "MetricName": "DailyServiceCost",
                "Dimensions": [
                    {"Name": "Service", "Value": service_name[:256]},
                    {"Name": "Environment", "Value": "prod"},
                ],
                "Value": cost,
                "Unit": "None",   # dollars
            }],
        )

# Run daily at 8am UTC (Lambda schedule or cron job)
```

---

## S3 Cost Reduction

```bash
# Intelligent-Tiering: auto-moves objects based on access patterns
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-bucket --id AllObjects \
  --intelligent-tiering-configuration '{
    "Id": "AllObjects", "Status": "Enabled",
    "Tierings": [
      {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
      {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
    ]
  }'

# Lifecycle rule — transition old objects to IA, expire old versions
# lifecycle.json: {"Rules": [{"ID": "TransitionToIA", "Status": "Enabled",
#   "Filter": {}, "Transitions": [{"Days": 30, "StorageClass": "STANDARD_IA"}],
#   "NoncurrentVersionExpiration": {"NoncurrentDays": 30}}]}
aws s3api put-bucket-lifecycle-configuration --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json
```

---

## Data Transfer Cost Reduction

- **Egress to internet:** $0.09/GB — use CloudFront to cache and reduce origin calls
- **Cross-AZ:** $0.01/GB each way — keep services in the same AZ where latency allows
- **NAT Gateway:** $0.045/GB processed — route S3/DynamoDB through Gateway VPC Endpoints (free within VPC)

```bash
# Create S3 Gateway VPC endpoint (eliminates NAT Gateway charges for S3)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxxx \
  --service-name com.amazonaws.eu-west-1.s3 \
  --route-table-ids rtb-xxxxxxxxx
```

---

## Common Failure Cases

**Cost allocation broken because tagging SCP was added after resources were created**
Why: The SCP that enforces required tags (`team`, `service`) only applies at resource creation time; existing resources created before the SCP are not retroactively tagged and show as unallocated cost.
Detect: Cost Explorer shows a large "No tag" segment in the tag-breakdown view; `aws resourcegroupstaggingapi get-resources --tag-filters` returns many untagged resources.
Fix: Run AWS Config rule `required-tags` to identify untagged resources; use AWS Tag Editor to bulk-tag existing resources; enforce the SCP going forward and set a 30-day remediation deadline for untagged legacy resources.

**Budget alert fires too late because it checks monthly actual spend, not forecasted spend**
Why: An `ACTUAL` spend threshold of 80% only alerts after 80% of the budget is already consumed; a spend spike at month-end can blow the budget before the alert is actionable.
Detect: Budget alarm fires with less than 5 days left in the month, leaving no time to reduce spending before the threshold is exceeded.
Fix: Add a `FORECASTED` notification at 80% of the budget in addition to the `ACTUAL` 80% notification (as shown in the code above); the forecast alert gives advance warning when spend trajectory is off.

**Savings Plan purchased against a service that is being migrated, leaving commitment stranded**
Why: A 1-year EC2 Savings Plan was purchased against an instance family (`c5`) that the platform team plans to migrate to Graviton (`c7g`) within 6 months; EC2 Instance Savings Plans are family-specific and cannot cover Graviton instances.
Detect: Savings Plans Utilization drops below 70% after the Graviton migration; Cost Explorer shows the old SP covering near-zero usage.
Fix: Use Compute Savings Plans instead of EC2 Instance Savings Plans — Compute SPs apply to any instance family, any OS, and also cover Fargate and Lambda, providing flexibility across a migration.

**Cost dashboard showing yesterday's data mistaken for real-time spend**
Why: AWS Cost Explorer and the Billing console have a 24-hour data lag; teams building custom cost dashboards from the Cost Explorer API assume the latest data reflects current-day spend.
Detect: Cost metrics appear stable during an incident that is clearly generating unusual traffic; the dashboard shows correct totals only after a 24-hour delay.
Fix: Use CloudWatch `EstimatedCharges` metric (updated multiple times per day) for near-real-time billing alerts; document the 24-hour lag prominently on the cost dashboard so engineers do not mistake stale data for current state.

## Connections

[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/infrastructure-monitoring]] · [[cloud/github-actions]] · [[cloud/kubernetes]]
