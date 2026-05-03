---
type: concept
category: protocols
para: resource
tags: [github, apps, webhooks, jwt, installation-tokens, oauth, ci-cd]
tldr: GitHub Apps authenticate in two steps — JWT (10-min) to get an installation token (1-hour). Webhooks carry the installation ID. Apps are scoped to repositories; OAuth Apps are scoped to users. Prefer GitHub Apps for bots and automation.
sources: []
updated: 2026-05-01
---

# GitHub Apps Architecture

> **TL;DR** GitHub Apps authenticate in two steps — JWT (10-min) to get an installation token (1-hour). Webhooks carry the installation ID. Apps are scoped to repositories; OAuth Apps are scoped to users. Prefer GitHub Apps for bots and automation.

Directly relevant to [[para/projects]]. Evalcheck is built as a GitHub App.

## Key Facts
- GitHub App auth = JWT (signed with private key, 10-min TTL) → exchange for installation token (1-hour TTL)
- Installation tokens are scoped to specific repositories and permissions — principle of least privilege by design
- Webhooks include the installation ID; use it to authenticate before processing the event
- GitHub Apps vs OAuth Apps: Apps are installed on orgs/repos; OAuth Apps act as a user. Apps are preferred for automation and bots
- A single GitHub App can be installed on multiple organisations — each installation has its own installation ID
- Apps can request fine-grained permissions (contents: read, pull_requests: write, checks: write, etc.)
- The GitHub App's private key (PEM file) must be stored as a secret — it signs every JWT

## GitHub Apps vs OAuth Apps

| | GitHub App | OAuth App |
|---|---|---|
| Acts as | A bot (machine user) | The authenticated user |
| Scoped to | Repositories and permissions | User's full access level |
| Rate limits | Per-installation (5,000 req/hour) | Per-user |
| Best for | Automation, bots, CI/CD, GitHub Actions | User-facing integrations |
| Installation | Org admins install on selected repos | Users authorise via OAuth |
| Webhook events | Receives all events for installed repos | Must poll or use user-level webhooks |

Use GitHub Apps for evalcheck-style tools. They get their own identity, scoped permissions, and don't depend on a user's account being active.

## Authentication Flow

### Step 1: Generate JWT

```python
import time
import jwt  # PyJWT

def generate_jwt(app_id: str, private_key_pem: str) -> str:
    now = int(time.time())
    payload = {
        "iat": now - 60,       # issued 60s ago (clock skew tolerance)
        "exp": now + (10 * 60), # expires in 10 minutes (max allowed)
        "iss": app_id,
    }
    return jwt.encode(payload, private_key_pem, algorithm="RS256")
```

The JWT must be signed with RS256 using the App's private key (PEM). GitHub enforces a 10-minute maximum validity.

### Step 2: Exchange JWT for Installation Token

```python
import httpx

def get_installation_token(jwt_token: str, installation_id: str) -> str:
    response = httpx.post(
        f"https://api.github.com/app/installations/{installation_id}/access_tokens",
        headers={
            "Authorization": f"Bearer {jwt_token}",
            "Accept": "application/vnd.github+json",
        },
    )
    response.raise_for_status()
    return response.json()["token"]  # expires in 1 hour
```

### Step 3: Use Installation Token

```python
response = httpx.get(
    "https://api.github.com/repos/OWNER/REPO/pulls",
    headers={
        "Authorization": f"Bearer {installation_token}",
        "Accept": "application/vnd.github+json",
    },
)
```

The installation token works for both REST and GraphQL APIs. Cache it for up to 55 minutes (leave 5-minute buffer before the 1-hour expiry).

## Webhook Event Processing

When GitHub delivers a webhook event, the payload includes the installation ID:

```json
{
  "action": "opened",
  "pull_request": { ... },
  "installation": {
    "id": 12345678,
    "node_id": "..."
  }
}
```

Processing pattern:

```python
from fastapi import FastAPI, Request, Header
import hmac, hashlib

app = FastAPI()

@app.post("/webhook")
async def handle_webhook(
    request: Request,
    x_github_event: str = Header(...),
    x_hub_signature_256: str = Header(...),
):
    body = await request.body()

    # 1. Verify the webhook signature
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, x_hub_signature_256):
        raise HTTPException(status_code=401)

    payload = await request.json()

    # 2. Get installation ID from payload
    installation_id = payload["installation"]["id"]

    # 3. Generate tokens scoped to this installation
    jwt_token = generate_jwt(APP_ID, PRIVATE_KEY)
    token = get_installation_token(jwt_token, installation_id)

    # 4. Process the event using the scoped token
    if x_github_event == "pull_request":
        await handle_pr(payload, token)
```

