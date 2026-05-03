---
type: concept
category: technical-qa
tags: [websocket, real-time, testing, k6, playwright, performance]
sources: []
updated: 2026-05-03
para: resource
---

# WebSocket Testing

WebSocket is a full-duplex, persistent TCP channel. Testing it is categorically different from REST API testing: the connection is stateful, messages arrive as a stream rather than a response, and failure modes include ordering violations, backpressure collapse, and mid-session authentication expiry. This page covers the full testing stack — protocol fundamentals, functional testing with Playwright, manual tools, k6 load testing, SSE comparison, contract testing, and CI integration.

See [[api-testing]] and [[api-testing-advanced]] for HTTP/REST context, [[performance-testing]] and [[load-testing-advanced]] for k6 general patterns, [[playwright]] for Playwright setup, and [[mock-strategies]] for test double taxonomy.

---

## Protocol Fundamentals for Testers

### The Handshake (HTTP Upgrade)

Every WebSocket connection starts as an HTTP/1.1 request. The client sends an `Upgrade` header:

```
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

The server responds with `101 Switching Protocols`. From that point the TCP connection is handed to the WebSocket framing layer — no HTTP overhead per message, no request/response cycle.

**What this means for testing:** authentication and authorisation happen at upgrade time (via cookies, headers, or query params in the URL). A server that rejects an unauthenticated connection should close during or immediately after the upgrade attempt, not after accepting and then sending a close frame. Test the upgrade boundary, not just message exchange.

### Full-Duplex Channel

Both sides can send at any time, independently. The server can push messages without a client request. This creates the fan-out scenario: one publisher sends a message and the server broadcasts it to all subscribers. Testing fan-out requires multiple concurrent clients, not just one.

### Frames and Opcodes

WebSocket data travels in frames. Testers need to know the opcodes:

| Opcode | Meaning | Test relevance |
|---|---|---|
| 0x0 | Continuation | Large messages fragment; verify reassembly |
| 0x1 | Text frame (UTF-8) | Most application messages |
| 0x2 | Binary frame | File transfer, binary protocols (e.g. MessagePack) |
| 0x8 | Close | Test clean close vs drop; verify close code (1000 = normal) |
| 0x9 | Ping | Server sends to keep connection alive |
| 0xA | Pong | Client must reply; test that proxy idle timeout is not hit |

Close codes above 3000 are application-defined. An auth failure might close with 4001, a rate limit with 4008. Verify these explicitly.

### Connection Lifecycle

```
Client                          Server
  |--- HTTP GET /ws (Upgrade) --->|
  |<-- 101 Switching Protocols ---|
  |=== WebSocket frames =========|   (bidirectional)
  |--- Ping ---------------------->|  (heartbeat)
  |<-- Pong -----------------------|
  |--- Close (0x8, 1000) -------->|  (clean teardown)
  |<-- Close (0x8, 1000) ---------|
```

States to cover in every test suite:
1. Connect + auth accepted
2. Connect + auth rejected (close before any message)
3. Message exchange (text, binary)
4. Heartbeat ping/pong under idle
5. Server-initiated close
6. Client-initiated close
7. Reconnect after drop
8. Auth token expiry mid-session

---

## Why WebSocket Testing Differs from REST

| Dimension | REST | WebSocket |
|---|---|---|
| Connection lifetime | Ephemeral per request | Persistent, minutes to hours |
| State | Stateless | Stateful — connection carries session context |
| Directionality | Client request then server response | Bidirectional; server pushes freely |
| Message ordering | Single response, trivially ordered | Stream — ordering violations under load are common |
| Timing sensitivity | Request/response latency | Message round-trip latency, delivery lag under fan-out |
| Load model | Requests per second | Concurrent connections x messages per second |
| Failure modes | HTTP 4xx/5xx | Connection drops, frame fragmentation, backpressure |
| Proxy behaviour | Transparent | Nginx/ALB idle timeouts silently drop connections |

REST tests can run independently and in any order. WebSocket tests must manage connection lifecycle, handle async message arrival with timeouts, and clean up open connections in teardown. A test that does not close the connection leaves server state dirty for subsequent tests.

Fan-out is the scenario REST testing never surfaces: one sender, N receivers. If the server sends a message to 1000 subscribers and subscriber #437 is slow, does the server drop its message, queue it, or block all other subscribers? That answer must be tested.

---

## Functional Testing with Playwright

Playwright captures WebSocket traffic through `page.on('websocket')`. This is the right tool for testing that a WebSocket-powered feature (chat, live dashboard, collaborative editing) behaves correctly end-to-end, because it tests the full stack — server, transport, and UI rendering — simultaneously.

### page.on('websocket') Event

The `websocket` event fires when the page opens a WebSocket connection. The `WebSocket` object exposes `framesent` and `framereceived` events for every frame in both directions.

```typescript
import { test, expect } from '@playwright/test';

