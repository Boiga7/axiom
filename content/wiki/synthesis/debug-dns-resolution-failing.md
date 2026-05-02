---
type: synthesis
category: synthesis
para: resource
tags: [debugging, dns, networking, kubernetes, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing DNS resolution failures causing services to be unreachable by name.
---

# Debug: DNS Resolution Failing

**Symptom:** Service unreachable by hostname. `Name or service not known`. Works with IP address but not domain name. Intermittent resolution failures in Kubernetes.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Works with IP, fails with hostname | DNS not resolving — resolver unreachable or record missing |
| Intermittent failures in Kubernetes | CoreDNS overloaded or pod DNS config incorrect |
| Fails only inside cluster | Internal DNS record not created or service selector mismatch |
| Fails only outside cluster | External DNS record not propagated or TTL cached |
| Was working, broke after deploy | Service name changed, DNS record not updated |

---

## Likely Causes (ranked by frequency)

1. DNS record does not exist or has wrong value
2. CoreDNS pod overloaded — dropping queries under cluster load
3. Service selector mismatch — Kubernetes service exists but points to no pods
4. DNS TTL not expired after record change — clients caching stale record
5. Search domain misconfiguration — FQDN required but short name used

---

## First Checks (fastest signal first)

- [ ] Test resolution from the failing host — `nslookup hostname` or `dig hostname`; confirm whether it is a timeout or NXDOMAIN
- [ ] In Kubernetes: exec into the failing pod and run `nslookup service-name.namespace.svc.cluster.local`
- [ ] Check CoreDNS pod status — `kubectl get pods -n kube-system -l k8s-app=kube-dns`
- [ ] Check whether the Kubernetes Service exists and has endpoints — `kubectl get endpoints service-name`
- [ ] Check DNS TTL — if a record was recently changed, stale entries may still be cached

**Signal example:** Service-to-service call fails with `Name or service not known` inside Kubernetes — `kubectl get endpoints` shows the service has 0 endpoints; the deployment label is `app: my-service` but the service selector is `app: myservice` (missing hyphen).

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Kubernetes service and endpoint config | [[cloud/kubernetes]] |
| CoreDNS configuration and scaling | [[cloud/kubernetes]] |
| External DNS and Route 53 | [[cloud/aws-networking-advanced]] |
| VPC DNS resolution settings | [[cloud/vpc-design-patterns]] |
| Service mesh DNS interception | [[cloud/service-mesh]] |

---

## Fix Patterns

- Always use FQDNs inside Kubernetes — `service.namespace.svc.cluster.local` avoids search domain ambiguity
- Check endpoints before checking DNS — a Service with no endpoints is a selector problem, not DNS
- Scale CoreDNS if DNS latency is high under load — `kubectl scale deployment coredns -n kube-system --replicas=3`
- Set realistic TTLs — low TTL (60s) for records that change; higher TTL (300s) for stable records
- Enable DNS caching in the application — reduce CoreDNS pressure by not resolving the same name on every request

---

## When This Is Not the Issue

If DNS resolves correctly but the service is still unreachable:

- DNS is working but the service is not listening — check whether the process is bound to the correct interface and port
- A firewall or security group may be blocking the connection after DNS resolution

Pivot to [[synthesis/debug-api-timeout]] to diagnose connection failures where DNS succeeds but the connection does not complete.

---

## Connections

[[cloud/kubernetes]] · [[cloud/aws-networking-advanced]] · [[cloud/vpc-design-patterns]] · [[cloud/service-mesh]] · [[synthesis/debug-api-timeout]]
