---
type: concept
category: cloud
para: resource
tags: [github-actions, ci-cd, oidc, caching, matrix, reusable-workflows, automation]
sources: []
updated: 2026-05-01
tldr: CI/CD built into GitHub. Triggered by events (push, PR, schedule, manual). Runs jobs in parallel or sequence across GitHub-hosted or self-hosted runners.
---

# GitHub Actions

CI/CD built into GitHub. Triggered by events (push, PR, schedule, manual). Runs jobs in parallel or sequence across GitHub-hosted or self-hosted runners. The standard CI/CD choice for most teams; tight GitHub integration eliminates webhook plumbing.

---

## Anatomy of a Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:          # manual trigger via GitHub UI

jobs:
  test:
    runs-on: ubuntu-latest    # GitHub-hosted runner; also: windows-latest, macos-latest
    timeout-minutes: 30       # fail fast; don't let a stuck job burn credits

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        run: pytest tests/ -v --tb=short
```

---

## OIDC — No Static Credentials

The single most important GitHub Actions security practice. Instead of storing long-lived cloud credentials as repository secrets, use OIDC tokens to assume a role dynamically.

```yaml
# Allow GitHub to mint an OIDC token
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials via OIDC
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-actions-role
      aws-region: eu-west-1

  # All subsequent AWS CLI/SDK calls use the temporary credentials — no secrets stored anywhere.
  - name: Deploy
    run: aws s3 sync ./dist s3://my-bucket/
```

Configure on the AWS side: create an OIDC provider for `token.actions.githubusercontent.com`, create an IAM role with a trust policy that matches your org/repo/branch.

Same pattern for GCP (Workload Identity Federation) and Azure (federated credentials on a managed identity).

---

## Caching — 60–80% Job Time Reduction

Actions cache stores dependencies between runs. Cache key is a hash of your lock file; hit = skip the install step entirely.

```yaml
- name: Cache Python dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-

- name: Install dependencies
  run: pip install -r requirements.txt
```

```yaml
# Node.js — use setup-node's built-in caching
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "pnpm"

# uv (Python) — built-in caching
- uses: astral-sh/setup-uv@v4
  with:
    enable-cache: true
```

Docker layer caching via registry:

```yaml
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: ghcr.io/my-org/my-app:${{ github.sha }}
    cache-from: type=registry,ref=ghcr.io/my-org/my-app:buildcache
    cache-to: type=registry,ref=ghcr.io/my-org/my-app:buildcache,mode=max
```

---

## Matrix Strategy

Run a job across multiple OS, language version, or config combinations in parallel.

```yaml
jobs:
  test:
    strategy:
      matrix:
        python-version: ["3.11", "3.12", "3.13"]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false        # don't cancel remaining jobs if one fails
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pytest tests/
```

---

## Reusable Workflows

Define a workflow once, call it from many other workflows. Eliminates copy-paste across repos.

```yaml
# .github/workflows/reusable-deploy.yml
on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true
    secrets:
      AWS_ROLE_ARN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: eu-west-1
      - run: |
          # Deploy logic here
```

```yaml
# Calling workflow
jobs:
  deploy-prod:
    uses: my-org/.github/.github/workflows/reusable-deploy.yml@main
    with:
      environment: production
    secrets:
      AWS_ROLE_ARN: ${{ secrets.PROD_AWS_ROLE_ARN }}
```

---

## Environments and Approvals

Protect production deployments with required reviewers.

```yaml
jobs:
  deploy:
    environment:
      name: production       # links to GitHub environment settings
      url: https://api.example.com
    runs-on: ubuntu-latest
    steps:
      - run: terraform apply -auto-approve
```

In GitHub settings → Environments → production: add required reviewers. The job pauses and sends notifications until a reviewer approves.

---

## Terraform CI Pattern

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: write   # to post plan output as PR comment

    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.TERRAFORM_ROLE_ARN }}
          aws-region: eu-west-1

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.0"

      - run: terraform init

      - name: Terraform Plan
        id: plan
        run: terraform plan -out=tfplan -no-color

      - name: Post plan to PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `\`\`\`\n${{ steps.plan.outputs.stdout }}\n\`\`\``
            })

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply tfplan
```

---

## Useful Patterns

**Conditional steps:**
```yaml
- run: npm run deploy
  if: github.ref == 'refs/heads/main'
