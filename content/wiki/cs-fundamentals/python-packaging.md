---
type: concept
category: cs-fundamentals
para: resource
tags: [uv, pyproject, packaging, publishing, pypi, versioning, monorepo, hatch]
sources: []
updated: 2026-05-01
---

# Python Packaging and Distribution

Modern Python package management with uv, pyproject.toml, and publishing to PyPI.

---

## uv — Modern Package Manager

```bash
# uv replaces pip, pip-tools, venv, virtualenv, pyenv (for project Python)
# 10-100× faster than pip; lockfile support; workspace support

# Project setup
uv init my-project          # creates pyproject.toml, .python-version, .venv
cd my-project
uv add requests fastapi     # add production dependency (updates pyproject.toml + uv.lock)
uv add --dev pytest ruff    # add dev dependency

# Run commands in the project environment
uv run pytest               # auto-uses .venv
uv run python -m myapp

# Sync environment from lockfile
uv sync                     # install exactly what's in uv.lock
uv sync --no-dev            # production: skip dev dependencies

# Lock without syncing
uv lock                     # update uv.lock without touching .venv

# Tool invocation (no install needed)
uvx ruff check src/         # run ruff in isolated env
uvx mypy src/
```

---

## pyproject.toml — Full Configuration

```toml
# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myapp"
version = "0.3.1"
description = "My application"
readme = "README.md"
requires-python = ">=3.11"
license = { text = "MIT" }
authors = [{ name = "Lewis Elliott", email = "lewis@example.com" }]
keywords = ["api", "myapp"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "License :: OSI Approved :: MIT License",
]
dependencies = [
    "fastapi>=0.110",
    "pydantic>=2.6",
    "httpx>=0.27",
    "structlog>=24.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=5.0",
    "ruff>=0.4",
    "mypy>=1.10",
]

[project.scripts]
myapp = "myapp.cli:app"     # entry point: `myapp` CLI command

[project.urls]
Homepage = "https://github.com/lewis/myapp"
Repository = "https://github.com/lewis/myapp"
"Bug Tracker" = "https://github.com/lewis/myapp/issues"

[tool.hatch.version]
path = "src/myapp/__init__.py"   # read version from __init__.py

[tool.ruff]
target-version = "py311"
line-length = 100
select = ["E", "F", "I", "N", "UP", "B", "S", "ANN"]
ignore = ["ANN101", "ANN102"]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=src/myapp --cov-report=term-missing --cov-fail-under=85"

[tool.coverage.run]
source = ["src/myapp"]
branch = true
```

---

## Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: breaking change (changes API that users depend on)
MINOR: new feature, backward compatible
PATCH: bug fix, backward compatible

Pre-release: 1.0.0a1 (alpha), 1.0.0b2 (beta), 1.0.0rc1 (release candidate)
Dev:         1.0.0.dev1 (not for PyPI — only for local/CI builds)

Rules:
  - Never break a released PATCH or MINOR version
  - MAJOR 0 is unstable by convention (anything can break)
  - MAJOR 1+ signals API stability
  - Always release from a clean git tag: git tag v1.2.3 && git push --tags

Conventional Commits → version bump mapping:
  feat:      MINOR bump (1.0.0 → 1.1.0)
  fix:       PATCH bump (1.0.0 → 1.0.1)
  feat!:     MAJOR bump (1.0.0 → 2.0.0)  (breaking change)
  chore/docs/refactor: no bump
```

---

## Publishing to PyPI

```yaml
# .github/workflows/publish.yml — Trusted Publishers (OIDC, no static secrets)
name: Publish to PyPI

on:
  push:
    tags:
      - "v*"

permissions:
  id-token: write   # OIDC token for PyPI trusted publisher

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3

      - name: Verify tag matches package version
        run: |
          TAG=${GITHUB_REF#refs/tags/v}
          PKG_VERSION=$(uv version --short)
          if [ "$TAG" != "$PKG_VERSION" ]; then
            echo "Tag $TAG != package version $PKG_VERSION"
            exit 1
          fi

      - name: Build distribution
        run: uv build   # creates dist/*.whl and dist/*.tar.gz

      - name: Upload to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        # No password needed — Trusted Publishers uses OIDC
```

```bash
# Local publish (if not using CI)
uv build
uv publish --token $PYPI_TOKEN

# Publish to Test PyPI first
uv publish --publish-url https://test.pypi.org/legacy/ --token $TEST_PYPI_TOKEN
# Then verify install
pip install --index-url https://test.pypi.org/simple/ myapp==1.2.3
```

---

## uv Workspaces (Monorepo)

```toml
# workspace root pyproject.toml
[tool.uv.workspace]
members = [
    "packages/core",
    "packages/api",
    "packages/cli",
    "services/order-service",
]

# packages/core/pyproject.toml
[project]
name = "myapp-core"
version = "0.1.0"

# packages/api/pyproject.toml
[project]
name = "myapp-api"
dependencies = [
    "myapp-core",   # references workspace sibling — resolved locally
    "fastapi>=0.110",
]

[tool.uv.sources]
myapp-core = { workspace = true }   # use local version, not PyPI
```

```bash
# Run tests across all workspace packages
uv run --all-packages pytest
# Run for specific package
uv run --package myapp-api pytest
# Install only one package's deps
uv sync --package myapp-core
```

---

## Package Layout

```
src-layout (recommended):
my-project/
  src/
    myapp/
      __init__.py      ← version = "0.1.0"
      cli.py
      api/
        __init__.py
        routes.py
  tests/
    test_cli.py
    test_api.py
  pyproject.toml
  uv.lock

Benefits of src/ layout:
  - Can't accidentally import from cwd instead of installed package
  - Clearer separation of package code from project files
  - Standard for production packages

Flat layout (acceptable for simple projects):
my-project/
  myapp/
    __init__.py
  tests/
  pyproject.toml
```

---

## Connections

[[se-hub]] · [[python/ecosystem]] · [[python/pypi-distribution]] · [[cs-fundamentals/cli-tooling]] · [[cloud/github-actions]]
