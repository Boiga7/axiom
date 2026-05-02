---
type: concept
category: cloud
para: resource
tags: [sagemaker, ml-serving, endpoints, training-jobs, model-registry, batch-transform, mlops]
sources: []
updated: 2026-05-01
tldr: "Managed ML platform: training, model registry, real-time inference endpoints, and batch transform — the bridge between cloud engineering and AI engineering."
---

# AWS SageMaker

Managed ML platform: training, model registry, real-time inference endpoints, and batch transform. The bridge between cloud engineering and AI engineering.

---

## SageMaker vs Alternatives

```
SageMaker:
  - Managed training + inference + model registry in one platform
  - Tight AWS integration (S3, ECR, IAM, CloudWatch)
  - Supports any framework (PyTorch, TF, HuggingFace, XGBoost, custom Docker)
  - Cost: endpoint hours + training hours + storage

When to use SageMaker:
  - You're already on AWS and need managed ML infra
  - You need autoscaling inference endpoints without managing EC2
  - You need model versioning and A/B testing
  - You run batch predictions (batch transform)

When NOT to use SageMaker:
  - You're serving open-weight LLMs at scale → vLLM on ECS/EKS is cheaper
  - You need GPU inference under 100ms with full control → custom EC2/container
  - Your team doesn't know SageMaker (steep learning curve)
```

---

## Real-Time Inference Endpoint

```python
import boto3
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

# Deploy a HuggingFace model from Hub to a SageMaker endpoint
session = sagemaker.Session()
role = "arn:aws:iam::123456789:role/SageMakerExecutionRole"

# Model configuration
hub_model = HuggingFaceModel(
    model_data=None,            # pull directly from Hub (no S3 needed)
    env={
        "HF_MODEL_ID": "sentence-transformers/all-MiniLM-L6-v2",
        "HF_TASK": "feature-extraction",
    },
    role=role,
    transformers_version="4.37",
    pytorch_version="2.1",
    py_version="py310",
)

# Deploy to a real-time endpoint
predictor = hub_model.deploy(
    initial_instance_count=1,
    instance_type="ml.g4dn.xlarge",   # GPU instance for transformers
    endpoint_name="embedding-endpoint-prod",
)

# Invoke the endpoint
response = predictor.predict({
    "inputs": ["semantic search query", "document to embed"],
})
# Returns list of embeddings

# Clean up
predictor.delete_endpoint()
```

---

## Autoscaling Endpoints

```python
import boto3

sm_runtime = boto3.client("application-autoscaling")

# Register the endpoint variant as a scalable target
sm_runtime.register_scalable_target(
    ServiceNamespace="sagemaker",
    ResourceId="endpoint/embedding-endpoint-prod/variant/AllTraffic",
    ScalableDimension="sagemaker:variant:DesiredInstanceCount",
    MinCapacity=1,
    MaxCapacity=10,
)

# Scale on invocations per instance
sm_runtime.put_scaling_policy(
    PolicyName="invocations-scaling",
    ServiceNamespace="sagemaker",
    ResourceId="endpoint/embedding-endpoint-prod/variant/AllTraffic",
    ScalableDimension="sagemaker:variant:DesiredInstanceCount",
    PolicyType="TargetTrackingScaling",
    TargetTrackingScalingPolicyConfiguration={
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "SageMakerVariantInvocationsPerInstance",
        },
        "TargetValue": 1000,           # scale when > 1000 invocations/instance/min
        "ScaleInCooldown": 300,        # 5 min cooldown before scale-in
        "ScaleOutCooldown": 60,        # 1 min before scale-out
    },
)
```

---

## Batch Transform

```python
from sagemaker.sklearn import SKLearnModel
import boto3

# Batch transform: run inference on large datasets without a persistent endpoint
# Input: S3 bucket with CSV files. Output: S3 bucket with predictions.

s3 = boto3.client("s3")

model = SKLearnModel(
    model_data="s3://my-bucket/models/classifier.tar.gz",
    role=role,
    framework_version="1.2-1",
    py_version="py3",
    entry_point="inference.py",
)

transformer = model.transformer(
    instance_count=5,
    instance_type="ml.m5.xlarge",
    output_path="s3://my-bucket/predictions/",
    strategy="MultiRecord",           # batch multiple records per request
    assemble_with="Line",
    max_payload=6,                    # MB per batch
)

transformer.transform(
    data="s3://my-bucket/input-data/",
    content_type="text/csv",
    split_type="Line",
    wait=False,                       # async — poll status separately
)

# Poll for completion
import time
job_name = transformer.latest_transform_job.name
while True:
    status = boto3.client("sagemaker").describe_transform_job(
        TransformJobName=job_name
    )["TransformJobStatus"]
    if status in ("Completed", "Failed", "Stopped"):
        break
    time.sleep(30)
```

