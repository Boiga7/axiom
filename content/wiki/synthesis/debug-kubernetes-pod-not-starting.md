---
type: synthesis
category: synthesis
para: resource
tags: [debugging, kubernetes, pod, crashloopbackoff, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing pods stuck in Pending, CrashLoopBackOff, or ImagePullBackOff.
---

# Debug: Kubernetes Pod Not Starting

**Symptom:** Pod stuck in Pending, CrashLoopBackOff, ImagePullBackOff, or OOMKilled. Deployment not rolling out.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| `Pending` indefinitely | No node has enough CPU/memory, or no matching node selector |
| `ImagePullBackOff` | Registry credentials missing or image tag does not exist |
| `CrashLoopBackOff` | Container starts then exits — app crash or bad config |
| `OOMKilled` | Memory limit too low for the workload |
| `Init container` stuck | Init container failing — dependency not ready |

---

## Likely Causes (ranked by frequency)

1. Image tag does not exist or registry credentials expired
2. App crashes on startup — missing env var, bad config, failed DB connection
3. Insufficient cluster resources — no node can satisfy the resource request
4. Memory limit too low — container killed before it can serve traffic
5. Liveness probe misconfigured — kills a slow-starting container repeatedly

---

## First Checks (fastest signal first)

- [ ] Run `kubectl describe pod <name>` — read the Events section at the bottom for the exact failure reason
- [ ] Run `kubectl logs <pod> --previous` — get the crash log from the last failed container
- [ ] Check image tag exists in the registry — `ImagePullBackOff` is almost always a bad tag or missing credentials
- [ ] Run `kubectl get events --sort-by=.lastTimestamp` — see what happened across the namespace
- [ ] Check resource requests vs node capacity — `kubectl describe nodes` shows allocatable vs allocated

**Signal example:** Pod in `CrashLoopBackOff`, logs show `KeyError: DATABASE_URL` — environment variable not injected into the deployment spec, app crashes on first import.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Registry credentials or image not found | [[cloud/container-security]] |
| Resource limits and requests | [[cloud/kubernetes]] |
| Liveness and readiness probe config | [[cloud/kubernetes]] |
| Secrets and env vars not injected | [[cloud/secrets-management]] |
| Node capacity and autoscaler | [[cloud/aws-eks]] |

---

## Fix Patterns

- Always check `kubectl describe pod` first — the Events section tells you exactly what failed
- For `CrashLoopBackOff`: fix the app crash before adjusting probe timings — do not mask the real error
- For `OOMKilled`: increase memory limit only after profiling actual usage — `kubectl top pod`
- Add `initialDelaySeconds` to liveness probe for slow-starting apps — do not let Kubernetes kill a healthy slow starter
- Use `imagePullPolicy: Always` in dev, `IfNotPresent` in prod with immutable tags

---

## When This Is Not the Issue

If the pod starts successfully but immediately goes unhealthy:

- The pod is starting but failing health checks — readiness probe is too strict or hitting the wrong path
- The service is running but not reachable — check service selector matches pod labels

Pivot to [[cloud/cloud-networking]] to verify service-to-pod routing and DNS resolution within the cluster.

---

## Connections

[[cloud/kubernetes]] · [[cloud/aws-eks]] · [[cloud/secrets-management]] · [[cloud/container-security]] · [[cloud/cloud-networking]]
