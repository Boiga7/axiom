---
type: concept
category: cloud
para: resource
tags: [cloudwatch, monitoring, dashboards, synthetics, x-ray, alarms, slos]
sources: []
updated: 2026-05-01
tldr: CloudWatch, X-Ray, Synthetics, and SLO-driven alerting for AWS workloads.
---

# Infrastructure Monitoring on AWS

CloudWatch, X-Ray, Synthetics, and SLO-driven alerting for AWS workloads.

---

## CloudWatch Custom Metrics

```python
import boto3
from datetime import datetime

cloudwatch = boto3.client("cloudwatch")

def put_metric(namespace: str, metric_name: str, value: float,
               unit: str = "Count", dimensions: dict = None) -> None:
    cloudwatch.put_metric_data(
        Namespace=namespace,
        MetricData=[{
            "MetricName": metric_name,
            "Value": value,
            "Unit": unit,
            "Timestamp": datetime.utcnow(),
            "Dimensions": [
                {"Name": k, "Value": v}
                for k, v in (dimensions or {}).items()
            ],
        }],
    )

# Usage in application code
put_metric("MyApp/Orders", "OrderProcessingTime", 142.5,
           unit="Milliseconds", dimensions={"Environment": "prod"})
put_metric("MyApp/Orders", "OrdersPlaced", 1,
           dimensions={"Region": "eu-west-1"})
```

```python
# Embedded Metrics Format (EMF) — structured logs that auto-create metrics
import json

def log_emf(metric_name: str, value: float, unit: str = "Count") -> None:
    print(json.dumps({
        "_aws": {
            "Timestamp": int(datetime.utcnow().timestamp() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": "MyApp",
                "Dimensions": [["Environment"]],
                "Metrics": [{"Name": metric_name, "Unit": unit}],
            }],
        },
        "Environment": "prod",
        metric_name: value,
    }))

# Works in Lambda — zero SDK overhead, metrics created from log ingestion
log_emf("PaymentProcessed", 1)
log_emf("ProcessingLatencyMs", 95.3, unit="Milliseconds")
```

---

## CloudWatch Dashboards — CDK

```python
from aws_cdk import aws_cloudwatch as cw

dashboard = cw.Dashboard(self, "AppDashboard", dashboard_name="OrderService")

# Error rate widget
error_rate = cw.GraphWidget(
    title="Error Rate",
    left=[
        cw.Metric(
            namespace="AWS/ApiGateway",
            metric_name="5XXError",
            dimensions_map={"ApiName": "OrderAPI"},
            statistic="Sum",
            period=Duration.minutes(1),
            color=cw.Color.RED,
        )
    ],
    width=12, height=6,
)

# P99 latency
latency_p99 = cw.GraphWidget(
    title="P99 Latency",
    left=[
        cw.Metric(
            namespace="MyApp",
            metric_name="ProcessingLatencyMs",
            statistic="p99",
            period=Duration.minutes(5),
        )
    ],
    width=12, height=6,
)

dashboard.add_widgets(
    cw.Row(error_rate, latency_p99),
)
```

---

## Alarms with Anomaly Detection

```python
# Standard threshold alarm
cw.Alarm(self, "HighErrorRate",
    metric=cw.Metric(
        namespace="AWS/Lambda",
        metric_name="Errors",
        dimensions_map={"FunctionName": "order-processor"},
        statistic="Sum",
        period=Duration.minutes(5),
    ),
    threshold=10,
    evaluation_periods=2,
    comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarm_description="Lambda error rate high — check DLQ",
    treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
)

# Anomaly detection alarm (learns from historical pattern)
anomaly_detector = cw.CfnAnomalyDetector(self, "LatencyAnomalyDetector",
    namespace="MyApp",
    metric_name="ProcessingLatencyMs",
    stat="p99",
    dimensions=[cw.CfnAnomalyDetector.DimensionProperty(
        name="Environment", value="prod",
    )],
    configuration=cw.CfnAnomalyDetector.ConfigurationProperty(
        excluded_time_ranges=[],
        metric_time_zone="UTC",
    ),
)
```

---

## AWS X-Ray Distributed Tracing

```python
# Lambda + FastAPI with X-Ray auto-instrumentation
from aws_xray_sdk.core import xray_recorder, patch_all
from aws_xray_sdk.core.sampling.sampler import DefaultSampler

patch_all()  # patches boto3, requests, httpx, SQLAlchemy automatically

xray_recorder.configure(
    sampling=True,
    context_missing="LOG_ERROR",   # don't crash on missing context
    plugins=("EC2Plugin", "ECSPlugin"),
)

# Manual subsegment
@xray_recorder.capture("validate_order")
def validate_order(order: dict) -> bool:
    with xray_recorder.in_subsegment("schema_check") as subsegment:
        subsegment.put_annotation("order_id", order["id"])
        subsegment.put_metadata("order_payload", order)
        return "items" in order and len(order["items"]) > 0
```

```yaml
# Lambda function — X-Ray active tracing
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  OrderProcessor:
    Type: AWS::Serverless::Function
    Properties:
      Tracing: Active   # PassThrough = only sample if upstream sampled; Active = always sample
```

---

## CloudWatch Synthetics Canaries

