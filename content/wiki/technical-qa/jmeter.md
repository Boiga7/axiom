---
type: entity
category: technical-qa
tags: [jmeter, performance-testing, load-testing, java]
sources: []
updated: 2026-05-04
para: resource
tldr: Apache JMeter is the dominant open-source, protocol-agnostic Java load testing tool — the default choice when a client has existing .jmx infrastructure or needs non-HTTP protocol coverage (JDBC, JMS, LDAP).
---

# Apache JMeter

Apache JMeter is the dominant open-source performance testing tool in enterprise environments. Written in Java, it runs anywhere a JVM runs. It is protocol-agnostic: HTTP/HTTPS is the common case, but it also handles JDBC, JMS, LDAP, FTP, SMTP, and TCP out of the box. The GUI is for test design only; production load runs are headless on the CLI. Nearly every large-scale QA engagement has JMeter in the toolchain or as the incumbent that needs wrapping or replacing.

JMeter sits in a different positioning bracket from [[k6]]: JMeter is the choice when a client already has `.jmx` files and infrastructure, or when non-HTTP protocol coverage is needed. k6 is the choice for greenfield, code-first, developer-led pipelines. See the comparison section for the full decision framework.

See also: [[performance-testing]] for test type taxonomy and NFR acceptance criteria, [[load-testing-advanced]] for advanced load scenarios, [[api-performance-testing]] for API-specific latency and throughput patterns.

---

## Test Plan Structure

JMeter organises tests as a tree. The nesting order is not arbitrary — it defines both scope and execution order.

```
Test Plan
  └── Thread Group
        ├── Config Elements       (CSV Data Set, HTTP Request Defaults, Header Manager, Cookie Manager, Cache Manager)
        ├── Pre-Processors        (JSR223 Pre-Processor, User Parameters, BeanShell Pre-Processor)
        ├── Samplers              (HTTP Request, JDBC Request, WebSocket Sampler, TCP Sampler)
        │     └── Logic Controllers (Loop, If, While, Transaction, Throughput, Random Order)
        ├── Post-Processors       (JSON Extractor, Regex Extractor, CSS/JQuery Extractor, JSR223 Post-Processor)
        ├── Assertions            (Response Assertion, Duration Assertion, Size Assertion, JSON Assertion)
        ├── Timers                (Constant, Gaussian Random, Uniform Random, Constant Throughput)
        └── Listeners             (View Results Tree, Aggregate Report, Summary Report, Backend Listener)
```

**Test Plan** — root node. Sets global user-defined variables, classpath additions, whether thread groups run serially or in parallel, and the teardown thread group behaviour on shutdown.

**Thread Group** — one population of virtual users. Each thread runs the sampler chain sequentially, in order. One thread group per user journey is the recommended pattern: separate groups for `browse`, `checkout`, `admin` to model realistic concurrency ratios.

**Samplers** — the actual requests sent to the system under test. The HTTP Request sampler covers the vast majority of web and API testing.

**Config Elements** — applied before samplers within their scope. Shared configuration (host, port, protocol) lives here rather than in every sampler individually.

**Pre/Post-Processors** — run immediately before and after their parent sampler. Pre-processors handle dynamic payload construction; post-processors extract values from responses for use in later requests (correlation).

**Assertions** — validate sampler output. Failures increment the error count but do not stop the thread by default. Failed assertions mark the sample red in listeners and contribute to the error rate in summary reports.

**Timers** — pause execution after the sampler they are attached to (or all samplers in scope if placed at thread group level). They model user think time.

**Listeners** — collect, aggregate, and display results. They are memory-intensive. Never include listeners other than the Backend Listener in a production load run.

---

## Thread Groups

Thread Group configuration is where the load profile is defined.

**Number of Threads (virtual users)** — concurrent users. Each thread executes the sampler chain independently. Start at 1–5 to verify the script functions correctly before scaling.

**Ramp-Up Period** — seconds to reach the target thread count. JMeter adds `threads / ramp_time` threads per second. A zero-second ramp creates a thundering herd and does not reflect real traffic; always ramp. A 60-second ramp for 100 threads adds ~1.67 threads per second.

**Loop Count / Scheduler** — use the scheduler (duration-based) for load tests; loop count is only appropriate for functional smoke validation. Set duration to at least 5x the longest expected transaction time, minimum 15 minutes for steady-state measurement.

**Stepping Thread Group (plugin)** — from the JMeter Plugins Manager. Adds threads incrementally in steps rather than continuously, making staircase load profiles easy:

