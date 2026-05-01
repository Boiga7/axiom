---
type: concept
category: cloud
para: resource
tags: [aws, api-gateway, rest-api, http-api, websocket, serverless]
sources: []
updated: 2026-05-01
---

# AWS API Gateway

Fully managed API layer. Routes HTTP requests to Lambda, ECS, EC2, or any HTTP backend. Three flavours: REST API (feature-rich, expensive), HTTP API (80% cheaper, modern), WebSocket API (persistent connections).

---

## REST API vs HTTP API

| | REST API | HTTP API |
|--|--|--|
| Cost | $3.50/million | $1.00/million |
| Latency | ~6ms | ~1ms |
| Auth | IAM, Cognito, Lambda authoriser, API keys | IAM, JWT, Lambda authoriser |
| Request validation | Built-in | Manual |
| Caching | Yes | No |
| Usage plans + throttling | Yes | Basic |
| WebSocket | No | No |

**Choose HTTP API** for new projects unless you specifically need request validation, caching, or usage plans.

---

## HTTP API with Lambda Integration

```bash
# Create HTTP API
API_ID=$(aws apigatewayv2 create-api \
  --name my-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins='["https://myapp.com"]',AllowMethods='["GET","POST"]',AllowHeaders='["Content-Type","Authorization"]' \
  --query 'ApiId' --output text)

# Lambda integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:eu-west-1:123456789:function:my-api \
  --payload-format-version 2.0 \
  --query 'IntegrationId' --output text)

# Route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key 'ANY /{proxy+}' \
  --target "integrations/$INTEGRATION_ID"

# Deploy
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name production \
  --auto-deploy
```

---

## Lambda Handler — HTTP API v2 Payload Format

```python
def handler(event, context):
    # HTTP API v2 event structure
    method = event["requestContext"]["http"]["method"]
    path = event["requestContext"]["http"]["path"]
    query = event.get("queryStringParameters", {}) or {}
    headers = event.get("headers", {})
    body = event.get("body", "")

    # Auth from JWT authoriser
    claims = event["requestContext"].get("authorizer", {}).get("jwt", {}).get("claims", {})
    user_id = claims.get("sub")

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"userId": user_id, "path": path})
    }
```

---

## JWT Authoriser

Validates JWT tokens from Cognito, Auth0, or any OIDC provider — without Lambda code.

```bash
aws apigatewayv2 create-authorizer \
  --api-id $API_ID \
  --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --name jwt-authoriser \
  --jwt-configuration \
    Audience=["my-client-id"],\
    Issuer="https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_XXXXX"
```

---

## Custom Domain

```bash
# Create custom domain
aws apigatewayv2 create-domain-name \
  --domain-name api.example.com \
  --domain-name-configurations \
    CertificateArn=arn:aws:acm:eu-west-1:123456789:certificate/xxx,EndpointType=REGIONAL

# Map to API stage
aws apigatewayv2 create-api-mapping \
  --domain-name api.example.com \
  --api-id $API_ID \
  --stage production
```

Point your DNS CNAME to the ApiGatewayDomainName from the domain creation output.

---

## Throttling and Usage Plans (REST API)

```bash
# Create usage plan: 10,000 req/day, 100 req/second burst
aws apigateway create-usage-plan \
  --name standard-plan \
  --throttle burstLimit=100,rateLimit=50 \
  --quota limit=10000,period=DAY

# Create API key and link to plan
KEY_ID=$(aws apigateway create-api-key --name my-key --enabled --query 'id' --output text)
aws apigateway create-usage-plan-key --usage-plan-id $PLAN_ID --key-id $KEY_ID --key-type API_KEY
```

---

## WebSocket API

Persistent bidirectional connections. Lambda handles `$connect`, `$disconnect`, and `$default` (message) routes.

```python
# WebSocket Lambda handler
import boto3

def handler(event, context):
    route = event["requestContext"]["routeKey"]
    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    if route == "$connect":
        # Store connection_id in DynamoDB
        save_connection(connection_id)

    elif route == "$disconnect":
        remove_connection(connection_id)

    elif route == "$default":
        # Send message back to client
        apigw = boto3.client("apigatewaymanagementapi",
            endpoint_url=f"https://{domain}/{stage}")
        apigw.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps({"message": "received"}).encode()
        )

    return {"statusCode": 200}
```

---

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-lambda-patterns]] · [[cloud/secrets-management]] · [[cloud/cloud-monitoring]]
