---
type: concept
category: python
tags: [python, async, pydantic, click, pytest, uv, httpx, asyncio, packaging]
sources: []
updated: 2026-04-29
para: resource
tldr: Production AI Python stack — uv for packaging (10-100x faster than pip), AsyncAnthropic + httpx for async I/O, Pydantic v2 for validation, respx for mock testing, polars for dataset work.
---

# Python Ecosystem for AI Engineers

> **TL;DR** Production AI Python stack — uv for packaging (10-100x faster than pip), AsyncAnthropic + httpx for async I/O, Pydantic v2 for validation, respx for mock testing, polars for dataset work.

The essential Python stack for building production AI systems. AI engineering in Python means: async everything, Pydantic for data validation, httpx for HTTP, uv for packaging, pytest for tests.

---

## Package Management: uv

uv replaces pip, virtualenv, and pip-tools in one tool. 10–100x faster than pip.

```bash
# Install
curl -LsSf https://astral.sh/uv/install.sh | sh

# New project
uv init my-project
cd my-project

# Add dependencies
uv add anthropic httpx pydantic

# Add dev dependencies
uv add --dev pytest pytest-asyncio respx

# Run
uv run python main.py
uv run pytest
```

`pyproject.toml` (PEP 517/518/621 compliant):
```toml
[project]
name = "my-project"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["anthropic>=0.35", "httpx>=0.27", "pydantic>=2.8"]

[project.scripts]
my-cli = "my_project.cli:main"
```

---

## Async: asyncio and httpx

LLM API calls are I/O-bound. Always use async in production.

**httpx** — async HTTP client (replaces requests for async code):
```python
import httpx

async def fetch_data(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
        return response.json()
```

**AsyncAnthropic:**
```python
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

async def ask(question: str) -> str:
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": question}]
    )
    return message.content[0].text
```

**Streaming with async generators:**
```python
async def stream_response(prompt: str):
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        async for text in stream.text_stream:
            yield text
```

**Running async code in scripts:**
```python
import asyncio
asyncio.run(main())
```

---

## Pydantic v2

Data validation and settings management. The backbone of any well-typed Python AI system.

```python
from pydantic import BaseModel, field_validator, model_validator
from typing import Literal

class ToolCall(BaseModel):
    name: str
    arguments: dict

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Tool name cannot be empty")
        return v

class ScanReport(BaseModel):
    target: str
    score: int
    severity: Literal["none", "low", "medium", "high", "critical"]
    issues: list[str] = []

    @model_validator(mode="after")
    def check_score_range(self) -> "ScanReport":
        if not 0 <= self.score <= 100:
            raise ValueError("Score must be 0-100")
        return self
```

**Settings with environment variables:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    model: str = "claude-sonnet-4-6"
    max_tokens: int = 4096

    model_config = {"env_file": ".env", "env_prefix": "APP_"}

settings = Settings()  # reads from env + .env file
```

---

## Click: CLI Building

The standard CLI framework. Decorators declare commands, options, and arguments.

```python
import click
from rich.console import Console

console = Console()

@click.group()
@click.version_option()
def cli(): pass

@cli.command()
@click.argument("target")
@click.option("--format", type=click.Choice(["json", "table"]), default="table")
@click.option("--verbose", "-v", is_flag=True)
def scan(target: str, format: str, verbose: bool):
    """Scan an MCP server for issues."""
    console.print(f"Scanning [cyan]{target}[/cyan]...")
    # ...
```

**Rich for output formatting:**
```python
from rich.table import Table
from rich.progress import Progress

table = Table(title="Scan Results")
table.add_column("Check", style="cyan")
table.add_column("Result")
table.add_row("Schema", "[green]PASS[/green]")
console.print(table)
```

---

## pytest: Testing

```python
# pytest.ini or pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # auto-detect async tests (pytest-asyncio)
testpaths = ["tests"]

# test file
import pytest
import respx
import httpx

@pytest.mark.asyncio
async def test_api_call():
    async with respx.mock:
        respx.post("https://api.anthropic.com/v1/messages").mock(
            return_value=httpx.Response(200, json={"content": [{"type": "text", "text": "Hello"}]})
        )
        result = await my_function()
        assert result == "Hello"
```

**Fixtures:**
```python
@pytest.fixture
def sample_tool() -> dict:
    return {"name": "read_file", "description": "Read a file", "inputSchema": {"type": "object"}}

@pytest.fixture(scope="session")
def anthropic_client():
    return AsyncAnthropic()
```

**respx** — mock httpx in tests (drop-in for requests-mock but async):
```python
respx.get("https://api.example.com/data").mock(return_value=httpx.Response(200, json={"key": "value"}))
```

---

## Structlog: Structured Logging

```python
import structlog

log = structlog.get_logger()

