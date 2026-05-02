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

Managed ML platform: training, model registry, real-time inference endpoints, and batch transform — the bridge between cloud engineering and AI engineering.

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

## Connections

[[cloud/cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-fargate]] · [[cloud/aws-eks]] · [[infra/inference-serving]] · [[llms/ae-hub]] · [[fine-tuning/frameworks]]
