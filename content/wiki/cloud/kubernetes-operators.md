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

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/argocd]] · [[cloud/helm-advanced]] · [[cloud/secrets-management]]
