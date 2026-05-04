---
type: concept
category: cloud
para: resource
tags: [argocd, gitops, kubernetes, cd, continuous-delivery, app-of-apps]
sources: []
updated: 2026-05-01
tldr: GitOps continuous delivery for Kubernetes. Watches a Git repository; reconciles cluster state to match. The cluster tells Argo what's running; Git tells Argo what should be running.
---

# ArgoCD

GitOps continuous delivery for Kubernetes. Watches a Git repository; reconciles cluster state to match. The cluster tells Argo what's running; Git tells Argo what should be running. Argo closes the gap.

---

## GitOps Principles (Why ArgoCD)

1. **Git as the single source of truth** — desired state is in a repo, not in someone's head or a CI pipeline.
2. **Declarative** — you declare the desired state; Argo figures out how to get there.
3. **Pull-based** — Argo pulls from Git, rather than CI pushing to the cluster. No cluster credentials in CI.
4. **Auditability** — every change is a Git commit with author, timestamp, and diff.

---

## Core Concepts

**Application** — an Argo object that links a Git repo/path to a cluster/namespace.

**Sync** — the act of making the cluster match Git. Manual or automated.

**Health** — Argo evaluates whether each resource is healthy (Deployment replicas ready, Pod running, etc.).

**Sync status** — Synced (cluster matches Git), OutOfSync (drift detected), or Unknown.

---

## Basic Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/my-org/k8s-manifests
    targetRevision: HEAD
    path: apps/my-api/production

  destination:
    server: https://kubernetes.default.svc  # same cluster Argo is in
    namespace: production

  syncPolicy:
    automated:
      prune: true        # delete resources removed from Git
      selfHeal: true     # revert manual kubectl changes
    syncOptions:
      - CreateNamespace=true
```

With `automated.selfHeal: true`, any `kubectl apply` or `kubectl delete` on a resource owned by this Application is reverted within ~3 minutes. This is intentional. Manual changes in prod are anti-patterns.

---

## App-of-Apps Pattern

Manage many Applications declaratively. An Application whose source is a directory of other Application manifests.

```
k8s-manifests/
├── apps/
│   ├── root-app.yaml          # The App-of-Apps Application
│   └── applications/
│       ├── my-api.yaml
│       ├── my-worker.yaml
│       ├── postgres.yaml
│       └── redis.yaml
├── my-api/
│   └── production/
│       ├── deployment.yaml
│       └── service.yaml
```

```yaml
# root-app.yaml — points at the applications/ directory
spec:
  source:
    repoURL: https://github.com/my-org/k8s-manifests
    targetRevision: HEAD
    path: apps/applications
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
```

When you add a new Application YAML to `apps/applications/`, ArgoCD creates and manages it automatically.

---

## ApplicationSets — Progressive Delivery

Generate many Applications from a template. Key use case: deploy the same app to many clusters or environments.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-api-envs
spec:
  generators:
    - list:
        elements:
          - env: staging
            cluster: staging-cluster
            values: staging-values.yaml
          - env: production
            cluster: production-cluster
            values: prod-values.yaml

  template:
    metadata:
      name: my-api-{{env}}
    spec:
      source:
        repoURL: https://github.com/my-org/k8s-manifests
        path: apps/my-api
        helm:
          valueFiles:
            - {{values}}
      destination:
        name: {{cluster}}
        namespace: my-api
```

Progressive sync: deploy to staging first; gate production on staging health check passing.

---

## Image Updater

Automatically updates the image tag in Git when a new image is pushed to a registry. No CI pipeline needs cluster access.

```yaml
# Annotation on the Application
annotations:
  argocd-image-updater.argoproj.io/image-list: api=ghcr.io/my-org/my-api
  argocd-image-updater.argoproj.io/api.update-strategy: semver
  argocd-image-updater.argoproj.io/write-back-method: git
```

ArgoCD Image Updater watches the registry, commits the new tag to Git, then Argo syncs the cluster to the new commit.

---

## Helm Integration

ArgoCD natively renders Helm charts at sync time. No need to pre-render.

```yaml
spec:
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: postgresql
    targetRevision: "14.3.0"
    helm:
      releaseName: my-postgres
      values: |
        auth:
          postgresPassword: $postgres-password
        primary:
          persistence:
            size: 50Gi
```

