---
type: concept
category: infra
tags: [deployment, docker, github-actions, ci-cd, modal, kubernetes, vercel, production]
sources: []
updated: 2026-05-01
para: resource
tldr: LLM application deployment patterns covering Docker multi-stage builds, GitHub Actions CI/CD, and platform selection — Vercel for Next.js streaming, Fly.io for persistent FastAPI services, Modal for serverless GPU inference.
---

# Deploying LLM Applications

> **TL;DR** LLM application deployment patterns covering Docker multi-stage builds, GitHub Actions CI/CD, and platform selection — Vercel for Next.js streaming, Fly.io for persistent FastAPI services, Modal for serverless GPU inference.

Getting AI applications from laptop to production. The stack: containerise with Docker, CI/CD with GitHub Actions, and deploy to the platform that matches your scale and ops budget.

---

## Docker for LLM Services

### API Service (FastAPI + Anthropic)

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src/ ./src/

# Non-root user for security
RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml — local dev with dependencies
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### GPU Inference Container

```dockerfile
# CUDA base for running open models
FROM nvidia/cuda:12.1-cudnn8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

# Model weights mounted at runtime, not baked in
ENV MODEL_PATH=/models/llama-3-8b-instruct
CMD ["uv", "run", "python", "-m", "src.serve"]
```

```bash
# Run with GPU access
docker run --gpus all \
  -v /data/models:/models \
  -p 8000:8000 \
  my-inference-service
```

---

## GitHub Actions CI/CD

### Standard Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          version: "latest"

      - name: Install dependencies
        run: uv sync --frozen

      - name: Run tests (unit only, no real API calls)
        run: uv run pytest -m "not integration" --tb=short

      - name: Type check
        run: uv run mypy src/

      - name: Lint
        run: uv run ruff check src/

  integration-test:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --frozen
      - name: Run integration tests
        run: uv run pytest -m "integration" --tb=short
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

  deploy:
    runs-on: ubuntu-latest
    needs: [test, integration-test]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions@v1
        with:
          args: "deploy --remote-only"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Docker Build + Push

```yaml
  build-push:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Deployment Platforms

### Vercel (Next.js / edge functions)

Best for: Next.js frontends with LLM-powered APIs. Streaming works out of the box.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment variables
vercel env add ANTHROPIC_API_KEY production
```

```typescript
// app/api/chat/route.ts — streams to browser automatically
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export const runtime = 'edge'  // runs on Vercel Edge, low latency
export const maxDuration = 60  // 60s timeout for streaming

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = streamText({ model: anthropic('claude-sonnet-4-6'), messages })
  return result.toDataStreamResponse()
}
```

### Fly.io (Persistent servers)

Best for: FastAPI services, anything needing persistent connections or background workers.

```toml
# fly.toml
app = "my-llm-api"
primary_region = "lhr"  # London

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = "stop"    # scale to zero when idle
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "2gb"
  cpu_kind = "shared"
  cpus = 2
```

```bash
fly launch          # first time setup
fly deploy          # subsequent deployments
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### Modal (Serverless GPU)

Best for: open model inference, fine-tuning jobs, batch processing — serverless with GPU.

```python
import modal

app = modal.App("llm-inference")

image = modal.Image.debian_slim().pip_install("vllm", "fastapi")

@app.cls(
    image=image,
    gpu="A100",
    container_idle_timeout=300,  # keep warm for 5 min
    secrets=[modal.Secret.from_name("my-secrets")],
)
class InferenceService:
    @modal.enter()
    def load_model(self):
        from vllm import LLM
        self.llm = LLM(model="meta-llama/Meta-Llama-3-8B-Instruct")

    @modal.method()
    def generate(self, prompt: str) -> str:
        outputs = self.llm.generate([prompt])
        return outputs[0].outputs[0].text

@app.local_entrypoint()
def main():
    service = InferenceService()
    print(service.generate.remote("Explain RAG in one paragraph."))
```

```bash
modal deploy inference_service.py   # deploy
modal run inference_service.py      # test locally
```

### Railway / Render

Simpler alternatives to Fly.io for teams that want less configuration:

```bash
# Railway
railway login
railway up

# Render: connect GitHub repo in dashboard, add env vars, done
```

---

## Environment Variables and Secrets

Never hardcode API keys. Standard pattern:

```python
# src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"         # local dev
        env_file_encoding = "utf-8"

settings = Settings()
```

```bash
# .env (never commit)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...

# Production: set via platform secrets
# Fly.io: fly secrets set KEY=value
# Vercel: vercel env add KEY production
# GitHub Actions: Settings → Secrets → Actions
```

---

## Health Checks and Readiness

```python
# FastAPI health endpoint — required by most deployment platforms
from fastapi import FastAPI
import anthropic

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ready")
async def ready():
    # Check dependencies are available
    try:
        client = anthropic.Anthropic()
        # Cheap API check (count tokens, not a full message)
        client.messages.count_tokens(
            model="claude-haiku-4-5-20251001",
            messages=[{"role": "user", "content": "ping"}],
        )
        return {"status": "ready", "api": "ok"}
    except Exception as e:
        return {"status": "not ready", "error": str(e)}, 503
```

---

## Key Facts

- Use `uv` for dependency installation in Docker; replaces pip + venv, 10-100x faster
- Never bake model weights into Docker images — mount at runtime via `-v /data/models:/models`
- Run containers as non-root user for security (`adduser --disabled-password`)
- Vercel `export const runtime = 'edge'` for lowest latency; `maxDuration = 60` for streaming
- Fly.io `auto_stop_machines = "stop"` scales to zero; `min_machines_running = 0` for cost savings
- Modal serverless GPU cost: ~$0.00164/s billed per request; cold start 2-5s
- API keys go via platform secrets (fly secrets set, vercel env add), never in source code

## Connections

- [[infra/inference-serving]] — serving open models (vLLM) vs API-based serving
- [[infra/gpu-hardware]] — GPU options for self-hosted model serving on cloud instances
- [[web-frameworks/fastapi]] — the API framework used in the deployment examples
- [[web-frameworks/nextjs]] — Next.js streaming deployment on Vercel via Vercel AI SDK
- [[observability/tracing]] — what to instrument once deployed (spans, latency, token cost)
- [[infra/cloud-platforms]] — Vercel, Fly, Modal, Railway, AWS, GCP comparison for these workloads

## Open Questions

- What is the practical cold start time difference between Modal and Fly.io for GPU workloads?
- When does Kubernetes become the right choice over Fly.io for LLM API services?
- How do you handle health checks for models with slow startup (large VRAM loads) without Kubernetes-style init containers?
