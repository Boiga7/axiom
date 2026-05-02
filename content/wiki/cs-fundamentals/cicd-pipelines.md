---
type: concept
category: cs-fundamentals
tags: [cicd, jenkins, azure-devops, pipelines, dora, deployment, devops, continuous-integration, continuous-delivery]
sources: [raw/inbox/cicd-pipelines-websearch-2026-05-02.md]
updated: 2026-05-02
para: resource
tldr: CI/CD pipeline design as a discipline — stage ordering (lint→build→test→scan→staging→prod), artifact promotion, Jenkins Declarative Pipeline, Azure DevOps YAML stages, and the four DORA metrics that measure delivery performance.
---

# CI/CD Pipelines

> **TL;DR** CI/CD pipeline design as a discipline — stage ordering (lint→build→test→scan→staging→prod), artifact promotion, Jenkins Declarative Pipeline, Azure DevOps YAML stages, and the four DORA metrics that measure delivery performance.

The vault covers GitHub Actions in [[cloud/github-actions]], GitOps workflows in [[cloud/argocd]] and [[cloud/gitops-patterns]], and deployment strategies in [[cloud/blue-green-deployment]]. This page covers CI/CD pipeline design as a discipline — what stages to include, how to structure them across tools, and how to measure delivery performance.

---

## The Pipeline Contract

One artefact, all environments. Build the Docker image once; push it with a content-addressed SHA tag. Promote the same image through dev → staging → prod. Never rebuild per environment — rebuilding introduces drift.

```
Build:    myapp:sha-abc123  →  push to registry
Staging:  tag as :staging, deploy
Prod:     tag as :prod, deploy same image
```

Environment-specific configuration comes from environment variables injected at deploy time, not baked into the image.

**Full run target:** under 15 minutes for a production-ready pipeline.

---

## Stage Ordering

The standard pipeline progression:

| Stage | Tool Examples | Purpose | Fast-Fail? |
|---|---|---|---|
| **1. Lint / Static Analysis** | ruff, ESLint, mypy | Catch style + type errors before building | Yes |
| **2. Build** | Docker, Maven, npm | Compile, package, push artefact | Yes |
| **3. Unit Tests** | pytest, Jest | Isolated tests, no external deps | Yes |
| **4. Integration Tests** | pytest + testcontainers | Real databases, queues, APIs | Yes |
| **5. Security Scan** | Trivy, Semgrep, detect-secrets | SAST, CVEs, exposed secrets | Warn or fail |
| **6. Deploy to Staging** | Helm, kubectl | Deploy artefact to staging | Yes |
| **7. E2E / Smoke Tests** | Playwright, httpx | Validate staging is functional | Yes |
| **8. Approval Gate** | Manual or automated | Confirm readiness for prod | Block |
| **9. Deploy to Production** | Helm, kubectl | Deploy same artefact to prod | Yes |
| **10. Post-Deploy Verification** | synthetic monitoring | Confirm prod is healthy | Alert |

Stages 1–4 can run in parallel (lint + unit test + security scan are independent). Stages 6+ are sequential.

---

## Jenkins Declarative Pipeline

Jenkins uses a `Jenkinsfile` checked into the repo. Declarative Pipeline syntax (recommended over Scripted):

