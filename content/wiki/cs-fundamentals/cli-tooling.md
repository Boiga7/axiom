---
type: concept
category: cs-fundamentals
para: resource
tags: [cli, click, typer, rich, argparse, subprocess, terminal, developer-tools]
sources: []
updated: 2026-05-01
tldr: Building professional command-line tools with Click, Typer, and Rich.
---

# CLI Tooling

Building professional command-line tools with Click, Typer, and Rich.

---

## Click vs Typer vs argparse

```
argparse:  stdlib. Verbose, no type inference, no decorators. Use only if zero deps allowed.
Click:     mature decorator-based framework. Explicit, composable, excellent error messages.
Typer:     Click wrapper. Infers types from Python type annotations. Less boilerplate.

Choose Typer for new projects (modern Python 3.10+).
Choose Click when you need fine-grained control or Click plugins.
```

---

## Typer — Full Example

```python
# cli.py — production-quality Typer CLI
import typer
from typing import Annotated
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.progress import track

app = typer.Typer(
    name="myapp",
    help="Manage orders and inventory.",
    no_args_is_help=True,
    add_completion=True,   # generates shell completion scripts
)
console = Console()
err_console = Console(stderr=True, style="bold red")

# Sub-commands via sub-apps
orders_app = typer.Typer(help="Order management commands.")
app.add_typer(orders_app, name="orders")


@orders_app.command("list")
def list_orders(
    status: Annotated[str, typer.Option("--status", "-s",
        help="Filter by status: pending, shipped, delivered")] = "all",
    limit: Annotated[int, typer.Option("--limit", "-n",
        help="Maximum number of results")] = 20,
    json_output: Annotated[bool, typer.Option("--json/--no-json",
        help="Output as JSON")] = False,
) -> None:
    """List orders with optional status filter."""
    try:
        orders = fetch_orders(status=status, limit=limit)
    except ConnectionError as e:
        err_console.print(f"API unreachable: {e}")
        raise typer.Exit(code=1)

    if json_output:
        import json
        typer.echo(json.dumps(orders, default=str))
        return

    table = Table("ID", "Status", "Total", "Created At", title="Orders")
    for order in orders:
        table.add_row(order["id"], order["status"], f"£{order['total']:.2f}",
                      order["created_at"])
    console.print(table)


@orders_app.command("export")
def export_orders(
    output: Annotated[Path, typer.Argument(help="Output CSV file path")],
    start_date: Annotated[str, typer.Option(help="Start date YYYY-MM-DD")] = "",
    overwrite: Annotated[bool, typer.Option("--overwrite", "-f")] = False,
) -> None:
    """Export orders to CSV."""
    if output.exists() and not overwrite:
        err_console.print(f"{output} already exists. Use --overwrite to replace.")
        raise typer.Exit(code=1)

    orders = fetch_orders(since=start_date)
    with console.status("Exporting...", spinner="dots"):
        write_csv(output, orders)
    console.print(f"[green]Exported {len(orders)} orders to {output}[/green]")


@app.command()
def version() -> None:
    """Print version and exit."""
    from importlib.metadata import version
    console.print(f"myapp {version('myapp')}")


if __name__ == "__main__":
    app()
```

---

## Click — Advanced Patterns

```python
import click

@click.group()
@click.option("--verbose", "-v", is_flag=True, default=False)
@click.option("--config", type=click.Path(exists=True, path_type=Path), envvar="MYAPP_CONFIG")
@click.pass_context
def cli(ctx: click.Context, verbose: bool, config: Path | None) -> None:
    """MyApp — order management CLI."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    ctx.obj["config"] = load_config(config) if config else {}

@cli.command()
@click.argument("order_id")
@click.option("--confirm", is_flag=True, prompt="Are you sure?",
              help="Skip confirmation prompt")
@click.pass_context
def cancel(ctx: click.Context, order_id: str, confirm: bool) -> None:
    """Cancel an order."""
    if not confirm:
        click.echo("Cancelled.")
        return
    try:
        result = cancel_order(order_id)
        click.echo(click.style(f"Order {order_id} cancelled.", fg="green"))
    except OrderNotFound:
        click.echo(click.style(f"Order {order_id} not found.", fg="red"), err=True)
        raise SystemExit(1)

# Custom parameter type
class OrderIdParam(click.ParamType):
    name = "order_id"

    def convert(self, value: str, param, ctx) -> str:
        if not value.startswith("ord_"):
            self.fail(f"{value!r} is not a valid order ID (must start with 'ord_')", param, ctx)
        return value

@cli.command()
@click.argument("order_id", type=OrderIdParam())
def view(order_id: str) -> None:
    ...
```

---

## Rich Output