```
Start threads count:   0
Initial delay:         30s
Start N threads every: 30s
Step threads count:    10
Stop N threads every:  0s (disabled)
Target thread count:   100
```

This adds 10 threads every 30 seconds until 100 VUs are running, holding each step for 30 seconds before the next. Ideal for capacity ramp tests where you want to identify the inflection point.

**Scheduler example (XML):**

```xml
<ThreadGroup testname="Checkout Flow" enabled="true">
  <stringProp name="ThreadGroup.num_threads">50</stringProp>
  <stringProp name="ThreadGroup.ramp_time">60</stringProp>
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
  <stringProp name="ThreadGroup.duration">600</stringProp>
  <stringProp name="ThreadGroup.delay">0</stringProp>
  <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
</ThreadGroup>
```

---

## Samplers

### HTTP Request Sampler

The workhorse. Covers all standard web and REST API testing.

Key fields:
- **Server Name or IP** — can reference a variable (`${BASE_URL}`). Set this once in HTTP Request Defaults and leave it blank in individual samplers.
- **HTTP Method** — GET, POST, PUT, PATCH, DELETE, OPTIONS.
- **Path** — the URL path, e.g. `/api/v1/products/${product_id}`.
- **Body Data / Parameters** — switch to `Body Data` for JSON payloads; use `Parameters` for form-encoded data.
- **Files Upload** — for multipart form submissions.
- **Advanced** — connect timeout, response timeout, keep-alive, follow redirects.

Minimal POST sampler:

```xml
<HTTPSamplerProxy testname="POST /orders">
  <stringProp name="HTTPSampler.path">/api/v1/orders</stringProp>
  <stringProp name="HTTPSampler.method">POST</stringProp>
  <boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
  <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
    <collectionProp name="Arguments.arguments">
      <elementProp name="" elementType="HTTPArgument">
        <stringProp name="Argument.value">{"product_id":"${PRODUCT_ID}","qty":1}</stringProp>
      </elementProp>
    </collectionProp>
  </elementProp>
</HTTPSamplerProxy>
```

### JDBC Sampler

Tests database performance directly. Requires a JDBC Connection Configuration element in scope with the connection pool.

```xml
<JDBCSampler testname="SELECT Orders">
  <stringProp name="dataSource">pg_pool</stringProp>
  <stringProp name="queryType">Select Statement</stringProp>
  <stringProp name="query">SELECT * FROM orders WHERE user_id = ${USER_ID} LIMIT 100</stringProp>
  <stringProp name="variableNames">order_id,status,total</stringProp>
</JDBCSampler>
```

The `variableNames` field extracts first-row column values into JMeter variables for use in subsequent samplers.

### WebSocket Sampler

Requires the JMeter WebSocket Sampler plugin. Used for real-time feature testing (chat, notifications, live data feeds).

```xml
<!-- Connect -->
<WebSocketOpenConnection testname="WS Connect">
  <stringProp name="server">ws.example.com</stringProp>
  <stringProp name="port">443</stringProp>
  <stringProp name="path">/ws/notifications</stringProp>
</WebSocketOpenConnection>

<!-- Send message -->
<WebSocketRequestResponseSampler testname="WS Subscribe">
  <stringProp name="requestData">{"type":"subscribe","channel":"orders"}</stringProp>
</WebSocketRequestResponseSampler>
```

---

## Config Elements

Config elements apply to all samplers within their scope (thread group or logic controller).

### HTTP Request Defaults

Sets the base URL once. Individual samplers only specify the path. Changing the target environment requires changing one field.

```xml
<ConfigTestElement testname="HTTP Request Defaults">
  <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
  <stringProp name="HTTPSampler.protocol">https</stringProp>
  <stringProp name="HTTPSampler.port">443</stringProp>
  <stringProp name="HTTPSampler.connect_timeout">5000</stringProp>
  <stringProp name="HTTPSampler.response_timeout">30000</stringProp>
</ConfigTestElement>
```

### HTTP Header Manager

Injects headers into every sampler in scope. Use at thread group level for universal headers (Authorization, Accept, Content-Type) and at sampler level only for endpoint-specific overrides.

```xml
<HeaderManager testname="HTTP Header Manager">
  <collectionProp name="HeaderManager.headers">
    <elementProp name="" elementType="Header">
      <stringProp name="Header.name">Authorization</stringProp>
      <stringProp name="Header.value">Bearer ${AUTH_TOKEN}</stringProp>
    </elementProp>
    <elementProp name="" elementType="Header">
      <stringProp name="Header.name">Content-Type</stringProp>
      <stringProp name="Header.value">application/json</stringProp>
    </elementProp>
  </collectionProp>
</HeaderManager>
```

