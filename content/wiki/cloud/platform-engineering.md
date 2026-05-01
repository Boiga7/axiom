---
type: concept
category: cloud
para: resource
tags: [platform-engineering, internal-developer-platform, backstage, golden-paths, idp]
sources: []
updated: 2026-05-01
---

# Platform Engineering

Building and operating an Internal Developer Platform (IDP) that enables product teams to self-serve infrastructure, deployments, and tooling — without needing deep ops expertise. Platform engineering treats developers as customers.

---

## Why Platform Engineering

```
Without an IDP:
  - Every team manages their own Kubernetes YAML, CI pipelines, monitoring
  - Duplicated effort; inconsistent security posture
  - Senior engineers become glue — unblocking others instead of building

With an IDP:
  - Teams self-serve: "create new service" → golden path handles CI/CD, observability, secrets
  - Platform team provides paved roads; teams stay in the fast lane
  - Consistency without mandating every decision
```

---

## The SPACE Framework

**S**atisfaction — are developers happy with the platform?  
**P**erformance — deployment frequency, change lead time  
**A**ctivity — code commits, PR merges, deployments per team  
**C**ommunication — documentation usage, support tickets  
**E**fficiency — time to onboard new service, time to prod

---

## Backstage

CNCF project for building IDPs. Provides a service catalog, software templates (scaffolders), TechDocs, and a plugin ecosystem.

```bash
npx @backstage/create-app@latest
cd backstage
yarn dev   # localhost:3000
```

```yaml
# catalog-info.yaml (every service registers itself)
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  description: Handles order creation and lifecycle
  annotations:
    github.com/project-slug: myorg/order-service
    backstage.io/techdocs-ref: dir:.
    prometheus.io/rule: |
      sum(rate(http_requests_total{job="order-service"}[5m]))
  tags: [python, fastapi, production]
  links:
  - url: https://grafana.mycompany.com/d/order-service
    title: Grafana Dashboard
spec:
  type: service
  lifecycle: production
  owner: team-commerce
  system: checkout
  dependsOn:
  - resource:default/orders-db
  - component:default/payment-service
```

---

## Software Templates (Scaffolders)

```yaml
# Template that creates a new Python service with all golden paths pre-wired
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: python-fastapi-service
  title: Python FastAPI Service
  description: Creates a new service with CI/CD, observability, and secrets management
spec:
  owner: platform-team
  type: service
  parameters:
  - title: Service Details
    properties:
      name:
        title: Service Name
        type: string
        pattern: '^[a-z][a-z0-9-]*$'
      owner:
        title: Owning Team
        type: string
        ui:field: OwnerPicker
      environment:
        title: Initial Environment
        type: string
        enum: [staging, production]
  steps:
  - id: fetch-template
    name: Fetch Template
    action: fetch:template
    input:
      url: ./content
      values:
        name: ${{ parameters.name }}
        owner: ${{ parameters.owner }}
  - id: publish
    name: Publish to GitHub
    action: publish:github
    input:
      repoUrl: github.com?owner=myorg&repo=${{ parameters.name }}
      defaultBranch: main
  - id: register
    name: Register in Catalog
    action: catalog:register
    input:
      repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
      catalogInfoPath: /catalog-info.yaml
```

---

## Golden Path Elements

A golden path is the recommended, supported way to do common tasks:

```
New service golden path:
  1. Use Backstage template → creates GitHub repo with boilerplate
  2. GitHub Actions CI pre-configured → test + build + push image
  3. ArgoCD ApplicationSet auto-detects new repo → deploys to staging
  4. Observability pre-wired → Prometheus metrics, Loki logs, OTel tracing
  5. Secrets via External Secrets Operator → team requests access to their namespace
  6. Service catalog entry created automatically

Developer effort: fill in 5 fields in Backstage UI
Platform effort: maintain the template, update it once for all services
```

---

## Platform Team KPIs

```
DORA metrics (measure platform impact on product teams):
  Deployment frequency: daily → multiple per day (target)
  Lead time for changes: < 1 day (target)
  Change failure rate: < 5%
  Time to restore: < 1 hour

Platform-specific:
  Mean time to onboard new service: < 2 hours
  % teams using golden path: > 80%
  Support tickets per team per month: trending down
  Self-service rate: % of requests resolved without platform team involvement
```

---

## Connections
[[cloud-hub]] · [[cloud/gitops-patterns]] · [[cloud/argocd]] · [[cloud/kubernetes]] · [[cloud/github-actions]] · [[cloud/observability-stack]] · [[cloud/secrets-management]]
