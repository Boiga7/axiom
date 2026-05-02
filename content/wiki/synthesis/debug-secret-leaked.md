---
type: synthesis
category: synthesis
para: resource
tags: [debugging, security, secrets, credentials, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for the first 30 minutes after discovering a leaked credential or secret in a public location.
---

# Debug: Secret Leaked

**Symptom:** API key, database password, or private key found in a public git repository, logs, error message, or external service. Clock is running.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Found in git history | Committed directly, `.env` file not in `.gitignore` |
| Found in application logs | Secret logged as part of a request, error message, or debug output |
| Found in error response | Secret returned in an API error or stack trace |
| Found in environment variable leak | Debug endpoint or misconfigured observability tool exposing env vars |
| Alerted by GitHub secret scanning | GitHub detected the secret in a push |

---

## Immediate Actions (do these first, in order)

1. **Revoke the secret now** — do not investigate first; revoke first. Every minute it is live is risk.
2. **Generate a new secret** — have a replacement ready before you need to update all services.
3. **Update all services** using the secret — deploy the new value before announcing the revocation.
4. **Check access logs** — when was the secret first exposed? Has it been used by anyone other than your services?
5. **Remove from the source** — git history, logs, or wherever it was found.

---

## First Checks (after revoking)

- [ ] Confirm the secret is fully revoked — test that the old key returns 401 or is rejected
- [ ] Check access logs for the compromised credential — any unexpected IPs, times, or operations?
- [ ] Search git history for the full secret value — `git log -p | grep <partial-key>`
- [ ] Check whether the secret was cached anywhere — CI logs, build artifacts, container images, Slack messages
- [ ] Identify how it was exposed — understand the root cause before closing the incident

**Signal example:** AWS access key committed to a public GitHub repo — GitHub secret scanning alert fires 3 minutes after push; key revoked immediately; CloudTrail shows the key was used to list S3 buckets from an unknown IP 90 seconds after the push.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Rotating secrets in AWS | [[cloud/secrets-management]] |
| Removing secrets from git history | [[cs-fundamentals/git]] |
| Preventing future leaks | [[cs-fundamentals/api-security]] |
| Auditing access after a breach | [[cloud/cloud-security]] |

---

## Fix Patterns

- Add `pre-commit` hooks with `detect-secrets` or `truffleHog` — catch secrets before they reach git
- Never put secrets in `.env` files that are committed — use `.env.example` with placeholder values; add `.env` to `.gitignore`
- Use a secrets manager (AWS Secrets Manager, Vault) — never hardcode secrets in code or config files
- Enable GitHub secret scanning and push protection — blocks pushes containing known secret patterns
- Rotate all secrets on a schedule — a leaked secret that was already rotated is a non-event

---

## When the Immediate Response Is Complete

After revoking, replacing, and auditing:

- Write an incident report — what was leaked, when, how it was found, what was accessed, what was done
- Check whether compliance reporting is required — PCI DSS, GDPR, SOC 2 may require notification
- Fix the root cause — the leak is resolved but the process that allowed it is not

Pivot to [[cloud/cloud-security]] to review the full secrets management posture and prevent recurrence.

---

## Connections

[[cloud/secrets-management]] · [[cloud/cloud-security]] · [[cs-fundamentals/git]] · [[cs-fundamentals/api-security]]