test('chat message appears in UI after WebSocket delivery', async ({ page }) => {
  const wsFrames: { dir: string; payload: string }[] = [];

  // Register before navigation so no frames are missed
  page.on('websocket', (ws) => {
    ws.on('framesent', (frame) => {
      wsFrames.push({ dir: 'sent', payload: frame.payload as string });
    });
    ws.on('framereceived', (frame) => {
      wsFrames.push({ dir: 'received', payload: frame.payload as string });
    });
    ws.on('close', () => console.log('WebSocket closed:', ws.url()));
  });

  await page.goto('/chat/room/42');

  // Send a message through the UI
  await page.fill('[data-testid="message-input"]', 'Hello room');
  await page.click('[data-testid="send-button"]');

  // Assert the message appears in the conversation
  await expect(page.locator('[data-testid="message-list"]'))
    .toContainText('Hello room');

  // Assert the frame was sent on the WebSocket
  const sentFrames = wsFrames.filter((f) => f.dir === 'sent');
  expect(sentFrames.length).toBeGreaterThan(0);

  const lastSent = JSON.parse(sentFrames.at(-1)!.payload);
  expect(lastSent).toMatchObject({ type: 'message', text: 'Hello room' });
});
```

### Mocking WebSocket Responses for Isolation

`page.routeWebSocket()` (Playwright 1.48+) intercepts the WebSocket channel and lets the test control what the server sends. This isolates the UI from a real backend — useful for testing edge cases the real server cannot easily produce (out-of-order messages, error frames, delayed delivery).

```typescript
test('notification badge increments on each server push', async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/notifications', (ws) => {
    ws.onMessage((msg) => {
      const parsed = JSON.parse(msg as string);
      if (parsed.type === 'subscribe') {
        ws.send(JSON.stringify({ type: 'subscribed', topic: parsed.topic }));
      }
    });

    // Push two server-initiated notifications after the page connects
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'notification', id: 1, text: 'New comment' }));
    }, 300);
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'notification', id: 2, text: 'New like' }));
    }, 600);
  });

  await page.goto('/dashboard');

  await expect(page.locator('[data-testid="notification-badge"]'))
    .toHaveText('2', { timeout: 2000 });
});
```

### Complete Test Example: Chat Application

```typescript
test.describe('Chat application — WebSocket functional tests', () => {
  test('two clients receive each other messages', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const receivedByPage2: string[] = [];
    page2.on('websocket', (ws) => {
      ws.on('framereceived', (frame) => {
        try {
          const msg = JSON.parse(frame.payload as string);
          if (msg.type === 'message') receivedByPage2.push(msg.text);
        } catch { /* non-JSON frames */ }
      });
    });

    await page1.goto('/chat/room/1');
    await page2.goto('/chat/room/1');

    // Give page2 time to connect and subscribe
    await page2.waitForSelector('[data-testid="connected-indicator"]');

    // Page1 sends a message
    await page1.fill('[data-testid="message-input"]', 'Hi from page 1');
    await page1.click('[data-testid="send-button"]');

    // Page2 UI should reflect it
    await expect(page2.locator('[data-testid="message-list"]'))
      .toContainText('Hi from page 1', { timeout: 3000 });

    expect(receivedByPage2).toContain('Hi from page 1');

    await context1.close();
    await context2.close();
  });

  test('reconnect indicator appears after connection drop', async ({ page }) => {
    await page.routeWebSocket('ws://localhost:3000/chat', (ws) => {
      ws.onMessage((msg) => {
        const parsed = JSON.parse(msg as string);
        if (parsed.type === 'trigger_drop') {
          ws.close(); // close without clean close frame
        }
      });
    });

    await page.goto('/chat/room/1');

    await page.evaluate(() => {
      (window as any).__ws.send(JSON.stringify({ type: 'trigger_drop' }));
    });

    await expect(page.locator('[data-testid="reconnecting-banner"]'))
      .toBeVisible({ timeout: 2000 });
  });
});
```

---

## Manual Testing Tools

### Postman (v9+)

Postman supports WebSocket natively. Workflow:

1. New Request > WebSocket Request
2. Enter `ws://` or `wss://` URL (with query params for auth tokens)
3. Add headers in the Headers tab (e.g. `Authorization: Bearer <token>`)
4. Click Connect — the timeline shows the 101 handshake
5. Type messages in the compose area and click Send
6. The Messages panel shows a timestamped log of all frames in both directions, colour-coded by direction

