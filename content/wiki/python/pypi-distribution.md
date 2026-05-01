---
type: concept
category: python
para: resource
tags: [pypi, packaging, trusted-publishers, oidc, github-actions, twine, pytest-plugin, entry-points, semantic-versioning]
tldr: PyPI Trusted Publishers (OIDC) eliminates long-lived API tokens from CI — GitHub proves to PyPI it's running your workflow. Pytest plugins register via entry_points in pyproject.toml. No passwords stored, tokens expire automatically.
sources: []
updated: 2026-05-01
---

# PyPI Distribution and Packaging

> **TL;DR** PyPI Trusted Publishers (OIDC) eliminates long-lived API tokens from CI — GitHub proves to PyPI it's running your workflow. Pytest plugins register via entry_points in pyproject.toml. No passwords stored, tokens expire automatically.

Directly relevant to evalcheck — v0.2.0 shipped to PyPI 2026-04-29, and confident release management requires understanding this pipeline end to end.

## Key Facts
- Trusted Publishers (OIDC): GitHub Actions proves identity to PyPI without storing any secrets — tokens are short-lived and scoped
- Long-lived API tokens are a security liability; Trusted Publishing is now the recommended approach
- pytest plugins must declare their entry point under `pytest11` in pyproject.toml — this is how pytest discovers them at runtime
- Semantic versioning: `MAJOR.MINOR.PATCH` — for pytest plugins, breaking changes to fixture/config APIs are MAJOR
- PyPI classifiers are metadata on the index page; include `Framework :: Pytest` for discoverability
- Build with `python -m build` (from the `build` package); publish with `twine upload` or the `pypa/pypi-publish` GitHub Action

## Trusted Publishers (OIDC)

### What it is

OIDC Trusted Publishing lets GitHub Actions prove its identity to PyPI using short-lived cryptographic tokens instead of stored API keys. The flow:

1. GitHub generates an OIDC token proving "this is workflow X in repo Y, running on ref Z"
2. PyPI validates the token against the trusted publisher configuration you set up
3. PyPI issues a short-lived upload token scoped to your project
4. The publish action uploads the package using that token

No passwords. No long-lived tokens. Nothing to rotate manually. Tokens expire automatically.

### Setting it up

**On PyPI (one-time per project):**
1. Go to `pypi.org/manage/project/<your-project>/settings/`
2. Under "Trusted Publishers", add a new publisher:
   - Owner: `your-github-username-or-org`
   - Repository: `your-repo-name`
   - Workflow filename: `release.yml` (or whatever your workflow is named)
   - Environment: (optional, but recommended) `pypi`

**In your GitHub Actions workflow:**

```yaml
# .github/workflows/release.yml
name: Release to PyPI

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    environment: pypi          # matches the environment in PyPI trusted publisher config
    permissions:
      id-token: write          # required for OIDC token generation
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install build tools
        run: pip install build

      - name: Build package
        run: python -m build

      - name: Publish to PyPI
        uses: pypa/pypi-publish@release/v1
        # No username/password/token needed — OIDC handles it
```

### Testing with TestPyPI first

Use a separate trusted publisher on TestPyPI for pre-release testing:

```yaml
      - name: Publish to TestPyPI
        uses: pypa/pypi-publish@release/v1
        with:
          repository-url: https://test.pypi.org/legacy/
```

## pytest Plugin Entry Points

Pytest discovers plugins at import time via Python's entry points mechanism. Your plugin must declare itself under the `pytest11` group.

```toml
# pyproject.toml
[project.entry-points.pytest11]
evalcheck = "evalcheck.plugin"
```

This tells pytest: "when loading plugins, import `evalcheck.plugin` and register everything it exports."

The module `evalcheck/plugin.py` should contain your fixtures, hooks, and configuration:

```python
# evalcheck/plugin.py
import pytest

def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "eval: mark test as an evalcheck eval (deselect with -m 'not eval')"
    )

@pytest.fixture
def eval_client():
    from evalcheck import EvalClient
    return EvalClient()
```

Pytest discovers this automatically when the package is installed — no explicit `conftest.py` needed.

## pyproject.toml Structure

Full pyproject.toml for a pytest plugin:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "evalcheck"
version = "0.2.0"
description = "pytest plugin for LLM eval regression detection"
readme = "README.md"
requires-python = ">=3.10"
license = {file = "LICENSE"}
authors = [
    {name = "Your Name", email = "you@example.com"}
]
keywords = ["pytest", "llm", "evals", "testing", "ai"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Framework :: Pytest",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Software Development :: Testing",
]
dependencies = [
    "pytest>=7.0",
    "httpx>=0.24",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "respx", "mypy"]

[project.entry-points.pytest11]
evalcheck = "evalcheck.plugin"

[project.urls]
Homepage = "https://github.com/you/evalcheck"
Documentation = "https://evalcheck.dev"
Issues = "https://github.com/you/evalcheck/issues"
Changelog = "https://github.com/you/evalcheck/CHANGELOG.md"
```

### Key classifiers for pytest plugins
- `Framework :: Pytest` — appears in PyPI's "framework" filter, critical for discoverability
- `Development Status :: 4 - Beta` / `5 - Production/Stable` — set accurately; users filter by this
- Include all supported Python versions explicitly

## Semantic Versioning for Plugins

```
MAJOR.MINOR.PATCH

MAJOR: breaking changes to public API
  - Removed or renamed fixtures
  - Changed hook signatures
  - Removed config options
  - Changed default behaviour

MINOR: new features, backward-compatible
  - New fixtures
  - New CLI options
  - New config keys with defaults

PATCH: bug fixes only
  - Never add new features in a patch release
```

For pytest plugins, the "public API" is:
- All `@pytest.fixture` names exported from your plugin
- All `pytest.ini` / `pyproject.toml` config keys your plugin reads
- All markers you declare
- The command-line options you add

Changing any of these without a MAJOR bump will break users' test configurations silently.

## Release Checklist

```
[ ] Update version in pyproject.toml
[ ] Update CHANGELOG.md (keep a running log)
[ ] Commit and push: git commit -m "chore: bump version to 0.3.0"
[ ] Tag: git tag v0.3.0 && git push origin v0.3.0
[ ] GitHub Actions triggers the release workflow automatically
[ ] Verify on PyPI: pip install evalcheck==0.3.0 in a fresh venv
[ ] Test the installed plugin: pytest --co (check plugin loads)
```

## Installing from PyPI (user perspective)

```bash
pip install evalcheck          # latest
pip install evalcheck==0.2.0   # pinned

# Verify plugin is registered:
pytest --co -q 2>&1 | grep evalcheck
```

> [Source: PyPI Docs — Trusted Publishers, 2025]
> [Source: Python Packaging Authority — GitHub Actions CI/CD guide]

## Connections
- [[para/projects]] — evalcheck v0.2.0 is the current release; this page governs release management
- [[infra/github-marketplace]] — complementary distribution channel for the GitHub App component
- [[python/ecosystem]] — uv, pyproject.toml, and the broader packaging ecosystem
- [[test-automation/pytest-patterns]] — the pytest internals that the plugin hooks into

## Open Questions
- How do you handle breaking changes to entry-point registered fixtures when users have them in their conftest.py?
- Is it worth maintaining a separate TestPyPI release for pre-release evalcheck versions?
