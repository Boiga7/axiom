---
type: concept
category: python
para: resource
tags: [latency, benchmarking, p50, p95, p99, py-spy, profiling, async, http, mcpindex]
tldr: Benchmark p50/p95/p99 with 1000+ samples per scenario. Use py-spy for sampling profiling without code changes. Histograms over averages — averages hide the tail. Profile representative traffic at steady state.
sources: []
updated: 2026-05-01
---

# Async Python Latency Benchmarking

> **TL;DR** Benchmark p50/p95/p99 with 1000+ samples per scenario. Use py-spy for sampling profiling without code changes. Histograms over averages — averages hide the tail. Profile representative traffic at steady state.

Directly relevant to mcpindex Weekend 2 — latency baselines for STDIO vs HTTP transport comparison.

## Key Facts
- p50 = typical user experience; p95 = where slow users live; p99 = architectural bottlenecks and outliers
- Minimum 1000 samples per scenario for reliable percentile estimates — fewer samples make p99 unstable
- Averages hide disasters: one 10s request in 100 pulls average from 10ms to 110ms; p99 shows the 10s clearly
- py-spy attaches to a running Python process without code changes — no import overhead, no measurement bias
- Cold starts skew results: warm up the client connection before recording measurements
- Profile at steady state, not during startup — connection pooling, JIT, and caching effects are meaningful

## Percentile Reference

| Percentile | What it tells you | When it regresses, check |
|---|---|---|
| p50 (median) | Typical request experience | General performance regression |
| p95 | Slow user experience; 5% worse than this | Outlier workloads, connection contention |
| p99 | Architectural bottlenecks; 1% worse than this | GIL contention, blocking I/O in async code, GC pauses |
| p999 | Worst-of-worst; meaningful only at high traffic | Resource leaks, timeouts, retry storms |

For MCP transport comparison (STDIO vs HTTP), p50 shows the baseline difference; p95 shows how each degrades under load.

## Measuring Latency in Async Python

### Basic Pattern with `time.perf_counter`

```python
import asyncio
import time
import statistics
import httpx

async def measure_endpoint(
    url: str,
    n_samples: int = 1000,
    concurrency: int = 1,
) -> dict:
    latencies = []

    async with httpx.AsyncClient() as client:
        # Warm-up: 10 requests not recorded
        for _ in range(10):
            await client.get(url)

        # Measurement phase
        for _ in range(n_samples):
            start = time.perf_counter()
            await client.get(url)
            elapsed_ms = (time.perf_counter() - start) * 1000
            latencies.append(elapsed_ms)

    latencies.sort()
    n = len(latencies)
    return {
        "p50": latencies[int(n * 0.50)],
        "p95": latencies[int(n * 0.95)],
        "p99": latencies[int(n * 0.99)],
        "min": latencies[0],
        "max": latencies[-1],
        "mean": statistics.mean(latencies),
        "stdev": statistics.stdev(latencies),
    }
```

### Concurrent Load Pattern

For realistic load that exercises connection pooling:

```python
import asyncio
import time
import httpx
from collections import defaultdict

async def concurrent_benchmark(
    url: str,
    n_samples: int = 1000,
    concurrency: int = 10,
) -> dict:
    latencies = []
    semaphore = asyncio.Semaphore(concurrency)

    async def single_request(client: httpx.AsyncClient):
        async with semaphore:
            start = time.perf_counter()
            await client.get(url)
            return (time.perf_counter() - start) * 1000

    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=concurrency)) as client:
        # Warm-up
        await asyncio.gather(*[single_request(client) for _ in range(concurrency)])

        # Benchmark
        tasks = [single_request(client) for _ in range(n_samples)]
        latencies = await asyncio.gather(*tasks)

    latencies = sorted(latencies)
    n = len(latencies)
    return {
        "p50": latencies[int(n * 0.50)],
        "p95": latencies[int(n * 0.95)],
        "p99": latencies[int(n * 0.99)],
        "samples": n,
        "concurrency": concurrency,
    }
```

### MCP Transport Comparison Pattern

For mcpindex — comparing STDIO vs HTTP transport latency:

