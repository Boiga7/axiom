---
type: synthesis
category: synthesis
para: resource
tags: [debugging, autoscaling, kubernetes, keda, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing autoscalers that fail to scale up under load or scale down after load drops.
---

# Debug: Scaling Not Triggering

**Symptom:** Load is high but new pods or instances are not being created. Or load has dropped but resources are not scaling down, wasting money.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| HPA not scaling up under load | Metrics server not running, wrong metric name, or target too high |
| Cluster autoscaler not adding nodes | All node groups at max, or pod has unschedulable resource request |
| KEDA not scaling from queue | Scaler misconfigured, wrong queue name, or credentials expired |
| Scale-up works but scale-down does not | Scale-down stabilisation window too long, or PodDisruptionBudget blocking drain |
| Scaling lags too far behind demand | Cooldown period too long, or metric evaluation interval too slow |

---

## Likely Causes (ranked by frequency)

1. Metrics server not running — HPA cannot read CPU/memory metrics
2. Target utilisation set too high — HPA only triggers at 90%+ when load is already critical
3. Node group max capacity reached — cluster autoscaler cannot add nodes
4. Resource requests not set — HPA cannot calculate utilisation without requests defined
5. KEDA credentials expired — queue scaler cannot authenticate to read queue depth

---

## First Checks (fastest signal first)

- [ ] Check HPA status — `kubectl describe hpa <name>` shows current metrics and why it is or is not scaling
- [ ] Check metrics server — `kubectl top pods` must return values; if it errors, HPA cannot function
- [ ] Check node group capacity — `kubectl describe nodes` shows allocatable vs allocated; cluster autoscaler will not add beyond max
- [ ] Confirm resource requests are set on the deployment — HPA CPU utilisation is calculated against requests, not actual usage
- [ ] For KEDA: check the ScaledObject status and scaler logs for authentication or connectivity errors

**Signal example:** HPA not scaling despite 80% CPU — `kubectl describe hpa` shows `unable to fetch metrics: no metrics returned from custom-metrics-apiserver`; metrics server is running but HPA is configured to use a custom metric from Prometheus that is not reachable.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| HPA and metrics server configuration | [[cloud/kubernetes]] |
| KEDA event-driven autoscaling | [[cloud/keda]] |
| Cluster autoscaler and node groups | [[cloud/aws-eks]] |
| PodDisruptionBudget blocking scale-down | [[cloud/kubernetes]] |
| Cost impact of over-provisioning | [[cloud/finops-cost-management]] |

---

## Fix Patterns

- Set resource requests on every deployment — HPA is blind without them; set requests at p50 actual usage
- Lower HPA target utilisation to 60-70% — leaves headroom before saturation; at 90% you are already degraded by the time scaling starts
- Set cluster autoscaler max to match your load test peak plus 20% buffer — not too low to block scaling, not unlimited
- Add scale-down stabilisation window of 5-10 minutes — prevents flapping but does not block legitimate scale-down
- Test autoscaling explicitly — run a load test and watch `kubectl get hpa -w` in real time

---

## When This Is Not the Issue

If autoscaling is triggering correctly but the system is still degraded during scale-up:

- Scale-up is too slow — pods take too long to become ready; improve startup time or pre-warm a minimum replica count
- The bottleneck is not the scaled resource — check whether the database or a downstream service is the constraint

Pivot to [[synthesis/debug-api-timeout]] if the degradation during scale-up looks like a timeout or connection pool problem in the downstream layer.

---

## Connections

[[cloud/kubernetes]] · [[cloud/keda]] · [[cloud/aws-eks]] · [[cloud/finops-cost-management]] · [[synthesis/debug-api-timeout]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
