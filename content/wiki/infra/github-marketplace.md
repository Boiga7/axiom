---
type: concept
category: infra
para: resource
tags: [github, marketplace, billing, listing, saas, monetisation, evalcheck]
tldr: GitHub Marketplace supports free, flat-rate, and per-unit billing. Paid plans require 100+ App installations. You must handle purchase lifecycle webhooks. Verified Publisher status is separate from listing.
sources: []
updated: 2026-05-01
---

# GitHub Marketplace Listing and Billing

> **TL;DR** GitHub Marketplace supports free, flat-rate, and per-unit billing. Paid plans require 100+ App installations. You must handle purchase lifecycle webhooks. Verified Publisher status is separate from listing.

Directly relevant to evalcheck — the next gate is a GitHub Marketplace listing.

## Key Facts
- Billing models: free, flat-rate (monthly/yearly), per-unit (per user, monthly/yearly)
- Paid plans require: GitHub Apps with 100+ installations OR OAuth Apps with 200+ users
- Must handle `marketplace_purchase` webhook events for all purchase lifecycle events
- 14-day free trials available on flat-rate and per-unit plans
- GitHub takes a revenue cut; the exact percentage is set in the Marketplace Partner Agreement
- Verified Publisher badge is a separate status (requires publishing to GitHub Packages or similar trust signals)
- Free listings can go live without usage minimums; paid listings need the threshold first

## Billing Models

### Free

No payment handling required. Any GitHub user can install. Good for: open-source tools, community versions of commercial tools.

evalcheck's initial listing should be free — it lowers friction for adoption and builds toward the 100-installation threshold needed for paid plans.

### Flat Rate

A fixed monthly or yearly charge regardless of how many users in the org use the app.

```
Example: $10/month or $96/year (2 months free for annual)
```

When to use: tools where the value is per-organisation, not per-seat (e.g., CI integration that runs on all PRs).

### Per-Unit

Charges per user in the organisation on a monthly or yearly basis.

```
Example: $2/user/month
```

When to use: tools where value scales with team size. GitHub counts users at billing time, not installation time.

## Purchase Lifecycle Webhooks

You must handle all `marketplace_purchase` events. GitHub delivers these to your webhook URL:

| Event action | When it fires |
|---|---|
| `purchased` | New subscription (paid or free trial start) |
| `pending_change` | Upgrade or downgrade queued (takes effect at next billing date) |
| `changed` | Upgrade or downgrade completed |
| `pending_change_cancelled` | Queued change was cancelled |
| `cancelled` | Subscription cancelled |

Webhook payload structure:

```json
{
  "action": "purchased",
  "effective_date": "2026-05-01T00:00:00+00:00",
  "sender": { "login": "username" },
  "marketplace_purchase": {
    "account": {
      "type": "Organization",
      "id": 12345,
      "login": "acme-corp"
    },
    "billing_cycle": "monthly",
    "unit_count": 5,
    "on_free_trial": false,
    "plan": {
      "id": 1,
      "name": "Pro",
      "bullet_points": ["Unlimited evals", "CI integration"],
      "monthly_price_in_cents": 1000,
      "yearly_price_in_cents": 9600,
      "price_model": "flat-rate"
    }
  }
}
```

Your app must store the subscription state and enforce plan limits based on this data. GitHub does not enforce access controls — you do.

## Listing Requirements

Before your listing goes live:

**Technical requirements:**
- The app must be installable and functional
- Must have a webhook endpoint accepting GitHub webhook events
- Must handle `marketplace_purchase` events if you have paid plans
- Landing page at the listed URL must exist

**For paid plans additionally:**
- GitHub App: minimum 100 installations
- OAuth App: minimum 200 users
- Must have a privacy policy URL
- Must have a support URL or email
- Must agree to the GitHub Marketplace Developer Agreement

**Review process:**
- GitHub reviews your listing before approval
- Expect 1-2 weeks for initial review
- A/B test your listing copy; GitHub provides basic analytics

## Listing Content

Key fields in the Marketplace listing:

```
Name:         evalcheck
Tagline:      Catch LLM eval regressions before they reach users
Category:     Testing / CI/CD
Pricing:      Free (initial); Pro $10/month (when threshold met)
Description:  [3-5 paragraphs covering: what it does, who it's for,
               how it works, what you get with the paid plan]
Screenshots:  3-5 showing the check run in a PR, failed eval diff,
               dashboard
```

Pricing page tips:
- Name the free tier "Community" or "Open Source" — not "Free" (sounds temporary)
- Keep the paid tier name simple: "Pro" or the brand name
- List bullet points that are concrete outcomes, not features ("Catch regressions in CI" not "CI integration")

## Verified Publisher

The Verified Publisher badge (blue checkmark) signals trust. Requirements [unverified — check current docs]:
- Publish at least one package to GitHub Packages (or similar GitHub ecosystem trust signal)
- Have a verified domain associated with your GitHub organisation
- Agree to the GitHub Marketplace Partner Agreement

The badge is not required for listing, but it improves conversion for paid plans because users see it before installing.

## Free Trial Implementation

When `on_free_trial: true` in the purchase event, give the user full paid-plan access. Set an expiry date in your database at `effective_date + 14 days`.

At trial end, GitHub sends a `changed` or `cancelled` event. Your app must downgrade access when the trial ends without conversion.

## Accessing Plan Data at Runtime

To check what plan an org is on without webhook state (e.g., on a new installation):

```python
import httpx

def get_marketplace_plan(account_login: str, jwt_token: str) -> dict:
    response = httpx.get(
        f"https://api.github.com/marketplace_listing/accounts/{account_login}",
        headers={
            "Authorization": f"Bearer {jwt_token}",
            "Accept": "application/vnd.github+json",
        },
    )
    if response.status_code == 404:
        return {"plan": "free"}  # not a marketplace subscriber
    return response.json()
```

> [Source: GitHub Docs — Selling Your App on GitHub Marketplace, 2025]

## Connections
- [[infra/github-apps]] — the App architecture that underlies the Marketplace listing
- [[para/projects]] — evalcheck's next gate is the Marketplace listing
- [[python/pypi-distribution]] — parallel distribution channel (PyPI) for the pytest plugin component

## Open Questions
- Does GitHub waive the 100-installation requirement for apps from verified publishers?
- What is the current revenue split percentage in the GitHub Marketplace Partner Agreement?
- Can evalcheck list the pytest plugin component on PyPI and the GitHub App component on Marketplace simultaneously without conflict?