```groovy
pipeline {
    agent none  // critical: avoids executor starvation — agents allocated per stage

    environment {
        REGISTRY = "registry.example.com"
        IMAGE    = "${REGISTRY}/myapp"
    }

    stages {
        stage('Lint & Security') {
            parallel {
                stage('Lint') {
                    agent { label 'docker' }
                    steps {
                        sh 'ruff check . && mypy src/'
                    }
                }
                stage('Security Scan') {
                    agent { label 'docker' }
                    steps {
                        sh 'trivy fs --exit-code 1 --severity HIGH,CRITICAL .'
                    }
                }
            }
        }

        stage('Build') {
            agent { label 'docker' }
            steps {
                sh """
                    docker build -t ${IMAGE}:${GIT_COMMIT} .
                    docker push ${IMAGE}:${GIT_COMMIT}
                """
                stash name: 'image-tag', includes: 'image-tag.txt'
            }
        }

        stage('Test') {
            parallel {
                stage('Unit') {
                    agent { label 'docker' }
                    steps { sh 'pytest tests/unit -x --junitxml=unit-results.xml' }
                    post { always { junit 'unit-results.xml' } }
                }
                stage('Integration') {
                    agent { label 'docker' }
                    steps { sh 'pytest tests/integration --junitxml=int-results.xml' }
                    post { always { junit 'int-results.xml' } }
                }
            }
        }

        stage('Deploy Staging') {
            agent { label 'k8s' }
            steps {
                sh "helm upgrade --install myapp ./charts/myapp --set image.tag=${GIT_COMMIT} -f values.staging.yaml"
                sh 'pytest tests/smoke --base-url https://staging.example.com'
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            input {
                message 'Deploy to production?'
                ok 'Yes, deploy now'
            }
            agent { label 'k8s' }
            steps {
                sh "helm upgrade --install myapp ./charts/myapp --set image.tag=${GIT_COMMIT} -f values.prod.yaml"
            }
        }
    }

    post {
        failure { slackSend channel: '#deploys', color: 'danger', message: "Pipeline failed: ${env.BUILD_URL}" }
        success { slackSend channel: '#deploys', color: 'good', message: "Deployed ${GIT_COMMIT[0..7]} to prod" }
    }
}
```

**Critical: `agent none` at top level.** Without this, the parent pipeline holds an executor while waiting for parallel children — classic deadlock (executor starvation).

**`parallel {}`** runs stages concurrently. Add `failFast true` inside `parallel` to abort siblings when one fails.

---

