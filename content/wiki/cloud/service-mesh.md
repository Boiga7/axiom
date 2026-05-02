---
type: concept
category: cloud
para: resource
tags: [service-mesh, istio, linkerd, envoy, mtls, traffic-management, kubernetes]
sources: []
updated: 2026-05-01
tldr: "A service mesh handles cross-cutting network concerns for microservices: mTLS, retries, circuit breaking, traffic shaping, and observability — without touching application code."
---

# Service Mesh

A service mesh handles cross-cutting network concerns for microservices: mTLS, retries, circuit breaking, traffic shaping, and observability — without touching application code. Implemented via sidecar proxies injected alongside every pod.

---

## The Problem It Solves

Without a service mesh, each microservice must implement:
- TLS and certificate rotation
- Retry logic with exponential backoff
- Circuit breakers
- Request tracing headers
- Load balancing between pod replicas

With a service mesh, all of this moves to the sidecar proxy layer. Applications speak plain HTTP to localhost; the sidecar handles everything else.

---

## Architecture

```
Pod A                           Pod B
┌─────────────────────┐         ┌─────────────────────┐
│  App Container      │         │  App Container       │
│  (plain HTTP :8080) │         │  (plain HTTP :8080)  │
│                     │         │                      │
│  Envoy Sidecar      │◄──mTLS─►│  Envoy Sidecar       │
│  (port 15001)       │         │  (port 15001)        │
└─────────────────────┘         └─────────────────────┘
         ▲                               ▲
         └───────────── Control Plane ───┘
                    (Istiod / Linkerd)
```

The control plane pushes configuration to all sidecar proxies. The data plane (Envoy sidecars) enforces policies.

---

## Istio

The most feature-complete service mesh. Built on Envoy proxy.

**Installation:**
```bash
istioctl install --set profile=default
kubectl label namespace production istio-injection=enabled
```

Labelling a namespace enables automatic sidecar injection — any pod created in that namespace gets an Envoy sidecar added.

**Traffic management — VirtualService:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-api
spec:
  hosts:
    - my-api
  http:
    - match:
        - headers:
            x-version:
              exact: "v2"
      route:
        - destination:
            host: my-api
            subset: v2
    - route:
        - destination:
            host: my-api
            subset: v1
          weight: 90
        - destination:
            host: my-api
            subset: v2
          weight: 10    # canary: 10% traffic to v2
```

**Circuit breaking — DestinationRule:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-api
spec:
  host: my-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s    # eject unhealthy pod for 60s
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

**mTLS enforcement:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT    # reject all non-mTLS traffic
```

---

## Linkerd

Simpler and lighter than Istio. Rust-based proxy (not Envoy) — 10× lower resource usage. Fewer features, but covers 80% of use cases.

```bash
linkerd install | kubectl apply -f -
linkerd check
kubectl annotate namespace production linkerd.io/inject=enabled
```

Linkerd provides mTLS, retries, timeouts, and golden-metric dashboards automatically with almost zero configuration.

---

## Istio vs Linkerd

| | Istio | Linkerd |
|--|--|--|
| Proxy | Envoy (C++) | Linkerd-proxy (Rust) |
| Resource usage | High (~50MB/sidecar) | Low (~10MB/sidecar) |
| Features | Extensive (traffic shaping, JWT auth, Wasm plugins) | Core mesh features |
| Learning curve | Steep | Gentle |
| Best for | Complex multi-cluster, advanced routing | Simpler, security-first |

---

## When Not to Use a Service Mesh

Service mesh adds latency (~1–5ms per hop), CPU overhead (~5%), and operational complexity. Not warranted for:
- Simple architectures with <10 services
- Teams without Kubernetes expertise
- When application already handles retries and circuit breaking

Use network policies + RBAC + application-level retries instead.

---

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/cloud-networking]] · [[cloud/cloud-monitoring]]
