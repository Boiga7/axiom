---
type: concept
category: technical-qa
tags: [websocket, async, api-testing, sse, real-time, protocol-testing]
updated: 2026-05-03
para: resource
tldr: Testing WebSocket connections, Server-Sent Events, and async protocols — connection lifecycle, message ordering, load testing, and mocking patterns.
---

# WebSocket and Async Protocol Testing

WebSocket and SSE testing occupies a different space from REST API testing. The protocol is stateful, long-lived, and bidirectional. You cannot model it as request/response pairs. Tests must manage connection lifecycle, assert on async message streams, and verify behaviour under partial failures — dropped connections, out-of-order delivery, backpressure.

---

## Why WebSocket Testing Differs from REST

| Dimension | REST | WebSocket |
|---|---|---|
| Connection | Short-lived per request | Long-lived, persistent |
| Direction | Client initiates, server responds | Bidirectional, server-push |
| State | Stateless | Stateful (connection context) |
| Ordering | Single response per request | Message stream, order matters |
| Failure modes | HTTP errors (4xx/5xx) | Connection drops, partial messages, frame corruption |
| Load model | Requests per second | Concurrent connections + message throughput |

REST tests assert on a response. WebSocket tests assert on a stream over time, which requires async primitives in every testing tool.

---

## Protocol Basics

### Handshake

WebSocket starts as an HTTP/1.1 upgrade:

```
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Server responds with 101 Switching Protocols. From that point the connection is a raw TCP framing layer — no HTTP overhead per message.

### Frames and Opcodes

| Opcode | Meaning |
|---|---|
| 0x0 | Continuation frame |
| 0x1 | Text frame (UTF-8) |
| 0x2 | Binary frame |
| 0x8 | Close frame |
| 0x9 | Ping |
| 0xA | Pong |

Tests should exercise close frames explicitly (not just drop the TCP connection) and verify ping/pong heartbeat behaviour under idle connections.

---

## Testing with pytest and websocket-client (Python)

`websocket-client` is the standard synchronous Python library. For async code, use `websockets`.

```python
# requirements: websocket-client, pytest, pytest-asyncio, websockets

import asyncio
import pytest
import websockets
import json


# --- Synchronous tests with websocket-client ---

import websocket

def test_connect_and_receive_welcome():
    ws = websocket.create_connection("ws://localhost:8080/ws")
    result = ws.recv()
    data = json.loads(result)
    assert data["type"] == "welcome"
    ws.close()


def test_send_and_receive_echo():
    ws = websocket.create_connection("ws://localhost:8080/echo")
    ws.send(json.dumps({"message": "hello"}))
    result = ws.recv()
    data = json.loads(result)
    assert data["message"] == "hello"
    ws.close()


def test_close_frame_sent():
    ws = websocket.create_connection("ws://localhost:8080/ws")
    ws.recv()  # consume welcome
    ws.close()
    # close() sends opcode 0x8; connection should be closed cleanly
    assert ws.connected is False


# --- Async tests with websockets ---

@pytest.mark.asyncio
async def test_message_ordering():
    async with websockets.connect("ws://localhost:8080/stream") as ws:
        await ws.send(json.dumps({"action": "subscribe", "topic": "prices"}))
        
        messages = []
        for _ in range(5):
            raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
            messages.append(json.loads(raw))
        
        # Verify sequence numbers are monotonically increasing
        sequences = [m["seq"] for m in messages]
        assert sequences == sorted(sequences), f"Out-of-order delivery: {sequences}"


@pytest.mark.asyncio
async def test_reconnect_after_server_drop():
    """Verify client can reconnect after the server closes the connection."""
    async with websockets.connect("ws://localhost:8080/ws") as ws:
        await ws.send(json.dumps({"action": "trigger_close"}))
        with pytest.raises(websockets.exceptions.ConnectionClosed):
            await ws.recv()

    # Reconnect
    async with websockets.connect("ws://localhost:8080/ws") as ws2:
        msg = json.loads(await asyncio.wait_for(ws2.recv(), timeout=2.0))
        assert msg["type"] == "welcome"


