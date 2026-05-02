---
type: concept
category: cloud
para: resource
tags: [kubernetes, operators, crds, kubebuilder, controller-runtime]
sources: []
updated: 2026-05-01
tldr: Operators extend Kubernetes with domain-specific knowledge.
---

# Kubernetes Operators

Operators extend Kubernetes with domain-specific knowledge. A custom controller watches Custom Resource Definitions (CRDs) and reconciles actual cluster state toward the desired state declared in those resources.

---

## Core Concepts

**Custom Resource Definition (CRD):** Extends the Kubernetes API with a new resource type.
**Custom Resource (CR):** An instance of a CRD — the desired state the operator manages.
**Controller:** Watches CRs and takes action to reconcile actual → desired.
**Reconciliation loop:** Observe → Diff → Act → Observe again. Must be idempotent.

The operator pattern encodes operational knowledge (deploy, upgrade, backup, failover) as code rather than runbooks.

---

## Kubebuilder

Standard framework for building Go operators.

```bash
# Scaffold project
kubebuilder init --domain mycompany.com --repo github.com/mycompany/myoperator
kubebuilder create api --group apps --version v1alpha1 --kind MyApp

# Generate manifests from markers
make manifests    # CRDs + RBAC
make generate     # DeepCopy methods

# Run controller locally against live cluster
make run

# Deploy to cluster
make deploy IMG=myregistry/myoperator:v0.1.0
```

---

## CRD Example

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.apps.mycompany.com
spec:
  group: apps.mycompany.com
  names:
    kind: MyApp
    listKind: MyAppList
    plural: myapps
    singular: myapp
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: [replicas, image]
            properties:
              replicas:
                type: integer
                minimum: 1
              image:
                type: string
          status:
            type: object
            properties:
              readyReplicas:
                type: integer
```

---

## Reconciler (Go)

```go
func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    myApp := &appsv1alpha1.MyApp{}
    if err := r.Get(ctx, req.NamespacedName, myApp); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Handle deletion via finalizer
    if !myApp.DeletionTimestamp.IsZero() {
        return r.handleDeletion(ctx, myApp)
    }

    // Ensure Deployment exists
    deployment := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{Name: myApp.Name, Namespace: myApp.Namespace}, deployment)
    if errors.IsNotFound(err) {
        dep := r.buildDeployment(myApp)
        ctrl.SetControllerReference(myApp, dep, r.Scheme)
        return ctrl.Result{}, r.Create(ctx, dep)
    }

    // Reconcile replicas drift
    if *deployment.Spec.Replicas != myApp.Spec.Replicas {
        deployment.Spec.Replicas = &myApp.Spec.Replicas
        r.Update(ctx, deployment)
    }

    // Update status subresource
    myApp.Status.ReadyReplicas = deployment.Status.ReadyReplicas
    r.Status().Update(ctx, myApp)

    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

---

## RBAC Markers

```go
//+kubebuilder:rbac:groups=apps.mycompany.com,resources=myapps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps.mycompany.com,resources=myapps/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
```

Run `make manifests` to generate the ClusterRole from these markers.

---

## Operator Maturity Levels

| Level | Capability |
|---|---|
| 1 — Basic Install | Install and configure the application |
| 2 — Seamless Upgrades | Patch and minor version upgrades |
| 3 — Full Lifecycle | App lifecycle, storage lifecycle |
| 4 — Deep Insights | Metrics, alerts, log processing |
| 5 — Auto Pilot | Auto scaling, config tuning, anomaly detection |

---

## Popular Operators

- **cert-manager** — X.509 certificate lifecycle (Let's Encrypt, Vault)
- **external-secrets** — sync secrets from AWS SM, GCP SM, Vault into Kubernetes Secrets
- **KEDA** — event-driven autoscaling (Kafka lag, SQS depth, Prometheus metrics)
- **Strimzi** — Kafka on Kubernetes
- **Crossplane** — provision cloud resources as Kubernetes CRDs
- **Velero** — backup and restore cluster resources and volumes

---

## Common Failure Cases

**Reconciler enters an infinite loop updating the same resource**
Why: the reconciler calls `r.Update(ctx, obj)` on the main object (not the status subresource), which triggers a new watch event, which triggers a reconcile, endlessly.
Detect: the operator pod logs show hundreds of reconcile calls per second for the same resource name/namespace; CPU usage on the operator pod spikes.
Fix: use `r.Status().Update(ctx, obj)` for status changes only; for spec updates, compare the desired vs actual state before calling Update and skip if they match.

**CRD schema validation silently drops unknown fields**
Why: the CRD `openAPIV3Schema` omits `x-kubernetes-preserve-unknown-fields: true` and the Kubernetes API server silently strips fields it does not recognise, causing the operator to act on incomplete spec data.
Detect: `kubectl get myapp <name> -o json` shows the CR is missing fields that were present in the applied YAML; operator behaviour is incorrect.
Fix: add `x-kubernetes-preserve-unknown-fields: true` at the appropriate schema level, or extend the CRD schema to explicitly include the missing fields and run `make manifests`.

**Operator fails to reconcile after cluster upgrade changes a core API version**
Why: the operator was built against `apps/v1beta1` or another deprecated API that was removed in the new Kubernetes version, causing the client to return 404 on resource kinds.
Detect: operator logs show `no matches for kind "X" in version "Y"`; `kubectl api-resources` confirms the old version is absent.
Fix: update the controller-runtime and client-go dependencies to a version that targets the current API, regenerate the CRD manifests, and rebuild the operator image.

**Finalizer prevents CR deletion and the operator pod is down**
Why: the CR has a finalizer registered by the operator, but the operator pod is not running (crash-loop, deleted), so the finalizer can never be removed and the namespace or CR is stuck terminating.
Detect: `kubectl get myapp <name>` shows `Terminating` status and non-empty `finalizers` list for many minutes.
Fix: patch the finalizer out manually: `kubectl patch myapp <name> -p '{"metadata":{"finalizers":[]}}' --type=merge`; then fix the operator crash before re-deploying.

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/argocd]] · [[cloud/helm-advanced]] · [[cloud/secrets-management]]
