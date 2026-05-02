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

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA to scale workloads based on external event sources — Kafka consumer lag, SQS queue depth, Prometheus metrics, Redis list length, and 60+ other scalers.

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

## Connections
[[cloud-hub]] · [[cloud/kubernetes]] · [[cloud/aws-sqs-sns]] · [[cloud/cloud-monitoring]] · [[cloud/kubernetes-operators]] · [[llms/ae-hub]]
