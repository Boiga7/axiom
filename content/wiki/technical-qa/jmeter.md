---
type: entity
category: technical-qa
tags: [jmeter, performance-testing, load-testing, enterprise, java]
updated: 2026-05-03
para: resource
---

# Apache JMeter

The dominant open-source performance testing tool on enterprise client sites. Written in Java, runs everywhere a JVM runs, and has been the industry standard for load testing since the late 1990s. Its GUI is used for test design; production runs are headless on the command line. Almost every large-scale QA engagement will have JMeter in the toolchain.

---

## Architecture: The Test Plan Hierarchy

JMeter organises tests as a tree. Every node type serves a distinct purpose.

```
Test Plan
  └── Thread Group
        ├── Config Elements       (HTTP Request Defaults, CSV Data Set, HTTP Header Manager)
        ├── Pre-Processors        (User Parameters, BeanShell/JSR223 Pre-Processor)
        ├── Samplers              (HTTP Request, JDBC Request, JMS Publisher, TCP Sampler)
        ├── Post-Processors       (Regex Extractor, JSON Extractor, CSS/JQuery Extractor)
        ├── Assertions            (Response Code, Response Body, Duration, Size)
        ├── Timers                (Constant Timer, Gaussian Random Timer, Throughput Shaping Timer)
        └── Listeners             (View Results Tree, Summary Report, Backend Listener)
```

**Test Plan** — root node. Sets global properties (user variables, classpath additions, whether to run thread groups serially).

**Thread Group** — represents a population of virtual users. Controls concurrency (number of threads), ramp-up period, loop count or duration. One thread group per user journey type is the recommended pattern (e.g. separate groups for "browse", "checkout", "admin").

**Samplers** — the actual requests. HTTP Request sampler is the workhorse. Each sampler can be scoped under its thread group or a logic controller (If, While, Loop, Random Order, Throughput Controller).

**Config Elements** — applied before samplers in their scope. HTTP Request Defaults sets the host/port/protocol once so individual samplers only specify the path. CSV Data Set Config parameterises test data from a file. HTTP Header Manager injects headers (Authorization, Content-Type).

**Pre/Post-Processors** — run immediately before/after a sampler. JSR223 pre-processors (Groovy, fast) handle dynamic payload construction. Post-processors extract variables from responses for use in subsequent requests.

**Assertions** — validate sampler output. Failures increment the error count but do not stop the thread by default. Attach assertions at the thread group level to apply them globally, or per-sampler for targeted checks.

**Listeners** — collect and visualise results. Never run listeners in CI — they consume memory and write to disk synchronously. Use only for local test debugging. In CI, write raw JTL output and process it separately.

---

## Creating a Basic HTTP Test Plan

Minimum viable JMeter test plan for a REST API:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0">
  <hashTree>
    <TestPlan testname="API Load Test" enabled="true">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">api.example.com</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
      <hashTree>

        <!-- Thread Group: 50 users, 60s ramp, 10 min duration -->
        <ThreadGroup testname="Browse Users" enabled="true">
          <stringProp name="ThreadGroup.num_threads">50</stringProp>
          <stringProp name="ThreadGroup.ramp_time">60</stringProp>
          <boolProp name="ThreadGroup.scheduler">true</boolProp>
          <stringProp name="ThreadGroup.duration">600</stringProp>
          <hashTree>

            <!-- Config: shared host -->
            <ConfigTestElement testname="HTTP Request Defaults">
              <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
              <stringProp name="HTTPSampler.protocol">https</stringProp>
              <stringProp name="HTTPSampler.port">443</stringProp>
            </ConfigTestElement>
            <hashTree/>

            <!-- Sampler: GET /products -->
            <HTTPSamplerProxy testname="GET /products">
              <stringProp name="HTTPSampler.path">/api/v1/products</stringProp>
              <stringProp name="HTTPSampler.method">GET</stringProp>
              <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
              <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
              <hashTree>

                <!-- Assert 200 OK -->
                <ResponseAssertion testname="Assert 200">
                  <collectionProp name="Asserion.test_strings">
                    <stringProp>200</stringProp>
                  </collectionProp>
                  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
                  <intProp name="Assertion.test_type">8</intProp><!-- Contains -->
                </ResponseAssertion>
                <hashTree/>

                <!-- Assert response time < 2000ms -->
                <DurationAssertion testname="Assert Duration">
                  <longProp name="DurationAssertion.duration">2000</longProp>
                </DurationAssertion>
                <hashTree/>

              </hashTree>
            </HTTPSamplerProxy>

          </hashTree>
        </ThreadGroup>

      </hashTree>
    </TestPlan>
  </hashTree>
