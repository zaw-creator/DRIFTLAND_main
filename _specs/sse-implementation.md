# SSE Implementation — Technical Report

**Date:** 2026-03-17
**Branch:** `feature/event-page`
**Status:** Complete

---

## Overview

Server-Sent Events (SSE) is implemented to push live capacity and status updates from the server to connected browsers — no page refresh required. When an admin updates event data (registered counts, enabled roles, status), all users currently viewing `/events` or `/events/:id` see the changes reflected instantly.

SSE was chosen over WebSocket because the data flow is strictly one-directional: server → client. The browser never needs to send data back over the realtime connection. SSE is simpler, works over plain HTTP/1.1, and reconnects automatically on disconnect.

---

## Dependencies and Tools

**Zero new npm packages were added.**

| Layer | Technology | Source |
|-------|-----------|--------|
| Server streaming | Node.js HTTP response (`res.write`) | Built into Node.js / Express |
| Client subscription | `EventSource` Web API | Built into every modern browser |
| Connection registry | `Map` + `Set` | Built into JavaScript |

No socket.io, no `ws`, no `eventsource` npm package. The entire implementation uses primitives already present in the runtime environment.

---

## Architecture

### Central Channel Registry — `server/utils/sseManager.js`

All SSE connections are managed through a single module-level registry:

```
Map<channelKey: string, Set<res: Response>>
```

Two exported functions:

- **`addClient(channelKey, res)`** — registers a response stream under a channel key; auto-removes it when the client disconnects via `res.on('close', ...)`
- **`broadcast(channelKey, eventName, data)`** — serializes `data` as JSON and writes a `text/event-stream` payload to every response in the channel

This design keeps SSE concerns isolated: routes register clients, controllers broadcast — neither needs to know about the other's internals.

### Channel Namespaces

Two channels are active for the current events feature:

| Channel key | Endpoint | Consumers |
|-------------|----------|-----------|
| `'events-list'` | `GET /api/events/stream` | `/events` listing page |
| `'event-{id}'` | `GET /api/events/{id}/stream` | `/events/:id` detail page |

Future features (leaderboard, registration queue) can add their own channels without touching existing code.

---

## Data Flow

```
Admin saves event in admin panel
         │
         ▼
adminEventController.updateEvent()
  └─ findByIdAndUpdate → attachDerivedFields(event)
         │
         ├─▶ broadcast('event-{id}', 'event-updated', {
         │       classes, participantRegisteredCount, riderRegisteredCount,
         │       waitlistCount, isDriverFull, isParticipantFull,
         │       isRiderFull, enabledRoles
         │   })
         │
         └─▶ broadcast('events-list', 'event-updated', {
                 _id, driverTotalRegisteredCount,
                 driverTotalCapacity, isDriverFull, status
             })
                   │
                   ▼
         sseManager iterates Set<res> for each channel
         writes: "event: event-updated\ndata: {...}\n\n"
                   │
                   ▼
         Browser EventSource receives payload
         listener fires → setEvent / setEvents patches state
                   │
                   ▼
         React re-renders:
           • capacity counts (X / Y)
           • FULL badges on classes, Participant, Rider
           • Register button disabled state
           • RoleSelector visibility (enabledRoles)
           • EventCard status badge and section grouping
```

---

## Files Changed

### `server/utils/sseManager.js` — NEW

Central pub/sub registry. No framework — plain `Map` and `Set`.

```js
const channels = new Map();

export function addClient(channelKey, res) {
  if (!channels.has(channelKey)) channels.set(channelKey, new Set());
  channels.get(channelKey).add(res);
  res.on('close', () => channels.get(channelKey)?.delete(res));
}

export function broadcast(channelKey, eventName, data) {
  const clients = channels.get(channelKey);
  if (!clients?.size) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}
```

---

### `server/routes/events.js` — MODIFIED

Two SSE endpoints added. The `/stream` static route is declared **before** `/:id` — this is required. Express matches routes top-to-bottom; if `/:id` came first, Express would treat the literal string `"stream"` as an event ID.