---

## Model Registry and A/B Testing

```python
import boto3

sm = boto3.client("sagemaker")

# Register a model version in the model registry
sm.create_model_package(
    ModelPackageGroupName="order-classifier",
    ModelPackageDescription="XGBoost order classifier v2.1.0",
    InferenceSpecification={
        "Containers": [{
            "Image": "123456789.dkr.ecr.eu-west-1.amazonaws.com/order-classifier:v2.1.0",
            "ModelDataUrl": "s3://my-bucket/models/order-classifier-v2.1.0.tar.gz",
        }],
        "SupportedContentTypes": ["text/csv"],
        "SupportedResponseMIMETypes": ["text/csv"],
    },
    ModelApprovalStatus="Approved",
)

# A/B test: send 10% of traffic to new model version
sm.update_endpoint(
    EndpointName="order-classifier-prod",
    EndpointConfigName="ab-test-config",
)

sm.create_endpoint_config(
    EndpointConfigName="ab-test-config",
    ProductionVariants=[
        {
            "VariantName": "ModelV1",
            "ModelName": "order-classifier-v1",
            "InitialVariantWeight": 90,      # 90% of traffic
            "InstanceType": "ml.m5.xlarge",
            "InitialInstanceCount": 1,
        },
        {
            "VariantName": "ModelV2",
            "ModelName": "order-classifier-v2",
            "InitialVariantWeight": 10,      # 10% of traffic
            "InstanceType": "ml.m5.xlarge",
            "InitialInstanceCount": 1,
        },
    ],
)
```

---

## SageMaker vs vLLM for LLMs

```
Use SageMaker when:
  - Model is < 7B parameters and managed inference beats self-hosting cost
  - You need out-of-box monitoring + model registry
  - Team is AWS-focused and doesn't want Kubernetes

Use vLLM on ECS/EKS when:
  - Serving 7B+ open models (Llama 3, Mistral) at scale
  - You need paged attention + continuous batching (vLLM's key advantage)
  - SageMaker container overhead is unacceptable for latency SLA < 100ms
  - Cost: vLLM on EC2 p4d is typically 40-60% cheaper than SageMaker for LLMs

Hybrid: SageMaker for model registry + endpoint management, ECS for the actual serving.
```

---

## Common Failure Cases

**Endpoint deployment fails with "ResourceLimitExceeded" for GPU instances**
Why: `ml.g4dn.xlarge` and similar GPU instance types have per-account service quota limits, and you've hit the limit across running endpoints and training jobs.
Detect: `create_endpoint` raises `ResourceLimitExceeded: An error occurred ... you have exceeded your service limit for instances of type ml.g4dn.xlarge`.
Fix: request a quota increase via AWS Service Quotas for the specific `ml.*` instance type; in the interim, use a smaller instance type or delete unused endpoints.

**Endpoint invocation returns 413 — payload too large**
Why: SageMaker real-time endpoints have a 6 MB payload limit per request; sending raw image bytes or large document batches inline exceeds this.
Detect: `botocore.exceptions.ClientError: An error occurred (413) ... Payload Too Large`.
Fix: for large inputs, upload to S3 and pass the S3 URI; for batch predictions, use Batch Transform instead of real-time endpoints.

**Autoscaling does not scale down — instances idle at minimum**
Why: `ScaleInCooldown` is set too long (e.g., 600s default) relative to traffic patterns, so the scale-in policy never fires during low-traffic windows.
Detect: CloudWatch `SageMakerVariantInvocationsPerInstance` is near zero but instance count stays at `MinCapacity` > 1; cost is higher than expected.
Fix: reduce `ScaleInCooldown` to match your off-peak window (e.g., 120-300s), and set `MinCapacity: 0` if you can tolerate the cold start latency of scaling from zero.

**Model container fails health check — endpoint never becomes `InService`**
Why: the custom inference container's `/ping` endpoint returns a non-200 status or takes longer than 60 seconds to respond during startup, causing SageMaker to mark it as unhealthy.
Detect: endpoint status stays `Creating` then transitions to `Failed`; CloudWatch `/aws/sagemaker/Endpoints` logs show health check timeouts.
Fix: ensure the container starts a web server on port 8080 that responds `200` to `GET /ping` within the startup window; the model weights should be loaded asynchronously or the health check should return 200 once the port is bound even before weights are loaded.

## Connections

[[cloud/cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-fargate]] · [[cloud/aws-eks]] · [[infra/inference-serving]] · [[llms/ae-hub]] · [[fine-tuning/frameworks]]
