---
type: concept
category: cloud
para: resource
tags: [aws, security, iam, guardduty, security-hub, waf, scps]
sources: []
updated: 2026-05-01
---

# Cloud Security

Securing AWS infrastructure: IAM least privilege, preventive controls (SCPs, resource policies), detective controls (GuardDuty, CloudTrail, Security Hub), and network security (WAF, Security Groups, NACLs).

---

## IAM Best Practices

```
Never use root account — lock it, enable MFA, no access keys
Use IAM roles for everything that runs (EC2, Lambda, ECS tasks, GitHub Actions OIDC)
Least privilege — start with deny all, add only what's needed
Review unused permissions with IAM Access Analyzer
```

```json
// Least-privilege Lambda execution role example
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOrdersTable",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:eu-west-1:123456789:table/Orders"
    },
    {
      "Sid": "ReadSecretsManagerSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:eu-west-1:123456789:secret:myapp/db-*"
    },
    {
      "Sid": "BasicLambdaLogging",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## Service Control Policies (SCPs)

SCPs are guardrails on AWS Organizations — they restrict what member accounts can do even if their IAM policies allow it. They do not grant permissions.

```json
// Deny leaving the organisation
{
  "Sid": "DenyLeaveOrg",
  "Effect": "Deny",
  "Action": "organizations:LeaveOrganization",
  "Resource": "*"
}

// Deny creating resources outside approved regions
{
  "Sid": "DenyNonEURegions",
  "Effect": "Deny",
  "NotAction": [
    "iam:*",
    "organizations:*",
    "support:*",
    "cloudfront:*"
  ],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["eu-west-1", "eu-west-2", "eu-central-1"]
    }
  }
}

// Require encryption on S3 buckets
{
  "Sid": "DenyUnencryptedS3Puts",
  "Effect": "Deny",
  "Action": "s3:PutObject",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "s3:x-amz-server-side-encryption": ["aws:kms", "AES256"]
    }
  }
}
```

---

## GuardDuty

Threat detection service. Analyses CloudTrail, VPC Flow Logs, DNS logs, S3 data events, EKS audit logs. No agents. ML-based anomaly detection.

```bash
# Enable GuardDuty
aws guardduty create-detector --enable --finding-publishing-frequency SIX_HOURS

# List high-severity findings
aws guardduty list-findings \
  --detector-id $(aws guardduty list-detectors --query 'DetectorIds[0]' --output text) \
  --finding-criteria '{
    "Criterion": {
      "severity": {"Gte": 7}
    }
  }'
```

Key finding types: UnauthorizedAccess:IAMUser/ConsoleLogin, CryptoCurrency:EC2/BitcoinTool, Recon:IAMUser/UserPermissions, Trojan:EC2/BlackholeTraffic.

---

## AWS WAF

Web Application Firewall. Protects CloudFront, ALB, API Gateway, AppSync from OWASP Top 10, bots, and rate abuse.

```bash
# Create WAF WebACL with managed rule groups
aws wafv2 create-web-acl \
  --name myapp-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "OverrideAction": {"None": {}},
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSet"
      }
    },
    {
      "Name": "RateLimitRule",
      "Priority": 2,
      "Action": {"Block": {}},
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    }
  ]' \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=myapp-waf \
  --region eu-west-1
```

---

## Security Hub

Aggregates findings from GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager, and third-party tools. Scores compliance against CIS AWS Foundations Benchmark, PCI DSS, AWS Foundational Security Best Practices.

```bash
aws securityhub enable-security-hub --enable-default-standards

# Get critical findings
aws securityhub get-findings \
  --filters '{"SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}], "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}]}' \
  --query 'Findings[*].[Title, ProductName, AwsAccountId]' \
  --output table
```

---

## Secrets — Never in Code or Environment Variables

```bash
# Store in Secrets Manager, not .env
aws secretsmanager create-secret \
  --name myapp/prod/database \
  --secret-string '{"host":"db.prod","password":"secure123","username":"app"}'

# Rotate automatically
aws secretsmanager rotate-secret \
  --secret-id myapp/prod/database \
  --rotation-lambda-arn arn:aws:lambda:eu-west-1:123456789:function:SecretsRotation
```

Use External Secrets Operator to sync Secrets Manager → Kubernetes Secrets. Never mount raw credentials as environment variables in ECS or Lambda.

---

## CloudTrail — Audit Log

```bash
# Enable CloudTrail for all regions
aws cloudtrail create-trail \
  --name myapp-audit \
  --s3-bucket-name myapp-cloudtrail-logs \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --include-global-service-events

# Query CloudTrail with Athena for incident investigation
# SELECT * FROM cloudtrail_logs WHERE eventname = 'DeleteBucket' AND eventtime > '2026-05-01'
```

---

## Connections
[[cloud-hub]] · [[cloud/secrets-management]] · [[cloud/cloud-networking]] · [[cloud/aws-cdk]] · [[security/guardrails]] · [[cs-fundamentals/auth-patterns]]
