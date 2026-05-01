---
type: concept
category: cs-fundamentals
para: resource
tags: [websockets, real-time, fastapi, broadcasting, rooms, heartbeat, backpressure]
sources: []
updated: 2026-05-01
---

# WebSockets

Persistent bidirectional connections for real-time features — chat, live feeds, collaborative editing.

---

## Protocol Fundamentals

```
HTTP:        Request-response. Client always initiates. No server push.
WebSocket:   Full-duplex over a single TCP connection.
             Starts as HTTP (101 Switching Protocols), upgrades to WS.
             Client or server can send at any time.
             No request/response framing — just frames.

When to use WebSocket (not SSE):
  Bidirectional: client sends AND server sends (chat, games, collaborative editing)
  High frequency: many messages per second (trading, live metrics)
  Low latency: < 50ms round-trip matters

When to use SSE instead:
  Server-to-client only (LLM streaming, live dashboards, notifications)
  SSE: simpler, HTTP/2 compatible, automatic reconnect, easier to proxy

When to use neither:
  Occasional updates (polling every 30s is fine)
  Non-interactive delivery (webhooks, batch jobs)
```

---

## FastAPI WebSocket Server

```python
# app/websockets/chat.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated
import json

app = FastAPI()

class ConnectionManager:
    """Manages active WebSocket connections, optionally grouped into rooms."""

    def __init__(self) -> None:
        # room_id → set of connected WebSockets
        self._rooms: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str) -> None:
        await websocket.accept()
        if room_id not in self._rooms:
            self._rooms[room_id] = set()
        self._rooms[room_id].add(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str) -> None:
        self._rooms.get(room_id, set()).discard(websocket)
        if not self._rooms.get(room_id):
            self._rooms.pop(room_id, None)

    async def broadcast(self, room_id: str, message: dict,
                        exclude: WebSocket | None = None) -> None:
        """Send to all connections in a room, optionally excluding the sender."""
        dead = set()
        for ws in self._rooms.get(room_id, set()):
            if ws is exclude:
                continue
            try:
                await ws.send_json(message)
            except RuntimeError:
                dead.add(ws)
        for ws in dead:
            self._rooms.get(room_id, set()).discard(ws)

    async def send_personal(self, websocket: WebSocket, message: dict) -> None:
        await websocket.send_json(message)


manager = ConnectionManager()


@app.websocket("/ws/chat/{room_id}")
async def chat_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str,              # query param: ws://...?token=xxx
) -> None:
    user = verify_token(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, room_id)

    # Notify room that user joined
    await manager.broadcast(room_id, {
        "type": "user_joined",
        "user": user["name"],
    }, exclude=websocket)

    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(room_id, {
                "type": "message",
                "user": user["name"],
                "text": data["text"],
                "timestamp": datetime.utcnow().isoformat(),
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast(room_id, {
            "type": "user_left",
            "user": user["name"],
        })
```

---

## Heartbeat / Ping-Pong

```python
import asyncio
from fastapi import WebSocket, WebSocketDisconnect

HEARTBEAT_INTERVAL = 30  # seconds
HEARTBEAT_TIMEOUT = 10   # seconds to wait for pong

@app.websocket("/ws/live")
async def live_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()

    async def heartbeat():
        """Send ping every 30s; close connection if pong not received."""
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            try:
                await asyncio.wait_for(
                    websocket.send_json({"type": "ping"}),
                    timeout=HEARTBEAT_TIMEOUT,
                )
            except (asyncio.TimeoutError, RuntimeError):
                await websocket.close(code=1001, reason="Heartbeat timeout")
                return

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "pong":
                continue   # heartbeat response — ignore
            await handle_message(data)
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
```

---

## Browser Client

```typescript
// websocket-client.ts — reconnecting WebSocket with exponential backoff
class ReconnectingWebSocket {
    private ws: WebSocket | null = null;
    private retryCount = 0;
    private maxRetries = 10;

    constructor(
        private url: string,
        private handlers: {
            onMessage: (data: unknown) => void;
            onConnect?: () => void;
            onDisconnect?: () => void;
        },
    ) {
        this.connect();
    }

    private connect(): void {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            this.retryCount = 0;
            this.handlers.onConnect?.();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "ping") {
                this.ws?.send(JSON.stringify({ type: "pong" }));
                return;
            }
            this.handlers.onMessage(data);
        };

        this.ws.onclose = () => {
            this.handlers.onDisconnect?.();
            if (this.retryCount < this.maxRetries) {
                const delay = Math.min(1000 * 2 ** this.retryCount, 30_000);
                setTimeout(() => this.connect(), delay);
                this.retryCount++;
            }
        };
    }

    send(data: unknown): void {
        this.ws?.send(JSON.stringify(data));
    }

    close(): void {
        this.maxRetries = 0;
        this.ws?.close();
    }
}

// Usage in React
const ws = new ReconnectingWebSocket(`ws://api.myapp.com/ws/chat/room-1?token=${token}`, {
    onMessage: (data) => setMessages((prev) => [...prev, data]),
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
});
```

---

## Scaling WebSockets

```
Problem: WebSocket connections are stateful and bound to one server process.
         Horizontal scaling means user A (on server 1) can't reach user B (on server 2).

Solution: pub/sub backing store (Redis, Kafka)

Redis pub/sub pattern:
  server 1 receives message from user A → publishes to Redis channel "room:abc"
  server 2 is subscribed to "room:abc" → receives message → delivers to user B on server 2

  producer (any server):  await redis.publish("room:abc", json.dumps(message))
  consumer (each server): async for msg in redis.subscribe("room:abc"): broadcast(msg)

Kubernetes:
  Use ClusterIP service (not LoadBalancer) for sticky sessions.
  Add NGINX Ingress annotation: nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  Increase nginx keepalive timeout to match WS idle time.
```

```python
import redis.asyncio as redis
import asyncio, json

class PubSubConnectionManager:
    def __init__(self, redis_url: str) -> None:
        self._redis = redis.from_url(redis_url)
        self._local_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, room_id: str) -> None:
        await ws.accept()
        self._local_connections.setdefault(room_id, set()).add(ws)
        # Subscribe to room's Redis channel (once per room, not per connection)
        asyncio.create_task(self._listen(room_id))

    async def _listen(self, room_id: str) -> None:
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(f"room:{room_id}")
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                for ws in self._local_connections.get(room_id, set()):
                    await ws.send_json(data)

    async def publish(self, room_id: str, message: dict) -> None:
        await self._redis.publish(f"room:{room_id}", json.dumps(message))
```

---

## Testing WebSockets

```python
# pytest + httpx WebSocket test
import pytest
from fastapi.testclient import TestClient

def test_chat_message_broadcast(client: TestClient) -> None:
    with (
        client.websocket_connect("/ws/chat/room-1?token=user1_token") as ws1,
        client.websocket_connect("/ws/chat/room-1?token=user2_token") as ws2,
    ):
        ws1.send_json({"text": "Hello from user 1"})
        
        # ws2 should receive the broadcast
        msg = ws2.receive_json(timeout=2)
        assert msg["type"] == "message"
        assert msg["text"] == "Hello from user 1"
```

---

## Connections

[[se-hub]] · [[cs-fundamentals/networking]] · [[cs-fundamentals/concurrency]] · [[web-frameworks/fastapi]] · [[cs-fundamentals/streaming-patterns]]
