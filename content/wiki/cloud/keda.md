---
type: concept
category: cloud
para: resource
tags: [keda, kubernetes, autoscaling, kafka, sqs, event-driven]
sources: []
updated: 2026-05-01
tldr: KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA to scale workloads based on external event sources — Kafka consumer lag, SQS queue depth, Prometheus metrics, Redis list length, and 6...
---

# KEDA — Kubernetes Event-Driven Autoscaling

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA to scale workloads based on external event sources. Kafka consumer lag, SQS queue depth, Prometheus metrics, Redis list length, and 60+ other scalers.

---

## Why KEDA

Standard HPA scales on CPU and memory. KEDA scales on what actually matters for queue-driven workloads:
- Kafka consumer group lag → scale up processors when messages pile up
- SQS queue depth → scale workers when jobs accumulate
- Prometheus metric → scale on business metrics (orders per minute)
- Scale to zero — no events, zero pods (true serverless on Kubernetes)

---

## Install

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set prometheus.metricServer.enabled=true
```

---

## ScaledObject — Core Resource

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor          # Deployment to scale
  minReplicaCount: 0               # scale to zero when idle
  maxReplicaCount: 50
  pollingInterval: 15              # check scaler every 15s
  cooldownPeriod: 300              # wait 5m before scaling down
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.messaging.svc:9092
      consumerGroup: order-processors
      topic: orders
      lagThreshold: "100"          # one replica per 100 messages of lag
      offsetResetPolicy: latest
```

---

## SQS Scaler

```yaml
triggers:
- type: aws-sqs-queue
  authenticationRef:
    name: keda-aws-credentials
  metadata:
    queueURL: https://sqs.eu-west-1.amazonaws.com/123456789/orders
    queueLength: "50"              # scale up when > 50 messages
    awsRegion: eu-west-1
    scaleOnInFlight: "true"        # count in-flight messages too
```

```yaml
# TriggerAuthentication using IRSA (no hardcoded credentials)
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-aws-credentials
  namespace: production
spec:
  podIdentity:
    provider: aws-eks              # use pod's IAM role (IRSA)
```

---

## Prometheus Scaler

```yaml
triggers:
- type: prometheus
  metadata:
    serverAddress: http://prometheus.monitoring.svc:9090
    metricName: orders_per_second
    threshold: "10"                # one replica per 10 orders/second
    query: sum(rate(http_requests_total{job="order-service"}[2m]))
```

---

## Redis Scaler (list/stream)

```yaml
triggers:
- type: redis
  authenticationRef:
    name: redis-auth
  metadata:
    address: redis.cache.svc:6379
    listName: job-queue
    listLength: "20"               # scale when list has > 20 items
```

---

## ScaledJob — for batch workloads

Scale Kubernetes Jobs (not Deployments) for batch processing. Each SQS message gets its own Job.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: image-resizer
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: resizer
          image: myregistry/image-resizer:latest
        restartPolicy: Never
  maxReplicaCount: 100
  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: keda-aws-credentials
    metadata:
      queueURL: https://sqs.eu-west-1.amazonaws.com/123456789/image-jobs
      queueLength: "1"             # one job per message
      awsRegion: eu-west-1
```

---

## Scale-to-Zero Considerations

- Pods at zero = cold start on first event (image pull + init time)
- Use `minReplicaCount: 1` if cold start latency is unacceptable
- Combine with Karpenter or Cluster Autoscaler — scaling pods and nodes

---

## Common Failure Cases

**ScaledObject created but HPA is not scaling — stuck at zero or minReplicas**
Why: KEDA creates the HPA successfully but the metrics adapter cannot reach the external scaler endpoint (e.g., Kafka broker unreachable, wrong bootstrap server, auth misconfigured).
Detect: `kubectl describe hpa <name>` shows `unable to get external metric`; `kubectl logs -n keda deployment/keda-operator` shows connection refused or auth errors.
Fix: verify the scaler endpoint is reachable from within the cluster (`kubectl exec` into a pod and test connectivity), and confirm the TriggerAuthentication secret contains the correct credentials.

**Scale-to-zero causes thundering herd when traffic returns**
Why: with `minReplicaCount: 0` the first batch of events must wait for pod cold start (image pull + init) before being processed, and if the queue filled up during idle time all events arrive simultaneously.
Detect: queue depth spikes to a large value after a quiet period; consumer lag metric shows a sudden large value before any pods are running.
Fix: set `minReplicaCount: 1` for latency-sensitive workloads, or pre-warm by setting `cooldownPeriod` high enough to keep at least one warm pod through expected idle periods.

**IRSA credentials on KEDA operator fail after cluster upgrade**
Why: the KEDA operator pod was not restarted after the IRSA token was refreshed following a node group rotation, and the mounted token has expired.
Detect: SQS or DynamoDB scaler logs show `ExpiredTokenException` or `InvalidClientTokenId`.
Fix: restart the KEDA operator pod to force a fresh token mount: `kubectl rollout restart deployment/keda-operator -n keda`.

**Kafka scaler reports zero lag but consumers are actually behind**
Why: `offsetResetPolicy: latest` combined with a consumer group that has never committed an offset causes KEDA to compute lag against the latest offset rather than the committed position, reporting zero lag.
Detect: Kafka consumer group `kafka-consumer-groups.sh --describe` shows `CURRENT-OFFSET = -` (no committed offset) while the partition `LOG-END-OFFSET` is much higher.
Fix: change `offsetResetPolicy` to `earliest` for new consumer groups, or ensure the consumer group commits an initial offset before KEDA begins evaluating lag.

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/aws-sqs-sns]] · [[cloud/cloud-monitoring]] · [[cloud/kubernetes-operators]] · [[llms/ae-hub]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
