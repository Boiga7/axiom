---
type: concept
category: cloud
para: resource
tags: [networking, vpc, subnets, load-balancing, dns, cdn, private-link, zero-trust]
sources: []
updated: 2026-05-01
tldr: Network design underpins security, performance, and cost in cloud architectures. The same concepts — VPC, subnets, routing, firewalls — appear in all three major clouds with different names.
---

# Cloud Networking

Network design underpins security, performance, and cost in cloud architectures. The same concepts (VPC, subnets, routing, firewalls) appear in all three major clouds with different names.

---

## VPC Design

A Virtual Private Cloud is your logically isolated network. Standard 3-tier subnet pattern:

```
VPC: 10.0.0.0/16  (65,536 addresses)
│
├── Public subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
│     → Route: 0.0.0.0/0 → Internet Gateway
│     → Hosts: Load balancers, NAT Gateways, bastion hosts
│
├── Private subnets (10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24)
│     → Route: 0.0.0.0/0 → NAT Gateway (outbound only)
│     → Hosts: Application servers, ECS/EKS nodes, Lambda in VPC
│
└── Isolated subnets (10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24)
      → Route: No internet route
      → Hosts: Databases (RDS, ElastiCache, Redis)
```

**One subnet per AZ per tier** — three AZs × three tiers = nine subnets minimum. This ensures AZ failure doesn't take down a whole tier.

**CIDR sizing** — AWS reserves 5 addresses per subnet. A /24 gives 251 usable addresses. A /23 gives 507. Size generously; re-CIDRing later requires downtime.

---

## Routing

**Route table** — ordered list of rules. Most specific prefix wins. Default route (0.0.0.0/0) is the catch-all.

| Destination | Target | Notes |
|---|---|---|
| 10.0.0.0/16 | local | VPC-internal traffic, always present |
| 10.1.0.0/16 | pcx-xxx | Peered VPC |
| 0.0.0.0/0 | igw-xxx | Internet (public subnets only) |
| 0.0.0.0/0 | nat-xxx | Internet via NAT (private subnets) |

---

## Security Groups vs NACLs

| | Security Group | NACL |
|--|--|--|
| Level | Instance/ENI | Subnet |
| Stateful | Yes (return traffic auto-allowed) | No (must allow inbound AND outbound) |
| Rules | Allow only | Allow and Deny |
| Default | Deny all inbound, allow all outbound | Allow all |
| Priority | All rules evaluated | Rules evaluated in order (lowest number first) |

**Security Groups** are the primary firewall tool. NACLs are secondary — useful for blocking specific IPs at the subnet edge.

```
# Security group: allow HTTPS inbound from anywhere
ingress 443 TCP 0.0.0.0/0
# Security group: allow DB port only from app security group
ingress 5432 TCP sg-app-servers (referenced by SG ID, not CIDR)
```

Referencing SGs by ID rather than CIDR ranges is more maintainable and more precise.

---

## Load Balancing

### Layer 7 (HTTP/HTTPS) — AWS ALB, GCP HTTP(S) LB, Azure Application Gateway

Path-based routing, host-based routing, header-based routing. SSL termination. WAF integration. Sticky sessions (cookie-based).

```
ALB listener: 443 HTTPS
├── IF path /api/* → target group: api-servers (port 8000)
├── IF path /static/* → target group: static-servers (port 80)
└── Default → target group: main-app (port 3000)
```

**Health checks** — ALB sends HTTP GET to `/health` every 30 seconds. Unhealthy threshold: 2 consecutive failures removes instance from rotation. Healthy threshold: 5 consecutive successes re-adds it.

### Layer 4 (TCP/UDP) — AWS NLB, GCP Network LB, Azure Load Balancer

No HTTP awareness. Ultra-low latency (<1ms). Preserves source IP. Used for databases, gaming, real-time streaming, anything that needs static IPs.

---

## DNS

**Route 53 (AWS) / Cloud DNS (GCP) / Azure DNS** — managed authoritative DNS. 100% SLA on AWS.

Routing policies (Route 53):
- **Simple** — one record, multiple IPs returned randomly
- **Weighted** — 80% to v2, 20% to v1 (canary releases)
- **Latency** — route to the region with lowest measured latency for the user
- **Failover** — primary / secondary with health check
- **Geolocation** — GDPR compliance (EU users → EU region)
- **Geoproximity** — bias traffic toward a region

Private hosted zones. DNS resolution only within your VPC. Internal service discovery without public DNS exposure.

---

## CDN

CloudFront (AWS) / Cloud CDN (GCP) / Azure Front Door. Globally distributed edge caches.

Cache static assets (JS, CSS, images) at the edge. Reduces latency from 200ms to <10ms for repeat visitors. Reduces origin load.

```
# CloudFront cache behaviour
Path pattern: /static/*
  TTL: 86400s (24 hours)
  Compress: yes
  Allowed methods: GET, HEAD

Path pattern: /api/*
  TTL: 0  (no caching; proxy to origin)
  Cache policy: CachingDisabled
```

**Origin Shield** — intermediate caching tier between edge and origin. Reduces origin traffic by 60–80% for global deployments.

---

## Private Connectivity

### VPC Peering
Direct, private routing between two VPCs. Not transitive, if A peers B and B peers C, A cannot reach C through B. Use Transit Gateway for hub-and-spoke.

### Transit Gateway (AWS) / Cloud Router / Azure Virtual WAN
Central hub for VPC-to-VPC and VPC-to-on-premises routing. Transitive routing supported.