Postman is useful for exploratory testing and debugging — send a malformed message, watch the close frame, verify the close code. It is not suitable for CI; use k6 or pytest for that.

### websocat CLI

`websocat` is a Netcat-style WebSocket client. Install: `cargo install websocat` or download a binary.

```bash
# Connect interactively — stdin goes to the WebSocket, received frames print to stdout
websocat ws://localhost:8080/ws

# Send a single message and print all received frames until close
echo '{"type":"ping"}' | websocat ws://localhost:8080/ws

# Connect with a Bearer token header
websocat -H "Authorization: Bearer $TOKEN" wss://api.example.com/ws

# Subscribe and collect 5 frames then disconnect
websocat --text ws://localhost:8080/stream \
  <<< '{"action":"subscribe","topic":"prices"}' | head -5

# TLS with a self-signed cert
websocat --insecure wss://localhost:8443/ws
```

`websocat` is the fastest way to verify a server is responding correctly before writing a test. It works in shell scripts for environment smoke checks.

### Browser DevTools WebSocket Frame Inspector

Chrome/Firefox DevTools > Network tab > filter by `WS`:

- Click any WebSocket request to open the Frames panel
- Frames listed with timestamp, direction (arrow icon), byte length, and payload
- Text frames show the raw string; binary frames show hex
- Close frames show the close code and reason string

Use the DevTools inspector to understand the message protocol before writing tests — this is often faster than reading source code.

---

## k6 for WebSocket Performance Testing

k6's `k6/ws` module opens a WebSocket connection per virtual user (VU). The session object (`socket`) provides event handlers for `open`, `message`, `error`, and `close`, plus `socket.send()`, `socket.setInterval()`, and `socket.setTimeout()`.

### k6/ws Module Basics

```javascript
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const connectTime = new Trend('ws_connect_time_ms', true);
const msgLatency  = new Trend('ws_msg_latency_ms', true);
const msgErrors   = new Counter('ws_msg_errors');
const successRate = new Rate('ws_success_rate');
```

`ws.connect(url, params, callback)` opens the connection. The callback receives the `socket` object. The VU stays inside the callback until `socket.close()` is called or a `setTimeout` fires. The `check()` function works on message content the same way it does on HTTP responses.

### Sending and Receiving Messages

```javascript
export default function () {
  const url = 'wss://chat.example.com/ws';
  const params = {
    headers: { Authorization: `Bearer ${__ENV.WS_TOKEN}` },
    tags: { endpoint: 'chat' },
  };

  const connectedAt = Date.now();

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      connectTime.add(Date.now() - connectedAt);
      socket.send(JSON.stringify({ type: 'subscribe', room: 'lobby' }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.timestamp) {
        msgLatency.add(Date.now() - msg.timestamp);
      }
      const valid = check(msg, {
        'has type field':   (m) => m.type !== undefined,
        'latency under 1s': () => (Date.now() - (msg.timestamp || Date.now())) < 1000,
      });
      successRate.add(valid);
      if (!valid) msgErrors.add(1);
    });

    socket.on('error', (e) => {
      msgErrors.add(1);
      successRate.add(false);
    });

    socket.setInterval(() => {
      socket.send(JSON.stringify({ type: 'ping', clientTs: Date.now() }));
    }, 5000);

    socket.setTimeout(() => socket.close(), 60000);
  });

  check(res, { 'handshake succeeded (101)': (r) => r && r.status === 101 });
}
```