### HTTP Cookie Manager

Manages session cookies automatically. Add one per thread group for stateful user sessions. By default JMeter does not handle cookies unless this element is present.

Set `Clear cookies each iteration?` to `true` for tests where each loop represents a fresh session; `false` for tests simulating a persistent user session.

### HTTP Cache Manager

Simulates browser caching behaviour. Respects `Cache-Control` and `ETag` response headers. Reduces load on the server for cacheable resources and makes the test more representative of real browser traffic. Add at thread group level.

### CSV Data Set Config

Parameterises test data from an external CSV file. Critical for authenticated flows where multiple threads must not share the same credentials.

```xml
<CSVDataSet testname="User Credentials">
  <stringProp name="filename">${__P(data.dir,data)}/users.csv</stringProp>
  <stringProp name="variableNames">USERNAME,PASSWORD,USER_ID</stringProp>
  <stringProp name="delimiter">,</stringProp>
  <boolProp name="quotedData">false</boolProp>
  <boolProp name="recycle">false</boolProp>
  <boolProp name="stopThread">true</boolProp>
  <stringProp name="shareMode">shareMode.all</stringProp>
</CSVDataSet>
```

`shareMode.all` — all threads share one pointer into the CSV; each thread gets the next unused row.
`shareMode.group` — threads within the same thread group share a pointer.
`shareMode.thread` — each thread gets its own pointer, cycling independently.

`recycle=false` + `stopThread=true` stops threads when the CSV is exhausted, preventing row reuse in auth-sensitive tests. Size the CSV to at least 2x the peak concurrent thread count.

### User Defined Variables

Global constants referenced anywhere in the test plan as `${VAR_NAME}`. Set environment-specific values here (base URL, timeouts, thresholds) and override them from the CLI with `-J` flags at runtime.

```xml
<elementProp name="BASE_URL" elementType="Argument">
  <stringProp name="Argument.name">BASE_URL</stringProp>
  <stringProp name="Argument.value">api.staging.example.com</stringProp>
</elementProp>
```

Override at runtime: `jmeter -n -t test.jmx -JBASE_URL=api.prod.example.com`

---

## Logic Controllers

Logic controllers modify the order or condition under which samplers execute.

**Loop Controller** — repeats its children N times (or indefinitely). Use inside a thread group to repeat a sub-flow independently of the thread group loop count.

**If Controller** — conditionally executes children based on a JavaScript condition or JMeter function. Use Groovy via JSR223 for performance; avoid JavaScript in hot paths.

```
${__groovy(vars.get("STATUS_CODE") == "200",)}
```

**Transaction Controller** — groups multiple samplers into a single reportable unit. The transaction's elapsed time covers all child samplers, giving a meaningful "end-to-end checkout time" metric rather than per-request metrics. Always wrap user journeys in transaction controllers for reporting.

```xml
<TransactionController testname="Complete Checkout">
  <boolProp name="TransactionController.includeTimers">false</boolProp>
  <boolProp name="TransactionController.parent">true</boolProp>
</TransactionController>
```

`parent=true` — the transaction appears as a parent row in aggregate reports, with children collapsed. `parent=false` — both the transaction and its children appear as rows.

**Throughput Controller** — restricts how often its children execute as a percentage of total executions or an absolute call count. Use to model a realistic endpoint distribution: 80% read, 15% write, 5% delete.

---

## Pre-Processors and Post-Processors

### JSR223 Pre-Processor (Groovy)

The fastest scripting option in JMeter. Groovy runs on the JVM with a compiled cache — far faster than BeanShell for hot paths. Use for dynamic payload construction, timestamp generation, HMAC signing, or request mutation.

```groovy
// JSR223 Pre-Processor — generate ISO timestamp and HMAC signature
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.util.Base64

def timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC"))
vars.put("TIMESTAMP", timestamp)

def secret = "my_shared_secret"
def payload = "${vars.get('USER_ID')}:${timestamp}"
def mac = Mac.getInstance("HmacSHA256")
mac.init(new SecretKeySpec(secret.bytes, "HmacSHA256"))
vars.put("SIGNATURE", Base64.encoder.encodeToString(mac.doFinal(payload.bytes)))
```

### Regex Extractor (Post-Processor)