</jmeterTestPlan>
```

---

## Recording Tests with HTTP(S) Test Script Recorder

JMeter's recorder proxies browser traffic and generates samplers automatically. Useful for complex multi-step flows where writing JMX by hand would be slow.

**Setup:**

1. Add `HTTP(S) Test Script Recorder` under the Test Plan.
2. Set the proxy port (default 8888).
3. Configure your browser to use `localhost:8888` as an HTTP/HTTPS proxy.
4. For HTTPS: install JMeter's CA certificate (`ApacheJMeterTemporaryRootCA.crt`, generated in `bin/` on first recorder start) into the browser's trusted roots.
5. Set a target controller (usually a Simple Controller or Recording Controller inside your thread group).
6. Click Start, exercise the app in the browser, click Stop.

**Post-recording cleanup:**

- Delete static asset requests (`.js`, `.css`, `.png`, `.woff`) — they skew results and are usually served from CDN.
- Replace hardcoded session tokens and CSRF values with variables from extractors.
- Add `HTTP Header Manager` for `Accept`, `Content-Type`, `Authorization` where needed.
- Collapse recorded samplers into a logical transaction controller flow.

---

## Thread Group Configuration

The three parameters that shape the load profile:

**Number of Threads** — concurrent virtual users. Each thread runs the sampler chain sequentially. Start with 10–20 to verify the script works, then scale to target.

**Ramp-Up Period** — seconds to reach full concurrency. A 60-second ramp for 50 threads adds one thread every 1.2 seconds. Always ramp — a zero-second ramp creates a thundering herd that does not reflect real traffic patterns and can mask timing bugs.

**Duration vs. Loop Count** — prefer duration-based tests (scheduler enabled). Loop count is useful only for functional smoke tests. For load tests, set duration to at least 5x the longest expected transaction time, with a minimum of 15 minutes for steady-state measurement.

**Throughput Shaping Timer (plugin)** for target RPS:

```
# Constant Throughput Timer — simplest approach
Target throughput: 300 (requests per minute)
Calculate based on: All active threads in current thread group
```

For precise RPS control install the JMeter Plugins Manager and use the Throughput Shaping Timer, which accepts a schedule:

```
Start RPS  End RPS  Duration
10         10       60s      # warm-up
100        100      600s     # steady state
200        200      120s     # stress spike
```

---

## Correlation and Dynamic Data Extraction

Correlation is the process of extracting dynamic values from one response (session ID, CSRF token, auth token) and injecting them into subsequent requests. It is the most common cause of script failures at client sites when tests replay recorded traffic against a live server.

### Regex Extractor

```xml
<RegexExtractor testname="Extract Session ID">
  <stringProp name="RegexExtractor.useHeaders">false</stringProp><!-- Body -->
  <stringProp name="RegexExtractor.refname">SESSION_ID</stringProp>
  <stringProp name="RegexExtractor.regex">"sessionId"\s*:\s*"([^"]+)"</stringProp>
  <stringProp name="RegexExtractor.template">$1$</stringProp>
  <stringProp name="RegexExtractor.default">SESSION_ID_NOT_FOUND</stringProp>
  <stringProp name="RegexExtractor.match_no">1</stringProp>