### Complete k6 Script: Chat Load Test (100 Concurrent Connections, 10-Minute Soak)

```javascript
// k6 run --env WS_URL=wss://chat.example.com/ws --env WS_TOKEN=xxx chat-soak.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

const connectLatency  = new Trend('ws_connect_latency_ms', true);
const msgRoundTrip    = new Trend('ws_msg_rtt_ms', true);
const connDrops       = new Counter('ws_connection_drops');
const msgErrors       = new Counter('ws_message_errors');
const activeSessions  = new Gauge('ws_active_sessions');
const deliverySuccess = new Rate('ws_delivery_success_rate');

export const options = {
  scenarios: {
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 100 },  // ramp to 100 concurrent connections
        { duration: '10m', target: 100 },  // hold for 10 minutes
        { duration: '1m',  target: 0   },  // ramp down
      ],
    },
  },
  thresholds: {
    ws_connect_latency_ms:    ['p(95)<500'],
    ws_msg_rtt_ms:            ['p(50)<100', 'p(95)<500', 'p(99)<1000'],
    ws_delivery_success_rate: ['rate>0.995'],
    ws_connection_drops:      ['count<5'],
  },
};

export function setup() {
  const res = ws.connect(__ENV.WS_URL, {}, function (socket) {
    socket.setTimeout(() => socket.close(), 1000);
  });
  if (!res || res.status !== 101) {
    throw new Error('Setup check failed: server did not accept WebSocket upgrade');
  }
  return { startTime: Date.now() };
}

export default function () {
  const url = __ENV.WS_URL || 'ws://localhost:8080/ws';
  const params = {
    headers: { Authorization: `Bearer ${__ENV.WS_TOKEN || 'test-token'}` },
    tags: { scenario: 'chat_soak' },
  };

  const connStart = Date.now();

  const res = ws.connect(url, params, function (socket) {
    activeSessions.add(1);
    const pendingEchos = new Map(); // echoId -> sentAt

    socket.on('open', () => {
      connectLatency.add(Date.now() - connStart);
      socket.send(JSON.stringify({
        type: 'subscribe',
        room: `load-test-room-${__VU % 10}`,  // spread across 10 rooms
      }));
    });

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'echo_reply' && pendingEchos.has(msg.echoId)) {
          msgRoundTrip.add(Date.now() - pendingEchos.get(msg.echoId));
          pendingEchos.delete(msg.echoId);
          deliverySuccess.add(true);
        } else if (msg.type === 'error') {
          msgErrors.add(1);
          deliverySuccess.add(false);
        }
      } catch (e) {
        msgErrors.add(1);
        deliverySuccess.add(false);
      }
    });

    socket.on('error', () => {
      connDrops.add(1);
      deliverySuccess.add(false);
    });

    socket.on('close', (code) => {
      activeSessions.add(-1);
      if (code !== 1000 && code !== 1001) {
        connDrops.add(1);
      }
    });

    // Send an echo probe every 10 seconds
    socket.setInterval(() => {
      const id = `${__VU}-${Date.now()}`;
      pendingEchos.set(id, Date.now());
      socket.send(JSON.stringify({ type: 'echo', echoId: id }));
    }, 10000);

    socket.setTimeout(() => {
      if (pendingEchos.size > 0) deliverySuccess.add(false);
      socket.close(1000, 'load test complete');
    }, 60000);
  });

  check(res, { 'WebSocket upgrade succeeded': (r) => r && r.status === 101 });
  sleep(1);
}

export function teardown(data) {
  console.log(`Soak duration: ${((Date.now() - data.startTime) / 1000).toFixed(0)}s`);
}
```

---

