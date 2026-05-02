---
type: concept
category: qa
para: resource
tags: [compliance, gdpr, accessibility, wcag, audit, pci-dss, regulation]
sources: []
updated: 2026-05-01
tldr: Verifying software meets legal, regulatory, and standards requirements. Failing compliance isn't just a bug — it's a regulatory risk.
---

# Compliance Testing

Verifying software meets legal, regulatory, and standards requirements. Failing compliance isn't just a bug. It's a regulatory risk. QA must understand which regulations apply and translate them into testable requirements.

---

## Regulatory Landscape

| Regulation | Applies to | Key QA Concerns |
|---|---|---|
| GDPR (EU) | Any org handling EU personal data | Data subject rights, consent, data retention |
| CCPA (California) | Orgs with CA users > 100K | Right to opt out, data deletion |
| PCI DSS | Card payment processing | No cardholder data in logs, encryption, network seg |
| HIPAA (US) | Healthcare data (PHI) | Encryption at rest/transit, audit logs, access control |
| SOC 2 | SaaS providers | Security, availability, confidentiality controls |
| WCAG 2.1 | Web accessibility | AA standard for public-facing products |
| ISO 27001 | Information security | Risk management, evidence of controls |

---

## GDPR Testing Scenarios

```
Right to access (Article 15):
  GIVEN a registered user requests their personal data
  WHEN the request is processed within 30 days
  THEN they receive a complete export of all data held

  Test: Request data export → verify export includes profile, orders, preferences, logs
        Verify no other user's data is included
        Verify response within SLA (30 calendar days)

Right to erasure (Article 17):
  GIVEN a user requests account deletion
  WHEN the deletion is processed
  THEN all personal data is removed from production systems
       AND removed from backups within 30 days
       AND audit log records the deletion (not the personal data)

  Test: Delete account → query all tables for user PII → assert none found
        Verify anonymised order records remain (legitimate business interest)
        Verify deletion event logged with timestamp and request reference

Data minimisation (Article 5):
  Test: Review every form field — is each one necessary for the stated purpose?
  Test: Verify no PII collected in analytics beyond what's declared in privacy notice
  Test: Verify log files do not contain passwords, card numbers, full names
```

---

## PCI DSS Test Cases

```python
# tests/compliance/test_pci.py
import pytest
import re

def test_card_number_not_in_application_logs(log_output):
    """PCI DSS Req 3.2: Do not store sensitive auth data."""
    card_pattern = re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b')
    matches = card_pattern.findall(log_output)
    assert not matches, f"Card numbers found in logs: {matches}"

def test_cvv_not_stored_in_database(db_session):
    """PCI DSS Req 3.2.1: Do not store CVV/CVC after authorization."""
    payments = db_session.query(Payment).all()
    for payment in payments:
        assert payment.cvv is None, f"CVV stored for payment {payment.id}"
        assert payment.raw_card_number is None, "Raw card number stored"

def test_payment_page_served_over_tls(client):
    """PCI DSS Req 4.1: Encrypt transmission of cardholder data."""
    # In CI: verify redirect from HTTP to HTTPS
    response = client.get("http://localhost:8000/checkout", allow_redirects=False)
    assert response.status_code in (301, 302)
    assert response.headers["Location"].startswith("https://")

def test_payment_api_requires_authentication(client):
    """PCI DSS Req 7: Restrict access to cardholder data by business need."""
    response = client.post("/api/payments", json={"amount": 100, "card_token": "tok_abc"})
    assert response.status_code == 401  # no auth header
```

---

## Accessibility Testing (WCAG 2.1 AA)

```python
# tests/accessibility/test_wcag.py
import pytest
from playwright.sync_api import Page

def test_images_have_alt_text(page: Page):
    page.goto("/products")
    images = page.query_selector_all("img")
    for img in images:
        alt = img.get_attribute("alt")
        src = img.get_attribute("src")
        assert alt is not None, f"Image missing alt text: {src}"
        assert alt != "", f"Image has empty alt text: {src}"

def test_form_inputs_have_labels(page: Page):
    page.goto("/checkout")
    inputs = page.query_selector_all("input:not([type='hidden']):not([type='submit'])")
    for input_el in inputs:
        input_id = input_el.get_attribute("id")
        aria_label = input_el.get_attribute("aria-label")
        aria_labelledby = input_el.get_attribute("aria-labelledby")

        has_label = (
            (input_id and page.query_selector(f"label[for='{input_id}']"))
            or aria_label
            or aria_labelledby
        )
        assert has_label, f"Input without label: {input_id or 'unnamed'}"

def test_color_contrast_passes(page: Page):
    page.goto("/")
    # axe-core integration
    result = page.evaluate("""
        const { axe } = require('@axe-core/playwright');
        return axe.run({ runOnly: { type: 'tag', values: ['wcag2aa'] } });
    """)
    violations = [v for v in result["violations"] if v["impact"] in ("serious", "critical")]
    assert not violations, f"Accessibility violations: {[v['description'] for v in violations]}"

def test_keyboard_navigation_works(page: Page):
    page.goto("/")
    # Tab to first link, press Enter, verify navigation
    page.keyboard.press("Tab")
    focused = page.evaluate("document.activeElement.tagName")
    assert focused in ("A", "BUTTON", "INPUT", "SELECT"), f"First focusable element is: {focused}"
```