</RegexExtractor>
```

Always set the default to a sentinel like `SESSION_ID_NOT_FOUND`. If the variable resolves to the sentinel in later requests, the correlation failed — easier to diagnose than a 401 with no explanation.

### JSON Extractor

Preferred for JSON APIs over regex. Uses JMESPath expressions:

```xml
<JSONPostProcessor testname="Extract Auth Token">
  <stringProp name="JSONPostProcessor.referenceNames">AUTH_TOKEN</stringProp>
  <stringProp name="JSONPostProcessor.jsonPathExprs">$.data.token</stringProp>
  <stringProp name="JSONPostProcessor.defaultValues">TOKEN_NOT_FOUND</stringProp>
  <stringProp name="JSONPostProcessor.match_no">0</stringProp><!-- 0 = random if multiple -->
</JSONPostProcessor>
```

### CSS/JQuery Extractor

Used for HTML responses — login pages, form submissions, CSRF tokens:

```xml
<HtmlExtractor testname="Extract CSRF Token">
  <stringProp name="HtmlExtractor.refname">CSRF_TOKEN</stringProp>
  <stringProp name="HtmlExtractor.expr">input[name="_csrf"]</stringProp>
  <stringProp name="HtmlExtractor.attribute">value</stringProp>
  <stringProp name="HtmlExtractor.default">CSRF_NOT_FOUND</stringProp>
  <stringProp name="HtmlExtractor.match_no">1</stringProp>
</HtmlExtractor>
```

---

## Think Time and Pacing (Timers)

Without timers, each virtual user hammers requests as fast as the server responds. Real users pause between clicks. Think time models this pause and prevents artificially high RPS per user.

**Constant Timer** — fixed pause after each sampler in scope. Simple but not realistic.

**Gaussian Random Timer** — pause drawn from a normal distribution. More realistic than constant.

```xml
<GaussianRandomTimer testname="Think Time">
  <stringProp name="ConstantTimer.delay">1000</stringProp><!-- offset ms -->
  <stringProp name="RandomTimer.range">2000.0</stringProp><!-- stdev ms -->
</GaussianRandomTimer>
```

This produces pauses centred around 1000ms with ±2000ms variance. Mean pause ≈ 1000 + (2000 * 0.4) = 1800ms (Gaussian offset formula: offset + range * 0.4 at default σ).

**Uniform Random Timer** — pause uniformly distributed between `[0, range] + constant`:

```xml
<UniformRandomTimer testname="Think Time">
  <stringProp name="ConstantTimer.delay">500</stringProp>
  <stringProp name="RandomTimer.range">1500</stringProp>
</UniformRandomTimer>
```

Rule of thumb: attach timers at thread group level to apply globally; move to specific samplers only when a particular action warrants a different pacing.

---

## Assertions

**Response Code Assertion** — checks HTTP status:

```xml
<ResponseAssertion testname="Assert 200">
  <collectionProp name="Asserion.test_strings">
    <stringProp>200</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <intProp name="Assertion.test_type">8</intProp>
</ResponseAssertion>
```

**Response Body Assertion** — checks for expected content:

```xml
<ResponseAssertion testname="Assert Body Contains product_id">
  <collectionProp name="Asserion.test_strings">
    <stringProp>product_id</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_data</stringProp>
  <intProp name="Assertion.test_type">2</intProp><!-- Contains -->
</ResponseAssertion>
```

**Duration Assertion** — marks a sample failed if it exceeds the threshold. Does not stop the test; it counts against the error rate:

```xml
<DurationAssertion testname="Assert Under 2s">
  <longProp name="DurationAssertion.duration">2000</longProp>
</DurationAssertion>
```

**JSON Assertion** — validates JSON path exists and optionally matches a value:

```xml
<JSONPathAssertion testname="Assert Token Present">
  <stringProp name="JSON_PATH">$.data.token</stringProp>
  <boolProp name="JSONVALIDATION">false</boolProp><!-- just check path exists -->
  <boolProp name="EXPECT_NULL">false</boolProp>