## Performance Metrics Specific to WebSockets

REST load testing tracks requests per second and HTTP latency. WebSocket load testing tracks a different set of metrics.

### Connection Establishment Time

Time from TCP connect to receipt of `101 Switching Protocols`. Elevated under load indicates TLS handshake pressure or server-side accept queue saturation. Target: p95 < 500ms at peak load.

### Message Round-Trip Latency (p50 / p95 / p99)

Time from client `send()` to receipt of the corresponding server reply. The primary quality metric for real-time applications. Report all three percentiles — the p99 reveals outliers that users experience as "frozen" updates.

| Use case | p50 | p95 | p99 |
|---|---|---|---|
| Trading / gaming | < 50ms | < 100ms | < 250ms |
| Chat / collaboration | < 100ms | < 500ms | < 1s |
| Live dashboard | < 500ms | < 2s | < 5s |

### Messages per Second Throughput

Total messages delivered to all clients per second. 100 connections each sending 10 messages/second = 1000 msg/s. At high throughput, look for head-of-line blocking in single-threaded servers.

### Connection Drop Rate Under Load

Count of connections that closed with a non-1000 code or TCP reset during the test. More than 1% unexpected drops at sustained load signals a resource limit: file descriptor exhaustion, memory pressure, or load balancer timeout.

### Fan-Out Latency

Time from when message M is sent by client A to when all N subscribing clients have received M. Measured by embedding a server timestamp in the broadcast and comparing it to each client's receipt time. Fan-out latency grows non-linearly with N — it is the critical metric for pub/sub architectures. At 10,000 subscribers, a naive synchronous broadcast can tail-lag by seconds.

### k6 Built-In WebSocket Metrics

k6 automatically tracks:

| Metric | Description |
|---|---|
| `ws_connecting` | Time to establish the connection (ms) |
| `ws_sessions` | Total sessions opened |
| `ws_msgs_sent` | Total messages sent by all VUs |
| `ws_msgs_received` | Total messages received by all VUs |
| `ws_session_duration` | Duration of each session |

Add custom `Trend` and `Rate` metrics (as in the soak script above) for application-specific assertions.

---

## Server-Sent Events (SSE) vs WebSocket

SSE is simpler and more suitable than WebSocket when the communication is one-directional (server to client only).

| Dimension | WebSocket | SSE |
|---|---|---|
| Direction | Bidirectional | Server to client only |
| Protocol | Custom framing over TCP | HTTP/1.1 or HTTP/2 |
| Client API | `WebSocket` object | `EventSource` object |
| Reconnect | Application-level | Automatic — browser sends `Last-Event-ID` header |
| Proxy support | Requires WebSocket-aware proxy | Works through any HTTP proxy |
| Use case | Chat, gaming, collaborative editing | Live feeds, dashboards, LLM token streaming |
| Auth | Header at upgrade time | Standard HTTP headers on each reconnect |

### How SSE Testing Differs

Because SSE is HTTP, test it with `httpx`, `requests`, or any HTTP client that supports response streaming. No handshake to verify, no opcodes, no close frame — just a `text/event-stream` content type and line-delimited events.

```python
import httpx
import json
import pytest


def parse_sse_lines(lines: list[str]) -> list[dict]:
    """Parse a list of SSE text lines into event dicts."""
    events, current = [], {}
    for line in lines:
        line = line.strip()
        if line.startswith('id: '):
            current['id'] = line[4:]
        elif line.startswith('event: '):
            current['type'] = line[7:]
        elif line.startswith('data: '):
            current['data'] = line[6:]
        elif line == '' and current:
            events.append(current)
            current = {}
    return events


def test_sse_content_type():
    with httpx.stream('GET', 'http://localhost:8080/events') as r:
        assert r.status_code == 200
        assert r.headers['content-type'].startswith('text/event-stream')


def test_sse_delivers_three_events():
    lines = []
    with httpx.stream('GET', 'http://localhost:8080/events') as r:
        for line in r.iter_lines():
            lines.append(line)
            if len(parse_sse_lines(lines)) >= 3:
                break
    assert len(parse_sse_lines(lines)) >= 3


def test_sse_event_schema():
    lines = []
    with httpx.stream('GET', 'http://localhost:8080/events') as r:
        for line in r.iter_lines():
            lines.append(line)
            events = parse_sse_lines(lines)
            if events:
                break

    payload = json.loads(parse_sse_lines(lines)[0]['data'])
    assert 'type' in payload
    assert 'timestamp' in payload
```

