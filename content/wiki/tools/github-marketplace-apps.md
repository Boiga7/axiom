---
type: concept
category: tools
para: resource
tags: [github, marketplace, distribution, github-apps]
tldr: To list a GitHub App on GitHub Marketplace, fill out a draft listing with logo, description, pricing plan, and policy links, then click "Request publish" — a GitHub onboarding expert reviews it manually, with no published SLA (community reports suggest 2–6 weeks).
sources: [raw/inbox/github-marketplace-apps-perplexity-2026-05-04.md]
updated: 2026-05-04
---

# GitHub Marketplace — Listing an App

> **TL;DR** To list a GitHub App on GitHub Marketplace, fill out a draft listing with logo, description, pricing plan, and policy links, then click "Request publish" — a GitHub onboarding expert reviews it manually, with no published SLA (community reports suggest 2–6 weeks).

Directly relevant to [[para/projects]] — evalcheck is entering its distribution phase and needs to be listed here.

## Key Facts

- Listings start in **draft mode** and must be submitted via "Request publish" to enter review.
- A GitHub **onboarding expert** contacts you manually after submission — no automated approval pipeline.
- **Free plan listings** have no install count or publisher verification requirements.
- **Paid plan listings** require the app to be owned by a **verified organization**, with 2FA enabled and domain verified, plus a minimum of 100 installations [unverified: enforcement strictness].
- Up to **10 pricing plans** per listing; plan types are free, flat-rate, and per-unit.
- A 14-day free trial can be offered; it auto-converts to a paid plan unless cancelled.
- Review timeline: no SLA published; community reports suggest **2–6 weeks** [unverified].
- Apps that only provide authentication, or that are invite-only/in public preview, are ineligible.
- Both GitHub Apps and OAuth Apps can be listed; GitHub recommends GitHub Apps for all new integrations.
- Logo must be PNG/JPG/GIF, under 1 MB, recommended 200×200 px.
- Paid plans require webhook handling for Marketplace purchase/cancellation events via the GitHub Marketplace API.
- Listing copy must not persuade users away from GitHub — this is an explicit rejection criterion.

## Detail

### Submission workflow

Starting from your GitHub App's settings page (or github.com/marketplace/new), GitHub creates a draft listing. You fill in all required sections before submission is enabled. When complete, you click **"Request publish"** and accept the GitHub Marketplace Developer Agreement. A GitHub onboarding expert then reaches out — this is a human-review gate with no SLA. Community forum posts report waits ranging from two to six weeks, though outcomes vary [unverified].

The listing draft covers several sections: app metadata (name, description, logo, screenshots, feature card), pricing plans, contact information, and policy links. Every section must be complete and all external URLs must resolve correctly before GitHub will accept the submission.

### Required fields

The following must all be present and valid:

- **Logo**: PNG, JPG, or GIF under 1 MB; recommended 200×200 px. If the logo includes GitHub's marks, it must comply with GitHub's Logos and Usage guidelines.
- **Feature card**: a supplemental image displayed on category browse pages.
- **Screenshots**: demonstrating the app in use.
- **Category**: selected from GitHub's defined list at listing creation time.
- **Short and long description**: must be well-written and free of grammatical errors. Must accurately describe the app's function. Must not actively discourage GitHub platform use.
- **Pricing plan**: at least one plan (can be free). Up to 10 plans total.
- **Privacy policy URL**: must be a live, relevant page.
- **Support link or email**: must be working.
- **Terms of Service URL** (if you have one): must resolve to a relevant page.
- **Contact info**: a working email address. Individual addresses are recommended over group aliases like support@domain.com — GitHub uses this for platform updates, marketing, and payout communications.

### Pricing plans

Three plan types are available: **free**, **flat-rate**, and **per-unit**. You can mix and match up to 10 plans. Free plans can coexist with paid tiers to support a freemium model. A **14-day free trial** can be attached to any paid plan — it converts automatically to a paid subscription when the trial period ends unless the customer cancels.

For free-only listings: no special requirements beyond the general metadata checklist. Publisher verification is not required.