## Azure DevOps YAML Pipelines

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]
  paths:
    exclude: [docs/**, '*.md']

variables:
  imageTag: $(Build.SourceVersion)

stages:
  - stage: Build
    displayName: 'Build & Test'
    jobs:
      - job: BuildTest
        pool: { vmImage: 'ubuntu-latest' }
        steps:
          - script: |
              docker build -t $(containerRegistry)/myapp:$(imageTag) .
              docker push $(containerRegistry)/myapp:$(imageTag)
            displayName: 'Build and push image'
          - script: pytest tests/ --junitxml=results.xml
          - task: PublishTestResults@2
            inputs: { testResultsFiles: 'results.xml' }

  - stage: Staging
    dependsOn: Build
    displayName: 'Deploy to Staging'
    jobs:
      - deployment: DeployStaging
        pool: { vmImage: 'ubuntu-latest' }
        environment: staging           # environment tracks deployment history
        strategy:
          runOnce:
            deploy:
              steps:
                - script: |
                    helm upgrade --install myapp ./charts/myapp \
                      --set image.tag=$(imageTag) \
                      -f values.staging.yaml

  - stage: Production
    dependsOn: Staging
    condition: |
      and(
        succeeded(),
        eq(variables['Build.SourceBranch'], 'refs/heads/main')
      )
    displayName: 'Deploy to Production'
    jobs:
      - deployment: DeployProd
        pool: { vmImage: 'ubuntu-latest' }
        environment: production        # approval gates configured per environment in portal
        strategy:
          canary:
            increments: [10, 50, 100]  # 10% → 50% → 100% traffic
            deploy:
              steps:
                - script: |
                    helm upgrade --install myapp ./charts/myapp \
                      --set image.tag=$(imageTag) \
                      -f values.prod.yaml
```

**Azure DevOps hierarchy:** Pipeline → Stages → Jobs → Steps → Tasks.

**`environment` objects** in Azure DevOps track deployment history and host approval policies. A production environment can require specific reviewers, a business-hours window, or a linked work item before a deployment proceeds.

**`dependsOn`** creates DAG-style stage dependencies. `condition` controls whether a stage runs.

---

## DORA Metrics

The four metrics from Google's DevOps Research and Assessment (DORA) programme. The empirical foundation of modern delivery performance measurement.

| Metric | What It Measures | Elite | High | Medium | Low |
|---|---|---|---|---|---|
| **Deployment Frequency** | How often you deploy to prod | Multiple/day | Daily–weekly | Weekly–monthly | < Monthly |
| **Lead Time for Changes** | Commit → running in prod | < 1 hour | 1 day–1 week | 1 week–1 month | > 1 month |
| **Change Failure Rate** | % of deploys causing incidents | 0–15% | 16–30% | 16–30% | > 30% |
| **MTTR (Mean Time to Restore)** | Time to recover from incident | < 1 hour | < 1 day | 1 day–1 week | > 1 week |

```python
# Automated DORA tracking — calculate lead time
from datetime import datetime
import subprocess

def lead_time_for_change(commit_sha: str) -> float:
    """Time in hours from commit to production deploy."""
    # Get commit timestamp
    commit_ts = subprocess.check_output(
        ["git", "show", "-s", "--format=%ct", commit_sha]
    ).decode().strip()
    commit_dt = datetime.fromtimestamp(int(commit_ts))

    # Production deploy timestamp comes from your CD system (Argo, Helm, etc.)
    # Here we read it from a deploy log or annotation
    deploy_dt = get_prod_deploy_time(commit_sha)  # from your CD system

    return (deploy_dt - commit_dt).total_seconds() / 3600
```

Jenkins ships a DORA Metrics plugin (v2.8.1+) for automated collection. Datadog and Grafana both have DORA dashboards.

---

## Trunk-Based Development

The branching strategy that enables high deployment frequency.

**Trunk-based:** All developers commit to `main` (the trunk) at least daily. Feature branches live for < 1 day. Feature flags control whether new code is active in production.

**Gitflow:** Long-lived `develop`, `release`, and `feature` branches. Merging is expensive; integration delays are common. Slower but used in regulated industries requiring release sign-off.

```
Trunk-based: feature-flag controls visibility, code always ships to prod
Gitflow:     release branch accumulates changes, ships on a fixed cycle
```

Feature flags are the enabler: incomplete features can land in `main` behind a flag, keeping the trunk green while development continues. See [[cs-fundamentals/feature-flags]].

---

## Environment Promotion Pattern

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌────────────┐
│  Build  │───▶│   Dev   │───▶│ Staging  │───▶│ Production │
└─────────┘    └─────────┘    └──────────┘    └────────────┘
  sha-abc123    auto-deploy    auto-deploy    approval gate
  pushed to      on merge       on merge        + canary
  registry        to main       to main
```

Same image (`sha-abc123`) at every stage. Environment-specific config via Helm values files or Kubernetes Secrets — never baked in.

---

## Pipeline Quality Gates

| Gate | Check | Action on Fail |
|---|---|---|
| Pre-commit | Lint, type check, secret scan | Block commit |
| PR | Unit tests, linting, coverage | Block merge |
| Post-merge | Integration tests, full test suite | Alert on-call, block staging deploy |
| Staging | E2E, performance baseline | Block prod deploy |
| Production | Smoke tests, synthetic monitoring | Rollback |

See [[technical-qa/ci-cd-quality-gates]] for the full implementation with YAML examples.

---

## Key Facts

- Jenkins declarative: `agent none` at top level prevents executor starvation in parallel pipelines
- Azure DevOps: `environment` objects carry approval gates and deployment history
- DORA elite: deploy multiple times/day, lead time < 1 hour, MTTR < 1 hour
- Trunk-based development is the branching strategy that enables high deployment frequency
- Build once, promote everywhere — never rebuild per environment

---

## Connections

- [[cloud/github-actions]] — GitHub-native CI/CD with OIDC and matrix strategies
- [[cloud/argocd]] — GitOps continuous delivery; ArgoCD syncs cluster state with Git
- [[cloud/gitops-patterns]] — Flux vs ArgoCD; reconciliation-based delivery
- [[cloud/blue-green-deployment]] — deployment strategies: canary, blue-green, rolling
- [[cloud/docker]] — building the artefact that pipelines promote
- [[cloud/kubernetes]] — the deployment target for most modern pipelines
- [[cs-fundamentals/feature-flags]] — trunk-based development enabler; features hidden behind flags until ready
- [[cloud/platform-engineering]] — DORA metrics and the SPACE framework for developer productivity
- [[technical-qa/ci-cd-quality-gates]] — gate taxonomy and full pipeline YAML implementation
- [[cloud/github-actions]] — specific GitHub Actions patterns (OIDC, caching, reusable workflows)

## Open Questions

- When does Azure DevOps outperform GitHub Actions for enterprise teams? (Compliance controls? Legacy integration?)
- At what team size does trunk-based development become harder to enforce than Gitflow?
- How do DORA metrics change for LLM-based services where deployment includes model version changes?