For Playwright + SSE: assert on the UI directly. SSE events update the DOM just like WebSocket events, and `expect(locator).toHaveText()` waits for the update without needing to intercept the stream.

---

## Contract Testing for WebSocket Message Schemas

WebSocket protocols are informal by default. Formalising the schema catches server-side regressions before they reach production.

### JSON Schema Validation on Received Messages

```python
import asyncio
import json
import jsonschema
import pytest
import websockets

NOTIFICATION_SCHEMA = {
    "type": "object",
    "required": ["type", "id", "text", "timestamp"],
    "properties": {
        "type":      {"type": "string", "enum": ["notification", "welcome", "ack"]},
        "id":        {"type": "integer"},
        "text":      {"type": "string", "minLength": 1},
        "timestamp": {"type": "integer"},
        "seq":       {"type": "integer"},
    },
    "additionalProperties": False,
}


@pytest.mark.asyncio
async def test_all_received_messages_match_schema():
    received = []
    async with websockets.connect('ws://localhost:8080/notifications') as ws:
        for _ in range(5):
            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            msg = json.loads(raw)
            # Raises jsonschema.ValidationError on schema violation
            jsonschema.validate(instance=msg, schema=NOTIFICATION_SCHEMA)
            received.append(msg)

    assert len(received) == 5
```

### Pact for Async Messaging

Pact's async message contract support applies to any messaging system including WebSocket. The consumer defines the expected message shape; the provider verifies it. This decouples consumer and provider deployments and catches schema drift in CI via the `can-i-deploy` gate.

```python
from pact import MessageConsumer, Provider
from pact.matchers import Like

pact = (
    MessageConsumer('NotificationUI')
    .has_pact_with(Provider('NotificationService'))
)

(
    pact
    .given('a notification exists for user 42')
    .expects_to_receive('a notification message')
    .with_content({
        'type':      'notification',
        'id':        Like(1),
        'text':      Like('You have a new message'),
        'timestamp': Like(1714000000),
    })
    .with_metadata({'contentType': 'application/json'})
)
```

See [[mock-strategies]] for context on test double taxonomy and when to use contract testing over integration testing.

---

## Common Failure Modes to Test

### Connection Drops Under Load

Nginx default WebSocket timeout is 60 seconds; AWS ALB default is also 60 seconds (configurable to 4000 seconds). If the client sends no frames within the timeout window, the proxy silently drops the TCP connection. The server believes the client is still connected; the client sees a read timeout.

Test: hold a connection idle for 65 seconds with no sends. Verify the client reconnect logic fires.

### Message Ordering Guarantees (or Lack Thereof)

A single WebSocket connection is ordered (TCP guarantees it). Fan-out to multiple clients through a pub/sub layer (Redis Pub/Sub, Kafka) does not guarantee cross-client ordering. Two messages published in sequence may arrive in different orders at different subscribers.

Test: have the server send 20 messages with monotonically increasing `seq` fields. Assert `sequences == sorted(sequences)`. Under load, this test will reveal reordering in pub/sub fan-out.

### Backpressure Handling

If a slow consumer cannot drain the receive buffer, the server's send buffer fills. Behaviour depends on the server: some block the send call (backpressure propagation), some drop messages, some close the connection.

Test: connect a client, stop reading deliberately, and have the server send a burst of messages. After 10 seconds of no reads, observe whether the server queues, drops with an error frame, or closes cleanly. Assert whichever the spec documents.

### Reconnection Logic in the Client

Reconnect logic is often written once and never tested again. Steps:
1. Connect successfully
2. Force the connection closed from the server side without a clean close frame (simulating a network drop)
3. Assert the client attempts to reconnect within a defined backoff window
4. Assert the reconnect succeeds
5. Assert no messages sent during the gap are silently lost (if the server guarantees replay)