Extracts values from the response body, headers, or URL using a Java regular expression. The most widely used correlation tool for non-JSON responses and header extraction.

```xml
<RegexExtractor testname="Extract Session ID">
  <stringProp name="RegexExtractor.useHeaders">false</stringProp>
  <stringProp name="RegexExtractor.refname">SESSION_ID</stringProp>
  <stringProp name="RegexExtractor.regex">"sessionId"\s*:\s*"([^"]+)"</stringProp>
  <stringProp name="RegexExtractor.template">$1$</stringProp>
  <stringProp name="RegexExtractor.default">SESSION_ID_NOT_FOUND</stringProp>
  <stringProp name="RegexExtractor.match_no">1</stringProp>
</RegexExtractor>
```

Always set the default to a sentinel value. If a subsequent request uses `SESSION_ID_NOT_FOUND` as a token, the failure is immediately visible in the View Results Tree rather than buried as a 401.

### JSON Extractor (Post-Processor)

Preferred over Regex for JSON APIs. Uses JSONPath expressions.

```xml
<JSONPostProcessor testname="Extract Auth Token">
  <stringProp name="JSONPostProcessor.referenceNames">AUTH_TOKEN</stringProp>
  <stringProp name="JSONPostProcessor.jsonPathExprs">$.data.token</stringProp>
  <stringProp name="JSONPostProcessor.defaultValues">TOKEN_NOT_FOUND</stringProp>
  <stringProp name="JSONPostProcessor.match_no">0</stringProp>
</JSONPostProcessor>
```

`match_no=0` selects a random match when the path returns multiple values. `match_no=1` selects the first. Use `-1` to extract all matches into `VAR_1`, `VAR_2`, etc.

### JSR223 Post-Processor (Groovy)

Use for complex extraction logic, conditional variable setting, or logging extracted values to a file for debugging.

```groovy
// Log extraction result — remove before load test
def token = vars.get("AUTH_TOKEN")
if (token == "TOKEN_NOT_FOUND") {
    log.error("Auth token extraction failed for user: " + vars.get("USERNAME"))
    SampleResult.setSuccessful(false)
    SampleResult.setResponseMessage("Correlation failure: AUTH_TOKEN not extracted")
}
```

---

## Assertions

Assertions validate sampler output. A failed assertion marks the sample as failed but does not stop the thread. Assertions contribute to the error rate in aggregate reports.

### Response Assertion

The general-purpose assertion. Can check response code, body, headers, URL, or the JMeter response message.

```xml
<ResponseAssertion testname="Assert 200 OK">
  <collectionProp name="Asserion.test_strings">
    <stringProp>200</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <intProp name="Assertion.test_type">8</intProp><!-- Contains -->
</ResponseAssertion>
```

Test type integers: `2` = Contains, `8` = Equals, `1` = Matches (regex), `16` = Not. Combine with bitwise OR: `18` = Not Contains.

### Duration Assertion

Marks a sample failed if elapsed time exceeds the threshold. Does not abort the request. Use as an SLO gate in load tests — when p95 breaches the threshold, the error rate rises, and CI can fail on error rate.

```xml
<DurationAssertion testname="Assert Under 2s">
  <longProp name="DurationAssertion.duration">2000</longProp>
</DurationAssertion>
```

When to use: attach at the transaction controller level rather than individual samplers to assert the end-to-end user journey time.

### Size Assertion

Validates that the response body size is within expected bounds. Catches empty responses (0 bytes = server error that returned no body) and unexpectedly truncated payloads.

```xml
<SizeAssertion testname="Assert Non-Empty Response">
  <stringProp name="Assertion.test_field">SizeAssertion.response_data</stringProp>
  <intProp name="SizeAssertion.operator">5</intProp><!-- > -->
  <longProp name="SizeAssertion.size">0</longProp>
</SizeAssertion>
```

### JSON Assertion

Validates that a JSONPath expression exists and optionally matches an expected value. Use to assert that mandatory fields are present in the response.

```xml
<JSONPathAssertion testname="Assert Token Present">
  <stringProp name="JSON_PATH">$.data.token</stringProp>
  <boolProp name="JSONVALIDATION">false</boolProp><!-- path must exist only -->
  <boolProp name="EXPECT_NULL">false</boolProp>
  <boolProp name="INVERT">false</boolProp>
</JSONPathAssertion>
```

Set `JSONVALIDATION=true` and add `<stringProp name="EXPECTED_VALUE">active</stringProp>` to assert an exact value match.

**Assertion placement guidance:**