Always verify the webhook signature before doing anything else. GitHub signs every payload with HMAC-SHA256 using your webhook secret.

## Installation Lifecycle

Events sent to your webhook when users interact with your App:

| Event | When |
|---|---|
| `installation.created` | User installs the App on their org/repo |
| `installation.deleted` | User uninstalls the App |
| `installation.suspend` | Installation suspended |
| `installation_repositories.added` | User adds a repo to the installation |
| `installation_repositories.removed` | User removes a repo |

For evalcheck: when `installation.created` fires, trigger any setup work (e.g., creating the initial check run configuration). When `installation.deleted` fires, clean up stored state for that installation.

## Permissions

Request only the permissions you need. Common permissions for a CI/CD app:

```
checks: write          # create check runs
contents: read         # read repo files
pull_requests: write   # comment on PRs
statuses: write        # set commit status
issues: write          # create/comment issues (optional)
```

Minimal permissions = smaller attack surface + faster user trust.

## Secrets Management

Required secrets for a GitHub App:
- `GITHUB_APP_ID` — the numeric app ID (not secret, but needed)
- `GITHUB_PRIVATE_KEY` — the PEM file contents (treat as a credential)
- `GITHUB_WEBHOOK_SECRET` — used to verify webhook payloads

Store in environment variables or a secrets manager. Never commit to git. Rotate the private key if compromised (GitHub allows multiple keys on one App).

## Useful Libraries

| Language | Library |
|---|---|
| Python | `PyGithub`, `PyJWT`, `githubkit` |
| JavaScript | `@octokit/auth-app`, `@octokit/rest` |
| Ruby | `octokit` |

> [Source: GitHub Docs — Authenticating with a GitHub App, 2025]

## Common Failure Cases

**JWT rejected with `Expiration time is too far in the future`**  
Why: the server clock is ahead of GitHub's clock; a JWT with `exp = now + 600` fails if GitHub sees the current time as 601 seconds before the expiry.  
Detect: `GitHub::Authentication::AuthenticationFailed: Expiration time is too far in the future` in webhook handler logs.  
Fix: set `"iat": now - 60` (issued 60 seconds ago) to create clock skew tolerance as shown in the code above; this is the canonical fix.

**Webhook signature validation fails with a valid payload**  
Why: the raw request body must be read before JSON parsing; some web frameworks decode the body before passing it to middleware, changing the byte representation.  
Detect: HMAC validation fails for every webhook even with the correct secret.  
Fix: read `await request.body()` before any JSON parsing; ensure no middleware has already consumed or transformed the body stream.

**Installation token expires mid-operation causing 401 errors on subsequent API calls**  
Why: installation tokens expire after 1 hour; long-running operations (indexing a large repo) may span the token lifetime.  
Detect: `401 Unauthorized: Bad credentials` appears 55-60 minutes into a long operation.  
Fix: cache tokens with a 55-minute TTL (not 60); refresh the token before making API calls if time-to-expiry is <5 minutes.

**App receives webhook events for repositories it wasn't installed on**  
Why: if the App is set to "All repositories" during installation, it receives events for repos added after installation; some repos may be unexpected.  
Detect: webhook handler receives `installation_repositories.added` events for repos with no business logic to handle them.  
Fix: validate the repository name against an allowlist before processing; return 200 immediately for unknown repos to avoid GitHub marking deliveries as failed.

**Private key rotation causes JWT generation failures across all installations**  
Why: rotating the private key in GitHub App settings invalidates all JWTs signed with the old key; any in-flight requests fail immediately.  
Detect: all webhooks start returning auth errors simultaneously; JWT generation succeeds but GitHub rejects it.  
Fix: add the new key to the App before removing the old one; update the `GITHUB_PRIVATE_KEY` secret in production; then remove the old key from GitHub.

## Connections
- [[para/projects]] — evalcheck is a GitHub App; this page is the reference for its auth layer
- [[infra/github-marketplace]] — listing evalcheck on GitHub Marketplace
- [[infra/deployment]] — CI/CD patterns for deploying the App server
- [[security/owasp-llm-top10]] — webhook validation is a boundary security concern

## Open Questions
- What is the recommended pattern for caching installation tokens across multiple webhook events in a stateless serverless deployment?
- How do GitHub App rate limits interact when a single App is installed on hundreds of organisations?
