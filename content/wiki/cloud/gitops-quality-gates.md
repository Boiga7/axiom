---
type: concept
category: cloud
tags: [gitops, quality-gates, ci-cd, argocd, flux, deployment]
sources: []
updated: 2026-05-03
para: resource
tldr: Quality gates in a GitOps flow split across two distinct planes — CI gates (PR checks before a commit lands in Git) and GitOps gates (sync hooks, analysis runs, and promotion policies that execute after Git already holds the desired state). QA practitioners own both planes.
---

# Quality Gates in GitOps Delivery

> **TL;DR** Quality gates in a GitOps flow split across two distinct planes: CI gates live before a commit lands in Git; GitOps gates execute after the operator reads that commit and reconciles the cluster. QA practitioners must instrument both planes or they will have gaps.

---

## How GitOps Differs from Push-Based CI/CD

In a conventional push-based pipeline, CI is both the test executor and the deployment actor. A single pipeline runs tests, builds an image, then calls `kubectl apply` or `helm upgrade`. Cluster credentials live in CI. Deployment happens because CI pushed a change outward.

GitOps inverts this. CI stops at producing an artifact and updating a manifest in Git. A separate operator — [[argocd]] or [[gitops-patterns#Flux v2]] — runs inside the cluster and continuously reconciles actual state toward the desired state declared in Git. CI never holds cluster credentials. Deployment happens because the operator pulled a change inward.

```
PUSH MODEL:
  PR → CI (tests + build + kubectl apply) → cluster

PULL MODEL (GitOps):
  PR → CI (tests + build + image push + manifest update) → Git merge
                                                              ↓
                                              ArgoCD/Flux detects diff
                                                              ↓
                                              sync → cluster
```

This separation creates two distinct quality gate planes:

| Plane | When it runs | Who enforces it |
|---|---|---|
| CI gate | Before Git merge | GitHub Actions, PR checks, branch protection |
| GitOps gate | After Git merge, during/after sync | Argo hooks, Flux alerts, OPA/Kyverno, Argo Rollouts |

Missing either plane is a gap. CI gates prevent broken manifests from landing in Git. GitOps gates prevent a syntactically valid manifest from causing a runtime disaster.

---

## Plane 1 — CI Gates (Pre-Merge)

These run on the pull request before any change reaches the environment state repo (sometimes called the "config repo" or "GitOps repo", separate from the application source repo).

### What belongs here

- Unit and integration tests (application source repo PR)
- Container image build and vulnerability scan
- Manifest validation: `helm lint`, `kustomize build`, `kubeval`/`kubeconformant`
- Policy dry-run: `kyverno apply --policy ...` or `conftest` with OPA policies
- `kubectl diff` or `argocd app diff` against a staging environment (requires cluster credentials scoped to read-only)
- Secret detection (`detect-secrets`, `trufflehog`)

### GitHub Actions example — manifest validation gate

```yaml
# .github/workflows/manifest-gate.yml
name: Manifest Gate
on:
  pull_request:
    paths:
      - 'k8s/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Helm lint
        run: helm lint k8s/charts/my-api

      - name: Kustomize build (dry-run)
        run: kustomize build k8s/overlays/staging | kubectl apply --dry-run=client -f -

      - name: Kyverno policy test
        uses: kyverno/action-install-cli@v0.2.0
      - run: |
          kyverno apply k8s/policies/ \
            --resource k8s/overlays/staging/ \
            --detailed-results

      - name: conftest (OPA)
        run: |
          conftest test k8s/overlays/staging/*.yaml \
            --policy opa/policies/
```

Branch protection rules should require this check to pass before merge is allowed. That is the CI quality gate: no broken or non-compliant manifest reaches the environment repo.

---

## Plane 2 — GitOps Gates (Post-Merge, During Sync)

Once a commit lands in the environment repo, the GitOps operator picks it up. ArgoCD and Flux both provide extension points where quality gates can execute inside the reconciliation loop.

---

## ArgoCD — Sync Hooks

ArgoCD supports resource hooks via the `argocd.argoproj.io/hook` annotation. A hook is a Kubernetes Job or Pod that runs at a defined phase of the sync lifecycle.

### Hook phases

| Phase | When it runs | Typical use |
|---|---|---|
| `PreSync` | Before any resources are applied | Database migrations, smoke test of current state, policy checks |
| `Sync` | During normal sync (alongside resource apply) | Rarely used for gates; mostly for parallel setup tasks |
| `PostSync` | After all resources are healthy | Integration tests, smoke tests, synthetic monitors, notify Slack |
| `SyncFail` | If the sync operation fails | Rollback scripts, alert escalation, cleanup |

If a `PreSync` hook Job fails, ArgoCD aborts the sync — the cluster is not updated. If a `PostSync` hook Job fails, ArgoCD marks the Application as degraded. Combined with `argocd app wait --health`, this forms a synchronous gate.

### PreSync hook — run a policy check before applying

```yaml
# k8s/overlays/production/presync-policy-check.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: policy-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: conftest
          image: openpolicyagent/conftest:latest
          command:
            - conftest
            - test
            - /manifests/
            - --policy
            - /policies/
          volumeMounts:
            - name: manifests
              mountPath: /manifests
            - name: policies
              mountPath: /policies
      volumes:
        - name: manifests
          configMap:
            name: rendered-manifests   # built by a generator or stored in Git
        - name: policies
          configMap:
            name: opa-policies
```

The `hook-delete-policy: BeforeHookCreation` annotation cleans up the previous Job before creating a new one, so hook jobs don't accumulate.

### PostSync hook — run smoke tests after deploy

```yaml
# k8s/overlays/production/postsync-smoke.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: smoke
          image: my-org/smoke-tests:latest
          env:
            - name: BASE_URL
              value: https://my-api.production.example.com
            - name: EXPECTED_VERSION
              valueFrom:
                configMapKeyRef:
                  name: deployment-metadata
                  key: image-tag
          command: ["pytest", "tests/smoke/", "-v", "--tb=short"]
```

If this Job exits non-zero, ArgoCD marks the Application degraded. Alert rules on `app.kubernetes.io/instance` label can trigger PagerDuty or Slack from this state.

### Sync waves — ordering resources within a sync

Sync waves control the apply order within a single sync operation. Resources with lower wave numbers apply first; ArgoCD waits for each wave to be healthy before applying the next.

```yaml
# Apply the database migration job (wave 0) before the API deployment (wave 1)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

Quality gate pattern: put a verification Job in wave 1 that validates the migration completed correctly, and the API deployment in wave 2. The sync will not reach the API if the verification fails.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-verify
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/hook: Sync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: verify
          image: postgres:16-alpine
          command:
            - psql
            - $(DATABASE_URL)
            - -c
            - "SELECT COUNT(*) FROM schema_migrations WHERE version = '20260501';"
```

---

## ArgoCD — ApplicationSet for Environment Promotion Pipelines

[[argocd]] ApplicationSet generates multiple `Application` objects from a single template. For environment promotion, the `list` generator defines ordered environments; promotion is gated by a Git commit to the next environment's path.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-api-promotion
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: staging
            namespace: staging
            imageTag: "1.4.2"
          - env: pre-prod
            namespace: pre-prod
            imageTag: "1.4.1"   # intentionally behind until QA promotes
          - env: production
            namespace: production
            imageTag: "1.4.0"
  template:
    metadata:
      name: "my-api-{{env}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/my-org/k8s-manifests
        targetRevision: HEAD
        path: "apps/my-api/{{env}}"
        kustomize:
          images:
            - "my-api=my-registry/my-api:{{imageTag}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

The promotion gate is a PR that bumps `imageTag` for `pre-prod` in this generator, followed by a separate PR for `production`. QA approval is encoded as branch protection on those PRs. The ApplicationSet controller re-generates Applications on each commit, so the environment only updates when a commit explicitly advances its tag.

---

## Flux — Image Automation as a Promotion Gate

Flux's [[gitops-patterns#Flux v2]] image automation controllers (ImageRepository, ImagePolicy, ImageUpdateAutomation) form a pull-based promotion gate: Flux watches a container registry and updates the manifest in Git when a new image tag matches a policy.

### ImagePolicy as a promotion gate

```yaml
# Staging: take any new semver patch — continuous delivery
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-api-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-api
  policy:
    semver:
      range: ">=1.0.0-0"   # any build including pre-releases
---
# Production: only take tags explicitly prefixed with "release-"
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-api-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-api
  filterTags:
    pattern: '^release-(?P<ts>[0-9]+)'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

The production `ImagePolicy` only matches tags that CI explicitly promotes (by retag with the `release-` prefix), after a QA sign-off step in CI. Flux will never auto-promote an untagged or pre-release image to production.

### ImageUpdateAutomation — write the manifest update back to Git

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@example.com
        name: Flux
      messageTemplate: |
        chore(auto): update {{range .Updated.Images}}{{println .}}{{end}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

The manifest uses a marker comment to tell Flux where to substitute the tag:

```yaml
image: my-registry/my-api:1.4.0 # {"$imagepolicy": "flux-system:my-api-production"}
```

When the production `ImagePolicy` matches a new tag, Flux commits the updated manifest to Git, which triggers a reconciliation. The gate is the policy filter: only images that passed QA and received the `release-` tag prefix enter this path.

---

## Policy Enforcement — OPA/Kyverno in a GitOps Flow

Policy engines integrate at two points in the GitOps flow.

### Admission control (runtime gate)

Both OPA Gatekeeper and Kyverno operate as Kubernetes admission webhook controllers. Any resource that ArgoCD or Flux attempts to apply passes through the admission webhook. If the policy denies it, the sync fails with a clear error. This is a hard gate that no manifest can bypass, regardless of what passed CI.

```yaml
# Kyverno policy: require all Deployments in production to have resource limits
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-container-limits
      match:
        any:
          - resources:
              kinds: [Deployment]
              namespaces: [production, pre-prod]
      validate:
        message: "Resource limits are required in production namespaces."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - name: "*"
                    resources:
                      limits:
                        memory: "?*"
                        cpu: "?*"
```

If a Deployment manifest missing resource limits reaches production via ArgoCD, the admission webhook rejects it and ArgoCD marks the Application as `SyncFailed`. The issue must be fixed in Git before the sync can succeed.

### Pre-merge policy dry-run (CI gate, linked to GitOps gate)

Run `kyverno apply` in CI against the rendered manifests before the PR merges. This surfaces policy violations before the manifest lands in Git, making the admission control gate a safety net rather than the first line of defence.

```bash
# In CI (GitHub Actions step)
kyverno apply k8s/policies/ \
  --resource <(kustomize build k8s/overlays/production/) \
  --detailed-results \
  --policy-report
```

---

## Progressive Delivery — Argo Rollouts Canary Analysis as a Quality Gate

[[argo-rollouts]] integrates with ArgoCD. When ArgoCD syncs a Rollout resource, Argo Rollouts controls traffic shifting and runs `AnalysisTemplate` jobs to decide whether to promote or abort.

### Canary with automated analysis

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-api
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10    # send 10% of traffic to canary
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: my-api-canary
        - setWeight: 50
        - pause: {duration: 10m}
        - analysis:
            templates:
              - templateName: success-rate
              - templateName: latency-p99
            args:
              - name: service-name
                value: my-api-canary
```

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
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(
              rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[2m])
            ) /
            sum(
              rate(http_requests_total{service="{{args.service-name}}"}[2m])
            )
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency-p99
spec:
  args:
    - name: service-name
  metrics:
    - name: p99-latency
      interval: 1m
      successCondition: result[0] <= 0.5   # 500ms
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            histogram_quantile(0.99,
              sum by (le) (
                rate(http_request_duration_seconds_bucket{service="{{args.service-name}}"}[2m])
              )
            )
```

If either analysis metric exceeds `failureLimit`, Argo Rollouts aborts and rolls back automatically. The quality gate is the `AnalysisTemplate` — it encodes the production quality threshold in a versioned, reviewable YAML file.

---

## Smoke Tests and Synthetic Monitors Post-Sync

Post-sync hooks are the correct place to run smoke tests immediately after a deployment. The pattern is:

1. ArgoCD applies resources.
2. ArgoCD waits for all resources to report healthy.
3. PostSync hook Job fires.
4. Job runs smoke tests or hits a synthetic endpoint.
5. Job exits 0 (pass) or non-zero (fail).
6. ArgoCD marks Application healthy or degraded accordingly.

For long-running synthetic monitors (not a one-shot test), register the monitor in the PostSync hook and let the monitor platform (Datadog, Checkly, Grafana Cloud) carry forward. The hook just creates or enables the monitor configuration.

```yaml
# PostSync hook to register a Checkly check after deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: register-synthetic-monitor
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: checkly
          image: curlimages/curl:latest
          env:
            - name: CHECKLY_API_KEY
              valueFrom:
                secretKeyRef:
                  name: monitoring-secrets
                  key: checkly-api-key
            - name: DEPLOY_VERSION
              valueFrom:
                configMapKeyRef:
                  name: deployment-metadata
                  key: image-tag
          command:
            - sh
            - -c
            - |
              curl -sf -X POST https://api.checklyhq.com/v1/deployments \
                -H "Authorization: Bearer $CHECKLY_API_KEY" \
                -H "Content-Type: application/json" \
                -d "{\"url\": \"https://my-api.production.example.com\",
                     \"repository\": \"my-org/my-api\",
                     \"sha\": \"$DEPLOY_VERSION\"}"
```

---

## Environment Promotion Gates: Staging to Pre-Prod to Production

The full promotion path in a GitOps flow with quality gates at each boundary:

```
[staging namespace]
    ArgoCD sync from k8s-manifests/staging/
    PostSync: smoke test job
    If healthy → QA approves a PR to bump imageTag in pre-prod

[pre-prod namespace]
    ArgoCD sync from k8s-manifests/pre-prod/
    PreSync: policy check (OPA/Kyverno dry-run)
    Sync: Rollout with canary + AnalysisTemplate (10% → 50% → 100%)
    PostSync: integration test suite job
    If healthy → QA approves a PR to bump imageTag in production

[production namespace]
    ArgoCD sync from k8s-manifests/production/
    PreSync: final policy check
    Sync: Rollout with canary + AnalysisTemplate (5% → 20% → 100%)
    PostSync: smoke test job + register synthetic monitor
```

Each environment boundary requires a PR approval. Branch protection rules enforce this. The approval is the human quality gate; the hooks are the automated quality gates. Neither replaces the other.

### Preventing promotion without gate passage

Use ArgoCD Projects to restrict which source repos can deploy to which namespaces:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production — requires QA-approved manifests only
  sourceRepos:
    - https://github.com/my-org/k8s-manifests
  destinations:
    - namespace: production
      server: https://kubernetes.default.svc
  sourceNamespaces:
    - argocd
  # Deny syncing if any resource is missing required labels
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
```

---

## Who Owns the Quality Gate Policy in a QA + Platform Team Model

GitOps quality gate ownership splits naturally across two teams:

| Gate | Owner | Rationale |
|---|---|---|
| CI test suite (unit, integration) | QA team | QA authors tests; owns pass/fail criteria |
| Manifest validation (lint, schema) | Platform team | Infrastructure correctness is platform domain |
| Policy (OPA/Kyverno rules) | Platform team, reviewed by Security | Policy is an infrastructure concern; Security reviews for compliance |
| Smoke test Job (PostSync) | QA team | QA defines what "working" means for the app |
| AnalysisTemplate thresholds | QA + Platform joint | QA defines quality thresholds; Platform owns the Prometheus infrastructure |
| Promotion PR approval | QA team lead | QA is the release authority |
| Synthetic monitor setup | QA team | Monitors are continuous tests; QA owns them |

In practice: Platform team owns everything inside `k8s/` except `k8s/tests/`. QA team owns `k8s/tests/` (smoke Jobs, AnalysisTemplates). Policy files in `k8s/policies/` are co-owned with a required approval from both teams on PRs to that directory (enforced via CODEOWNERS).

```
# .github/CODEOWNERS
k8s/policies/              @platform-team @security-team
k8s/tests/                 @qa-team
k8s/charts/                @platform-team
k8s/overlays/production/   @qa-team-lead @platform-team-lead
```

---

## Summary: Where Every Gate Sits

```
Developer writes code
        ↓
PR to application repo
  [CI gate: unit + integration tests]
  [CI gate: image build + scan]
        ↓
Merge → image pushed to registry
        ↓
PR to k8s-manifests repo (update imageTag in staging/)
  [CI gate: helm lint + kustomize build]
  [CI gate: kyverno apply dry-run]
  [CI gate: kubectl diff vs staging]
        ↓
Merge → ArgoCD detects diff in staging/
  [PreSync hook: policy check job]
  [Sync waves: ordered resource apply]
  [Admission control: Kyverno webhook]
  [PostSync hook: smoke test job]
        ↓
QA reviews smoke test output + Argo health status
  [Human gate: QA approves PR to pre-prod/]
        ↓
ArgoCD syncs pre-prod/
  [Argo Rollouts canary + AnalysisTemplate]
  [PostSync hook: integration test suite]
        ↓
QA approves PR to production/
        ↓
ArgoCD syncs production/
  [PreSync hook: final policy check]
  [Argo Rollouts canary with tight AnalysisTemplate thresholds]
  [PostSync hook: smoke tests + synthetic monitor registration]
```

---

## Related Pages

- [[argocd]] — Application, sync policy, app-of-apps pattern
- [[argo-rollouts]] — canary, blue-green, AnalysisTemplate spec
- [[gitops-patterns]] — GitOps principles, Flux vs ArgoCD comparison
- [[github-actions]] — CI pipeline structure, reusable workflows
- [[ci-cd-quality-gates]] — quality gate taxonomy across all CI/CD patterns
- [[cicd-pipelines]] — pipeline design, stages, parallelism
- [[slo-sla-quality]] — SLO-aligned threshold selection for canary analysis
- [[cloud-security]] — OPA Gatekeeper, Kyverno admission control
- [[container-security]] — image scanning, supply chain gates
- [[cloud-monitoring]] — Prometheus, alerting on sync failures
- [[secrets-management]] — SOPS, External Secrets Operator
