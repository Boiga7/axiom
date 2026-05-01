---
type: concept
category: technical-qa
para: resource
tags: [wiremock, service-virtualisation, stubs, mocking, api-testing]
sources: []
updated: 2026-05-01
---

# WireMock

Service virtualisation tool — stubbing HTTP dependencies so you can test your service without running real downstream services. Available as a Java library, standalone server, and Docker image.

---

## Why Service Virtualisation

```
Without stubs:
  - External APIs have rate limits, cost money, and go down
  - Third-party services don't have test environments
  - Integration tests are slow and non-deterministic
  - You can't simulate specific error conditions easily

With WireMock:
  - Test 500s, timeouts, slow responses without a real server
  - Tests run in milliseconds, not seconds
  - CI doesn't need network access to external services
  - Replay real API responses captured from production
```

---

## WireMock in Python Tests (requests-mock / wiremock-python)

```python
# Option 1: requests-mock (simpler, in-process)
import requests
import requests_mock

def test_product_service_handles_api_error():
    with requests_mock.Mocker() as m:
        m.get("https://api.example.com/products/123", status_code=503, json={"error": "Service unavailable"})

        result = product_service.get_product(123)   # calls external API internally

        assert result.status == "unavailable"
        assert result.fallback_data is not None

def test_product_service_retries_on_500():
    with requests_mock.Mocker() as m:
        # First call: 500, second call: 200
        m.get(
            "https://api.example.com/products/123",
            [
                {"status_code": 500, "json": {"error": "Internal error"}},
                {"status_code": 200, "json": {"id": 123, "name": "Widget"}},
            ]
        )

        result = product_service.get_product(123)

        assert m.call_count == 2    # verify retry happened
        assert result.name == "Widget"
```

---

## WireMock Standalone (Docker)

```yaml
# docker-compose.yaml
wiremock:
  image: wiremock/wiremock:3.5.4
  ports:
  - "8080:8080"
  volumes:
  - ./wiremock:/home/wiremock
  command: --port 8080 --verbose
```

```
wiremock/
  mappings/
    products.json
  __files/
    products-response.json
```

```json
// wiremock/mappings/products.json
{
  "mappings": [
    {
      "request": {
        "method": "GET",
        "urlPathPattern": "/api/products/[0-9]+"
      },
      "response": {
        "status": 200,
        "headers": {"Content-Type": "application/json"},
        "bodyFileName": "products-response.json",
        "fixedDelayMilliseconds": 50
      }
    },
    {
      "request": {
        "method": "POST",
        "url": "/api/orders",
        "bodyPatterns": [
          {"matchesJsonPath": "$.items[?(@.quantity > 0)]"}
        ]
      },
      "response": {
        "status": 201,
        "jsonBody": {
          "orderId": "{{randomValue type='UUID'}}",
          "status": "created",
          "createdAt": "{{now}}"
        },
        "transformers": ["response-template"]
      }
    }
  ]
}
```

---

## WireMock Admin API

```bash
# Register stub at runtime
curl -X POST http://localhost:8080/__admin/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "request": {"method": "GET", "url": "/api/health"},
    "response": {"status": 503, "body": "Service Unavailable"}
  }'

# Verify requests were made
curl http://localhost:8080/__admin/requests

# Reset all stubs
curl -X DELETE http://localhost:8080/__admin/mappings

# Reset request journal
curl -X DELETE http://localhost:8080/__admin/requests
```

---

## Stateful Scenarios

Simulate stateful workflows (e.g., order goes pending → processing → shipped):

```json
{
  "mappings": [
    {
      "scenarioName": "OrderLifecycle",
      "requiredScenarioState": "Started",
      "request": {"method": "GET", "url": "/api/orders/1"},
      "response": {"status": 200, "jsonBody": {"status": "pending"}},
      "newScenarioState": "Processing"
    },
    {
      "scenarioName": "OrderLifecycle",
      "requiredScenarioState": "Processing",
      "request": {"method": "GET", "url": "/api/orders/1"},
      "response": {"status": 200, "jsonBody": {"status": "processing"}},
      "newScenarioState": "Shipped"
    },
    {
      "scenarioName": "OrderLifecycle",
      "requiredScenarioState": "Shipped",
      "request": {"method": "GET", "url": "/api/orders/1"},
      "response": {"status": 200, "jsonBody": {"status": "shipped"}}
    }
  ]
}
```

---

## Recording Real API Responses

```bash
# Run WireMock in record mode to capture real API responses
docker run wiremock/wiremock:3.5.4 \
  --proxy-all "https://api.realservice.com" \
  --record-mappings \
  --port 8080

# Your app calls localhost:8080 instead of api.realservice.com
# WireMock records all requests/responses as stub files
# Later: replay mode — no real API needed
```

---

## Connections
[[tqa-hub]] · [[technical-qa/contract-testing]] · [[technical-qa/api-testing]] · [[technical-qa/testcontainers]] · [[qa/test-environments]]