| Assertion type | Attach at |
|---|---|
| Status code (200, 201) | Each sampler |
| Response time SLO | Transaction controller |
| Mandatory field presence | Each sampler (post-processor scope) |
| Body content | Specific samplers only, not globally |
| Size (non-empty) | Every sampler as a baseline |

---

## Timers

Timers pause execution after the sampler they are attached to. Placed at thread group level, they apply after every sampler. Placed under a specific sampler, they apply only after that sampler.

### Constant Timer

Fixed pause. Use only for scripted scenarios where exact timing is required (e.g., polling after a known async operation). Not realistic for load tests.

```xml
<ConstantTimer testname="Fixed 1s Pause">
  <stringProp name="ConstantTimer.delay">1000</stringProp>
</ConstantTimer>
```

### Gaussian Random Timer

Pause drawn from a normal distribution. More representative of real user behaviour than a constant.

```xml
<GaussianRandomTimer testname="Think Time">
  <stringProp name="ConstantTimer.delay">1000</stringProp><!-- offset ms -->
  <stringProp name="RandomTimer.range">2000.0</stringProp><!-- range ms -->
</GaussianRandomTimer>
```

Mean pause = `offset + (range * 0.4)` at the default standard deviation. The above produces a mean of ~1800ms.

### Uniform Random Timer

Pause uniformly distributed between `constant` and `constant + random_delay`. More predictable than Gaussian; easier to reason about minimum and maximum pauses.

```xml
<UniformRandomTimer testname="Think Time">
  <stringProp name="ConstantTimer.delay">500</stringProp>
  <stringProp name="RandomTimer.range">2000</stringProp>
</UniformRandomTimer>
```

This produces pauses between 500ms and 2500ms.

### Constant Throughput Timer

Controls requests per minute (not per second — the unit is RPM) across all active threads. Use when the test objective is a target RPS rather than a target concurrency.

```xml
<ConstantThroughputTimer testname="300 RPM Cap">
  <intProp name="ConstantThroughputTimer.calcMode">2</intProp><!-- All active threads -->
  <doubleProp name="throughput">300.0</doubleProp><!-- RPM -->
</ConstantThroughputTimer>
```

`calcMode=1` = this thread only, `calcMode=2` = all threads in thread group, `calcMode=4` = all threads in test plan.

For the Throughput Shaping Timer (plugin), which accepts a rate schedule with ramp/hold/stress steps, install via the JMeter Plugins Manager (see Plugins section below).

---

## Listeners

Listeners collect and display results. They are the largest source of heap consumption in JMeter. The rule is simple: use listeners in the GUI during script development and debugging; remove or disable them for any actual load run.

### View Results Tree

Shows every request and response in detail. Essential for debugging correlation failures, assertion failures, and unexpected responses. Causes OOM errors with more than ~50 threads if left enabled. Always disable before running a load test.

**Correct use:** enable, run 1 thread, debug, disable.

### Aggregate Report

Shows per-sampler statistics: sample count, average, median, p90, p95, p99, min, max, error rate, throughput, received KB/s. The standard post-test report for client presentations. In non-GUI mode this data is generated by `jmeter -e -o report/`.

### Summary Report

Lightweight aggregate with fewer columns. Lower memory overhead than Aggregate Report. Acceptable for CI where you only need pass/fail decisions, not full percentile breakdowns.

### Backend Listener (InfluxDB → Grafana)

The only listener suitable for production load runs. Streams metrics asynchronously to an external time-series database rather than accumulating them in memory.

```xml
<BackendListener testname="InfluxDB Listener">
  <stringProp name="classname">
    org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender
  </stringProp>
  <elementProp name="arguments" elementType="Arguments">
    <collectionProp name="Arguments.arguments">
      <elementProp name="influxdbUrl" elementType="Argument">
        <stringProp name="Argument.value">http://influxdb:8086/write?db=jmeter</stringProp>
      </elementProp>
      <elementProp name="application" elementType="Argument">
        <stringProp name="Argument.value">checkout-load-test</stringProp>
      </elementProp>
      <elementProp name="summaryOnly" elementType="Argument">
        <stringProp name="Argument.value">false</stringProp>
      </elementProp>
      <elementProp name="percentiles" elementType="Argument">
        <stringProp name="Argument.value">90;95;99</stringProp>
      </elementProp>
    </collectionProp>
  </elementProp>
</BackendListener>
```

Import Grafana dashboard ID **5496** (JMeter Load Test Results) for an out-of-the-box view covering active threads, RPS, error rate, and response time percentiles by transaction.

