---
type: concept
category: qa
para: resource
tags: [security-testing, owasp, dast, sast, penetration-testing, qa]
sources: []
updated: 2026-05-01
---

# Security Testing (QA)

QA's role in application security: running automated security scans, coordinating with pen testers, and integrating security checks into the test pipeline. Not a replacement for dedicated security engineering — but QA is often the team that operationalises security checks in CI.

---

## OWASP Top 10 (2021) — QA's Testing Scope

| # | Vulnerability | QA Test Approach |
|---|---|---|
| A01 | Broken Access Control | Test role boundaries: can customer A see customer B's data? |
| A02 | Cryptographic Failures | Check HTTPS enforced, sensitive data not in logs/URLs |
| A03 | Injection | Payloads in every input field (SQL, command, LDAP, XPath) |
| A04 | Insecure Design | Missing threat model or auth for sensitive operations |
| A05 | Security Misconfiguration | Exposed admin endpoints, default creds, verbose errors |
| A06 | Vulnerable Components | Dependency scanning (SBOM) — Trivy, Safety, npm audit |
| A07 | Auth and Session Failures | Session fixation, no logout, weak tokens |
| A08 | Software/Data Integrity | Unsigned updates, insecure deserialisation |
| A09 | Logging/Monitoring Failures | No audit log for admin actions |
| A10 | SSRF | Inputs that trigger server-side HTTP requests |

---

## SAST — Static Analysis in CI

Scans source code without running it.

```yaml
# GitHub Actions — Semgrep SAST
- name: Semgrep scan
  uses: semgrep/semgrep-action@v1
  with:
    config: "p/owasp-top-ten p/python p/django"
  env:
    SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

# Bandit for Python
- name: Bandit security scan
  run: |
    pip install bandit
    bandit -r src/ -f json -o bandit-report.json -ll   # only medium+ severity
    bandit -r src/ --exit-zero -f txt                   # print results without failing CI

# ESLint security plugin for JavaScript
- name: ESLint security
  run: |
    npm install --save-dev eslint-plugin-security
    npx eslint --plugin security --rule 'security/detect-object-injection: error' src/
```

---

## DAST — Dynamic Analysis (ZAP)

Scans a running application by spidering and fuzzing endpoints.

```yaml
# GitHub Actions — OWASP ZAP API scan
- name: ZAP API Scan
  uses: zaproxy/action-api-scan@v0.7.0
  with:
    target: 'https://staging.myapp.com/api/openapi.json'
    format: openapi
    rules_file_name: '.zap/rules.tsv'
    fail_action: warn              # warn only, don't fail CI (noisy initially)

- name: Upload ZAP report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: zap-report
    path: report_html.html
```

```bash
# ZAP baseline scan (quicker — passive scan only)
docker run -v $(pwd):/zap/wrk/:rw -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://staging.myapp.com -r zap-baseline-report.html
```

---

## Dependency Scanning

```bash
# Python — Safety
pip install safety
safety check --json --output safety-report.json

# Python — Trivy
trivy fs --security-checks vuln --format json -o trivy-report.json .

# Node — npm audit
npm audit --audit-level=high --json > npm-audit.json

# Docker image scanning
trivy image myregistry/myapp:latest --severity HIGH,CRITICAL

# GitHub — Dependabot (automatic PRs for vulnerable deps)
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## QA Security Test Cases

```python
# tests/security/test_access_control.py
import pytest
import httpx

@pytest.fixture
def customer_a_client(api_url):
    # Authenticate as customer A
    response = httpx.post(f"{api_url}/auth/token", json={"email": "a@test.com", "password": "pass"})
    token = response.json()["access_token"]
    return httpx.Client(base_url=api_url, headers={"Authorization": f"Bearer {token}"})

def test_customer_cannot_view_other_customers_order(customer_a_client, customer_b_order_id):
    response = customer_a_client.get(f"/orders/{customer_b_order_id}")
    assert response.status_code == 403, "Customer A should not see customer B's orders"

def test_sql_injection_in_search(customer_a_client):
    payloads = ["' OR '1'='1", "'; DROP TABLE orders; --", "1' UNION SELECT * FROM users --"]
    for payload in payloads:
        response = customer_a_client.get(f"/products?search={payload}")
        assert response.status_code in (200, 400), f"Payload caused {response.status_code}: {payload}"
        # 500 = likely injection vulnerability

def test_sensitive_data_not_in_error_response(customer_a_client):
    response = customer_a_client.get("/users/999999999")
    assert response.status_code == 404
    body = response.text
    assert "password" not in body.lower()
    assert "secret" not in body.lower()
    assert "token" not in body.lower()

def test_admin_endpoint_requires_auth(api_url):
    response = httpx.get(f"{api_url}/admin/users")
    assert response.status_code in (401, 403), "Admin endpoint must not be publicly accessible"
```

---

## Pen Test Coordination

QA's role when an external pen test runs:
1. Provide test credentials at each role level (guest, customer, admin)
2. Share API documentation and OpenAPI spec
3. Flag which areas are in scope vs out of scope
4. Triage findings: Critical/High require fix before release; Medium in next sprint; Low tracked
5. Write regression tests for every confirmed vulnerability found

---

## Connections
[[qa-hub]] · [[qa/risk-based-testing]] · [[qa/qa-in-devops]] · [[technical-qa/security-automation]] · [[security/guardrails]] · [[cs-fundamentals/auth-patterns]]