@pytest.mark.asyncio
async def test_ping_pong_heartbeat():
    async with websockets.connect("ws://localhost:8080/ws", ping_interval=1, ping_timeout=5) as ws:
        await asyncio.sleep(3)  # allow multiple ping cycles
        assert ws.open, "Connection closed during heartbeat window"
```

### pytest-websockets Fixtures

`pytest-websockets` (part of the `starlette` test ecosystem) provides fixtures for FastAPI/Starlette apps:

```python
# For FastAPI apps — no real server needed
from fastapi.testclient import TestClient
from app.main import app

def test_websocket_endpoint():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "ping"})
        data = ws.receive_json()
        assert data["type"] == "pong"


def test_broadcast_to_multiple_clients():
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws1, \
         client.websocket_connect("/ws") as ws2:
        ws1.send_json({"type": "broadcast", "message": "hello all"})
        # Both clients should receive the broadcast
        msg1 = ws2.receive_json()
        assert msg1["message"] == "hello all"
```

---

## Testing with JavaScript (ws library + Jest)

```javascript
// npm install ws jest

const WebSocket = require('ws');

describe('WebSocket server', () => {
  let server;
  let port;

  beforeAll((done) => {
    server = new WebSocket.Server({ port: 0 }, () => {
      port = server.address().port;
      done();
    });

    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ type: 'welcome' }));
      socket.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.action === 'echo') {
          socket.send(JSON.stringify({ echo: msg.payload }));
        }
      });
    });
  });

  afterAll((done) => server.close(done));

  test('receives welcome on connect', (done) => {
    const client = new WebSocket(`ws://localhost:${port}`);
    client.on('message', (data) => {
      const msg = JSON.parse(data);
      expect(msg.type).toBe('welcome');
      client.close();
      done();
    });
  });

  test('echo round-trip', (done) => {
    const client = new WebSocket(`ws://localhost:${port}`);
    client.once('message', () => {  // consume welcome
      client.send(JSON.stringify({ action: 'echo', payload: 'test-value' }));
      client.once('message', (data) => {
        const msg = JSON.parse(data);
        expect(msg.echo).toBe('test-value');
        client.close();
        done();
      });
    });
  });

  test('close frame received on server close', (done) => {
    const client = new WebSocket(`ws://localhost:${port}`);
    client.on('open', () => {
      // Force server-side close
      server.clients.forEach((c) => c.close(1000, 'test done'));
    });
    client.on('close', (code, reason) => {
      expect(code).toBe(1000);
      done();
    });
  });
});
```

---

## k6 WebSocket Load Testing

k6's `k6/ws` module drives WebSocket load tests. Each virtual user (VU) maintains its own connection.

### Basic connection and message test

```javascript
// k6 run websocket-test.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const messageLatency = new Trend('ws_message_latency');
const errorsCounter = new Counter('ws_errors');

export const options = {
  vus: 100,
  duration: '30s',
};

export default function () {
  const url = 'ws://localhost:8080/ws';
  const params = { tags: { name: 'ws_connection' } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ action: 'subscribe', topic: 'updates' }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      const latency = Date.now() - msg.timestamp;
      messageLatency.add(latency);

      check(msg, {
        'message has seq': (m) => m.seq !== undefined,
        'latency under 100ms': () => latency < 100,
      });
    });

    socket.on('error', (e) => {
      errorsCounter.add(1);
      console.error(`WS error: ${e.error()}`);
    });

    socket.setTimeout(() => socket.close(), 20000);
  });

  check(res, { 'connected successfully': (r) => r && r.status === 101 });
  sleep(1);
}
```

### Testing concurrent connections with message throughput

```javascript
import ws from 'k6/ws';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const successRate = new Rate('ws_success_rate');

export const options = {
  stages: [
    { duration: '10s', target: 500 },   // ramp up to 500 concurrent connections
    { duration: '30s', target: 500 },   // hold
    { duration: '10s', target: 0 },     // ramp down
  ],
  thresholds: {
    ws_success_rate: ['rate>0.99'],
    ws_message_latency: ['p(95)<200'],
  },
};

