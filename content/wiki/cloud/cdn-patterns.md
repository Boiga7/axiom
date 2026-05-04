---
type: concept
category: cloud
para: resource
tags: [cdn, cloudfront, edge, caching, cache-invalidation, performance]
sources: []
updated: 2026-05-01
tldr: "Content delivery networks and edge computing: moving content and computation closer to users to reduce latency and origin load. Critical for global applications."
---

# CDN and Edge Patterns

Content delivery networks and edge computing: moving content and computation closer to users to reduce latency and origin load. Critical for global applications.

---

## CDN Fundamentals

```
CDN = network of Points of Presence (PoPs) caching content close to users

Cache hit: user request served from PoP — no origin roundtrip
Cache miss: PoP fetches from origin, caches for next request

Hit rate target: > 80% for static assets, > 50% for API responses
  Below 80% static: caching config problem
  Below 50% API: consider whether CDN adds value

Metrics:
  TTFB (Time to First Byte):       < 100ms at edge (vs 200-500ms from origin)
  Cache hit ratio:                  from CDN analytics
  Bandwidth saved:                  origin egress vs CDN egress
  Error rate at edge:               CDN errors vs origin errors
```

---

## CloudFront Configuration

```python
# infra/cloudfront.py — CDK Python
from aws_cdk import aws_cloudfront as cf, aws_cloudfront_origins as origins, aws_s3 as s3

class CloudFrontStack(Stack):
    def __init__(self, scope, id, **kwargs):
        super().__init__(scope, id, **kwargs)

        # S3 bucket for static assets
        bucket = s3.Bucket(self, "AssetsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )

        # Cache policies
        static_policy = cf.CachePolicy(self, "StaticPolicy",
            default_ttl=Duration.days(365),
            min_ttl=Duration.days(1),
            max_ttl=Duration.days(365),
            enable_accept_encoding_brotli=True,
            enable_accept_encoding_gzip=True,
            cache_key_parameters=cf.CachePolicyProps.DEFAULT,
        )

        api_policy = cf.CachePolicy(self, "ApiPolicy",
            default_ttl=Duration.seconds(60),
            min_ttl=Duration.seconds(0),
            max_ttl=Duration.seconds(300),
            enable_accept_encoding_gzip=True,
            # Cache key includes Authorization header for per-user caching
            header_behavior=cf.CacheHeaderBehavior.allow_list("Authorization"),
        )

        distribution = cf.Distribution(self, "Distribution",
            default_behavior=cf.BehaviorOptions(
                origin=origins.S3BucketOrigin(bucket),
                viewer_protocol_policy=cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=static_policy,
                compress=True,
            ),
            additional_behaviors={
                "/api/*": cf.BehaviorOptions(
                    origin=origins.HttpOrigin("api.myapp.com"),
                    cache_policy=api_policy,
                    origin_request_policy=cf.OriginRequestPolicy.ALL_VIEWER,
                    allowed_methods=cf.AllowedMethods.ALLOW_ALL,
                ),
            },
            price_class=cf.PriceClass.PRICE_CLASS_100,  # US + Europe PoPs
            enable_logging=True,
        )
```

---

## Cache-Control Headers

```python
# FastAPI — set cache headers on responses
from fastapi import Response
from datetime import timedelta

@app.get("/api/products")
async def list_products(response: Response):
    products = await get_products()
    # Cache at CDN for 60s, allow stale-while-revalidate for 30s
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=30"
    response.headers["Vary"] = "Accept-Encoding"  # separate cache per encoding
    return products

@app.get("/api/products/{id}")
async def get_product(id: str, response: Response):
    product = await fetch_product(id)
    # Products change rarely — cache 5 minutes
    response.headers["Cache-Control"] = "public, max-age=300, stale-if-error=3600"
    response.headers["ETag"] = f'"{product.version}"'  # conditional requests
    return product

@app.get("/api/user/profile")
async def get_profile(response: Response):
    # Private — never cache at CDN
    response.headers["Cache-Control"] = "private, no-store"
    return current_user_profile()

# Static assets — long TTL, cache-bust via content hash in filename
# /static/app.abc123.js → Cache-Control: public, max-age=31536000, immutable
```

---

## Cache Invalidation

```python
import boto3

cloudfront = boto3.client("cloudfront")

def invalidate_product_cache(product_id: str):
    """Call when a product is updated — bust CDN cache immediately."""
    cloudfront.create_invalidation(
        DistributionId="E1234567890ABC",
        InvalidationBatch={
            "Paths": {
                "Quantity": 2,
                "Items": [
                    f"/api/products/{product_id}",
                    "/api/products",           # list endpoint too
                ],
            },
            "CallerReference": str(uuid.uuid4()),
        },
    )

def invalidate_all():
    """Nuclear option — invalidate everything. Costs money + causes origin spike."""
    cloudfront.create_invalidation(
        DistributionId="E1234567890ABC",
        InvalidationBatch={
            "Paths": {"Quantity": 1, "Items": ["/*"]},
            "CallerReference": str(uuid.uuid4()),
        },
    )
```

