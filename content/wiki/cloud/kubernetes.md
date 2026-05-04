---
type: concept
category: cloud
para: resource
tags: [kubernetes, k8s, pods, deployments, hpa, rbac, helm, ingress]
sources: []
updated: 2026-05-01
tldr: Open-source container orchestration. Declare desired state; the control plane makes it so and keeps it so. The standard production substrate for containerised workloads.
---

# Kubernetes

Open-source container orchestration. Declare desired state; the control plane makes it so and keeps it so. The standard production substrate for containerised workloads. Originally built at Google (Borg lineage), donated to CNCF in 2014.

---

## Architecture

```
Control Plane (managed by cloud provider in EKS/GKE/AKS)
├── API Server      — all kubectl/SDK requests land here
├── etcd            — distributed KV store for all cluster state
├── Scheduler       — assigns pods to nodes
└── Controller Manager — reconciliation loops (ReplicaSet, Deployment, etc.)

Worker Nodes (your EC2/VMs)
├── kubelet         — node agent; talks to API server; runs containers
├── kube-proxy      — network rules for Service routing
└── Container Runtime (containerd) — actually runs the containers
```

---

## Core Objects

### Pod
Smallest deployable unit. One or more containers sharing a network namespace and volume mounts.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
    - name: app
      image: my-api:1.0.0
      ports:
        - containerPort: 8000
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
```

Always set `resources.requests`. The scheduler uses them for placement. Always set `limits`. Without them, a single pod can starve all others on the node.

### Deployment
Declarative rolling updates with rollback. Manages a ReplicaSet.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # one extra pod during rollout
      maxUnavailable: 0   # never take down a pod before a new one is ready
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: api
          image: my-api:1.2.0
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
```

`readinessProbe` — pod only receives traffic when probe passes. `livenessProbe` — pod is restarted if probe fails.

### Service
Stable network endpoint for a set of pods. Labels select which pods are included.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-svc
spec:
  selector:
    app: my-api
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP   # ClusterIP (internal), NodePort (on node IP), LoadBalancer (cloud LB)
```

### ConfigMap / Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "info"
  REGION: "eu-west-1"

---
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
type: Opaque
data:
  password: cGFzc3dvcmQxMjM=   # base64-encoded; use External Secrets Operator in prod
```

### Ingress
Route external HTTP(S) traffic to services based on host/path.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-api-svc
                port:
                  number: 80
```

Requires an Ingress Controller (nginx, Traefik, AWS ALB Ingress Controller, GKE Ingress).

---

## Autoscaling

### Horizontal Pod Autoscaler (HPA)

Scale pod count based on CPU, memory, or custom metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Vertical Pod Autoscaler (VPA)
Automatically adjusts CPU/memory requests. Usually run in "Off" mode (recommendations only) in production. Live eviction during updates can disrupt traffic.

### Cluster Autoscaler
Adds/removes nodes based on pending pod pressure and node utilization. Configured at the node pool level in cloud-managed K8s. Set `--scale-down-utilization-threshold=0.5` to reclaim idle nodes.

---

## RBAC

Role-Based Access Control. Who can do what on which resources.

```yaml
# Role — namespace-scoped
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]

---
# Bind the role to a service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: ServiceAccount
    name: monitoring-sa
    namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

`ClusterRole` / `ClusterRoleBinding` for cluster-wide permissions (e.g., node access, PV management).

---

## Helm

Package manager for Kubernetes. A chart is a parameterised set of Kubernetes manifests.

```bash
# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install a chart
helm install my-postgres bitnami/postgresql \
  --set auth.postgresPassword=mysecretpassword \
  --namespace databases \
  --create-namespace

# Upgrade
helm upgrade my-postgres bitnami/postgresql --set image.tag=16.2.0

# Rollback
helm rollback my-postgres 1

# Template (render without applying)
helm template my-api ./charts/my-api -f values.prod.yaml
```

Chart structure:
```
charts/my-api/
  Chart.yaml         # name, version, appVersion
  values.yaml        # default values
  templates/
    deployment.yaml
    service.yaml
    ingress.yaml
    _helpers.tpl     # reusable template snippets
```

---

## Pod Disruption Budgets

Protect availability during voluntary disruptions (node drain, upgrades).

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-api-pdb
spec:
  minAvailable: 2       # always keep 2 pods running; OR use maxUnavailable: 1
  selector:
    matchLabels:
      app: my-api
```

Without a PDB, `kubectl drain` can remove all pods at once.

---

## Network Policies

Default: all pods can talk to all pods. Network Policies restrict traffic.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-only-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: my-api
      ports:
        - port: 5432
```

Requires a CNI that supports NetworkPolicy (Calico, Cilium, Weave). AWS VPC CNI requires an add-on (Calico for NetworkPolicy).