</JSONPathAssertion>
```

---

## Distributed / Remote Testing

A single JMeter process on a standard machine can generate roughly 300–500 RPS before the test generator itself becomes the bottleneck. For higher concurrency, use JMeter's controller/agent (called "slave" in older docs) model.

**Architecture:**

```
Controller (your laptop or CI node)
  ├── Agent 1 (cloud VM, e.g. 4-core 8GB)
  ├── Agent 2
  └── Agent 3
```

**Setup on each agent machine:**

```bash
# jmeter/bin/jmeter-server
./jmeter-server -Djava.rmi.server.hostname=<AGENT_IP>
```

**Run from controller:**

```bash
jmeter -n -t test-plan.jmx \
  -R agent1_ip,agent2_ip,agent3_ip \
  -l results.jtl \
  -e -o report/
```

The `-R` flag distributes the thread groups across all listed agents. Each agent runs the full thread group count — so 50 threads * 3 agents = 150 effective virtual users. Size your thread group for the per-agent share.

**Network considerations:**

- Agents need to reach the system under test, not the controller.
- Open RMI port (1099 by default) between controller and agents.
- Use a private subnet; avoid running agents in different geographic regions unless geo-distributed load is the test objective.
- For large-scale cloud runs, prefer Taurus with BlazeMeter cloud execution or AWS/GCP spot instances bootstrapped with a startup script.

---

## Taurus: YAML Wrapper for JMeter

Taurus (`bzt`) wraps JMeter (and k6, Gatling, Selenium) behind a code-first YAML interface. It handles JMeter installation, JVM flags, real-time reporting, and CI exit codes automatically.

**Install:**

```bash
pip install bzt
```

**Basic Taurus YAML (runs JMeter under the hood):**

```yaml
execution:
  - executor: jmeter
    concurrency: 50
    ramp-up: 60s
    hold-for: 10m
    throughput: 200  # target RPS
    scenario: browse-products

scenarios:
  browse-products:
    default-address: https://api.example.com
    requests:
      - url: /api/v1/products
        label: GET products
        assert:
          - contains:
              - product_id
          - not contains:
              - error
      - url: /api/v1/products/${product_id}
        label: GET product detail
        extract-jsonpath:
          product_id: $.data[0].id

reporting:
  - module: final-stats
    summary: true
    percentiles: true
  - module: junit-xml
    filename: test-results/jmeter-results.xml
```

**Run:**

```bash
bzt load-test.yml
```

Taurus prints a live summary table and exits non-zero if error rate or response time thresholds are breached. The `junit-xml` reporter produces output that CI systems (Jenkins, GitHub Actions) can parse as test results.

**Wrapping an existing JMX file:**

```yaml
execution:
  - executor: jmeter
    concurrency: 100
    ramp-up: 2m
    hold-for: 15m
    scenario: existing-plan

scenarios:
  existing-plan:
    script: test-plans/checkout-flow.jmx
    variables:
      BASE_URL: https://staging.example.com
      USERS_CSV: data/users.csv
```

---

## Running JMeter in CI (Headless)

Never open the GUI in CI. The GUI is a test authoring tool — it loads all listeners into memory and renders them in real time, which inflates heap usage and produces unreliable results.

**Command-line syntax:**

```bash
jmeter \
  -n \                              # non-GUI mode
  -t test-plans/checkout.jmx \     # test plan
  -l results/results.jtl \         # raw output (CSV)
  -e \                              # generate HTML report after test
  -o results/html-report/ \        # HTML report output dir
  -Jbase_url=https://staging.example.com \   # override JMeter property
  -Jthreads=50 \
  -Jrampup=60 \
  -Jduration=600
```

**GitHub Actions example:**

```yaml
- name: Run JMeter load test
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

- name: Check error rate
  run: |
    python tools/check_jtl.py results/results.jtl --max-error-rate 0.01

- name: Upload HTML report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: jmeter-report
    path: results/html-report/
