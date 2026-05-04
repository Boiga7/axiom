---
type: concept
category: cloud
para: resource
tags: [helm, kubernetes, charts, hooks, oci, dependencies, templating]
sources: []
updated: 2026-05-01
tldr: Beyond `helm install`. Hooks, library charts, OCI registries, testing, and patterns for production-grade chart management.
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

## Common Failure Cases

**Hook job from a previous release blocks the next upgrade**
Why: `helm.sh/hook-delete-policy` was not set (or set to `hook-succeeded` only), so a failed hook Job remains and the new upgrade cannot create a job with the same name.
Detect: `helm upgrade` exits with `Error: rendered manifests contain a resource that already exists`; the old Job is visible in `kubectl get jobs`.
Fix: manually delete the stale Job, then re-run the upgrade; add `before-hook-creation` to the hook's delete policy to prevent recurrence.

**`helm dependency update` pulls a different sub-chart version than expected**
Why: `Chart.yaml` uses a loose version range (e.g., `14.3.x`) and a new patch release broke a breaking change in the sub-chart API.
Detect: `helm template` or `helm upgrade --dry-run` fails with an unexpected field error originating from the sub-chart.
Fix: pin the dependency to the exact version in `Chart.yaml` and commit `Chart.lock` to source control so all environments use the identical chart.

**OCI chart pull fails with "401 unauthorized" in CI**
Why: the OCI registry authentication token was generated before the Helm client session started, or the credentials helper is not configured for the OCI URL prefix.
Detect: `helm pull oci://...` returns `Error: unexpected status code 401`; the equivalent `docker pull` succeeds.
Fix: run `helm registry login <registry>` explicitly before any OCI pull/push commands, using the same credential source as your Docker login.

**`helm rollback` does not restore the application to a working state**
Why: rollback restores the chart manifests to the previous revision but does not undo changes applied by hooks (e.g., a database migration run in `pre-upgrade` cannot be rolled back automatically).
Detect: rollback completes without error but the application still errors because the schema no longer matches the old code version.
Fix: write migrations to be backward-compatible (expand-contract pattern) so both old and new code can run against the same schema simultaneously.

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/argocd]] · [[cloud/github-actions]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