```javascript
// canary.js — smoke-tests your production endpoints every 5 minutes
const synthetics = require("Synthetics");
const syntheticsLogger = require("SyntheticsLogger");

const apiCanaryBlueprint = async function () {
    const requestOptions = {
        hostname: "api.myapp.com",
        method: "GET",
        path: "/health/ready",
        port: 443,
        protocol: "https:",
    };

    const stepConfig = {
        continueOnStepFailure: false,
        includeRequestHeaders: true,
        includeResponseHeaders: true,
        includeResponseBody: true,
    };

    await synthetics.executeHttpStep(
        "VerifyAPIHealth",
        requestOptions,
        validateHealthResponse,
        stepConfig,
    );
};

const validateHealthResponse = async function (res) {
    if (res.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    const body = JSON.parse(res.body);
    if (body.status !== "healthy") {
        throw new Error(`Unhealthy: ${JSON.stringify(body)}`);
    }
    syntheticsLogger.info("Health check passed");
};

exports.handler = async () => {
    return await apiCanaryBlueprint();
};
```

```python
# CDK: create and schedule the canary
from aws_cdk import aws_synthetics as synthetics

canary = synthetics.Canary(self, "ApiHealthCanary",
    canary_name="api-health-check",
    schedule=synthetics.Schedule.rate(Duration.minutes(5)),
    test=synthetics.Test.custom(
        code=synthetics.Code.from_asset("canaries/"),
        handler="canary.handler",
    ),
    runtime=synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_6_2,
    environment_variables={"API_HOST": "api.myapp.com"},
)

# Alarm on canary failure
cw.Alarm(self, "CanaryAlarm",
    metric=canary.metric_failed(),
    threshold=1,
    evaluation_periods=1,
)
```

---

## SLO Tracking

```python
# Calculate and emit error budget metrics
import boto3

def calculate_and_emit_slo_metrics(service: str, window_minutes: int = 60) -> dict:
    cw = boto3.client("cloudwatch", region_name="eu-west-1")

    now = datetime.utcnow()
    start = now - timedelta(minutes=window_minutes)

    def get_sum(metric_name: str) -> float:
        response = cw.get_metric_statistics(
            Namespace="MyApp",
            MetricName=metric_name,
            Dimensions=[{"Name": "Service", "Value": service}],
            StartTime=start, EndTime=now,
            Period=window_minutes * 60,
            Statistics=["Sum"],
        )
        datapoints = response["Datapoints"]
        return datapoints[0]["Sum"] if datapoints else 0.0

    total_requests = get_sum("RequestsTotal")
    error_requests = get_sum("RequestErrors")

    if total_requests == 0:
        return {"availability": 1.0, "error_budget_remaining": 1.0}

    availability = 1 - (error_requests / total_requests)
    slo_target = 0.999  # 99.9% SLO
    error_budget_remaining = (availability - slo_target) / (1 - slo_target)

    # Emit back as custom metrics
    put_metric("MyApp/SLO", "Availability", availability * 100, unit="Percent",
               dimensions={"Service": service})
    put_metric("MyApp/SLO", "ErrorBudgetRemaining", error_budget_remaining * 100,
               unit="Percent", dimensions={"Service": service})

    return {"availability": availability, "error_budget_remaining": error_budget_remaining}
```

---

## Common Failure Cases

**Alarm fires but the SNS topic never delivers the notification**
Why: the SNS topic subscription was confirmed manually in one region but the alarm was created in a different region, or the subscription's filter policy silently drops the alarm notification payload.
Detect: CloudWatch shows the alarm entered ALARM state; SNS delivery status logs (if enabled) show no attempts or filtered-out messages.
Fix: enable SNS delivery status logging, confirm the subscription ARN is in the same region as the alarm, and verify the filter policy allows the alarm notification format.

**Anomaly detection alarm triggers constantly for the first two weeks**
Why: the anomaly detection model has insufficient historical data and the training band is too narrow, so normal daily variance breaches the band.
Detect: the alarm fires multiple times per day at predictable times with no corresponding real incident; the Anomaly Detection widget shows a very tight band.
Fix: set `evaluation_periods` to 3+ and configure `ExcludedTimeRanges` to exclude initial noisy training days, then wait 14 days for the model to stabilise before relying on the alarm.

**Synthetics canary succeeds locally but always fails in the scheduled run**
Why: the canary code references an environment variable or secret that exists in the local test context but was not passed via `environment_variables` in the Canary CDK resource.
Detect: `SyntheticsLogger` shows a missing environment variable error; the canary Python/Node runtime logs confirm the variable is undefined.
Fix: add the missing variable to the `environment_variables` map in the Canary construct and redeploy.

**EMF metrics never appear in CloudWatch despite logs being published**
Why: the Lambda function log group does not have the CloudWatch Logs metric filter enabled — EMF requires the log group to have `PutMetricData` permission, but more commonly the JSON is printed with extra non-JSON text before it, breaking the parser.
Detect: Lambda logs show the EMF JSON, but no custom metric appears under the declared namespace in CloudWatch.
Fix: ensure the EMF JSON is the only content on the printed line (no prefix text); use `json.dumps` directly without concatenation; verify the `_aws.CloudWatchMetrics` structure matches the documented EMF schema exactly.

## Connections

[[cloud-hub]] · [[cloud/cloud-monitoring]] · [[cloud/observability-stack]] · [[cloud/aws-lambda-patterns]] · [[cloud/production-monitoring-qa]] · [[cloud/serverless-patterns]] · [[llms/ae-hub]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