```

**Parsing JTL to enforce pass/fail:**

```python
# tools/check_jtl.py
import csv
import sys
import argparse

def check_jtl(path: str, max_error_rate: float, max_p95_ms: int = None):
    rows = []
    with open(path) as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    errors = sum(1 for r in rows if r.get("success", "true").lower() == "false")
    error_rate = errors / total if total else 0

    latencies = sorted(int(r["elapsed"]) for r in rows)
    p95 = latencies[int(total * 0.95)] if total else 0

    print(f"Total samples: {total}")
    print(f"Error rate:    {error_rate:.2%}")
    print(f"p95 latency:   {p95}ms")

    failed = False
    if error_rate > max_error_rate:
        print(f"FAIL: error rate {error_rate:.2%} exceeds threshold {max_error_rate:.2%}")
        failed = True
    if max_p95_ms and p95 > max_p95_ms:
        print(f"FAIL: p95 {p95}ms exceeds threshold {max_p95_ms}ms")
        failed = True

    sys.exit(1 if failed else 0)
```

---

## JMeter + Grafana / InfluxDB Real-Time Dashboard

For long-running load tests (30+ minutes), real-time visibility beats post-hoc JTL analysis. The Backend Listener streams metrics to InfluxDB; Grafana visualises them live.

**JMeter Backend Listener config:**

```xml
<BackendListener testname="InfluxDB Listener">
  <elementProp name="arguments" elementType="Arguments">
    <collectionProp name="Arguments.arguments">
      <elementProp name="influxdbMetricsSender" elementType="Argument">
        <stringProp name="Argument.value">
          org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender
        </stringProp>
      </elementProp>
      <elementProp name="influxdbUrl" elementType="Argument">
        <stringProp name="Argument.value">http://localhost:8086/write?db=jmeter</stringProp>
      </elementProp>
      <elementProp name="application" elementType="Argument">
        <stringProp name="Argument.value">checkout-load-test</stringProp>
      </elementProp>
      <elementProp name="measurement" elementType="Argument">
        <stringProp name="Argument.value">jmeter</stringProp>
      </elementProp>
      <elementProp name="summaryOnly" elementType="Argument">
        <stringProp name="Argument.value">false</stringProp>
      </elementProp>
    </collectionProp>
  </elementProp>
</BackendListener>
```

**Docker Compose for local InfluxDB + Grafana:**

```yaml
services:
  influxdb:
    image: influxdb:1.8
    ports: ["8086:8086"]
    environment:
      INFLUXDB_DB: jmeter

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on: [influxdb]

volumes:
  grafana-data:
