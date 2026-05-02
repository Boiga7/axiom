---
type: concept
category: cloud
para: resource
tags: [aws, cost-optimisation, finops, spot, reserved-instances, rightsizing]
sources: []
updated: 2026-05-01
tldr: "FinOps discipline for managing cloud spend. The goal is unit economics: cost per transaction, cost per user, cost per model inference — not absolute spend."
---

# Cloud Cost Optimisation

FinOps discipline for managing cloud spend. The goal is unit economics: cost per transaction, cost per user, cost per model inference. Not absolute spend.

---

## Where Cloud Bills Come From

1. **Compute** — EC2, Lambda, ECS, Fargate (usually 50-70% of bill)
2. **Storage** — S3, EBS, RDS, EFS
3. **Data transfer** — egress out of AWS is expensive; cross-AZ traffic adds up
4. **Managed services** — RDS, ElastiCache, MSK, NAT Gateway
5. **Idle/orphaned resources** — unused EBS volumes, unattached EIPs, stopped EC2

---

## Rightsizing

Match instance size to actual resource utilisation. AWS Compute Optimizer makes recommendations based on 14 days of CloudWatch metrics.

```bash
# Enable Compute Optimizer
aws compute-optimizer update-enrollment-status --status Active

# Get EC2 recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --account-ids 123456789012 \
  --query 'instanceRecommendations[?finding==`OVER_PROVISIONED`].[instanceArn,recommendationOptions[0].instanceType]' \
  --output table

# Get Lambda recommendations
aws compute-optimizer get-lambda-function-recommendations \
  --query 'lambdaFunctionRecommendations[?finding==`OVER_PROVISIONED`].[functionArn,memorySizeRecommendationOptions[0].memorySize]'
```

Target: CPU utilisation at 60-80% average. Below 30% consistently = overprovisioned.

---

## Spot Instances

Up to 90% cheaper than On-Demand. Instances can be interrupted with 2-minute warning. Suitable for:
- Batch jobs, ML training, CI/CD runners, dev environments
- NOT for databases, payment processing, or stateful services without checkpointing

```python
# boto3 — request Spot fleet
ec2 = boto3.client('ec2')

ec2.request_spot_fleet(
    SpotFleetRequestConfig={
        'IamFleetRole': 'arn:aws:iam::123456789:role/AmazonEC2SpotFleetRole',
        'TargetCapacity': 10,
        'LaunchSpecifications': [
            {
                'InstanceType': 'c5.xlarge',
                'ImageId': 'ami-xxxxxxxxx',
                'SubnetId': 'subnet-xxxxxxxxx',
            },
            {
                'InstanceType': 'c5a.xlarge',   # fallback type
                'ImageId': 'ami-xxxxxxxxx',
                'SubnetId': 'subnet-xxxxxxxxx',
            }
        ],
        'AllocationStrategy': 'capacityOptimized',  # prefer AZs with most capacity
        'SpotPrice': '0.10',
    }
)
```

**EKS Spot:** Use Karpenter with mixed instance types and multiple AZs. Configure pod disruption budgets so Spot interruptions drain gracefully.

---

## Savings Plans and Reserved Instances

| Option | Commitment | Saving | Flexibility |
|---|---|---|---|
| On-Demand | None | 0% | Maximum |
| Compute Savings Plan | 1 or 3 year, $/hour | Up to 66% | Any region, any instance type, Lambda, Fargate |
| EC2 Savings Plan | 1 or 3 year | Up to 72% | Specific instance family + region |
| Reserved Instance | 1 or 3 year | Up to 75% | Specific type, AZ, OS |

Rule of thumb: buy Compute Savings Plans for 60-70% of your baseline compute spend. Let Spot cover spiky/batch workloads. On-Demand covers the rest.

---

## S3 Cost Reduction

```bash
# Intelligent-Tiering: auto-moves objects based on access patterns
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-bucket \
  --id AllObjects \
  --intelligent-tiering-configuration '{
    "Id": "AllObjects",
    "Status": "Enabled",
    "Tierings": [
      {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
      {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
    ]
  }'

# Lifecycle rule — transition and expire old versions
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json
```