---

## kubectl Essentials

```bash
# Context and namespace
kubectl config get-contexts
kubectl config use-context my-cluster
kubectl config set-context --current --namespace=production

# Basics
kubectl get pods -n production -o wide
kubectl describe pod my-pod-abc123
kubectl logs my-pod-abc123 -f --previous    # --previous for crashed container logs
kubectl exec -it my-pod-abc123 -- sh

# Apply / delete
kubectl apply -f deployment.yaml
kubectl delete -f deployment.yaml
kubectl delete pod my-pod-abc123

# Rollout
kubectl rollout status deployment/my-api
kubectl rollout history deployment/my-api
kubectl rollout undo deployment/my-api       # rollback

# Scale
kubectl scale deployment my-api --replicas=5

# Port forward (local dev, not production)
kubectl port-forward svc/my-api-svc 8080:80
```

---

## Security Hardening

- **Run as non-root**: `securityContext.runAsNonRoot: true`
- **Read-only root filesystem**: `securityContext.readOnlyRootFilesystem: true`
- **Drop all capabilities**: `securityContext.capabilities.drop: ["ALL"]`
- **Pod Security Standards**: Enforce `baseline` or `restricted` at namespace level via admission controller
- **Network Policies**: default-deny ingress/egress, allow only what's needed
- **IRSA / Workload Identity**: no static credentials in pods; IAM roles bound to pod service accounts
- **Image scanning**: scan all images for CVEs before push; enforce via admission webhook (OPA Gatekeeper, Kyverno)
- **Secrets**: never put raw values in YAML committed to git; use External Secrets Operator (pulls from Vault / Secrets Manager at runtime)

---

## Common Failure Cases

**Pods stuck in "Pending" indefinitely after deployment**
Why: no node has enough allocatable CPU or memory to satisfy the pod's `resources.requests` — either the cluster has no remaining capacity or requests are set too high relative to node size.
Detect: `kubectl describe pod <name>` shows `Insufficient cpu` or `Insufficient memory` in the Events section; `kubectl get nodes` shows nodes at capacity.
Fix: scale the node group, right-size the pod requests to reflect actual consumption, or verify the Cluster Autoscaler is configured and has permission to add nodes.

**Rolling update stalls with half old pods and half new pods**
Why: the new pods fail their `readinessProbe` (app misconfiguration, missing secret, wrong image) so the deployment controller never proceeds past `maxUnavailable`.
Detect: `kubectl rollout status deployment/<name>` hangs; `kubectl get pods` shows new pods in `Running` state but `0/1 READY`; `kubectl describe pod` shows probe failures.
Fix: check logs on the new pod (`kubectl logs <new-pod>`), fix the underlying issue (missing env var, wrong image tag), then push a corrected deployment revision.

**`kubectl drain` blocks node maintenance indefinitely**
Why: a pod has no PodDisruptionBudget and is the only replica of a stateful workload, or a PDB has `minAvailable` equal to the current replica count, making any disruption impossible.
Detect: `kubectl drain` outputs `Cannot evict pod as it would violate the pod's disruption budget`.
Fix: temporarily scale the affected deployment to add a replica, then drain; or reduce `minAvailable` in the PDB, drain, then restore; never delete PDBs permanently on production workloads.

**Ingress returns 502 for all requests despite pods being healthy**
Why: the pod's `containerPort` or `targetPort` in the Service does not match the port the application actually listens on, so the Ingress Controller's backend health check fails.
Detect: `kubectl describe ingress` shows healthy backend; `kubectl exec` into the pod and `curl localhost:<port>` returns connection refused on the configured port.
Fix: align the Service `targetPort` with the actual listening port in the container; verify with `kubectl port-forward` before deploying changes.

**NetworkPolicy blocks DNS and all pods lose external connectivity**
Why: a default-deny egress policy was applied to a namespace without an explicit rule allowing UDP/TCP port 53 to `kube-dns` in `kube-system`.
Detect: pods in the namespace fail name resolution (`nslookup kubernetes.default` times out); removing the NetworkPolicy restores connectivity.
Fix: add an egress rule to the NetworkPolicy allowing port 53 to the `kube-system` namespace where `kube-dns` runs.

## Connections

- [[cloud/docker]] — Docker builds the images Kubernetes runs
- [[cloud/aws-core]] — EKS is AWS managed K8s
- [[cloud/gcp-core]] — GKE is GCP managed K8s
- [[cloud/azure-core]] — AKS is Azure managed K8s
- [[cloud/argocd]] — GitOps CD for Kubernetes
- [[cloud/cloud-networking]] — CNI, ingress, network policies in depth
- [[cloud/terraform]] — terraform-aws-eks and similar modules for cluster provisioning
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
