---
type: synthesis
category: synthesis
para: resource
tags: [debugging, ssl, tls, certificate, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing TLS handshake failures, expired certificates, and chain errors.
---

# Debug: SSL Certificate Error

**Symptom:** `SSL: CERTIFICATE_VERIFY_FAILED`, `ERR_CERT_AUTHORITY_INVALID`, or TLS handshake errors. Service unreachable over HTTPS. Was working yesterday.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| `certificate has expired` | Certificate expired — renewal not configured or failed |
| `unable to verify the first certificate` | Intermediate certificate missing from the chain |
| Works in browser, fails in code | Code not using system trust store, or custom CA not trusted |
| Works for users, fails for internal services | Internal service using self-signed cert not trusted by other services |
| Suddenly broken after deploy | New certificate deployed with wrong chain or wrong domain |

---

## Likely Causes (ranked by frequency)

1. Certificate expired — auto-renewal (Let's Encrypt, ACM) silently failed
2. Incomplete certificate chain — intermediate CA not included in the served chain
3. Certificate does not cover the domain — wrong SAN or wildcard does not match subdomain
4. Self-signed or private CA cert not trusted by the calling service
5. Clock skew — system time wrong, certificate validity window check fails

---

## First Checks (fastest signal first)

- [ ] Check expiry immediately — `echo | openssl s_client -connect host:443 2>/dev/null | openssl x509 -noout -dates`
- [ ] Verify the full chain is served — `openssl s_client -connect host:443 -showcerts` should show 2-3 certificates
- [ ] Confirm the certificate covers the exact domain being requested — check Subject Alternative Names
- [ ] Check system clock on the failing host — even 5 minutes of skew can cause handshake failures
- [ ] Test from the exact host that is failing — certificate errors are often environment-specific

**Signal example:** Internal service returns `CERTIFICATE_VERIFY_FAILED` calling another service — the service has a valid cert but is only serving the leaf certificate; the intermediate CA is not included in the chain; the calling service cannot build a trust path to a root CA.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Certificate auto-renewal in AWS | [[cloud/aws-core]] |
| TLS configuration in Kubernetes | [[cloud/kubernetes]] |
| Service mesh mTLS | [[cloud/service-mesh]] |
| Secrets and certificate storage | [[cloud/secrets-management]] |

---

## Fix Patterns

- Always serve the full certificate chain — leaf + intermediate; never just the leaf
- Set up monitoring on certificate expiry — alert at 30 days and 7 days before expiry
- Use ACM or cert-manager for automatic renewal — manual renewal always eventually gets missed
- For internal services: use a private CA with the root distributed to all services via a secret or config map
- Test renewal in staging before it matters — Let's Encrypt rate limits apply to failed renewals too

---

## When This Is Not the Issue

If the certificate is valid, not expired, and the chain is complete but errors persist:

- Check whether cipher suites are compatible — very old clients may not support modern TLS 1.3 ciphers
- Check whether SNI is configured correctly — multiple domains on one IP require SNI to select the right certificate

Pivot to [[cs-fundamentals/networking]] to trace the full TLS handshake and identify exactly which step is failing.

---

## Connections

[[cs-fundamentals/networking]] · [[cloud/secrets-management]] · [[cloud/service-mesh]] · [[cloud/kubernetes]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
