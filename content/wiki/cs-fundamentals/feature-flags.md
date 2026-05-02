---
type: concept
category: cs-fundamentals
para: resource
tags: [feature-flags, feature-toggles, launchdarkly, unleash, experimentation, gradual-rollout]
sources: []
updated: 2026-05-01
tldr: Decoupling deployment from release — ship code dark, control visibility independently.
---

# Feature Flags

Decoupling deployment from release. Ship code dark, control visibility independently.

---

## Flag Types

```
Release flag (temporary):
  Purpose: hide incomplete feature until ready
  Lifetime: days to weeks; delete once fully rolled out
  Example: new_checkout_flow = True | False

Experiment flag (A/B test):
  Purpose: test hypothesis with user segment
  Lifetime: days to weeks; delete after analysis
  Example: checkout_button_color = "blue" | "green"

Ops flag (operational):
  Purpose: kill switch for degraded services, rate limits
  Lifetime: permanent; changed at runtime under load
  Example: enable_email_notifications = True | False

Permission flag (permanent):
  Purpose: enable feature for specific user tier
  Lifetime: permanent; managed as entitlement
  Example: advanced_analytics = based on plan
```

---

## Simple In-Process Flags (No External Service)

```python
# flags.py — environment-driven flags, no SDK dependency
import os
from functools import lru_cache

@lru_cache(maxsize=None)
def get_flags() -> dict[str, bool]:
    """Load flags from environment. Cache for process lifetime."""
    return {
        "new_checkout_flow": os.getenv("FLAG_NEW_CHECKOUT", "false").lower() == "true",
        "enable_recommendations": os.getenv("FLAG_RECOMMENDATIONS", "false").lower() == "true",
        "admin_panel_v2": os.getenv("FLAG_ADMIN_V2", "false").lower() == "true",
    }

def flag(name: str) -> bool:
    return get_flags().get(name, False)

# Usage
if flag("new_checkout_flow"):
    return new_checkout_handler(request)
return legacy_checkout_handler(request)
```

---

## Unleash (Open Source)

```python
# pip install UnleashClient
from UnleashClient import UnleashClient
from UnleashClient.strategies import Strategy

client = UnleashClient(
    url="https://unleash.myapp.com/api",
    app_name="order-service",
    custom_headers={"Authorization": "Bearer *:default.secret"},
)
client.initialize_client()

def is_enabled(flag_name: str, user_id: str | None = None) -> bool:
    context = {"userId": user_id} if user_id else {}
    return client.is_enabled(flag_name, context)

# Gradual rollout: Unleash "gradual rollout" strategy
# Configures 10% → 25% → 50% → 100% rollout in the Unleash UI.
# SDK handles the consistent hashing (same user always gets same bucket).

# Custom strategy — e.g., enable for specific company
class CompanyStrategy(Strategy):
    name = "company"

    def load_provisioning(self) -> list:
        return self.parameters.get("companies", "").split(",")

    def apply(self, parameters: dict, context: dict) -> bool:
        company_id = context.get("properties", {}).get("companyId")
        return company_id in self.load_provisioning()
```

---

## LaunchDarkly

```python
# pip install launchdarkly-server-sdk
import ldclient
from ldclient import Config, Context

ldclient.set_config(Config(os.environ["LAUNCHDARKLY_SDK_KEY"]))
ld = ldclient.get()

def evaluate_flag(flag_key: str, user_id: str, default=False) -> bool:
    context = (
        Context.builder(user_id)
        .kind("user")
        .set("email", get_user_email(user_id))
        .set("plan", get_user_plan(user_id))
        .build()
    )
    return ld.variation(flag_key, context, default)

def evaluate_multivariate(flag_key: str, user_id: str, default: str) -> str:
    context = Context.builder(user_id).build()
    return ld.variation(flag_key, context, default)

# A/B test example
button_color = evaluate_multivariate("checkout_button_color", user_id, "blue")
# LD assigns "blue" or "green" consistently per user based on rollout rules

# Flag with targeting rules (configured in LD dashboard):
# IF user.plan == "enterprise" → true
# IF user.email matches "*@internal.com" → true
# ELSE rollout 10% → true
```

---

## Testing with Feature Flags