For secrets in Helm values: use ArgoCD Vault Plugin or External Secrets Operator. Never commit plaintext secrets to Git.

---

## Rollback

```bash
# CLI rollback to previous sync
argocd app rollback my-api

# Rollback to a specific sync ID
argocd app rollback my-api 42

# Or just revert the Git commit — Argo will sync to the reverted state
git revert <bad-commit>
git push
```

The Git revert approach is preferred. It creates an audit trail and keeps Git as the truth.

---

## RBAC

ArgoCD has its own RBAC on top of Kubernetes RBAC.

```yaml
# argocd-rbac-cm ConfigMap
policy.csv: |
  # Developers can sync staging, read production
  p, role:developer, applications, sync, staging/*, allow
  p, role:developer, applications, get, production/*, allow

  # Ops can do everything
  p, role:ops, applications, *, */*, allow

  # Bind GitHub team
  g, my-org:developers, role:developer
  g, my-org:ops, role:ops
```

---

## CLI

```bash
# Install
brew install argocd

# Login
argocd login argocd.my-company.com --username admin --password <pass>

# App management
argocd app list
argocd app get my-api
argocd app sync my-api
argocd app diff my-api       # show diff between Git and cluster
argocd app history my-api    # sync history

# Force refresh (re-read Git without waiting for poll interval)
argocd app refresh my-api
```

---

## CI/CD Split of Responsibilities

The classic GitOps pattern:

```
Developer push → GitHub Actions CI:
  1. Run tests
  2. Build Docker image
  3. Push image to registry (e.g., ghcr.io/my-org/my-api:abc123)
  4. Update image tag in k8s-manifests repo (via git commit)

ArgoCD CD:
  5. Detects new commit in k8s-manifests
  6. Syncs cluster to new image tag
```

This cleanly separates CI (building artifacts) from CD (deploying to cluster). CI never needs cluster credentials.

---

## Common Failure Cases

**Application stuck in `OutOfSync` even after a successful sync**
Why: a resource has a `last-applied-configuration` annotation that differs from what Argo generates (often due to Helm rendering differences or kubectl imperatives), causing Argo to always see drift.
Detect: `argocd app diff my-api` shows non-empty output despite the sync appearing to complete cleanly.
Fix: enable `RespectIgnoreDifferences` in the Application spec for the noisy field, or switch all resource management to Argo and stop mixing `kubectl apply`.

**selfHeal loop: Argo keeps reverting changes needed for hotfix**
Why: `selfHeal: true` is set and a temporary kubectl patch was applied directly to a resource owned by the Application.
Detect: the resource reverts within ~3 minutes of each manual change and Argo logs show repeated sync events.
Fix: either commit the change to Git (the correct path) or pause auto-sync for the Application (`argocd app set my-api --sync-policy none`) before applying the hotfix, then re-enable.

**Image Updater commits a broken tag and deploys it automatically**
Why: the update strategy (e.g., `latest` or `semver`) picked up a malformed or failing image tag and committed it to Git, triggering an automated sync.
Detect: a bad image tag appears in the manifest repo commit history and the rollout health degrades immediately after.
Fix: set `autoPromotionEnabled: false` in the Rollout or use `semver` with a constrained range rather than `latest`; always pair automated image updates with a pre-promotion analysis gate.

**ArgoCD cannot access a private Git repo after repo credential rotation**
Why: the SSH key or token stored in the ArgoCD `repo-creds` secret was rotated externally but not updated in Argo.
Detect: the Application shows `ComparisonError: rpc error: code = Unknown desc = authentication required` in the UI.
Fix: update the credential in `argocd repo add --upsert` or patch the `argocd-repo-creds` secret directly, then trigger a refresh.

## Connections

- [[cloud/kubernetes]] — ArgoCD deploys to Kubernetes clusters
- [[cloud/github-actions]] — CI builds images; ArgoCD deploys them
- [[cloud/docker]] — images that ArgoCD deploys
- [[cloud/terraform]] — Terraform provisions the cluster; ArgoCD manages workloads on it
- [[cloud/secrets-management]] — ArgoCD Vault Plugin or External Secrets for secret injection
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