### Authentication Token Expiry Mid-Session

Short-lived JWTs (5-15 minutes) expire during long-lived WebSocket sessions. Test: issue a token with a 10-second TTL. Connect. Wait 12 seconds. Send a message. The server should either close with code 4001, accept if it revalidates each message, or have the client proactively refresh and reconnect. Verify whichever behaviour is documented. Silent acceptance of an expired token is a security failure; silent disconnection without an error code is a UX failure.

---

## CI Integration

### What CI Needs

A WebSocket test suite in CI requires a real server or a stub. Unlike REST, you cannot stub at the HTTP request level because the protocol switches to a custom framing layer after the upgrade.

Options:

1. **Start the real server in CI** — simplest for integration tests. Use a Docker Compose service with a health check. Gate the test step on the health check passing.

2. **Lightweight Node.js echo server** — for unit-level tests that only need a functional WebSocket endpoint:

```javascript
// test-helpers/ws-echo-server.js
const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.WS_TEST_PORT || 8765 });

server.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'welcome' }));
  socket.on('message', (data) => socket.send(data)); // echo
});

server.on('listening', () => {
  process.send && process.send('ready');
  console.log(`WS echo server on port ${server.address().port}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
```

3. **WireMock limitation** — WireMock does not natively support WebSocket. Its HTTP stub mechanism cannot handle the protocol upgrade. Use a Node.js echo server (above) or Mockoon (which added WebSocket support in v5) for CI stubs. See [[mock-strategies]] for more on stub selection.

### GitHub Actions Example

```yaml
name: WebSocket Tests

on: [push, pull_request]

jobs:
  ws-tests:
    runs-on: ubuntu-latest

    services:
      app:
        image: your-app:latest
        ports:
          - 8080:8080
        options: >-
          --health-cmd "curl -f http://localhost:8080/health || exit 1"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install test dependencies
        run: pip install -r requirements-test.txt

      - name: Run WebSocket functional tests
        run: pytest tests/websocket/ -v --timeout=30
        env:
          WS_URL: ws://localhost:8080/ws

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright WebSocket E2E tests
        run: npx playwright test tests/e2e/websocket/

      - name: Run k6 WebSocket smoke test (on PR)
        if: github.event_name == 'pull_request'
        uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/ws-smoke.js
          flags: --vus 5 --duration 30s
        env:
          WS_URL: ws://localhost:8080/ws

  ws-soak:
    # Run the 10-minute soak on a schedule, not on every PR
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/chat-soak.js
        env:
          WS_URL: ${{ secrets.STAGING_WS_URL }}
          WS_TOKEN: ${{ secrets.STAGING_WS_TOKEN }}
```

### Key CI Rules

- Set a per-test timeout. WebSocket tests without a timeout will hang indefinitely if a message never arrives. Use `asyncio.wait_for()` in Python, `socket.setTimeout()` in k6, and Playwright's built-in assertion timeout.
- Close all connections in teardown. Open connections prevent graceful server shutdown and block the job from completing.
- Run soak tests on a nightly schedule, not on every PR. They take 12+ minutes.
- Use `--exit-on-running-status` in k6 to fail the CI job when thresholds are breached, not only when k6 itself errors.

---

## Open Questions

- `k6/experimental/websockets` (Web API-compatible interface) is being promoted to replace `k6/ws`. Migration: replace `ws.connect(url, params, fn)` with `new WebSocket(url)` and async event handlers. Monitor for GA status before migrating production scripts.
- Mockoon's WebSocket support (v5+) needs validation in stateful multi-step scenarios before recommending it as the default CI stub.
- Fan-out latency measurement at scale (10k+ subscribers) requires distributed load generation — k6 Cloud or k6 Operator on Kubernetes — rather than a single k6 process.

---

## Connections

[[api-testing]] · [[api-testing-advanced]] · [[performance-testing]] · [[load-testing-advanced]] · [[playwright]] · [[mock-strategies]] · [[api-performance-testing]] · [[graphql-testing]] · [[tqa-hub]]