```python
# Pattern 1: inject flag as parameter (most testable)
def checkout(user_id: str, cart: Cart, use_new_flow: bool = False) -> Order:
    if use_new_flow:
        return new_checkout_flow(user_id, cart)
    return legacy_checkout_flow(user_id, cart)

def test_new_checkout_flow() -> None:
    order = checkout("user_1", cart, use_new_flow=True)
    assert order.status == "confirmed"

# Pattern 2: mock the flag client
from unittest.mock import patch

def test_feature_flag_off() -> None:
    with patch("myapp.flags.flag", return_value=False):
        response = client.post("/checkout", json=cart_data)
        assert "legacy" in response.json()["flow"]

# Pattern 3: override via environment in integration tests
import pytest

@pytest.fixture
def with_new_checkout(monkeypatch):
    monkeypatch.setenv("FLAG_NEW_CHECKOUT", "true")
    # Clear lru_cache so the new env value is picked up
    from myapp.flags import get_flags
    get_flags.cache_clear()
    yield
    get_flags.cache_clear()

def test_new_checkout_end_to_end(with_new_checkout, client) -> None:
    response = client.post("/checkout", json=cart_data)
    assert response.json()["flow"] == "new"
```

---

## Gradual Rollout Pattern

```python
# Consistent user bucketing without an SDK
import hashlib

def get_user_bucket(user_id: str, flag_name: str) -> int:
    """Returns 0-99 consistently for a given user+flag combination."""
    key = f"{flag_name}:{user_id}"
    hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return hash_val % 100

def is_in_rollout(user_id: str, flag_name: str, rollout_pct: int) -> bool:
    """True if user is in the first rollout_pct% bucket."""
    return get_user_bucket(user_id, flag_name) < rollout_pct

# Example rollout schedule (driven by ops flag config):
# Day 1: rollout_pct=1
# Day 3: rollout_pct=10  (watch metrics)
# Day 5: rollout_pct=50
# Day 7: rollout_pct=100 (flag removed, code path becomes default)
```

---

## Flag Lifecycle Management

```
Creation → Rollout → Removal (the missing step most teams skip)

Signs a flag needs removal:
  - Flag has been at 100% for > 2 weeks
  - Both branches tested and stable
  - Flag is a release flag (temporary by design)

Removal process:
  1. Set flag to 100% in production (default)
  2. Remove flag evaluation from code (merge the winning path)
  3. Delete dead code path
  4. Archive flag in flag management system
  5. Update tests (remove flag-conditional test paths)

Anti-patterns:
  - Flag spaghetti: flags that depend on other flags
  - Zombie flags: release flags left in code for months
  - Missing cleanup: flagged code becomes permanent tech debt
  - Global singleton: flags evaluated in constructors (hard to test)
```

---

## Common Failure Cases

**Zombie flags accumulating as tech debt**
Why: release flags are created with no deletion plan; after a feature ships at 100%, the conditional code and both branches remain in production indefinitely.
Detect: flags created more than 4 weeks ago that have been at 100% for more than 2 weeks with no open cleanup ticket.
Fix: track flag creation date and owner; add an automated lint step that fails the build if a release flag's age exceeds the agreed threshold.

**`lru_cache` holding stale flag values in long-running processes**
Why: `get_flags()` cached on first call never re-reads the environment, so a change to an env var has no effect until the process restarts.
Detect: changing `FLAG_X=true` in the environment has no effect; only a process restart picks it up.
Fix: either clear the cache explicitly after changing env vars in tests, or use a flag client (Unleash/LaunchDarkly) that polls for changes rather than a process-lifetime cache.

**Flag spaghetti: flags that depend on other flags**
Why: team members combine `if flag_a and flag_b and not flag_c` inline, creating state space that is impossible to test exhaustively.
Detect: a change to one flag breaks behaviour that seemed unrelated; reproducing a bug requires knowing the exact flag combination active at the time.
Fix: flags should be independent; if a feature requires multiple flags, use a single enclosing flag and remove the inner ones.

**Inconsistent bucket assignment in gradual rollout**
Why: using a non-deterministic bucketing function (e.g., `random.random() < 0.1`) means the same user gets a different experience on each request.
Detect: a user reports the UI "flickering" between old and new versions on page refresh.
Fix: always derive the bucket from a stable hash of `flag_name + user_id` so assignment is sticky.

## Connections

[[se-hub]] · [[cs-fundamentals/api-security]] · [[cloud/blue-green-deployment]] · [[qa/continuous-testing]] · [[qa/shift-left-testing]]