log.info("scan_started", target="https://api.example.com", checks=["schema", "security"])
log.error("scan_failed", error=str(e), target=target)
```

Output: `{"event": "scan_started", "target": "...", "checks": [...], "timestamp": "...", "level": "info"}`

Configure JSON output in production, pretty-print in development via `structlog.dev.ConsoleRenderer`.

---

## Data Processing: polars + duckdb

For AI data work (dataset processing, eval results analysis):

**polars** — pandas replacement, 10–100x faster, lazy evaluation:
```python
import polars as pl

df = pl.read_parquet("eval_results.parquet")
results = (
    df.lazy()
    .filter(pl.col("score") > 0.8)
    .group_by("model")
    .agg(pl.col("score").mean().alias("avg_score"))
    .collect()
)
```

**duckdb** — in-process SQL on any data source:
```python
import duckdb
conn = duckdb.connect()
conn.execute("SELECT model, AVG(score) FROM 'eval_results.parquet' GROUP BY 1")
```

---

## Key Facts

- uv: 10-100x faster than pip; single tool replaces pip + virtualenv + pip-tools
- httpx: async HTTP client; `respx` mocks it in tests (drop-in replacement for requests-mock)
- Pydantic v2: `model_validator(mode="after")` runs after all field validators; `pydantic_settings` reads from .env
- pytest-asyncio: `asyncio_mode = "auto"` in pyproject.toml auto-detects async test functions
- polars: 10-100x faster than pandas; lazy evaluation with `.lazy()` + `.collect()`
- duckdb: in-process SQL on Parquet/CSV/JSON without a server; ideal for eval result analysis
- structlog: JSON output in production, ConsoleRenderer for development; machine-readable from day one

## Common Failure Cases

**`uv run pytest` fails because dev dependencies were not added with `--dev` flag**  
Why: `uv add pytest` adds pytest as a regular dependency that ships with the package; `uv add --dev pytest` adds it to the dev dependency group only; if tests run in a clean `uv run` environment without dev deps, pytest is not found.  
Detect: `ModuleNotFoundError: No module named 'pytest'` when running `uv run pytest`; pytest is listed under `[project.dependencies]` rather than `[tool.uv.dev-dependencies]` in pyproject.toml.  
Fix: remove pytest from regular dependencies with `uv remove pytest`; re-add as dev: `uv add --dev pytest pytest-asyncio respx`.

**`asyncio_mode = "auto"` in pyproject.toml not picked up because the config is in the wrong section**  
Why: pytest-asyncio configuration must be in `[tool.pytest.ini_options]`, not in `[tool.asyncio]` or `[pytest]`; if placed in the wrong section, the setting is silently ignored and async tests fail with "coroutine was never awaited".  
Detect: async tests fail with `RuntimeWarning: coroutine 'test_...' was never awaited` despite `asyncio_mode = "auto"` being set; checking `pytest --co` shows the tests are not marked async.  
Fix: verify the pyproject.toml section is exactly `[tool.pytest.ini_options]` with `asyncio_mode = "auto"` inside; run `pytest --co -v` to confirm pytest-asyncio is active.

**`respx.mock` context manager not entered, causing real HTTP requests to fire in tests**  
Why: `respx.mock` must be used as a context manager (`async with respx.mock:`) or decorator; calling `respx.post().mock()` outside of `respx.mock` context registers the mock but does not activate it, so real requests are made.  
Detect: tests make real HTTP requests and fail with network errors or unexpected responses; `respx.calls` shows zero recorded calls despite `respx.post().mock()` being called.  
Fix: always wrap the test body in `async with respx.mock:` or use the `@respx.mock` decorator on the test function.

**Pydantic `model_validator(mode="after")` raises `ValidationError` before field validators have run**  
Why: `mode="after"` runs after all field validators and type coercions; but if a field validator raises a `ValueError`, the model validator is skipped entirely; code that relies on the model validator for final cross-field checks may silently not run when individual fields fail.  
Detect: a cross-field constraint (e.g., `end_date > start_date`) is never checked because an unrelated field validator fails first; invalid cross-field combinations slip through.  
Fix: handle the case where the model validator may be skipped by also validating critical constraints in individual field validators; or use `mode="wrap"` to access the validator call chain.

## Connections

- [[apis/anthropic-api]] — AsyncAnthropic streaming patterns
- [[test-automation/pytest-patterns]] — deeper pytest patterns including fixtures and parametrize
- [[web-frameworks/fastapi]] — FastAPI + Pydantic for API backends
- [[observability/platforms]] — instrumenting Python apps with Langfuse

## Open Questions

- When will uv's workspace support (monorepo with shared dependencies) be stable enough for production AI project layouts?
- Does polars' lazy evaluation model have meaningful advantages over duckdb for typical AI eval dataset sizes (<10M rows)?
- Is pydantic_settings still the canonical approach for config management, or has something better emerged?
