---
type: concept
category: cloud
para: resource
tags: [gitops, argocd, flux, progressive-delivery, pull-based-deployment]
sources: []
updated: 2026-05-01
tldr: GitOps uses Git as the single source of truth for infrastructure and application state. A GitOps operator continuously reconciles the actual cluster state toward what's declared in Git.
---

# GitOps Patterns

GitOps uses Git as the single source of truth for infrastructure and application state. A GitOps operator continuously reconciles the actual cluster state toward what's declared in Git. Changes happen via PR, not `kubectl apply`.

---

## GitOps Principles

1. **Declarative:** Desired state described in Git, not imperative scripts
2. **Versioned:** Git is the authoritative record; all changes are commits
3. **Pulled automatically:** An agent in the cluster pulls from Git (not pushed by CI)
4. **Continuously reconciled:** Divergence from desired state is automatically corrected

```
Developer → PR → Git merge → GitOps operator detects diff → applies to cluster

NOT:
Developer → CI pipeline → kubectl apply → cluster (push-based, CI needs cluster credentials)
```

---

## Flux vs ArgoCD

| | Flux v2 | ArgoCD |
|---|---|---|
| Architecture | CLI + controllers | CLI + server + UI |
| UI | Third-party (Weave GitOps) | Built-in dashboard |
| Multi-tenancy | Namespace isolation with Kustomization | Projects + RBAC |
| Multi-cluster | Native (Fleet) | ApplicationSets |
| Notification | Built-in (Slack, MS Teams, PagerDuty) | Notification controller |
| App delivery | Kustomize + Helm natively | App-of-apps, ApplicationSets |
| Learning curve | Moderate (more CRDs) | Lower (single App CRD) |

Choose **ArgoCD** if you want a UI-first experience and simpler initial setup. Choose **Flux** if you want a pure GitOps controller without a management UI.

---

## Flux v2 — Quick Setup

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal   # or --token-auth for org repos
```

```yaml
# clusters/production/myapp-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: myapp-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.mycompany.com
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: production
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: myapp-charts
  values:
    replicaCount: 3
    image:
      tag: "v1.2.0"
  # Upgrade policy
  upgrade:
    remediation:
      retries: 3
  rollback:
    enable: true
```

---

## Repository Structure Patterns

**Monorepo (single repo for all apps + infra):**
```
fleet-infra/
  clusters/
    production/
      myapp.yaml
      database.yaml
      ingress.yaml
    staging/
      myapp.yaml
  apps/
    myapp/
      deployment.yaml
      service.yaml
      hpa.yaml
```

**Polyrepo (app team owns their repo; ops team owns fleet repo):**
```
myapp-repo/            ← owned by app team
  Dockerfile
  helm/
  .github/workflows/   ← pushes new image tag

fleet-infra/           ← owned by platform team
  apps/myapp/
    HelmRelease.yaml   ← references image tag; Flux Image Automation updates this
```

---

## Image Automation with Flux

```yaml
# Automatically update image tag in Git when new image is pushed
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: myregistry/myapp
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"
---
# In your HelmRelease values:
# image:
#   tag: "v1.2.0" # {"$imagepolicy": "flux-system:myapp:tag"}
# Flux updates this comment-marker automatically
```

---

## Secrets in GitOps — SOPS

Never store plaintext secrets in Git. Use SOPS to encrypt secrets with a KMS key.

```bash
# Encrypt secrets file with AWS KMS
sops --encrypt \
  --kms arn:aws:kms:eu-west-1:123456789:key/mrk-xxxxxxxx \
  secrets.yaml > secrets.enc.yaml

# Decrypt at cluster time (Flux SOPS integration)
# flux create secret generic sops-aws --from-literal=... (configure decryption)
```

Alternative: External Secrets Operator syncing from AWS Secrets Manager.

---

## Drift Detection and Reconciliation

```bash
# Flux — check sync status
flux get all -A

# Suspend reconciliation for manual maintenance
flux suspend kustomization myapp

# Force immediate sync
flux reconcile kustomization myapp --with-source

# Get diff between Git and cluster
flux diff kustomization myapp
```

---

## Common Failure Cases

**Flux reconciliation stuck in "not ready" permanently**
Why: the GitRepository source cannot authenticate to the remote — the deploy key or PAT was rotated but not updated in the Flux secret.
Detect: `flux get sources git -A` shows `failed to checkout` or `authentication required`.
Fix: delete and recreate the `flux-system/flux-system` secret with the new credentials, then `flux reconcile source git flux-system`.

**HelmRelease upgrade fails and blocks all subsequent reconciliations**
Why: a pre-upgrade hook job failed or the chart rendered invalid manifests, leaving the release in a `failed` state with retries exhausted.
Detect: `flux get helmreleases -A` shows `upgrade retries exhausted`; `kubectl describe helmrelease <name>` shows the failing hook.
Fix: fix the underlying chart issue, then `flux suspend helmrelease <name> && flux resume helmrelease <name>` to reset the retry counter.

**SOPS-encrypted secret fails to decrypt in cluster**
Why: the KSOPS or Flux SOPS provider cannot access the KMS key because the controller's IAM role lost the `kms:Decrypt` permission.
Detect: `flux get kustomizations -A` shows `decryption failed`; CloudTrail shows `AccessDenied` on the KMS key ARN.
Fix: verify and restore the `kms:Decrypt` IAM policy on the Flux controller's service account role.

**Image Automation writes to Git but deployment never updates**
Why: the `ImagePolicy` semver range excludes the newly pushed tag (e.g., range is `>=1.0.0 <2.0.0` but image was tagged `2.0.0`).
Detect: `flux get imagerepositories -A` shows the image is detected; `flux get imagepolicies -A` shows `no latest image`.
Fix: update the `ImagePolicy` semver range to include the new tag, or re-tag the image to match the existing range.

**Drift correction loops endlessly and thrashes the cluster**
Why: a resource has a field that Kubernetes mutates after creation (e.g., `status`, or a webhook-injected annotation), and the GitOps source does not match what the cluster returns — causing Flux to re-apply every interval.
Detect: `flux events` shows continuous reconciliation of the same resource; pod disruptions occur on a regular cycle.
Fix: add the drifting field to the `.spec.patches` ignore list in the Kustomization, or use `kustomize.toolkit.fluxcd.io/force: disabled` on the resource.

## Connections
[[cloud-hub]] · [[cloud/argocd]] · [[cloud/argo-rollouts]] · [[cloud/kubernetes]] · [[cloud/github-actions]] · [[cloud/secrets-management]] · [[cloud/helm-advanced]]