```python
import asyncio
import subprocess
import time

async def benchmark_stdio_transport(
    server_command: list[str],
    tool_name: str,
    n_samples: int = 200,
) -> dict:
    """Benchmark MCP STDIO transport: measures wall time per tool call."""
    latencies = []

    for _ in range(n_samples + 10):  # 10 warm-up
        start = time.perf_counter()
        proc = await asyncio.create_subprocess_exec(
            *server_command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
        )
        # Send tool call JSON-RPC request
        request = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": {}},
        }) + "\n"
        stdout, _ = await proc.communicate(input=request.encode())
        elapsed_ms = (time.perf_counter() - start) * 1000

        if _ >= 10:  # skip warm-up
            latencies.append(elapsed_ms)

    latencies.sort()
    n = len(latencies)
    return {"p50": latencies[int(n * 0.50)], "p95": latencies[int(n * 0.95)], "p99": latencies[int(n * 0.99)]}
```

## Profiling with py-spy

py-spy is a sampling profiler that attaches to a running Python process without code changes. Essential for identifying where latency comes from once you have a baseline.

### Installation

```bash
pip install py-spy
# or: uv add py-spy
```

### Attaching to a running process

```bash
# Find the PID of your Python process
ps aux | grep python

# Attach and record a flame graph (30 seconds)
py-spy record -o profile.svg --pid 12345 --duration 30

# Or dump the current stack trace
py-spy dump --pid 12345
```

The flame graph (`profile.svg`) shows where time is actually spent. Wide bars = hot code paths.

### Running directly with py-spy

```bash
py-spy record -o profile.svg -- python -m mcpindex scan --target http://localhost:8000
```

### Reading the flame graph

```
Bottom = outermost call (main/event loop)
Top = innermost call (where time is actually spent)
Width = proportion of total time spent in this call

Look for:
- Unexpectedly wide bars outside your code (e.g., json parsing, ssl handshake)
- asyncio._run_once or select() being wide = I/O wait (often correct, but check)
- GC frames (gc.collect) being wide = memory pressure
```

## Statistical Validity

For reliable percentile estimates:

| Samples | p50 stability | p95 stability | p99 stability |
|---|---|---|---|
| 100 | Good | Poor | Very poor |
| 500 | Good | OK | Poor |
| 1000 | Good | Good | OK |
| 5000 | Good | Good | Good |

Minimum recommendation: 1000 samples for p95, 5000 for p99 that you want to track over time.

### Avoiding Measurement Bias

```python
# BAD: cold start included
for i in range(1000):
    start = time.perf_counter()
    response = await client.get(url)
    latencies.append(time.perf_counter() - start)

# GOOD: warm-up excluded from measurement
async with httpx.AsyncClient() as client:
    # Warm up connection pool and any server-side caches
    for _ in range(10):
        await client.get(url)
    
    # Now measure
    for _ in range(1000):
        start = time.perf_counter()
        await client.get(url)
        latencies.append((time.perf_counter() - start) * 1000)
```

## Reporting Format

Standard output for latency baselines:

```
Transport: HTTP (streamable-HTTP, 2025-03-26)
Server: test-mcp-server v1.2.0
Operation: tools/list
Samples: 1000 | Concurrency: 1

p50:  12.3 ms
p95:  45.1 ms
p99: 112.8 ms
min:   8.1 ms
max: 890.2 ms
mean: 15.4 ms ± 22.1 ms (stdev)

---
Transport: STDIO
Samples: 200 | Concurrency: 1 (inherently serial)

p50:  85.2 ms  (+6.9x vs HTTP p50)
p95: 143.6 ms
p99: 201.4 ms
```

Record baselines at a fixed server version and commit to enable regression tracking across mcpindex releases.

> [Source: py-spy documentation; Python performance optimization best practices, 2025]

## Connections
- [[protocols/mcp-http-transport]] — the HTTP transport being benchmarked
- [[protocols/mcp]] — STDIO transport as the comparison baseline
- [[python/ecosystem]] — httpx, asyncio, structlog for the benchmark harness
- [[observability/tracing]] — Langfuse/OTel for production latency (complement to benchmarking)
- [[para/projects]] — mcpindex Weekend 2 target

## Open Questions
- At what concurrency level does STDIO transport become worse than HTTP due to process spawn overhead?
- Does mcpindex's scan parallelism interact badly with STDIO's inherently serial nature?