---

## CLI Execution

Never use the GUI for load tests. The canonical non-GUI command:

```bash
jmeter \
  -n \                                          # non-GUI mode
  -t test-plans/checkout.jmx \                 # test plan
  -l results/results.jtl \                     # raw output (CSV format)
  -e \                                          # generate HTML report after test
  -o results/html-report/ \                    # HTML report output dir (must not exist)
  -Jbase_url=https://staging.example.com \     # override User Defined Variable
  -Jthreads=50 \
  -Jrampup=60 \
  -Jduration=600
```

**Key flags:**

| Flag | Purpose |
|---|---|
| `-n` | Non-GUI (headless) mode |
| `-t <file.jmx>` | Test plan file |
| `-l <file.jtl>` | Results output file (CSV) |
| `-e` | Generate HTML dashboard report |
| `-o <dir>` | HTML report output directory (must not pre-exist) |
| `-J<var>=<val>` | Override a JMeter property (accessible as `${__P(var,default)}`) |
| `-G<var>=<val>` | Override a JMeter property globally across all threads |
| `-R <ip,ip>` | Distribute test to remote injector nodes |
| `-X` | Exit remote engines after the test |

**JVM heap** — set before running:

```bash
export JVM_ARGS="-Xms512m -Xmx4g -XX:MaxMetaspaceSize=256m"
jmeter -n -t test.jmx -l results.jtl -e -o report/
```

The JTL file is a CSV with columns: `timeStamp`, `elapsed`, `label`, `responseCode`, `success`, `bytes`, `grpThreads`, `allThreads`, etc.

---

## CI Integration: GitHub Actions

```yaml
name: Performance Gate

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'   # nightly at 02:00 UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install JMeter
        run: |
          wget -q https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.3.tgz
          tar -xzf apache-jmeter-5.6.3.tgz
          echo "${GITHUB_WORKSPACE}/apache-jmeter-5.6.3/bin" >> $GITHUB_PATH

      - name: Run load test
        run: |
          jmeter \
            -n -t test-plans/api-load.jmx \
            -l results/results.jtl \
            -e -o results/html-report \
            -Jbase_url=${{ vars.STAGING_URL }} \
            -Jthreads=20 \
            -Jrampup=30 \
            -Jduration=300
        env:
          JVM_ARGS: "-Xms512m -Xmx2g"

      - name: Enforce thresholds
        run: python tools/check_jtl.py results/results.jtl --max-error-rate 0.01 --max-p95-ms 2000

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: jmeter-report-${{ github.run_number }}
          path: results/html-report/
```

**Threshold enforcement script (`tools/check_jtl.py`):**

```python
import csv
import sys
import argparse


def check_jtl(path: str, max_error_rate: float, max_p95_ms: int | None = None):
    with open(path) as f:
        rows = list(csv.DictReader(f))

    total = len(rows)
    if total == 0:
        print("FAIL: JTL file is empty")
        sys.exit(1)

    errors = sum(1 for r in rows if r.get("success", "true").lower() == "false")
    error_rate = errors / total

    latencies = sorted(int(r["elapsed"]) for r in rows)
    p95 = latencies[int(total * 0.95)]

    print(f"Samples:    {total}")
    print(f"Error rate: {error_rate:.2%}")
    print(f"p95:        {p95}ms")

    failed = False
    if error_rate > max_error_rate:
        print(f"FAIL: error rate {error_rate:.2%} > threshold {max_error_rate:.2%}")
        failed = True
    if max_p95_ms and p95 > max_p95_ms:
        print(f"FAIL: p95 {p95}ms > threshold {max_p95_ms}ms")
        failed = True

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("jtl")
    parser.add_argument("--max-error-rate", type=float, default=0.01)
    parser.add_argument("--max-p95-ms", type=int, default=None)
    args = parser.parse_args()
    check_jtl(args.jtl, args.max_error_rate, args.max_p95_ms)
```

---

## Distributed Testing

A single JMeter process on a standard machine generates roughly 300–500 RPS before the load generator itself becomes the bottleneck. For higher concurrency (typically above 500 VUs or 500 RPS sustained), use JMeter's controller/injector model.

**Architecture:**

```
Controller (CI node or local machine)
  ├── Injector 1 (cloud VM, e.g. 4-core / 8 GB)
  ├── Injector 2
  └── Injector 3
```

**Setup on each injector:**

```bash
# On each injector node
./jmeter-server -Djava.rmi.server.hostname=<INJECTOR_IP>
```

