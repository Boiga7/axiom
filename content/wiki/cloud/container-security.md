---
type: concept
category: cloud
para: resource
tags: [container-security, docker, kubernetes, trivy, falco, image-scanning, pod-security]
sources: []
updated: 2026-05-01
---

# Container Security

Securing the container lifecycle: from image build to runtime in Kubernetes. Containers reduce attack surface compared to VMs but introduce their own threat model.

---

## Container Threat Model

```
Image vulnerabilities:
  - Outdated base image with known CVEs
  - Unnecessary packages installed (larger attack surface)
  - Secrets baked into image layers (visible in docker history)
  - Running as root inside container

Registry risks:
  - Unsigned images (image substitution attack)
  - Public registry with no access control
  - No scanning before deployment

Runtime threats:
  - Container escape to host kernel
  - Privilege escalation within container
  - Lateral movement between containers
  - Network access to restricted services
```

---

## Secure Dockerfile

```dockerfile
# Multi-stage build — only ship what's needed
FROM python:3.12-slim AS builder
WORKDIR /build

# Install build deps only in builder stage
RUN pip install --no-cache-dir poetry
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --without-hashes > requirements.txt
RUN pip install --no-cache-dir -r requirements.txt --target /install

COPY src/ ./src/

# Lean production image
FROM gcr.io/distroless/python3-debian12:nonroot AS production
# distroless: no shell, no package manager, minimal CVE surface

WORKDIR /app

# Copy only installed packages + app code
COPY --from=builder /install /install
COPY --from=builder /build/src ./src

# Non-root user (distroless images use uid 65532 by default)
USER nonroot:nonroot

ENV PYTHONPATH=/install
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Use exec form — signals reach process, no shell wrapping
CMD ["python", "-m", "gunicorn", "myapp.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## Image Scanning with Trivy

```yaml
# .github/workflows/image-scan.yaml
- name: Build image
  run: docker build -t myapp:${{ github.sha }} .

- name: Scan for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: HIGH,CRITICAL
    exit-code: '1'          # fail pipeline on HIGH/CRITICAL
    ignore-unfixed: true    # skip vulnerabilities with no fix yet

- name: Upload scan results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

```bash
# Local scanning
trivy image myapp:latest
trivy image --severity HIGH,CRITICAL python:3.12-slim
trivy fs --scanners secret,vuln .   # scan local filesystem for secrets + CVEs
trivy k8s --report summary cluster  # scan entire cluster
```

---

## Kubernetes Pod Security

```yaml
# Pod security — restrict what containers can do
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534        # nobody
        runAsGroup: 65534
        fsGroup: 65534
        seccompProfile:
          type: RuntimeDefault  # restrict syscalls to safe set

      containers:
      - name: myapp
        image: myapp:1.2.3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true     # container can't write to FS
          capabilities:
            drop: ["ALL"]                  # drop all Linux capabilities
            add: ["NET_BIND_SERVICE"]      # only add back what's needed

        volumeMounts:
        - name: tmp
          mountPath: /tmp                  # writable tmp when readOnly root

      volumes:
      - name: tmp
        emptyDir: {}                       # in-memory volume for /tmp
```

---

## NetworkPolicy — Zero-Trust Networking

```yaml
# Default deny all ingress/egress, then allow explicitly
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: myapp-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Ingress
    - Egress

  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress    # only accept from ingress controller
    ports:
    - port: 8000

  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres         # allow DB access
    ports:
    - port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system     # allow DNS
    ports:
    - port: 53
      protocol: UDP
```

---

## Runtime Security with Falco

```yaml
# falco-rules.yaml — detect suspicious runtime behaviour
- rule: Shell Spawned in Container
  desc: Detect any shell spawned inside a container
  condition: >
    spawned_process and container
    and proc.name in (shell_binaries)
    and not proc.pname in (allowed_parent_processes)
  output: >
    Shell spawned in container (user=%user.name command=%proc.cmdline
    container=%container.name image=%container.image.repository)
  priority: WARNING

- rule: Sensitive File Access
  desc: Detect access to sensitive files inside containers
  condition: >
    open_read and container
    and fd.name in (/etc/passwd, /etc/shadow, /etc/sudoers, /root/.ssh/id_rsa)
  output: >
    Sensitive file opened for reading (file=%fd.name command=%proc.cmdline)
  priority: ERROR

- rule: Container Running as Root
  desc: Detect containers started as root
  condition: container.start_ts != 0 and proc.vpid=1 and user.uid=0 and container
  output: "Container started with root user (image=%container.image.repository)"
  priority: WARNING
```

---

## Image Signing with Cosign

```bash
# Sign the image after build
cosign sign --key cosign.key myregistry.io/myapp:1.2.3

# Verify before deployment (in CI or admission webhook)
cosign verify --key cosign.pub myregistry.io/myapp:1.2.3

# Keyless signing with OIDC (no key management)
cosign sign --rekor-url https://rekor.sigstore.dev \
            --oidc-issuer https://token.actions.githubusercontent.com \
            myregistry.io/myapp:1.2.3
```

---

## Connections
[[cloud-hub]] · [[cloud/cloud-security]] · [[cloud/kubernetes-operators]] · [[technical-qa/security-automation]] · [[technical-qa/infrastructure-testing]] · [[cs-fundamentals/security-fundamentals-se]]
