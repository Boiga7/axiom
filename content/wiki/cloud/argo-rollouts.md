---
type: concept
category: cloud
para: resource
tags: [argo-rollouts, progressive-delivery, canary, blue-green, gitops]
sources: []
updated: 2026-05-01
tldr: Progressive delivery controller for Kubernetes. Extends Deployments with canary, blue-green, and analysis-driven rollout strategies.
---

# Argo Rollouts

Progressive delivery controller for Kubernetes. Extends Deployments with canary, blue-green, and analysis-driven rollout strategies. Integrates with ingress controllers and service meshes for traffic splitting.

---

## Why Argo Rollouts

Standard Kubernetes Deployments give you all-or-nothing rollouts with no traffic weighting, no automated analysis, and no easy rollback trigger. Argo Rollouts adds:

- Weighted traffic splitting during rollout
- Automated metric analysis — promote or abort based on real traffic quality
- Manual promotion gates
- Native integration with Istio, NGINX, AWS ALB, Traefik

---

## Install

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# kubectl plugin
brew install argoproj/tap/kubectl-argo-rollouts
```

---

## Canary Rollout

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 10
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myregistry/myapp:v2.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      canaryService: myapp-canary
      stableService: myapp-stable
      trafficRouting:
        istio:
          virtualService:
            name: myapp-vs
          destinationRule:
            name: myapp-dr
            canarySubsetName: canary
            stableSubsetName: stable
      steps:
      - setWeight: 10          # 10% traffic → canary
      - pause: {duration: 5m}
      - analysis:
          templates:
          - templateName: success-rate
            clusterScope: false
      - setWeight: 40
      - pause: {duration: 10m}
      - setWeight: 80
      - pause: {}              # manual gate — requires `kubectl argo rollouts promote`
```

---

## Blue-Green Rollout

```yaml
strategy:
  blueGreen:
    activeService: myapp-active       # receives 100% production traffic
    previewService: myapp-preview     # receives 0% — for pre-production testing
    autoPromotionEnabled: false       # require explicit promotion
    scaleDownDelaySeconds: 300        # keep old version alive 5 min post-promotion
    prePromotionAnalysis:
      templates:
      - templateName: smoke-tests
```

---

## Analysis Template

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    interval: 1m
    count: 5
    successCondition: result[0] >= 0.95    # abort if error rate exceeds 5%
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring.svc:9090
        query: |
          sum(rate(http_requests_total{job="{{args.service-name}}",status!~"5.."}[5m]))
          /
          sum(rate(http_requests_total{job="{{args.service-name}}"}[5m]))
```

Other analysis providers: Datadog, NewRelic, CloudWatch, Job (run a Kubernetes Job as a smoke test), Web (HTTP endpoint returning pass/fail).

---

## kubectl Plugin Commands

```bash
# Watch rollout progress live
kubectl argo rollouts get rollout myapp --watch

# Promote a paused rollout to next step
kubectl argo rollouts promote myapp

# Abort and immediately rollback to stable
kubectl argo rollouts abort myapp
kubectl argo rollouts undo myapp

# Retry after a failed rollout
kubectl argo rollouts retry rollout myapp

# Set image (triggers new rollout)
kubectl argo rollouts set image myapp myapp=myregistry/myapp:v2.1.0

# Local dashboard
kubectl argo rollouts dashboard
```

---

## ArgoCD Integration

ArgoCD + Argo Rollouts = full GitOps progressive delivery:

1. ArgoCD syncs the Rollout manifest from Git on PR merge
2. Argo Rollouts controller executes the strategy automatically
3. ArgoCD UI shows rollout status alongside sync status
4. On analysis failure, Argo Rollouts aborts; ArgoCD marks the app degraded
5. Engineers see exactly which step failed in both UIs

---

## Connections
[[cloud-hub]] · [[cloud/argocd]] · [[cloud/kubernetes]] · [[cloud/service-mesh]] · [[cloud/cloud-monitoring]] · [[cloud/kubernetes-operators]]
