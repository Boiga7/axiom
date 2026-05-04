---
type: synthesis
category: synthesis
para: resource
tags: [debugging, websocket, connection, realtime, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing WebSocket connections that drop, fail to connect, or cause reconnect storms.
---

# Debug: WebSocket Connection Dropping

**Symptom:** WebSocket connections drop unexpectedly. Clients reconnect in a loop. Real-time features stop working. Works briefly then disconnects.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Drops after exactly N seconds | Idle timeout on proxy, load balancer, or server |
| Drops under load | Server not handling concurrent connections, memory pressure |
| Never connects in production | Proxy or load balancer not configured for WebSocket upgrade |
| Reconnect storm after drop | No backoff on client reconnect logic |
| Works locally, fails in prod | AWS ALB or Nginx not passing `Upgrade` header |

---

## Likely Causes (ranked by frequency)

1. Load balancer or proxy dropping idle connections — default timeout 60s
2. Missing `Upgrade: websocket` header passthrough on proxy or ALB
3. No heartbeat/ping — connection appears idle and gets killed
4. Client reconnects immediately on drop — causes reconnect storm under load
5. Server closing connection on exception without proper close frame

---

## First Checks (fastest signal first)

- [ ] Check the disconnect reason code — 1001 (going away), 1006 (abnormal closure), 1011 (server error) each point to different causes
- [ ] Check load balancer idle timeout — most default to 60s; WebSocket connections need this extended or disabled
- [ ] Confirm proxy passes `Connection: Upgrade` and `Upgrade: websocket` headers — without these, the handshake fails
- [ ] Check whether a heartbeat/ping is sent — if not, proxies treat the connection as idle and close it
- [ ] Check client reconnect logic — is there exponential backoff, or does it reconnect immediately?

**Signal example:** Connections drop every 60 seconds exactly — AWS ALB idle timeout is 60s default; WebSocket connection is silent between messages; ALB treats it as idle and closes it.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Load balancer WebSocket configuration | [[cloud/load-balancing-advanced]] |
| WebSocket server implementation | [[cs-fundamentals/websockets-se]] |
| Nginx/proxy header configuration | [[cloud/cloud-networking]] |
| Reconnect storm as a retry problem | [[cs-fundamentals/error-handling-patterns]] |

---

## Fix Patterns

- Extend ALB idle timeout to 3600s for WebSocket endpoints — or use NLB which has no idle timeout
- Implement server-side ping every 30s — clients respond with pong; keeps connection alive through proxies
- Add exponential backoff with jitter on client reconnect — never reconnect immediately on drop
- Confirm `Upgrade` headers are forwarded by all proxies in the chain — test with `curl --include -H "Upgrade: websocket"`
- Use sticky sessions if running multiple server instances — WebSocket connections are stateful

---

## When This Is Not the Issue

If connection stays open but messages stop flowing:

- The connection is alive but the message handler has an uncaught exception silently killing the handler
- Check server logs for exceptions inside the message handler that are swallowed

Pivot to [[cs-fundamentals/networking]] to verify the full connection path including any service mesh or sidecar proxies that may interfere with long-lived connections.

---

## Connections

[[cs-fundamentals/websockets-se]] · [[cs-fundamentals/networking]] · [[cloud/load-balancing-advanced]] · [[cs-fundamentals/error-handling-patterns]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