export default function () {
  ws.connect('ws://localhost:8080/ws', {}, function (socket) {
    let received = 0;

    socket.on('message', (data) => {
      received++;
      successRate.add(true);
    });

    socket.on('error', () => successRate.add(false));

    // Send 10 messages per connection
    for (let i = 0; i < 10; i++) {
      socket.send(JSON.stringify({ seq: i, ts: Date.now() }));
    }

    socket.setTimeout(() => {
      check(received, { 'received all messages': (r) => r >= 10 });
      socket.close();
    }, 5000);
  });
}
```

Key k6 WebSocket metrics to threshold: `ws_connecting` (time to 101), `ws_msgs_sent`, `ws_msgs_received`, `ws_sessions`.

---

## Playwright WebSocket Interception

Playwright captures WebSocket traffic through the `page.on('websocket')` event. This lets you assert on WebSocket messages in E2E tests without a separate WebSocket client.

```javascript
// playwright.config.js — no special config needed

const { test, expect } = require('@playwright/test');

test('WebSocket messages appear in UI', async ({ page }) => {
  const wsMessages = [];

  // Intercept WebSocket before navigation
  page.on('websocket', (ws) => {
    ws.on('framesent', (frame) => {
      wsMessages.push({ direction: 'sent', data: frame.payload });
    });
    ws.on('framereceived', (frame) => {
      wsMessages.push({ direction: 'received', data: frame.payload });
    });
    ws.on('close', () => {
      console.log('WebSocket closed');
    });
  });

  await page.goto('http://localhost:3000/live-feed');

  // Wait for a specific message to arrive
  await page.waitForFunction(() => {
    return document.querySelector('.feed-item') !== null;
  });

  const received = wsMessages.filter((m) => m.direction === 'received');
  expect(received.length).toBeGreaterThan(0);
  const firstPayload = JSON.parse(received[0].data);
  expect(firstPayload).toHaveProperty('type');
});


test('WebSocket mock — inject fake server messages', async ({ page }) => {
  // Intercept and mock WebSocket responses
  await page.routeWebSocket('ws://localhost:8080/ws', (ws) => {
    ws.onMessage((message) => {
      // Echo back with a modification
      const msg = JSON.parse(message);
      ws.send(JSON.stringify({ ...msg, mocked: true }));
    });

    // Push a server-initiated message after 500ms
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'update', value: 42, mocked: true }));
    }, 500);
  });

  await page.goto('http://localhost:3000/dashboard');
  await expect(page.locator('[data-testid="update-value"]')).toHaveText('42');
});
```

`page.routeWebSocket` (Playwright 1.48+) intercepts and controls the WebSocket channel — useful for injecting race conditions or testing reconnect UI flows.

---

## Postman WebSocket Support

Postman supports WebSocket requests natively (since v9). Key workflow:

1. New Request > WebSocket Request
2. Enter `ws://` or `wss://` URL
3. Connect — Postman shows the 101 handshake in the timeline
4. Send messages manually or script them in the Pre-request Script tab
5. Messages panel shows full send/receive log with timestamps

Postman WebSocket tests are manual/exploratory tools, not suited for CI. For CI, use the Python or k6 approaches above.

---

## Server-Sent Events (SSE) Testing

SSE is unidirectional (server to client) over HTTP/1.1 or HTTP/2. The response Content-Type is `text/event-stream`. Each event is a plain-text block:

```
id: 42
event: price_update
data: {"symbol":"AAPL","price":189.50}

```

### Python SSE testing with httpx

