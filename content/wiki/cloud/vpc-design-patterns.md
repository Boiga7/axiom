---
type: concept
category: cloud
para: resource
tags: [vpc, subnets, nat-gateway, transit-gateway, private-link, security-groups, nacl, network-design]
sources: []
updated: 2026-05-01
---

# VPC Design Patterns

Network architecture patterns for secure, scalable AWS deployments — from single-account to multi-account.

---

## Standard 3-Tier VPC

```
The foundational pattern for most production workloads:

  Public Subnet (per AZ)     → Load balancers, NAT Gateways, bastion hosts
  Private Subnet (per AZ)    → Application servers, ECS tasks, Lambda VPC
  Data Subnet (per AZ)       → RDS, ElastiCache, OpenSearch

CIDR allocation example (3 AZs, 10.0.0.0/16):
  10.0.1.0/24    Public us-east-1a
  10.0.2.0/24    Public us-east-1b
  10.0.3.0/24    Public us-east-1c
  10.0.10.0/22   Private us-east-1a  (1022 hosts)
  10.0.14.0/22   Private us-east-1b
  10.0.18.0/22   Private us-east-1c
  10.0.100.0/24  Data us-east-1a
  10.0.101.0/24  Data us-east-1b
  10.0.102.0/24  Data us-east-1c

Rules:
  - Internet Gateway: attached to VPC, routes public subnets to internet
  - NAT Gateway: one per AZ in public subnet, routes private subnets outbound
  - Route tables: separate per tier; private routes 0.0.0.0/0 → NAT GW
```

---

## CDK — Production VPC

```python
import aws_cdk as cdk
from aws_cdk import aws_ec2 as ec2

class NetworkStack(cdk.Stack):
    def __init__(self, scope, id, **kwargs):
        super().__init__(scope, id, **kwargs)

        self.vpc = ec2.Vpc(self, "ProductionVPC",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=3,
            nat_gateways=3,   # one per AZ — no single point of failure
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=22,
                ),
                ec2.SubnetConfiguration(
                    name="Data",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24,
                ),
            ],
            flow_logs={
                "VpcFlowLogs": ec2.FlowLogOptions(
                    destination=ec2.FlowLogDestination.to_cloud_watch_logs(),
                    traffic_type=ec2.FlowLogTrafficType.REJECT,  # log rejected traffic
                )
            },
        )
```

---

## Security Groups vs NACLs

```
Security Groups (stateful — preferred):
  - Attached to resources (EC2, RDS, Lambda)
  - Allow rules only (implicit deny)
  - Stateful: responses allowed automatically
  - Changes take effect immediately
  - Rules can reference other security groups by ID (not just CIDR)

Network ACLs (stateless):
  - Attached to subnets
  - Allow AND deny rules, numbered priority
  - Stateless: you must allow inbound AND outbound explicitly
  - Applied to all resources in the subnet
  - Use for: block specific IP ranges, add defence-in-depth layer

Best practice:
  - Security groups: primary access control (always)
  - NACLs: add only if you need subnet-level deny rules (e.g., block known bad IPs)

Security group: allow HTTPS from ALB only
  Inbound:  443 from alb-sg (not the world)
  Outbound: 443 to 0.0.0.0/0 (for external API calls)
  Outbound: 5432 to rds-sg (for database)
```

```python
# CDK security group pattern
from aws_cdk import aws_ec2 as ec2

alb_sg = ec2.SecurityGroup(self, "ALBSG",
    vpc=vpc,
    description="ALB — accepts internet HTTPS",
    allow_all_outbound=False,
)
alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443))
alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80))

app_sg = ec2.SecurityGroup(self, "AppSG",
    vpc=vpc,
    description="Application — only accepts traffic from ALB",
    allow_all_outbound=True,
)
app_sg.add_ingress_rule(alb_sg, ec2.Port.tcp(8000))   # only from ALB SG

rds_sg = ec2.SecurityGroup(self, "RDSSG",
    vpc=vpc,
    description="RDS — only accepts traffic from application tier",
    allow_all_outbound=False,
)
rds_sg.add_ingress_rule(app_sg, ec2.Port.tcp(5432))   # only from app SG
```

---

## VPC Endpoints (Reduce NAT Cost)

```python
# VPC Endpoints let private subnets reach AWS services WITHOUT a NAT Gateway
# Traffic stays on the AWS backbone — no internet gateway required
# Reduces NAT Gateway data processing costs significantly for S3-heavy workloads

# Gateway endpoint (S3, DynamoDB) — free
s3_endpoint = vpc.add_gateway_endpoint("S3Endpoint",
    service=ec2.GatewayVpcEndpointAwsService.S3,
    subnets=[ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)],
)

# Interface endpoint (Secrets Manager, SQS, ECR, etc.) — ~$7/month per AZ per service
secrets_endpoint = ec2.InterfaceVpcEndpoint(self, "SecretsManagerEndpoint",
    vpc=vpc,
    service=ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
    security_groups=[endpoint_sg],
    private_dns_enabled=True,  # DNS resolves secretsmanager.region.amazonaws.com to private IP
)

# ECR endpoints (required for Fargate in private subnets with no NAT)
for svc in [
    ec2.InterfaceVpcEndpointAwsService.ECR,
    ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
]:
    ec2.InterfaceVpcEndpoint(self, f"{svc.name}Endpoint",
        vpc=vpc,
        service=svc,
        private_dns_enabled=True,
        subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
    )
```

---

## Multi-Account Network with Transit Gateway

```
Single account: VPC peering is fine (one-to-one, no transitive routing)
Multi-account: Transit Gateway (hub-and-spoke, transitive routing, centrally managed)

Typical multi-account layout:
  Network account:   Transit Gateway (hub), Direct Connect, VPN
  Shared Services:   Route 53 Resolver, Internal ALBs, ECR
  Production:        Application VPCs attached to TGW
  Dev/Staging:       Isolated VPCs (no prod-to-dev path)

Route table isolation:
  - Production VPCs → can reach Shared Services, cannot reach Dev
  - Dev VPCs → can reach Shared Services, cannot reach Production
  - All → can reach Network account (DNS, egress)
```

---

## Cost Optimisation

```
NAT Gateway: $0.045/GB data processed + $0.045/hour per NAT GW
Biggest savings opportunities:

1. VPC Endpoints for S3 (free gateway endpoint):
   Large S3 usage → can save hundreds/month in NAT Gateway charges

2. Centralised NAT (single NAT in one AZ):
   Saves: NAT GW cost per AZ
   Risk: traffic from other AZs incurs cross-AZ data transfer ($0.01/GB)
   Decision: centralised NAT < cross-AZ cost only if inter-AZ traffic is low

3. NAT Instance (free-tier eligible EC2):
   Saves: $0.045/hour × 3 AZs = ~$100/month
   Risk: you manage availability, patching, and scaling
   Only worth it for dev/staging, never production

4. IPv6 Egress-Only Internet Gateway (free):
   For outbound-only IPv6 traffic — no charge
```

---

## Connections

[[cloud/cloud-hub]] · [[cloud/cloud-networking]] · [[cloud/aws-networking-advanced]] · [[cloud/aws-eks]] · [[cloud/aws-fargate]] · [[cloud/multi-tenancy]] · [[cloud/aws-cdk]]