```python
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, BarColumn, TimeRemainingColumn
from rich.panel import Panel
from rich.syntax import Syntax
from rich.tree import Tree
import time

console = Console()

# Tables
def print_orders_table(orders: list[dict]) -> None:
    table = Table(
        "Order ID", "Status", "Total",
        title="Recent Orders",
        show_header=True,
        header_style="bold cyan",
    )
    for order in orders:
        status_style = {"shipped": "green", "pending": "yellow", "cancelled": "red"}.get(
            order["status"], "white"
        )
        table.add_row(
            order["id"],
            f"[{status_style}]{order['status']}[/{status_style}]",
            f"£{order['total']:.2f}",
        )
    console.print(table)

# Progress bar with ETA
def process_batch(items: list) -> None:
    with Progress(
        SpinnerColumn(),
        "[progress.description]{task.description}",
        BarColumn(),
        "[progress.percentage]{task.percentage:>3.0f}%",
        TimeRemainingColumn(),
    ) as progress:
        task = progress.add_task("Processing orders...", total=len(items))
        for item in items:
            process(item)
            progress.advance(task)

# Panels and syntax highlighting
def display_config(config: dict) -> None:
    import json
    syntax = Syntax(json.dumps(config, indent=2), "json", theme="monokai")
    console.print(Panel(syntax, title="Current Config", border_style="blue"))

# Tree structure
def display_file_tree(path: Path) -> None:
    tree = Tree(f"[bold]{path.name}/[/bold]")
    for item in sorted(path.iterdir()):
        if item.is_dir():
            tree.add(f"[blue]{item.name}/[/blue]")
        else:
            tree.add(item.name)
    console.print(tree)
```

---

## Configuration File + Environment

```python
# config.py — precedence: CLI args > env vars > config file > defaults
from pydantic import BaseSettings, Field
from pathlib import Path
import tomllib

class Config(BaseSettings):
    api_url: str = "http://localhost:8000"
    api_key: str = ""
    timeout: int = 30
    output_format: str = "table"

    class Config:
        env_prefix = "MYAPP_"            # MYAPP_API_URL, MYAPP_API_KEY
        env_file = ".env"

def load_config(config_file: Path | None = None) -> Config:
    file_config = {}
    if config_file and config_file.exists():
        with open(config_file, "rb") as f:
            file_config = tomllib.load(f).get("tool", {}).get("myapp", {})
    return Config(**file_config)

# Default config file locations (in priority order):
# 1. --config flag
# 2. MYAPP_CONFIG env var
# 3. .myapp.toml in cwd
# 4. ~/.config/myapp/config.toml
def find_config() -> Path | None:
    candidates = [
        Path(".myapp.toml"),
        Path.home() / ".config" / "myapp" / "config.toml",
    ]
    return next((p for p in candidates if p.exists()), None)
```

---

## Testing CLI Commands

```python
# test_cli.py
from typer.testing import CliRunner
from cli import app

runner = CliRunner()

def test_list_orders_returns_table() -> None:
    result = runner.invoke(app, ["orders", "list"])
    assert result.exit_code == 0
    assert "Order ID" in result.output

def test_cancel_requires_confirmation() -> None:
    result = runner.invoke(app, ["orders", "cancel", "ord_123"])
    assert "Are you sure" in result.output

def test_cancel_with_confirm_flag() -> None:
    result = runner.invoke(app, ["orders", "cancel", "ord_123", "--confirm"])
    assert result.exit_code == 0
    assert "cancelled" in result.output.lower()

def test_export_fails_if_file_exists(tmp_path) -> None:
    existing = tmp_path / "orders.csv"
    existing.write_text("")
    result = runner.invoke(app, ["orders", "export", str(existing)])
    assert result.exit_code == 1
    assert "already exists" in result.output
```

---

## Common Failure Cases

**Error output written to stdout instead of stderr**
Why: `print(f"Error: {e}")` writes to stdout, which pollutes machine-readable output when the command is piped; downstream scripts parsing JSON or CSV output receive the error message as data.
Detect: pipe the command to `jq` or `cut` and trigger an error; if the parser receives the error text, stdout is being used for errors.
Fix: write all errors via `Console(stderr=True)` (Rich) or `click.echo(..., err=True)`; reserve stdout exclusively for the command's data output.

**Non-zero exit code not set on failure**
Why: a command catches an exception and prints an error message but returns exit code 0; scripts that check `$?` to detect failure see success and continue silently.
Detect: run the command with invalid input, then `echo $?` — if it prints 0, the exit code is wrong.
Fix: call `raise typer.Exit(code=1)` or `raise SystemExit(1)` in every error path; use `typer.Exit(code=0)` only on genuine success.

**Config precedence not honoured (env var silently overridden by file)**
Why: the config loading order is implemented incorrectly — file values override env vars, so `MYAPP_API_KEY` in the environment has no effect when a config file exists.
Detect: set an env var that conflicts with a config file value and check which takes effect.
Fix: enforce the precedence chain explicitly: CLI args > env vars > config file > defaults; with `pydantic-settings`, env vars override file values by default.

**Shell completion broken because entry point is not configured**
Why: `add_completion=True` is set in Typer but the package's `pyproject.toml` does not declare a `[project.scripts]` entry point; the `myapp --install-completion` command generates a script pointing at a non-existent command.
Detect: install the package with `pip install -e .` and run `myapp --install-completion bash`; if it fails or completion does not trigger, the entry point is missing.
Fix: add `[project.scripts] myapp = "myapp.cli:app"` to `pyproject.toml` and reinstall.

## Connections

[[se-hub]] · [[python/ecosystem]] · [[cs-fundamentals/linux-fundamentals]] · [[cs-fundamentals/performance-optimisation-se]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
