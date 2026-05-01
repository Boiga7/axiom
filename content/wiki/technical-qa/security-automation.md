---
type: concept
category: technical-qa
para: resource
tags: [security-automation, zap, semgrep, trivy, sast, dast, ci]
sources: []
updated: 2026-05-01
---

# Security Automation

Automating security checks as part of CI/CD — SAST (static analysis), DAST (dynamic scanning), dependency auditing, container scanning, and secrets detection. Shift-left security means catching vulnerabilities before they reach production.

---

## Security Pipeline Layers

```
Pre-commit
  └── secrets detection (detect-secrets, gitleaks)
  └── SAST lint (ruff/bandit rules)

Pull Request
  └── SAST (Semgrep, Bandit, CodeQL)
  └── Dependency scan (Trivy, safety, npm audit)
  └── Container image scan (Trivy)
  └── IaC scan (checkov, tfsec)

Staging deploy
  └── DAST (ZAP baseline scan)
  └── API security scan

Production
  └── Continuous penetration testing (Bug bounty, scheduled pen test)
  └── WAF rules (AWS WAF, Cloudflare)
  └── Runtime protection (Falco on Kubernetes)
```

---

## Secrets Detection

```bash
# detect-secrets — baseline approach
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline

# pre-commit hook (in .pre-commit-config.yaml)
- repo: https://github.com/Yelp/detect-secrets
  rev: v1.4.0
  hooks:
  - id: detect-secrets
    args: ['--baseline', '.secrets.baseline']

# gitleaks — scan entire git history
docker run -v "${PWD}:/path" zricethezav/gitleaks:latest \
  detect --source="/path" --report-format=json --report-path=/path/gitleaks-report.json

# GitHub — secret scanning is automatic in public repos; enable for private via Settings
```

---

## SAST — Semgrep

```yaml
# .github/workflows/semgrep.yaml
- name: Semgrep SAST
  uses: semgrep/semgrep-action@v1
  with:
    config: >-
      p/owasp-top-ten
      p/python
      p/django
      p/jwt
      p/sql-injection
  env:
    SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

```bash
# Local scan
semgrep --config "p/owasp-top-ten" src/

# Custom rule example
# .semgrep/rules.yaml
rules:
- id: hardcoded-token
  pattern: |
    $VAR = "sk-..."
  message: "Possible hardcoded API token in $VAR"
  severity: ERROR
  languages: [python]
```

---

## Dependency Scanning — Trivy

```bash
# Scan Python dependencies
trivy fs --security-checks vuln --format table .

# Scan Docker image
trivy image --severity HIGH,CRITICAL myregistry/myapp:latest

# Fail CI if CRITICAL vulnerabilities found
trivy image --exit-code 1 --severity CRITICAL myregistry/myapp:latest

# SBOM generation (Software Bill of Materials)
trivy image --format cyclonedx --output sbom.json myregistry/myapp:latest
```

```yaml
# GitHub Actions
- name: Trivy vulnerability scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myregistry/myapp:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    exit-code: '1'
    ignore-unfixed: true
    severity: CRITICAL,HIGH

- name: Upload to GitHub Security tab
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

---

## IaC Scanning — Checkov

```bash
pip install checkov

# Scan Terraform
checkov -d terraform/ --framework terraform --soft-fail

# Scan Kubernetes manifests
checkov -d k8s/ --framework kubernetes --output json

# Scan Dockerfile
checkov -f Dockerfile --framework dockerfile

# GitHub Actions
- name: Checkov IaC scan
  uses: bridgecrewio/checkov-action@master
  with:
    directory: terraform/
    framework: terraform
    soft_fail: true
    output_format: github_failed_only
```

---

## DAST — OWASP ZAP in CI

```yaml
# API scan against OpenAPI spec
- name: ZAP API Scan
  uses: zaproxy/action-api-scan@v0.7.0
  with:
    target: 'https://staging.myapp.com/api/openapi.json'
    format: openapi
    fail_action: true
    cmd_options: '-I'   # ignore warning alerts
  env:
    ZAP_AUTH_HEADER: 'Authorization'
    ZAP_AUTH_HEADER_VALUE: 'Bearer ${{ secrets.STAGING_API_TOKEN }}'

# Full site scan
- name: ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'https://staging.myapp.com'
    rules_file_name: '.zap/rules.tsv'
    cmd_options: '-a'   # include alpha rules
```

```
# .zap/rules.tsv — customise which rules fail CI
# Format: rule_id TAB action (IGNORE/WARN/FAIL)
10016	IGNORE    # Web Browser XSS Protection Not Enabled (deprecated header)
10035	WARN      # Strict-Transport-Security header not set (staging-only)
40012	FAIL      # Cross Site Scripting Reflected
40014	FAIL      # Cross Site Scripting Persistent
```

---

## Falco — Runtime Security (Kubernetes)

```yaml
# Falco rule — alert on container writing to /etc
- rule: Write below etc
  desc: Detect writes to /etc
  condition: >
    open_write and container and fd.name startswith /etc
    and not proc.name in (known_etc_writers)
  output: >
    File opened for writing below /etc
    (user=%user.name command=%proc.cmdline file=%fd.name container=%container.id)
  priority: ERROR
  tags: [filesystem, mitre_persistence]
```

---

## Automated Security Test Cases

```python
# tests/security/test_auth.py
def test_jwt_expiry_rejected(client):
    expired_token = create_jwt(expires_delta=timedelta(seconds=-1))
    response = client.get("/api/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401

def test_csrf_protection_active(client, session_cookie):
    # POST without CSRF token must be rejected
    response = client.post("/api/profile", cookies={"session": session_cookie})
    assert response.status_code in (400, 403)

def test_rate_limit_enforced(client):
    for _ in range(100):
        client.post("/api/auth/login", json={"email": "test@test.com", "password": "wrong"})
    response = client.post("/api/auth/login", json={"email": "test@test.com", "password": "wrong"})
    assert response.status_code == 429
```

---

## Connections
[[tqa-hub]] · [[qa/security-testing-qa]] · [[cloud/cloud-security]] · [[security/guardrails]] · [[cloud/github-actions]] · [[cloud/kubernetes]] · [[cs-fundamentals/auth-patterns]]