```js
// Events list channel
router.get('/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  res.flushHeaders();
  addClient('events-list', res);
});

// Per-event detail channel
router.get('/:id/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  res.flushHeaders();
  addClient(`event-${req.params.id}`, res);
});
```

`res.flushHeaders()` sends the HTTP headers immediately, establishing the long-lived connection before any data is written.

---

### `server/controllers/adminEventController.js` — MODIFIED

After `updateEvent` persists changes, it broadcasts to both channels. The detail-page channel gets full capacity data; the list-page channel gets the minimal fields needed for `EventCard`.

```js
// Detail page — full capacity state
broadcast(`event-${enriched._id}`, 'event-updated', {
  classes:                    enriched.classes,
  participantRegisteredCount: enriched.participantRegisteredCount,
  riderRegisteredCount:       enriched.riderRegisteredCount,
  waitlistCount:              enriched.waitlistCount,
  isDriverFull:               enriched.isDriverFull,
  isParticipantFull:          enriched.isParticipantFull,
  isRiderFull:                enriched.isRiderFull,
  enabledRoles:               enriched.enabledRoles,
});

// List page — card-level summary
broadcast('events-list', 'event-updated', {
  _id:                        enriched._id,
  driverTotalRegisteredCount: enriched.driverTotalRegisteredCount,
  driverTotalCapacity:        enriched.driverTotalCapacity,
  isDriverFull:               enriched.isDriverFull,
  status:                     enriched.status,
});
```

---

### `client/src/app/events/[id]/page.js` — MODIFIED

Opens one `EventSource` per visited detail page. Dependency on `event?._id` ensures the stream only opens after the initial REST fetch resolves, and re-opens if the user navigates to a different event.

```js
useEffect(() => {
  if (!event?._id) return;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const es = new EventSource(`${API_URL}/api/events/${event._id}/stream`);
  es.addEventListener('event-updated', (e) => {
    const patch = JSON.parse(e.data);
    setEvent((prev) => ({ ...prev, ...patch }));
  });
  return () => es.close();
}, [event?._id]);
```

The spread `{ ...prev, ...patch }` preserves fields not included in the broadcast (e.g. `name`, `description`, `image`) while applying only what changed.

---

### `client/src/app/events/page.js` — MODIFIED

Opens one `EventSource` for the listing page on mount. Matches incoming patches to the correct card by `_id`.

```js
useEffect(() => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const es = new EventSource(`${API_URL}/api/events/stream`);
  es.addEventListener('event-updated', (e) => {
    const patch = JSON.parse(e.data);
    setEvents((prev) =>
      prev.map((ev) => (ev._id === patch._id ? { ...ev, ...patch } : ev))
    );
  });
  return () => es.close();
}, []);
```

---

## Connection Lifecycle and Memory Safety

Each `res` object is stored in a `Set`. When a browser tab closes or navigates away, the underlying TCP connection closes. Express fires `res.on('close', ...)`, which removes that specific `res` from the channel's `Set`. The `Set` shrinks to zero when all clients disconnect — no memory leak, no zombie connections.

The `EventSource` browser API handles automatic reconnect (after ~3 seconds by default) if the server restarts or the connection drops. The client does not need to implement retry logic.

---

## Payload Format

SSE messages follow the `text/event-stream` spec:

```
event: event-updated
data: {"_id":"abc123","isDriverFull":true,"status":"ongoing",...}

```

The double newline at the end terminates the message. The browser `EventSource` parses this and fires the named event listener (`'event-updated'`).

---

## What SSE Does Not Cover

- **Registration form submissions** — handled by a standard REST `POST /api/register`. SSE is broadcast-only and does not replace form submission.
- **Admin authentication** — JWT cookies; not an SSE concern.
- **Historical data / past events** — read-only REST fetch; no realtime needed.
- **Leaderboard** — component not yet built. Will use a separate channel (`/api/leaderboard/stream`) when that feature ships.
