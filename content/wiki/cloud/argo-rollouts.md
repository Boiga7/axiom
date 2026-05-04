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

## Common Failure Cases

**Rollout paused indefinitely at a manual gate**
Why: a `pause: {}` step (no duration) requires an explicit `kubectl argo rollouts promote` command, and no one ran it after the canary looked healthy.
Detect: `kubectl argo rollouts get rollout myapp` shows `Paused` status with the step counter stuck.
Fix: add a maximum pause duration (`pause: {duration: 2h}`) for automated promotion fallback, or integrate the promote command into your deployment runbook.

**Analysis fails because Prometheus query returns no data**
Why: the AnalysisTemplate's Prometheus query references a metric label or job name that doesn't match what the canary pods actually emit, returning an empty result set.
Detect: the AnalysisRun shows `Error` with message `no data returned` rather than a numeric failure.
Fix: test the exact PromQL query against Prometheus directly before wiring it into the template; ensure the `job` label and metric name match the canary service's scrape config.

**Traffic not shifting — canary gets 0% despite setWeight step**
Why: the VirtualService or ingress annotation is not referencing the correct stable/canary service names declared in the Rollout spec, so the traffic routing integration is disconnected.
Detect: `kubectl describe vs myapp-vs` shows unmodified weights while the Rollout reports the step is active.
Fix: confirm `canaryService` and `stableService` in the Rollout spec exactly match the Kubernetes Service names, and that the VirtualService exists in the same namespace.

**Rollout controller not installed in the correct namespace**
Why: the CRDs are installed but the Argo Rollouts controller is deployed in a different namespace than the Rollout resources, so it never reconciles them.
Detect: `kubectl get rollouts -n production` shows resources but they never transition state; controller logs show no events for that namespace.
Fix: the controller defaults to watching all namespaces; if it was scoped with `--namespace`, either add the target namespace or remove the flag to restore cluster-wide watch.

## Connections
[[cloud-hub]] · [[cloud/argocd]] · [[cloud/kubernetes]] · [[cloud/service-mesh]] · [[cloud/cloud-monitoring]] · [[cloud/kubernetes-operators]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
