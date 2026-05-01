---
type: concept
category: cloud
para: resource
tags: [security-hub, config, guardduty, inspector, compliance, waf, macie, aws-security]
sources: []
updated: 2026-05-01
---

# AWS Security and Compliance

Security Hub, GuardDuty, Config, Inspector, and WAF — the AWS security control plane.

---

## Security Hub

```
Central aggregator for findings across all AWS security services.
Aggregates: GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager

Security standards available:
  - AWS Foundational Security Best Practices (FSBP) — recommended starting point
  - CIS AWS Foundations Benchmark
  - PCI DSS
  - NIST SP 800-53

Each control generates PASS/FAIL findings. Failed controls become findings in Security Hub.
```

```python
# Enable Security Hub and standards via CDK
from aws_cdk import aws_securityhub as securityhub

hub = securityhub.CfnHub(self, "SecurityHub",
    auto_enable_controls=True,
    enable_default_standards=True,   # enables AWS FSBP by default
)

# Query findings programmatically
import boto3

sh = boto3.client("securityhub", region_name="eu-west-1")

def get_critical_findings(max_results: int = 100) -> list[dict]:
    response = sh.get_findings(
        Filters={
            "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
            "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
            "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}],
        },
        MaxResults=max_results,
    )
    return response["Findings"]

def suppress_finding(finding_arn: str, reason: str) -> None:
    sh.batch_update_findings(
        FindingIdentifiers=[{"Id": finding_arn, "ProductArn": "..."}],
        Workflow={"Status": "SUPPRESSED"},
        Note={"Text": reason, "UpdatedBy": "security-team"},
    )
```

---

## AWS Config — Resource Compliance

```python
# Custom Config rule: check that S3 buckets have versioning enabled
import json

def evaluate_compliance(configuration_item: dict, rule_parameters: dict) -> str:
    """Returns COMPLIANT or NON_COMPLIANT."""
    if configuration_item["resourceType"] != "AWS::S3::Bucket":
        return "NOT_APPLICABLE"

    config_str = configuration_item.get("configuration", "{}")
    config = json.loads(config_str) if isinstance(config_str, str) else config_str

    versioning = config.get("versioningConfiguration", {})
    return "COMPLIANT" if versioning.get("status") == "Enabled" else "NON_COMPLIANT"

def lambda_handler(event: dict, context) -> None:
    import boto3
    config_client = boto3.client("config")
    invoking_event = json.loads(event["invokingEvent"])
    ci = invoking_event["configurationItem"]

    evaluation = {
        "ComplianceResourceType": ci["resourceType"],
        "ComplianceResourceId": ci["resourceId"],
        "ComplianceType": evaluate_compliance(ci, {}),
        "OrderingTimestamp": ci["configurationItemCaptureTime"],
    }

    config_client.put_evaluations(
        Evaluations=[evaluation],
        ResultToken=event["resultToken"],
    )
```

```python
# CDK: managed Config rules (no Lambda required)
from aws_cdk import aws_config as config

# S3 public access blocked
config.ManagedRule(self, "S3PublicAccess",
    identifier=config.ManagedRuleIdentifiers.S3_BUCKET_PUBLIC_READ_PROHIBITED,
)

# RDS encryption at rest
config.ManagedRule(self, "RDSEncryption",
    identifier=config.ManagedRuleIdentifiers.RDS_STORAGE_ENCRYPTED,
)

# CloudTrail enabled
config.ManagedRule(self, "CloudTrailEnabled",
    identifier=config.ManagedRuleIdentifiers.CLOUD_TRAIL_ENABLED,
)

# Root account MFA
config.ManagedRule(self, "RootMFA",
    identifier=config.ManagedRuleIdentifiers.ROOT_ACCOUNT_MFA_ENABLED,
)
```

---

## GuardDuty