```python
import httpx
import pytest


def test_sse_stream_receives_events():
    events = []
    with httpx.stream("GET", "http://localhost:8080/events") as r:
        assert r.headers["content-type"].startswith("text/event-stream")
        for line in r.iter_lines():
            if line.startswith("data: "):
                payload = line[6:]
                events.append(payload)
            if len(events) >= 3:
                break

    assert len(events) == 3
    import json
    first = json.loads(events[0])
    assert "symbol" in first


def test_sse_event_types():
    event_types = []
    with httpx.stream("GET", "http://localhost:8080/events") as r:
        current_event = {}
        for line in r.iter_lines():
            if line.startswith("event: "):
                current_event["type"] = line[7:]
            elif line.startswith("data: "):
                current_event["data"] = line[6:]
            elif line == "" and current_event:
                event_types.append(current_event.get("type", "message"))
                current_event = {}
            if len(event_types) >= 5:
                break

    assert "price_update" in event_types
```

### JavaScript SSE testing with EventSource

```javascript
test('SSE stream delivers typed events', (done) => {
  const source = new EventSource('http://localhost:8080/events');
  const received = [];

  source.addEventListener('price_update', (e) => {
    received.push(JSON.parse(e.data));
    if (received.length >= 3) {
      source.close();
      expect(received[0]).toHaveProperty('symbol');
      done();
    }
  });

  source.onerror = (e) => {
    source.close();
    done(new Error(`SSE error: ${JSON.stringify(e)}`));
  };
}, 10000);
```

---

## GraphQL Subscriptions

GraphQL subscriptions run over WebSocket using the `graphql-ws` protocol (supersedes `subscriptions-transport-ws`). The handshake includes a `graphql-transport-ws` subprotocol header.

```python
import asyncio
import pytest
import websockets
import json


@pytest.mark.asyncio
async def test_graphql_subscription():
    url = "ws://localhost:4000/graphql"
    subprotocol = "graphql-transport-ws"

    async with websockets.connect(url, subprotocols=[subprotocol]) as ws:
        # 1. connection_init
        await ws.send(json.dumps({"type": "connection_init", "payload": {}}))
        ack = json.loads(await ws.recv())
        assert ack["type"] == "connection_ack"

        # 2. subscribe
        await ws.send(json.dumps({
            "id": "1",
            "type": "subscribe",
            "payload": {
                "query": "subscription { priceUpdated { symbol price } }"
            }
        }))

        # 3. receive next messages
        messages = []
        for _ in range(3):
            raw = json.loads(await asyncio.wait_for(ws.recv(), timeout=5.0))
            assert raw["type"] == "next"
            messages.append(raw["payload"]["data"]["priceUpdated"])

        assert all("symbol" in m for m in messages)

        # 4. complete
        await ws.send(json.dumps({"id": "1", "type": "complete"}))
```

---

## Mocking WebSocket Servers

### Python fixture with websockets

```python
import asyncio
import threading
import pytest
import websockets


class MockWebSocketServer:
    def __init__(self, host="localhost", port=0):
        self.host = host
        self.port = port
        self.received = []
        self._server = None
        self._thread = None

    async def _handler(self, websocket):
        await websocket.send(json.dumps({"type": "welcome"}))
        async for message in websocket:
            self.received.append(json.loads(message))
            await websocket.send(json.dumps({"echo": json.loads(message)}))

    def start(self):
        loop = asyncio.new_event_loop()

        async def _run():
            self._server = await websockets.serve(self._handler, self.host, self.port)
            self.port = self._server.sockets[0].getsockname()[1]

        loop.run_until_complete(_run())
        self._thread = threading.Thread(target=loop.run_forever, daemon=True)
        self._thread.start()
        self._loop = loop

    def stop(self):
        self._loop.call_soon_threadsafe(self._server.close)


@pytest.fixture
def mock_ws_server():
    server = MockWebSocketServer()
    server.start()
    yield server
    server.stop()
```

### Node.js ws mock server