---

## Audit Logging Requirements

```python
# Compliance requires immutable audit trail for:
# - Authentication events (login, logout, failed attempts)
# - Data access (who accessed which PII)
# - Data changes (who changed what, when, old vs new value)
# - Admin actions (permission changes, deletions)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(UUID, primary_key=True, default=uuid4)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    actor_id = Column(UUID, nullable=False)
    actor_ip = Column(String, nullable=False)
    action = Column(String, nullable=False)   # "user.login", "order.delete"
    resource_type = Column(String)
    resource_id = Column(UUID)
    old_value = Column(JSONB)                # for data changes
    new_value = Column(JSONB)
    outcome = Column(String, nullable=False) # "success", "failure", "denied"

# Tests
def test_failed_login_creates_audit_entry(client, db):
    client.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    log = db.query(AuditLog).filter_by(action="user.login", outcome="failure").first()
    assert log is not None
    assert log.actor_ip is not None

def test_pii_access_creates_audit_entry(auth_client, db, user):
    auth_client.get(f"/api/admin/users/{user.id}/data-export")
    log = db.query(AuditLog).filter_by(action="pii.export", resource_id=user.id).first()
    assert log is not None
```

---

## Compliance Testing in CI

```yaml
# .github/workflows/compliance.yaml
name: Compliance Checks

on:
  schedule:
    - cron: '0 6 * * 1'   # Monday morning — compliance report

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
    - run: npx @axe-core/cli https://staging.myapp.com --tags wcag2aa --exit

  pci-checks:
    runs-on: ubuntu-latest
    steps:
    - run: pytest tests/compliance/test_pci.py -v
```

---

## Common Failure Cases

**Testing the GDPR deletion endpoint but not cascading tables**
Why: the primary user table is cleared, but references in orders, analytics events, session logs, or third-party forwarded data remain, leaving a GDPR violation that only surfaces during an audit.
Detect: post-deletion database query against all tables containing a `user_id` column returns rows for the deleted user.
Fix: maintain a schema registry of every table that stores PII; the deletion test must query all of them and assert zero rows after the deletion request.

**PCI log-scrubbing tests that only check application logs**
Why: card numbers can leak into infrastructure logs (load balancer access logs, cloud provider audit trails, APM traces) that the application layer never touches.
Detect: PCI scan tool flags card-number patterns in CloudWatch or nginx access logs not covered by automated tests.
Fix: extend log-scanning tests to cover all log destinations (application, infrastructure, APM, audit trail); run against a real transaction in a sandbox environment.

**Compliance CI job runs on a schedule but not on every PR**
Why: a weekly or monthly compliance scan means a new feature that breaks a GDPR or PCI requirement ships to production before the scan fires.
Detect: compliance failures are discovered in scheduled runs after the offending code has been in production for days.
Fix: run critical compliance tests (PCI log checks, GDPR deletion, auth audit logging) on every PR touching the relevant modules; use path filters to avoid unnecessary overhead.

**Accessibility compliance treated as a one-time audit rather than continuous**
Why: a WCAG audit passes at launch, but component library updates or new UI features introduce violations that accumulate until the next manual audit.
Detect: automated axe scans in CI are not enabled, so violations are only caught by occasional manual reviews.
Fix: integrate axe-core scans into the PR pipeline with a zero-new-Critical-violations policy so accessibility regression is caught at the same time as functional regression.

## Connections
[[qa-hub]] · [[qa/security-testing-qa]] · [[qa/non-functional-testing]] · [[cs-fundamentals/security-fundamentals-se]] · [[cloud/cloud-security]] · [[qa/test-strategy]]