**Run from controller:**

```bash
jmeter -n -t test-plan.jmx \
  -R 10.0.0.1,10.0.0.2,10.0.0.3 \
  -l results.jtl \
  -e -o report/
```

**Thread count semantics:** the `-R` flag distributes the test but does not divide thread counts. 50 threads * 3 injectors = 150 effective VUs. Size your thread group to the per-injector share.

**Network requirements:**
- RMI port 1099 must be open between controller and injectors.
- Injectors need network access to the system under test, not to each other.
- Use a private subnet. Geographic distribution is a deliberate choice, not a default.
- Injectors need the same JMeter version and the same plugin set as the controller.

**When to use distributed testing:**
- Target VU count > 500.
- Target RPS > 500 sustained (depends on response size and think time).
- CPU on the single controller node exceeds 80% during the test ramp.
- The test requires geographic distribution of load origins.

For large cloud-scale runs, consider wrapping with Taurus (`bzt`) or using BlazeMeter cloud execution, which handles injector provisioning automatically.

---

## JMeter vs k6

| Dimension | JMeter | [[k6]] |
|---|---|---|
| Test definition | XML (`.jmx`) + GUI | JavaScript / TypeScript |
| Learning curve | Higher — GUI concepts, XML structure | Lower — code-first |
| Ecosystem age | 25+ years, vast plugin library | ~8 years, fast growing |
| Protocol coverage | HTTP, JDBC, JMS, LDAP, FTP, SMTP, TCP | HTTP, WebSocket, gRPC (via extensions) |
| Distributed testing | Built-in controller/injector | k6 Cloud or k6 Operator (Kubernetes) |
| Resource usage per VU | Higher (JVM thread per VU) | Lower (Go goroutine per VU) |
| Real-time dashboards | Backend Listener to InfluxDB/Grafana | k6 Cloud or Prometheus remote write |
| CI integration | Taurus or raw CLI with JTL parsing | First-class (`k6 run`, threshold exit codes) |
| Code review of tests | Difficult — XML diffs are noisy | Natural — JavaScript PRs |
| Script version control | Possible but painful | Clean |

**Choose JMeter when:**
- The client already has `.jmx` scripts and JMeter infrastructure.
- Non-HTTP protocol testing is required (JDBC, JMS, LDAP, FTP, TCP).
- The team is not comfortable with JavaScript or TypeScript.
- You need the broadest plugin ecosystem for specialist scenarios.
- Enterprise license compliance requirements favour open-source Apache projects.

**Choose [[k6]] when:**
- Greenfield project with developer-led performance testing.
- Existing JavaScript/TypeScript skillset in the team.
- Kubernetes-native deployment (k6 Operator).
- CI-first workflow where test scripts are code-reviewed.
- You want type safety and IDE support for test scripts.
- Horizontal scaling via cloud execution without managing injector nodes.

**Migration path:** if a client has existing `.jmx` files that must be preserved while modernising the CI pipeline, wrap JMeter with Taurus (`bzt`) rather than rewriting immediately. Taurus provides clean YAML configuration and proper CI exit codes while preserving the existing `.jmx` investment.

---

## JMeter Plugins

The JMeter Plugins Manager (available at `jmeter-plugins.org`) extends the core installation with additional samplers, controllers, listeners, and timers. Install via `Plugins Manager → Available Plugins`.

**Essential plugins for performance testing engagements:**

**Stepping Thread Group** — staircase load profiles with configurable step size, hold duration, and target thread count. Easier to reason about than a ramp for capacity tests. (Plugin: `jpgc-tst`)

**Throughput Shaping Timer** — rate-based test scheduling with a time-series schedule (RPS vs time). More precise than Constant Throughput Timer for complex load shapes. (Plugin: `jpgc-graphs-basic`)

```
Time (s)   Target RPS
0–60       10           # warm-up
60–660     100          # steady state
660–780    200          # stress spike
780–840    0            # cooldown
```

**3 Basic Graphs** — adds active threads, transactions per second, and response time over time graphs to the GUI. The only listeners worth running locally for visual debugging. (Plugin: `jpgc-graphs-basic`)

**WebSocket Sampler** — full WebSocket testing support (open connection, send/receive, close). Required for any real-time feature load testing. (Plugin: `websocket-samplers`)

**Custom Thread Groups** — includes Ultimate Thread Group, Arrivals Thread Group, and Free-Form Arrivals Thread Group for advanced load shaping beyond what the standard thread group supports. (Plugin: `jpgc-casutg`)

