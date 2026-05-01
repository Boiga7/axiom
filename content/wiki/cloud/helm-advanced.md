---
type: concept
category: cloud
para: resource
tags: [helm, kubernetes, charts, hooks, oci, dependencies, templating]
sources: []
updated: 2026-05-01
---

# Helm — Advanced Patterns

Beyond `helm install`. Hooks, library charts, OCI registries, testing, and patterns for production-grade chart management.

---

## Chart Structure Deep Dive

```
my-chart/
├── Chart.yaml          # metadata: name, version, appVersion, dependencies
├── values.yaml         # default values
├── values-prod.yaml    # environment overrides (not shipped in chart)
├── templates/
│   ├── _helpers.tpl    # named templates (reusable snippets)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── NOTES.txt       # printed after install
│   └── tests/
│       └── test-connection.yaml
└── charts/             # vendored dependency charts
```

---

## Named Templates (_helpers.tpl)

```yaml
{{/* Standard labels for all resources */}}
{{- define "my-chart.labels" -}}
helm.sh/chart: {{ include "my-chart.chart" . }}
app.kubernetes.io/name: {{ include "my-chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/* Selector labels */}}
{{- define "my-chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

Usage in templates:
```yaml
metadata:
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "my-chart.selectorLabels" . | nindent 6 }}
```

---

## Hooks

Run Jobs at specific points in the release lifecycle.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .Release.Name }}-db-migrate"
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"           # lower = runs first
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["python", "manage.py", "migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-creds
                  key: url
```

Hook annotations:
- `pre-install` / `post-install` — before/after first install
- `pre-upgrade` / `post-upgrade` — before/after upgrades
- `pre-delete` / `post-delete` — before/after deletion
- `pre-rollback` / `post-rollback` — before/after rollbacks

---

## Chart Dependencies

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "14.3.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled    # toggle via values
  - name: redis
    version: "18.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

```bash
helm dependency update my-chart    # download deps to charts/
helm dependency build my-chart     # use Chart.lock (pinned versions)
```

```yaml
# values.yaml — configure sub-charts under their chart name
postgresql:
  enabled: true
  auth:
    postgresPassword: "{{ .Values.database.password }}"
  primary:
    persistence:
      size: 50Gi

redis:
  enabled: false
```

---

## OCI Registry

Helm 3.8+ supports storing charts in OCI registries (ECR, GCR, GHCR, Docker Hub).

```bash
# Push chart to GHCR
helm package my-chart
helm push my-chart-1.2.3.tgz oci://ghcr.io/my-org/charts

# Install from OCI
helm install my-release oci://ghcr.io/my-org/charts/my-chart --version 1.2.3

# Authenticate
echo $GITHUB_TOKEN | helm registry login ghcr.io --username my-user --password-stdin
```

OCI replaces HTTP chart repositories for private charts. No need to run a chart museum.

---

## Helm Test

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ .Release.Name }}-test-connection"
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: wget
      image: busybox
      command: ['wget', '--no-verbose', '--tries=1', '--spider',
                'http://{{ include "my-chart.fullname" . }}:{{ .Values.service.port }}/health']
```

```bash
helm test my-release    # runs test pods, reports pass/fail
```

---

## Diff and Dry-Run

```bash
# Show what will change before upgrading
helm diff upgrade my-release my-chart -f values-prod.yaml

# Render templates without applying (debug)
helm template my-release my-chart -f values-prod.yaml

# Dry-run (server-side validation)
helm upgrade my-release my-chart -f values-prod.yaml --dry-run
```

`helm-diff` plugin is essential for code review of Helm changes — shows a kubectl-diff style output of every manifest change.

---

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/argocd]] · [[cloud/github-actions]]