```

**Job outputs:**
```yaml
jobs:
  build:
    outputs:
      image-tag: ${{ steps.tag.outputs.tag }}
    steps:
      - id: tag
        run: echo "tag=${{ github.sha }}" >> $GITHUB_OUTPUT
  deploy:
    needs: build
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.image-tag }}"
```

**Secrets and vars:**
```yaml
env:
  API_URL: ${{ vars.API_URL }}        # non-secret config variable
  API_KEY: ${{ secrets.API_KEY }}     # encrypted secret
```

**Concurrency — prevent overlapping deploys:**
```yaml
concurrency:
  group: production-deploy
  cancel-in-progress: false    # queue rather than cancel; true for preview deploys
```

---

## GitHub Actions vs Alternatives

| | GitHub Actions | GitLab CI | CircleCI | Jenkins |
|--|--|--|--|--|
| Integration | Native GitHub | Native GitLab | Any git | Any git |
| Free tier | 2,000 min/mo public | 400 min/mo | 6,000 credits/mo | Self-host only |
| OIDC | Native | Native | Supported | Plugin |
| Reusable workflows | Yes | Templates | Orbs | Shared libs |
| Self-hosted runners | Yes | Yes | Yes (resource classes) | Yes |

---

## Common Failure Cases

**OIDC role assumption fails because the trust policy subject condition is too strict**
Why: The IAM trust policy condition uses `StringEquals` on `token.actions.githubusercontent.com:sub` with a specific branch (`ref:refs/heads/main`) but the workflow runs on a PR branch, so the subject does not match.
Detect: The `configure-aws-credentials` step fails with `Error: Not authorized to perform sts:AssumeRoleWithWebIdentity`; the OIDC token subject in the error contains the PR branch ref instead of `main`.
Fix: Use `StringLike` with a wildcard for non-deployment roles (`repo:my-org/my-repo:*`), and reserve the strict `ref:refs/heads/main` condition only for the production deployment role; use separate roles for CI (broad) and CD (narrow).

**Cache restore key collision between branches causing stale dependencies**
Why: The `restore-keys` fallback pattern (`${{ runner.os }}-pip-`) matches cache entries from any branch; a feature branch picks up a cache from `main` that contains a different dependency version, causing test failures that are impossible to reproduce locally.
Detect: Tests pass on `main` but fail intermittently on feature branches after the cache is restored from a different branch; `pip list` in the job shows a package version that is not in `requirements.txt`.
Fix: Include the branch name in the primary cache key (`${{ runner.os }}-pip-${{ github.ref }}-${{ hashFiles('requirements.txt') }}`); use the OS+pip prefix as the restore key fallback only.

**Concurrent deploys racing to apply the same Terraform state**
Why: Two PRs merge to `main` within seconds of each other; both trigger `terraform apply` concurrently and the second apply starts before the first releases the state lock, causing a `state lock` error or conflicting infrastructure changes.
Detect: Terraform apply step fails with `Error acquiring the state lock` or `state is currently locked`; or both applies succeed but the final state reflects only one of the intended changes.
Fix: Set `concurrency: group: terraform-apply, cancel-in-progress: false` on the deploy job so the second workflow queues rather than runs concurrently; Terraform remote backends (S3+DynamoDB, HCP Terraform) provide state locking automatically.

**Workflow billing minutes exhausted because a step hangs without a timeout**
Why: A step that calls an external API or waits on a resource hangs indefinitely; without `timeout-minutes` on the step or job, it runs until the 6-hour job limit and consumes the full credit.
Detect: GitHub Actions billing shows a disproportionate minutes usage from a single workflow; the workflow run shows a single step that ran for hours before the job was cancelled or timed out.
Fix: Set `timeout-minutes: 30` on every job (or a lower value per step for known-fast operations); add explicit timeout flags to CLI tools (`aws --cli-connect-timeout 10`, `terraform apply -lock-timeout=5m`).

## Connections

- [[cloud/terraform]] — Terraform plan/apply via GitHub Actions
- [[cloud/argocd]] — GitHub Actions builds image; ArgoCD deploys to K8s
- [[cloud/aws-core]] — OIDC role assumption for AWS deployments
- [[cloud/docker]] — GitHub Actions builds Docker images, pushes to GHCR/ECR
- [[cloud/secrets-management]] — OIDC avoids storing static credentials as secrets
- [[cs-fundamentals/cicd-pipelines]] — pipeline design discipline: stage ordering, DORA metrics, Jenkins/Azure DevOps patterns
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