```javascript
const WebSocket = require('ws');

function createMockServer(options = {}) {
  const server = new WebSocket.Server({ port: 0 });
  const { onMessage, welcomePayload } = options;

  server.on('connection', (socket) => {
    if (welcomePayload) {
      socket.send(JSON.stringify(welcomePayload));
    }

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      if (onMessage) {
        const response = onMessage(msg);
        if (response) socket.send(JSON.stringify(response));
      }
    });
  });

  return {
    port: () => server.address().port,
    close: (cb) => server.close(cb),
    broadcast: (payload) => {
      server.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(payload));
        }
      });
    },
  };
}

// Usage in Jest
describe('client reconnect logic', () => {
  let mockServer;

  beforeEach(() => {
    mockServer = createMockServer({
      welcomePayload: { type: 'welcome' },
      onMessage: (msg) => ({ echo: msg }),
    });
  });

  afterEach((done) => mockServer.close(done));

  test('client handles forced disconnect', (done) => {
    // ... test using mockServer.port()
  });
});
```

---

## Connection Lifecycle Testing

Key states to cover in tests:

| State | What to test |
|---|---|
| Connect | 101 response, welcome message, auth rejection (4xx before upgrade) |
| Idle | Heartbeat ping/pong keeps connection alive |
| Message exchange | Ordering, payload schema validation, error frames |
| Slow consumer | Server-side backpressure (message queue growth) |
| Disconnect | Client-initiated close (opcode 0x8 with 1000), server-initiated close |
| Reconnect | Client re-establishes, resumes session if applicable |
| Auth expiry | Token rotation during long-lived connections |

```python
@pytest.mark.asyncio
async def test_auth_required_before_messages():
    """Server must reject unauthenticated connections with close code 4001."""
    try:
        async with websockets.connect("ws://localhost:8080/ws") as ws:
            # Should receive close frame immediately, not a welcome
            await asyncio.wait_for(ws.recv(), timeout=2.0)
            pytest.fail("Expected connection to be rejected")
    except websockets.exceptions.ConnectionClosedError as e:
        assert e.code == 4001  # application-defined: Unauthorized
```

---

## Common Failure Modes

**Connection drops mid-stream** — test by having the mock server close without a close frame. Client should handle `ConnectionResetError` and trigger reconnect logic.

**Message ordering violations** — assign sequence numbers server-side and assert monotonic increase in tests. Fan-out architectures (pub/sub) commonly deliver out-of-order under load.

**Backpressure / slow consumer** — if the client cannot process messages fast enough, the server's send buffer fills. Test by blocking the receive loop and measuring whether the server applies backpressure or drops messages.

**Heartbeat failures** — default ping timeout is 20–60 seconds depending on proxy config. Nginx and AWS ALB both have WebSocket idle timeouts that can silently drop connections. Test with `ping_interval` set lower than the proxy timeout.

**Frame fragmentation** — large binary messages may arrive as continuation frames. `websocket-client` and `websockets` reassemble automatically; raw frame-level tests should send fragmented frames explicitly.

**Duplicate delivery** — in reconnect scenarios, verify the server does not replay already-delivered messages (requires server-side sequence tracking).

---

## Delivery Guarantee Testing

WebSocket itself provides no delivery guarantees above TCP. Application-level guarantees must be tested explicitly:

```python
@pytest.mark.asyncio
async def test_at_least_once_delivery_after_reconnect():
    """Messages sent while disconnected should be delivered on reconnect."""
    # Receive some messages to establish a sequence position
    async with websockets.connect("ws://localhost:8080/ws") as ws:
        await ws.send(json.dumps({"action": "subscribe", "last_seq": 0}))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
        last_seq = msg["seq"]

    # Reconnect with last_seq — server should replay missed messages
    async with websockets.connect("ws://localhost:8080/ws") as ws:
        await ws.send(json.dumps({"action": "subscribe", "last_seq": last_seq}))
        replay = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
        # If no new messages, server sends a caught-up signal
        assert replay["seq"] >= last_seq
```

---

## Cross-references

[[technical-qa/api-testing]] · [[technical-qa/api-performance-testing]] · [[technical-qa/load-testing-advanced]] · [[technical-qa/graphql-testing]] · [[technical-qa/mock-strategies]] · [[technical-qa/playwright-advanced]] · [[technical-qa/postman-newman]] · [[technical-qa/tqa-hub]]