```python
# Enable GuardDuty (per region) — detects threats from CloudTrail, VPC Flow Logs, DNS
import boto3

gd = boto3.client("guardduty", region_name="eu-west-1")

# Enable (only needed if not already enabled)
def enable_guardduty() -> str:
    response = gd.create_detector(
        Enable=True,
        FindingPublishingFrequency="SIX_HOURS",   # how often to publish to CloudWatch
        DataSources={
            "S3Logs": {"Enable": True},
            "Kubernetes": {"AuditLogs": {"Enable": True}},
            "MalwareProtection": {"ScanEc2InstanceWithFindings": {"EbsVolumes": True}},
        },
    )
    return response["DetectorId"]

# React to GuardDuty findings via EventBridge
# Event pattern for critical GuardDuty findings:
GUARDDUTY_EVENT_PATTERN = {
    "source": ["aws.guardduty"],
    "detail-type": ["GuardDuty Finding"],
    "detail": {
        "severity": [{"numeric": [">=", 7]}]   # High (7-8.9) and Critical (9-10)
    },
}

# GuardDuty finding types to watch for:
# UnauthorizedAccess:EC2/TorIPCaller   — Tor exit node access
# Recon:IAMUser/MaliciousIPCaller      — reconnaissance from known malicious IP
# CryptoCurrency:EC2/BitcoinTool       — crypto mining detected
# Trojan:EC2/BlackholeTraffic          — EC2 communicating with C2 server
# PrivilegeEscalation:IAMUser          — unusual privilege escalation
```

---

## Inspector v2

```python
# Amazon Inspector v2: vulnerability scanning for EC2, ECR images, Lambda
# Enabled per region; automatically scans supported resources

import boto3

inspector = boto3.client("inspector2", region_name="eu-west-1")

def get_critical_vulnerabilities(max_results: int = 100) -> list[dict]:
    response = inspector.list_findings(
        filterCriteria={
            "severity": [{"comparison": "EQUALS", "value": "CRITICAL"}],
            "findingStatus": [{"comparison": "EQUALS", "value": "ACTIVE"}],
        },
        maxResults=max_results,
    )
    return [
        {
            "title": f["title"],
            "resource": f["resources"][0]["type"],
            "resource_id": f["resources"][0]["id"],
            "cve": f.get("packageVulnerabilityDetails", {}).get("vulnerabilityId"),
            "severity": f["severity"],
            "fix_available": f.get("fixAvailable") == "YES",
        }
        for f in response["findings"]
    ]

# Inspector findings in ECR → enforce in CI:
# Fail the build if Inspector reports critical CVEs in your container image
```

---

## WAF Rate Limiting + IP Blocking

```python
from aws_cdk import aws_wafv2 as waf

# Create WAF WebACL with rate limiting and AWS managed rules
web_acl = waf.CfnWebACL(self, "ApiWAF",
    scope="REGIONAL",   # use CLOUDFRONT for CloudFront distributions
    default_action=waf.CfnWebACL.DefaultActionProperty(allow={}),
    visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
        cloud_watch_metrics_enabled=True,
        metric_name="ApiWAF",
        sampled_requests_enabled=True,
    ),
    rules=[
        # Rate limit: block IPs making > 2000 requests per 5 minutes
        waf.CfnWebACL.RuleProperty(
            name="RateLimit",
            priority=10,
            action=waf.CfnWebACL.RuleActionProperty(block={}),
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name="RateLimit",
                sampled_requests_enabled=True,
            ),
            statement=waf.CfnWebACL.StatementProperty(
                rate_based_statement=waf.CfnWebACL.RateBasedStatementProperty(
                    limit=2000,
                    aggregate_key_type="IP",
                ),
            ),
        ),
        # AWS Managed Rules: known bad inputs (SQL injection, XSS)
        waf.CfnWebACL.RuleProperty(
            name="AWSManagedRulesKnownBadInputsRuleSet",
            priority=20,
            override_action=waf.CfnWebACL.OverrideActionProperty(none={}),
            visibility_config=waf.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name="KnownBadInputs",
                sampled_requests_enabled=True,
            ),
            statement=waf.CfnWebACL.StatementProperty(
                managed_rule_group_statement=waf.CfnWebACL.ManagedRuleGroupStatementProperty(
                    vendor_name="AWS",
                    name="AWSManagedRulesKnownBadInputsRuleSet",
                ),
            ),
        ),
    ],
)

# Associate with ALB
waf.CfnWebACLAssociation(self, "WAFAssociation",
    resource_arn=alb.load_balancer_arn,
    web_acl_arn=web_acl.attr_arn,
)
```

---

## Connections

[[cloud-hub]] · [[cloud/cloud-security]] · [[cloud/aws-networking-advanced]] · [[cs-fundamentals/api-security]] · [[security/owasp-llm-top10]] · [[cloud/infrastructure-monitoring]]