For paid listings: the app must be owned by an organization (not a personal GitHub account) that has completed GitHub's publisher verification process. Verification requires two-factor authentication on the org, a verified domain, and contact information GitHub can reach. Additionally, the app must have at least 100 installations before a paid plan can go live [unverified: whether GitHub enforces this as a hard gate or soft guideline]. Financial onboarding is required to enable payments.

### Paid plan technical requirements

Apps with paid plans must handle Marketplace purchase lifecycle events via webhooks:

- `marketplace_purchase.purchased` — new subscription
- `marketplace_purchase.cancelled` — cancellation
- `marketplace_purchase.changed` — plan upgrade or downgrade
- `marketplace_purchase.pending_change` — pending plan change

GitHub provides stubbed APIs to test these webhook payloads before submission. Missing this integration is a direct rejection reason for paid listings.

### Review process

The review is entirely manual. After "Request publish," a GitHub onboarding expert contacts the submitter with next steps. There is no published SLA. GitHub's documentation says only that an expert "will reach out." Community discussions report timelines ranging from two to six weeks [unverified]. The reviewer checks:

- All required fields are present and valid
- All external URLs resolve correctly
- The app provides genuine value beyond authentication
- The app is publicly accessible (not preview or invite-only)
- Webhook integration is correctly implemented (for paid plans)
- Logo and branding comply with GitHub's guidelines
- Description quality is acceptable

### OAuth App vs GitHub App on Marketplace

Both OAuth Apps and GitHub Apps can be listed on GitHub Marketplace. From a listing perspective, the metadata and review requirements are the same. The meaningful differences are architectural:

| Dimension | GitHub App | OAuth App |
|---|---|---|
| Permissions model | Fine-grained per-resource permissions | Broad OAuth scopes |
| Acts as | Bot identity (machine user) | The authenticated user |
| Repository access | Scoped by org admin at install time | All repos the user can access |
| Webhooks | Built-in, centralized | Must configure per-repo/org |
| Token lifespan | Short-lived (1-hour installation tokens) | Long-lived until revoked |
| Rate limits | Scales with number of installations | Per-user cap |
| Marketplace status | Recommended for new integrations | Legacy pattern |

GitHub's own documentation explicitly calls OAuth Apps a legacy pattern and recommends GitHub Apps as the default for new Marketplace integrations. For a tool like evalcheck — which acts as a bot posting PR comments across many repositories — a GitHub App is the correct choice architecturally and provides a better security posture.

### Common pitfalls and rejection reasons

- **Authentication-only apps**: the app must provide value beyond logging users in with GitHub.
- **Broken links**: any dead or irrelevant URL in the listing (privacy policy, ToS, support, status page) causes rejection.
- **Invite-only or preview apps**: not eligible for public listing.
- **No Marketplace webhook integration**: for paid plans, missing purchase/cancellation event handling is an automatic rejection.
- **Personal account ownership for paid plans**: must be an organization account with publisher verification.
- **Incorrect use of GitHub branding in logo**: must comply with GitHub's Logos and Usage policy.
- **Low-quality description**: grammatical errors or vague copy are grounds for rejection.
- **Copy that discourages GitHub use**: explicitly prohibited.
- **Broken contact info**: must use a working email address.

## Connections

- [[para/projects]] — evalcheck distribution phase requires this listing; see "Next: Marketplace listing once installs exist"
- [[protocols/github-apps]] — evalcheck's auth architecture; GitHub Apps are preferred over OAuth Apps on Marketplace
- [[python/pypi-distribution]] — complementary distribution channel for the pytest plugin half of evalcheck
- [[test-automation/pytest-patterns]] — evalcheck is a pytest plugin; PyPI and Marketplace are the two distribution targets
- [[security/prompt-injection]] — webhook validation is a security boundary relevant to GitHub App webhook processing

## Open Questions

- Does GitHub enforce the 100-installation minimum for paid plans as a hard gate before allowing submission, or only before approval? [unverified]
- What is the actual median review time in 2026 — community reports from 2024/2025 suggest 2–6 weeks but may be stale.
- Can a free plan be added to an existing paid listing without triggering re-review?
- Does the listing need to be re-submitted after major permission scope changes to the underlying GitHub App?
- What happens to existing installations when a Marketplace listing is removed or delisted?

## Sources

- raw/inbox/github-marketplace-apps-perplexity-2026-05-04.md