### Private Link / Private Endpoints
Expose a service (S3, RDS, SaaS vendor) inside your VPC via a private IP. Traffic never leaves the cloud backbone.

```
Without Private Link:
  App → NAT Gateway → internet → S3  (data egress charges, public IP)

With Private Link:
  App → VPC Endpoint → S3  (free, private, no NAT needed)
```

Always add VPC endpoints for S3, DynamoDB, ECR. They eliminate NAT Gateway data charges for high-traffic services.

### VPN / Direct Connect (AWS) / Interconnect (GCP) / ExpressRoute (Azure)
On-premises to cloud connectivity. VPN: encrypted over internet, up to 1.25 Gbps. Direct Connect: dedicated 1G/10G/100G fibre, private, lower latency, predictable throughput.

---

## Zero Trust Networking

Traditional model: trust everything inside the perimeter. Zero trust: verify every request regardless of network source.

In practice for cloud:
- No VPN for internal tools — use identity-aware proxies (IAP on GCP, Cloudflare Access, AWS Verified Access)
- All inter-service calls require mTLS or signed tokens (service mesh: Istio, Linkerd)
- Least-privilege security groups — no 0.0.0.0/0 inbound on any port except public-facing load balancers
- Network policies in Kubernetes

### Service Mesh
Sidecar proxies (Envoy) injected into every pod. Provides mTLS, retries, circuit breaking, observability (traces, metrics), traffic shaping. Without application code changes.

Istio adds ~15ms to inter-pod latency and ~5% CPU overhead. Not warranted for simple architectures.

---

## Network Cost Optimisation

| Traffic | Cost |
|---|---|
| Inbound to cloud | Free |
| Within same AZ | Free |
| Cross-AZ (same region) | $0.01/GB each direction (AWS) |
| Outbound to internet | $0.085–0.09/GB (AWS, first 10TB) |
| S3 via VPC endpoint | Free (vs $0.01+/GB via NAT) |

**Cross-AZ traffic is the hidden cost.** A three-AZ RDS cluster with read replicas in each AZ generates cross-AZ traffic on every replica sync. Use the same-AZ endpoint when latency allows; use primary-only for read-heavy non-HA workloads.

---

## Common Failure Cases

**Subnet exhaustion blocking new EC2/EKS node launches**
Why: AWS reserves 5 addresses per subnet; a /24 gives only 251 usable addresses, and EKS with the AWS VPC CNI assigns one IP per pod — a 30-node cluster with 30 pods per node needs 900+ addresses in a single subnet.
Detect: EKS node group scaling fails with `InsufficientFreeAddressesInSubnet` error in the EC2 console; new pods stay in `Pending` with the event `0/0 nodes available: 0 Insufficient pods`.
Fix: Use /23 or larger subnets for EKS node pools, or enable the VPC CNI prefix delegation mode to assign /28 prefixes per ENI instead of individual IPs; plan CIDRs at VPC creation time since re-CIDRing requires downtime.

**Security group rule referencing a deleted SG ID causes all traffic to drop**
Why: A security group inbound rule references another SG by ID (e.g., `sg-app-servers`); if that referenced SG is deleted, the rule becomes invalid and AWS implicitly drops matching traffic.
Detect: Application traffic drops suddenly with no recent infrastructure changes; `aws ec2 describe-security-groups` shows a rule with a stale SG ID that no longer exists.
Fix: Audit security group rules regularly with `aws ec2 describe-security-groups` and alert on rules referencing non-existent SG IDs; recreate or update the rule to reference the correct SG.

**NAT Gateway charges unexpectedly high due to missing VPC endpoints for S3/DynamoDB**
Why: Traffic to S3 or DynamoDB from private subnets traverses the NAT Gateway, incurring $0.045/GB processing charges; a busy service moving terabytes per day generates thousands in unplanned costs.
Detect: NAT Gateway `BytesOutToDestination` metric is high; Cost Explorer shows NAT Gateway as a top-5 cost item.
Fix: Create Gateway VPC Endpoints for S3 and DynamoDB (free), add them to the private subnet route tables; traffic to these services bypasses the NAT Gateway entirely.

**VPC peering not transitive causes inter-service connectivity gaps**
Why: Teams assume VPC A can reach VPC C via VPC B (A-B peered, B-C peered) but peering is not transitive, so A-C traffic is dropped.
Detect: `traceroute` or `nc` from a host in VPC A to VPC C times out; VPC Flow Logs show `REJECT` for the cross-VPC traffic.
Fix: Establish a direct peering between VPC A and VPC C, or migrate to Transit Gateway which provides transitive routing across all attached VPCs.

**Route 53 failover not triggering because health check is checking the wrong endpoint**
Why: The health check is configured against the load balancer's IP rather than a meaningful application path, or the path returns 200 even when the backend is degraded (e.g., returns a static HTML page after the app crashes).
Detect: Region-level outage occurs but Route 53 does not fail over; the health check status in the Route 53 console shows green.
Fix: Point the health check at a deep health endpoint (`/health/ready`) that validates all critical dependencies (DB, cache); ensure the endpoint returns 5xx when any dependency is unhealthy.

## Connections

- [[cloud/aws-core]] — VPC, Security Groups, ALB, NLB, Route 53, NAT Gateway
- [[cloud/gcp-core]] — GCP VPC (global), Cloud Load Balancing, Cloud DNS
- [[cloud/azure-core]] — Azure VNet, NSG, Application Gateway, Azure Front Door
- [[cloud/kubernetes]] — container networking, CNI, ingress controllers, network policies
- [[cloud/terraform]] — terraform-aws-vpc module for automated VPC provisioning