---

## Edge Functions (CloudFront Functions / Lambda@Edge)

```javascript
// CloudFront Function — runs at every PoP, < 1ms execution
// Use case: URL rewrites, redirect rules, header manipulation (cheap)
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Rewrite /products/123 → /products/[id] for SPA routing
    if (uri.match(/^\/products\/[\w-]+$/)) {
        request.uri = '/index.html';
    }

    // Add security headers
    var response = event.response;
    if (response) {
        response.headers['strict-transport-security'] = {
            value: 'max-age=31536000; includeSubDomains'
        };
    }

    return request;
}
```

```python
# Lambda@Edge — runs at regional PoPs, longer execution (up to 5s for origin request)
# Use case: auth at edge, A/B testing, personalisation, image resizing
def origin_request_handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    headers = request["headers"]

    # Verify JWT at edge — reject before hitting origin
    auth_header = headers.get("authorization", [{}])[0].get("value", "")
    token = auth_header.replace("Bearer ", "")

    if not verify_jwt(token):
        return {
            "status": "401",
            "statusDescription": "Unauthorized",
            "body": '{"error": "Invalid token"}',
            "headers": {"content-type": [{"value": "application/json"}]},
        }

    return request  # allow request to proceed to origin
```

---

## Image Optimisation at CDN

```
CloudFront + Lambda@Edge (or Cloudflare Images / imgix):
  - Resize to requested dimensions (avoid serving 4K image for a thumbnail)
  - Convert to WebP/AVIF automatically (modern browsers)
  - Compress appropriately (not all PNGs are worth PNG)

URL pattern:
  /images/product-123.jpg?w=400&h=400&format=webp&quality=80

Next.js Image component:
  - Handles optimisation automatically via /_next/image route
  - Works with Vercel CDN or self-hosted sharp library
```

---

## Common Failure Cases

**Stale content served after a deployment due to missing cache invalidation**
Why: Static assets cached at edge with long TTLs (days/years) continue to be served from PoPs even after a new deploy replaces the origin files.
Detect: Users on first visit (cache miss) see new content; returning users or users at different PoPs see old content; compare `x-cache` header (HIT vs MISS) across requests.
Fix: Use content-hash-based filenames (`app.abc123.js`) for immutable assets so URLs change on each deploy; for non-hashed URLs, trigger a CloudFront invalidation as part of the deploy pipeline.

**Authorization header included in cache key causing private responses to leak across users**
Why: The CloudFront cache policy includes the `Authorization` header in the cache key so per-user responses can be cached, but a misconfiguration omits it, causing user A's response to be served to user B.
Detect: Users intermittently see data belonging to another user; check CloudFront access logs for the same `x-cache: Hit` response served to multiple distinct users.
Fix: Set `Cache-Control: private, no-store` on any response that contains user-specific data; for user-specific cached responses, always include the `Authorization` (or a session-derived cache key) in the cache policy.

**Lambda@Edge function cold starts adding hundreds of milliseconds to every cache miss**
Why: Lambda@Edge functions in `origin-request` position run on a cold container when a PoP handles its first request after a period of inactivity, and cold start duration adds directly to TTFB.
Detect: p99 TTFB spikes to 500-800ms sporadically at low-traffic PoPs while p50 is fine; CloudWatch Lambda@Edge metrics show `Init Duration` on those invocations.
Fix: Use CloudFront Functions (sub-millisecond, no cold start) for header manipulation, redirects, and URL rewrites; reserve Lambda@Edge only for logic that genuinely requires its longer timeout or full runtime.

**Cache hit rate stays below 30% on API responses despite CDN being configured**
Why: Every request has a unique `Cache-Control: no-cache` header from the origin, or the cache key includes a query-string parameter that is unique per user (e.g., a timestamp or session token).
Detect: CloudFront analytics show `CacheHitRate` near zero for the `/api/*` behaviour; inspect the `Vary` and `Cache-Control` response headers from the origin.
Fix: Remove session-specific query parameters from CDN-facing requests (handle them in the app layer); set explicit `Cache-Control` headers with a TTL greater than zero for cacheable endpoints; normalise the cache key to exclude parameters irrelevant to the response.

## Connections
[[cloud-hub]] · [[cloud/cloud-networking]] · [[cloud/aws-core]] · [[cloud/finops-cost-management]] · [[cs-fundamentals/caching-strategies]] · [[cs-fundamentals/performance-optimisation-se]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