```json
// lifecycle.json
{
  "Rules": [
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [{"Days": 30, "StorageClass": "STANDARD_IA"}],
      "NoncurrentVersionExpiration": {"NoncurrentDays": 30}
    }
  ]
}
```

---

## Data Transfer Costs

- **Egress to internet:** $0.09/GB (most regions) — use CloudFront to cache and reduce origin calls
- **Cross-AZ:** $0.01/GB each way — keep services in the same AZ where latency allows; use VPC endpoints for S3/DynamoDB (free within VPC)
- **NAT Gateway:** $0.045/GB processed — route S3/DynamoDB through Gateway VPC Endpoints instead (free)

```bash
# Create S3 Gateway VPC endpoint (eliminates NAT Gateway charges for S3)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxxx \
  --service-name com.amazonaws.eu-west-1.s3 \
  --route-table-ids rtb-xxxxxxxxx
```

---

## Cost Tagging Strategy

```bash
# Enforce tagging via SCP or Tag Policy
# Required tags: Environment, Team, Service, CostCentre

# Find untagged resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters 'Key=Environment,Values=production' \
  --query 'ResourceTagMappingList[?Tags[?Key!=`CostCentre`]].ResourceARN'

# Activate tags for Cost Explorer
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Team,Status=Active
```

---

## Cost Monitoring

```bash
# Set billing alert (CloudWatch → SNS)
aws cloudwatch put-metric-alarm \
  --alarm-name MonthlySpendAlert \
  --alarm-description "Alert when monthly spend exceeds $1000" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:billing-alerts \
  --dimensions Name=Currency,Value=USD
```

AWS Cost Explorer, Kubecost (for Kubernetes cost attribution), Infracost (Terraform cost estimation in PRs).

---

## Common Failure Cases

**Savings Plan commitment too large causes waste after a workload is decommissioned**
Why: A 3-year Compute Savings Plan was purchased against a workload that was later retired; the commitment charge continues even though the covered compute no longer runs.
Detect: Cost Explorer shows high Savings Plan coverage with low utilisation (coverage > 95% but utilisation < 60%); the Savings Plans console shows unused commitment dollars each month.
Fix: Purchase Savings Plans in tranches (30-50% of baseline spend per purchase) rather than 100% up-front; review coverage quarterly using Cost Explorer's Savings Plans Utilization report and allow partial unused plans to age out before buying replacements.

**Spot interruptions causing job re-runs that cost more than On-Demand would have**
Why: A long batch job is interrupted at 80% completion with no checkpointing; the entire job re-runs from scratch, and the total Spot compute time exceeds what On-Demand would have cost.
Detect: AWS Spot interruption notices in instance metadata appear frequently for the chosen instance type/AZ combination; CloudWatch shows repeated job start events without completion.
Fix: Implement checkpointing (save progress to S3 every N minutes); use `capacityOptimized` allocation strategy and diversify across 3+ instance types and 3 AZs to reduce interruption frequency.

**NAT Gateway data processing charges dominating the bill unexpectedly**
Why: Application servers in private subnets pull large payloads from S3 or DynamoDB through the NAT Gateway, incurring $0.045/GB charges; S3 Gateway VPC Endpoints were never created.
Detect: Cost Explorer shows NAT Gateway as a top-5 line item; the `BytesOutToDestination` metric on the NAT Gateway is consistently high.
Fix: Create Gateway VPC Endpoints for S3 and DynamoDB and add them to private subnet route tables — this is free and eliminates the NAT Gateway data charge for those services.

**EBS volumes orphaned after EC2 instance termination accumulate significant cost**
Why: By default, EBS volumes attached to terminated EC2 instances are not deleted unless `DeleteOnTermination` was set to `true` at launch time; over months, dozens of unused 100GB+ volumes accumulate.
Detect: Cost Explorer shows EBS as a top cost item while EC2 instance count is lower than expected; `aws ec2 describe-volumes --filters Name=status,Values=available` lists all unattached volumes.
Fix: Set `DeleteOnTermination: true` on all root volumes in launch templates and Auto Scaling Groups; run a monthly audit with `aws ec2 describe-volumes` and delete unattached volumes after confirming they are orphaned.

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/aws-lambda-patterns]] · [[cloud/aws-ecs]] · [[cloud/cloud-monitoring]] · [[cloud/cloud-security]]
