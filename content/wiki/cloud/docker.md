---
type: concept
category: cloud
para: resource
tags: [docker, containers, dockerfile, multi-stage, buildkit, compose]
sources: []
updated: 2026-05-01
tldr: Container runtime. Packages an application and its dependencies into a portable, reproducible image that runs identically in dev, CI, and production.
---

# Docker

Container runtime. Packages an application and its dependencies into a portable, reproducible image that runs identically in dev, CI, and production. The default unit of deployment for cloud-native applications.

---

## Core Concepts

**Image** — read-only template. Built from a Dockerfile. Layers are cached and shared.

**Container** — running instance of an image. Isolated process with its own filesystem, network, and PID namespace. Stateless by default; data not written to a volume is lost on container stop.

**Registry** — image repository. Docker Hub (public), AWS ECR, GCP Artifact Registry, Azure ACR (private). Image names: `registry/repo:tag`. Default registry is Docker Hub, default tag is `latest` (avoid `latest` in production — pin exact versions).

---

## Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Copy deps first — leverages layer cache. If requirements.txt unchanged,
# pip install layer is reused even when source code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Key instructions:
- `FROM` — base image. Use slim/alpine variants for smaller output.
- `RUN` — executes in a new layer. Chain commands with `&&` to reduce layers.
- `COPY` — adds files from host. Prefer over `ADD` unless you need tar extraction.
- `ENV` — sets environment variables visible at runtime.
- `ARG` — build-time variable only; not persisted in image.
- `EXPOSE` — documents the port; does not publish it. Publishing happens at `docker run -p`.
- `CMD` — default command when no arguments given. Override with `docker run <image> <cmd>`.
- `ENTRYPOINT` — fixed command; `CMD` becomes its default arguments.

---

## Multi-Stage Builds

The single highest-impact Dockerfile practice. Build in a fat image with all tooling; copy only the compiled artifact to a minimal runtime image.

### Go — 980MB → 10MB

```dockerfile
# Build stage
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Runtime stage — scratch has no OS at all
FROM scratch
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/server"]
```

### Node.js — 900MB → 120MB

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Python FastAPI — builder pattern

```dockerfile
FROM python:3.12 AS builder
WORKDIR /app
RUN pip install --user --no-cache-dir \
    fastapi uvicorn[standard] pydantic sqlalchemy

FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## BuildKit

Docker BuildKit is the default build engine since Docker 23. Key improvements:

```bash
# BuildKit is enabled by default in recent Docker; explicitly in older:
DOCKER_BUILDKIT=1 docker build .

# Or use the new CLI syntax
docker buildx build .
```

**Cache mounts** — cache pip/npm caches between builds without committing them to the image:

```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

**Secret mounts** — pass secrets at build time without baking them into layers:

```dockerfile
RUN --mount=type=secret,id=github_token \
    git clone https://$(cat /run/secrets/github_token)@github.com/my-org/private-repo
```

```bash
docker buildx build --secret id=github_token,src=$HOME/.github_token .
```

---

## Key Commands

```bash
# Build
docker build -t my-api:1.0.0 .
docker buildx build --platform linux/amd64,linux/arm64 -t my-api:1.0.0 --push .

# Run
docker run -d -p 8000:8000 --name api my-api:1.0.0
docker run -it --rm python:3.12-slim bash   # ephemeral interactive shell

# Inspect
docker ps                         # running containers
docker ps -a                      # all containers including stopped
docker logs api -f                # follow logs
docker exec -it api sh            # shell into running container
docker inspect api                # full JSON metadata

# Images
docker images
docker pull python:3.12-slim
docker push my-registry.com/my-api:1.0.0
docker rmi my-api:1.0.0

# Cleanup
docker system prune -af           # remove all unused images, containers, networks
docker volume prune               # remove unused volumes (careful — data loss)
```

---

## Docker Compose

Local multi-container orchestration. Not for production; for dev environments and integration tests.

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

```bash
docker compose up -d          # start in background
docker compose logs -f api    # follow api logs
docker compose down           # stop and remove containers (data volume survives)
docker compose down -v        # also remove volumes
```

---

## Image Best Practices

| Practice | Why |
|----------|-----|
| Multi-stage builds | Shrinks image; no build tools in prod |
| Pin base image versions (`python:3.12-slim`, not `python:latest`) | Reproducible builds |
| Run as non-root user | Reduces blast radius of container escape |
| `.dockerignore` file | Excludes `.git`, `node_modules`, `__pycache__` from build context |
| One process per container | Simpler health checks and scaling |
| Use `CMD` not shell form | `["uvicorn", ...]` not `uvicorn ...` — clean signal propagation |

```dockerfile
# Non-root user pattern
RUN addgroup --system app && adduser --system --group app
USER app
```

---

## Container Security Scanning

```bash
# Docker Scout (built in to recent Docker Desktop)
docker scout cves my-api:1.0.0

# Trivy (open source, CI-friendly)
trivy image my-api:1.0.0
```

In CI, fail the build on HIGH/CRITICAL CVEs before pushing to a registry.

---

## Common Failure Cases

**Build cache invalidated on every run because COPY . . precedes dependency installation**
Why: Placing `COPY . .` before `RUN pip install` means any source code change invalidates the pip layer, forcing a full reinstall even when `requirements.txt` is unchanged.
Detect: Build times are consistently 3-5 minutes even for trivial one-line code changes; Docker build output shows `COPY` as the first non-cached step.
Fix: Copy only the dependency file first (`COPY requirements.txt .`), run the install, then `COPY . .` — the install layer is only invalidated when the lock file changes.

**Container runs as root because no USER instruction was added**
Why: Most base images default to root unless overridden; without a `USER` instruction the application process runs with UID 0 inside the container.
Detect: `docker inspect <container> | grep '"User"'` returns empty or `"User": ""`; `docker exec <container> whoami` returns `root`.
Fix: Add `RUN addgroup --system app && adduser --system --group app` and `USER app` before the `CMD` instruction; verify with `docker run --rm <image> whoami`.

**`docker compose down` removes containers but leaves volumes, causing stale state between test runs**
Why: `docker compose down` without `-v` preserves named volumes; a PostgreSQL volume from a previous test run still contains old schema or data when the next run starts.
Detect: Integration tests pass in isolation but fail after a previous run; database shows tables or rows that the test setup did not create.
Fix: Use `docker compose down -v` in CI teardown steps to remove volumes; alternatively use `tmpfs` mounts for test databases so data is never persisted to disk.

**Multi-platform build fails because base image does not have an arm64 variant**
Why: `docker buildx build --platform linux/amd64,linux/arm64` fails mid-build when a base image (e.g., an older CUDA image) does not provide an arm64 manifest.
Detect: Build fails with `exec format error` or `no matching manifest for linux/arm64` in the build output.
Fix: Check image availability with `docker buildx imagetools inspect <base-image>` before adding `--platform` flags; use QEMU-based emulation only as a last resort as it is significantly slower than native builds.

## Connections

- [[cloud/kubernetes]] — Kubernetes runs containers; Docker builds the images
- [[cloud/github-actions]] — CI pipeline builds and pushes Docker images
- [[cloud/aws-core]] — ECR stores Docker images for ECS/EKS
- [[cloud/argocd]] — GitOps deployment of containerised applications
- [[cloud/cloud-networking]] — container networking, overlay networks