```

Import the **JMeter Dashboard** (Grafana dashboard ID 5496) for an out-of-the-box view covering active threads, RPS, error rate, response time percentiles.

---

## Reading JMeter Summary Reports

The aggregate report listener (or `jmeter -e` HTML output) provides these columns:

| Column | Meaning |
|---|---|
| Label | Sampler name |
| # Samples | Total requests sent |
| Average | Mean response time (ms) — avoid using this as SLO metric |
| Median | p50 latency |
| 90% Line | p90 latency — standard SLO anchor |
| 95% Line | p95 latency |
| 99% Line | p99 latency — catches tail outliers |
| Min / Max | Extremes — max often reveals timeout values |
| Error % | Percentage of samples with failures |
| Throughput | RPS sustained during the test window |
| Received KB/sec | Server-side response bandwidth |

**Identifying bottlenecks:**

- **Rising p99 with stable p50** — a subset of requests hitting a slow path (DB lock contention, cold cache, GC pause). Not a capacity issue yet.
- **p50 and p99 both rising together** — overall capacity ceiling being hit; scale horizontally or optimise the hot path.
- **Error rate > 1% before target RPS** — the system is rejecting requests; check server-side logs for 5xx, connection pool exhaustion, or rate limiting.
- **Throughput plateaus below target** — the server is saturated; adding more threads only increases error rate from this point.
- **Max latency = exactly round number (e.g. 30000ms)** — requests are hitting a timeout, not completing. Find and fix the timeout configuration or the upstream call causing it.

---

## Common Pitfalls

**Running tests in GUI mode**
GUI mode loads listeners into memory and renders every sample in real time. This consumes 3–5x more heap than headless and produces lower throughput from the load generator itself, making results unrepresentative. Use GUI only to build and debug scripts; always run actual load tests with `-n`.

**Insufficient Java heap**
Default JVM heap is 512MB. A 200-thread test with a View Results Tree listener open will OOM. Set via environment variable before starting JMeter:
```bash
export JVM_ARGS="-Xms1g -Xmx4g"
```
For distributed agents, set this on each agent node in `jmeter-server.sh`.

**No think time**
A script with no timers and 50 threads sends requests as fast as responses arrive. At 100ms average response time, that's 50 * 10 = 500 RPS — far above any realistic user concurrency model. This makes the test a stress test by accident. Always model think time unless you explicitly want a stress/soak scenario.

**Static assets not excluded from recording**
A recorded script capturing JS/CSS/image requests inflates sample counts, creates misleading error rates when CDN assets are unavailable in staging, and pollutes the aggregate report with noise. Add a URL filter to the recorder or a Throughput Controller set to 0% for static extensions.

**CSV Data Set Config exhaustion**
When a CSV file has fewer rows than the number of concurrent threads * iterations, JMeter will recycle rows or error depending on the "Recycle on EOF?" setting. In authenticated flows, this means multiple threads sharing the same credential, causing 401s or session conflicts. Size your test data set to at least 2x the peak concurrent thread count.

**Not verifying correlation before scaling**
A script that works at 1 thread but fails at 50 almost always has a correlation issue — dynamic tokens extracted correctly in isolation but clashing when concurrent threads share state. Always run at 1 thread with "View Results Tree" open before scaling, verifying each extracted variable has a non-sentinel value.

---

## JMeter vs k6: When Each Wins

| Dimension | JMeter | k6 |
|---|---|---|
| Test language | XML (JMX) + GUI | JavaScript (ES6) |
| Learning curve | Higher (XML, GUI concepts) | Lower (code-first) |
| Ecosystem maturity | 25+ years, vast plugin library | 8 years, growing fast |
| Enterprise client fit | Near-universal — already installed | Increasing adoption |
| Distributed testing | Built-in controller/agent | k6 Cloud or k6 operator for K8s |
| Real-time dashboards | Backend Listener → InfluxDB/Grafana | Built-in k6 Cloud or Prometheus |
| CI integration | Taurus or raw CLI | First-class (`k6 run`, exit codes) |
| Protocol coverage | HTTP, JDBC, JMS, LDAP, FTP, SMTP | HTTP, WebSocket, gRPC (extensions) |
| Resource usage | Higher (JVM per thread) | Lower (Go coroutines) |
| Scripting complexity | GUI reduces complexity | Code-first scales better |

**Choose JMeter when:**
- The client already has JMeter scripts and infrastructure.
- You need non-HTTP protocol testing (JDBC, JMS, LDAP).
- The team is not comfortable with JavaScript.
- You need the broadest plugin ecosystem.

**Choose k6 when:**
- Greenfield project with developer-led performance testing.
- Existing JavaScript/TypeScript skillset.
- Kubernetes-native deployment (k6 operator).
- You want TypeScript type safety in test scripts.
- CI-first workflow where code review of test scripts matters.

See also: [[qa/performance-testing-qa]] for NFR acceptance criteria and [[technical-qa/k6]] for k6 in depth.

---

## Connections

[[qa/performance-testing-qa]] · [[qa/non-functional-testing]] · [[qa/performance-test-reporting]] · [[qa/test-automation-strategy]] · [[qa/qa-tools]] · [[technical-qa/k6]] · [[technical-qa/gatling]] · [[protocols/mcp]]