---

## Reading Results

The HTML report generated by `jmeter -e -o report/` and the Aggregate Report listener share the same column set.

| Column | Meaning | Notes |
|---|---|---|
| # Samples | Total requests sent | |
| Average | Mean response time (ms) | Do not use as your SLO metric |
| Median | p50 latency | |
| 90% Line | p90 latency | Standard SLO anchor for most clients |
| 95% Line | p95 latency | Use for stricter SLOs |
| 99% Line | p99 latency | Catches tail latency and timeouts |
| Min | Fastest sample | |
| Max | Slowest sample | Round numbers (e.g. 30000ms) = timeout |
| Error % | Failed assertions + non-2xx responses | Primary CI gate metric |
| Throughput | Sustained RPS | Compare to target |
| Received KB/s | Response bandwidth | |

**Diagnosing bottlenecks from results:**

- **p50 stable, p99 rising** — a subset of requests hitting a slow path (DB lock, cold cache, GC pause). Not yet at capacity ceiling.
- **p50 and p99 both rising together** — overall capacity ceiling; scale out or optimise the hot path.
- **Error rate > 1% before target RPS reached** — server rejecting requests; check for connection pool exhaustion, 5xx errors, or rate limiting.
- **Throughput plateaus below target** — server saturated; adding threads only inflates errors from this point.
- **Max = exactly N * 1000** — requests hitting a configured timeout. Identify and fix the upstream call or timeout config.

---

## Common Mistakes

**Running load tests in GUI mode.** The GUI loads all listeners into memory and renders samples in real time. This consumes 3–5x more heap than headless mode and reduces the throughput the load generator can sustain, making results unrepresentative. Use the GUI only to build and debug scripts.

**No correlation.** A script that replays recorded traffic with hardcoded session tokens will fail at any user count above 1. Every dynamic value (session ID, CSRF token, auth token, order ID) must be extracted from the response that creates it and injected into subsequent requests. Always verify correlation at 1 thread with View Results Tree open before scaling.

**Hardcoded think times.** A constant 1000ms think time applied uniformly produces synthetic, uniform traffic. Real users have variance. Use Gaussian or Uniform Random Timers. Worse: no think time at all accidentally turns a concurrency test into an unintended stress test.

**Listeners left enabled for load tests.** View Results Tree in particular will cause OOM with more than ~50 threads. Disable all listeners except the Backend Listener before running at load. Add a comment to the `.jmx` noting which listeners are debug-only.

**CSV exhaustion.** If the CSV Data Set Config file has fewer rows than `threads * iterations`, JMeter recycles rows or stops threads depending on the `recycle` setting. In authenticated flows this causes session collisions. Size the data file and set `recycle=false` + `stopThread=true` to detect the problem early.

**Insufficient heap.** The default JVM heap is 512 MB. A 200-thread test with several extractors and assertions can exhaust this quickly. Always set `JVM_ARGS="-Xms1g -Xmx4g"` before running load tests. On distributed injectors, set this in `jmeter-server.sh`.

**Measuring from the wrong point.** Response time in JMeter is measured from the moment the request is sent to the moment the last byte of the response is received, at the load generator. Network latency between the injector and the system under test is included. For fair comparisons, run injectors in the same region or data centre as the system under test, unless geo-distributed latency is the test objective.

---

## Connections

- [[performance-testing]] — test type taxonomy and NFR acceptance criteria JMeter scripts are built against
- [[load-testing-advanced]] — advanced load scenario patterns that apply to JMeter thread groups
- [[api-performance-testing]] — API-specific latency and throughput patterns complementing JMeter HTTP sampler use
- [[k6]] — code-first alternative; decision framework for choosing between JMeter and k6
- [[technical-qa/ci-cd-quality-gates]] — integrating JMeter JTL threshold checks into CI pass/fail gates
- [[technical-qa/test-observability]] — streaming JMeter Backend Listener results to Grafana/InfluxDB dashboards
- [[technical-qa/performance-capacity-planning]] — environment sizing and result projection methodology for JMeter runs
- [[technical-qa/tqa-hub]] — central index for all technical QA pages

## Open Questions

- At what sustained RPS does a single JMeter injector node typically become the bottleneck, and does this vary significantly with response payload size?
- Is Taurus (`bzt`) still the recommended JMeter CI wrapper, or has a more actively maintained alternative emerged?
- Does the Throughput Shaping Timer plugin reliably handle rate schedules above 5000 RPM on a single injector, or does controller overhead become measurable at that scale?
