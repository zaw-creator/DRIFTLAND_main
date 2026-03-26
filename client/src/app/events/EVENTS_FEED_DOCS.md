# Events Feed — Architecture Docs

## Overview

The events feed has two key features layered on top of the existing server-rendered page:

1. **Intercepting Routes Modal** — clicking an event card opens its detail in a panel overlay, without navigating away from the feed.
2. **Per-section bi-directional infinite scroll** — each status section loads more events as you scroll down; a top sentinel checks for newly published events when you scroll back to the top.

---

## File Map

```
app/events/
├── layout.js                       ← Parallel route shell (required for @modal)
├── page.js                         ← Server component: SSR initial events
├── page.module.css
│
├── [id]/
│   ├── page.js                     ← Full-page event detail (direct URL / shared link)
│   └── page.module.css
│
└── @modal/
    ├── default.js                  ← Null fallback (no modal active)
    └── (.)[id]/
        ├── page.js                 ← Intercepted server component (renders modal)
        ├── ModalUI.js              ← Client: Framer Motion panel + dismiss logic
        └── EventModal.module.css   ← Modal shell styles (size, backdrop, close btn)

components/events/
├── LiveEventFeed.js                ← Feed orchestrator (filter tabs, sections, sentinels)
├── LiveEventFeed.module.css        ← Feed styles + sentinel + new-events banner
├── LiveEventDetails.js             ← Event detail CONTENT (shared by modal + full page)
└── EventCard.js                    ← Individual card in the feed

hooks/
└── useInfiniteSection.js           ← IntersectionObserver hook for per-section pagination

services/
└── eventService.js
    ├── getEvents()                 ← Server-side fetch (SSR, Next.js cached)
    ├── getEventsPaginated()        ← Client-side fetch (infinite scroll pages)
    └── getEventById()              ← Single event fetch (modal + full page)

server/controllers/
└── eventController.js
    └── getEvents()                 ← Now supports ?page=N&limit=N query params
```

---

## 1. Intercepting Routes Modal

### How it works

```
User on /events
  → clicks EventCard (link to /events/abc123)
  → Next.js sees (.)[id] intercepting route
  → renders @modal/(.)[id]/page.js into the @modal slot
  → feed stays mounted, scroll position preserved
  → URL shows /events/abc123

User presses ESC / clicks backdrop / clicks ✕
  → router.back() called
  → URL reverts to /events
  → @modal slot returns to default.js (null)
  → modal unmounts, feed unchanged
```

### Direct URL visit (no interception)

If someone visits `/events/abc123` directly (fresh load, shared link, or F5):
- Next.js does **not** intercept — `app/events/[id]/page.js` renders as a full standalone page.
- No modal, no feed behind it.

### What to edit

| Goal | File |
|---|---|
| Change modal **size** (height, width) | `@modal/(.)[id]/EventModal.module.css` → `.panel` |
| Change modal **animation** (spring, duration) | `@modal/(.)[id]/ModalUI.js` → `transition` prop |
| Change modal **backdrop** (darkness, blur) | `@modal/(.)[id]/EventModal.module.css` → `.backdrop` |
| Change event detail **content** (title, capacity, register button) | `components/events/LiveEventDetails.js` |
| Change full-page event layout (back button, page padding) | `app/events/[id]/page.js` + `[id]/page.module.css` |
| Change SEO metadata for the event page | `app/events/[id]/page.js` → `generateMetadata()` |

> **Key rule:** `LiveEventDetails.js` is shared. Any change there affects **both** the modal view and the full `/events/[id]` page.

---

## 2. Infinite Scroll

### Architecture

The feed is static after the initial SSR load (no SSE connection). Each status section independently manages its own paginated list.

```
LiveEventFeed (orchestrator)
  ├── [top sentinel]              ← IntersectionObserver: fires on scroll-back-to-top
  │     └── checkForNewEvents()  ← fetches page 1, shows banner if new IDs found
  │
  ├── SectionFeed key="active"
  │     ├── EventCard × N
  │     ├── [bottom sentinel]    ← fires when near bottom of this section
  │     └── EventSkeleton        ← shown while next page is loading
  │
  ├── SectionFeed key="upcoming"
  │     ├── EventCard × N
  │     ├── [bottom sentinel]
  │     └── EventSkeleton
  │
  └── SectionFeed key="archived"
        └── ...
```

### useInfiniteSection hook

`src/hooks/useInfiniteSection.js`

```js
const { events, bottomRef, isLoading, hasMore } = useInfiniteSection({
  initialEvents,   // first page from SSR
  status,          // section status key e.g. "upcoming"
  limit,           // events per page, default 10
});
```

- Attaches an `IntersectionObserver` to `bottomRef` with `rootMargin: "200px"` (triggers 200px before the sentinel is visible — feels seamless).
- Uses `isLoadingRef` (a ref, not state) inside the observer callback to prevent double-firing without stale closure issues.
- Resets when `status` changes (tab switch).

### Top sentinel — new events detection

A single `<div ref={topSentinelRef} />` sits just below the TelemetryControl filter bar. The observer works in two phases:

1. **Phase 1 — leaving:** When the sentinel scrolls out of view (user scrolled down), `hasScrolledRef` is set to `true`.
2. **Phase 2 — re-entering:** When the sentinel comes back into view AND `hasScrolledRef` is `true`, `checkForNewEvents()` runs.

This prevents a false trigger on the initial page load when the sentinel is already visible.

If new event IDs are found, a yellow banner appears: **"↑ N new event(s) — tap to refresh"**. Clicking it calls `router.refresh()` which re-runs the server component and reloads the initial events.

### Backend pagination

`GET /api/events?status=upcoming&page=2&limit=10`

Returns:
```json
{
  "success": true,
  "data": {
    "events": [...],
    "page": 2,
    "hasNextPage": true,
    "hasPrevPage": true,
    "total": 47
  }
}
```

**Backward-compatible:** If `page` and `limit` are omitted, the response is the original flat array `data: [...]` — nothing breaks for existing callers (admin panel, SSR server component).

### Adjusting page size

Default is 10 events per page. To change it globally, edit the `limit` default in:
- `hooks/useInfiniteSection.js` — `limit = 10` parameter default
- Or pass a different `limit` to `SectionFeed` in `LiveEventFeed.js`

---

## 3. SSE (Server-Sent Events) — What changed

| Location | Before | After |
|---|---|---|
| `LiveEventFeed` (events list) | SSE connection open, patches capacity on every card | **Removed** — drift events rarely update; static SSR is sufficient |
| `LiveEventDetails` (event detail) | SSE connection for live capacity | **Unchanged** — still active; useful when a user is actively on an event page |

If you ever want to re-enable live capacity updates on the feed, add back the `useEffect` with `EventSource` from the git history of `LiveEventFeed.js`.

---

## 4. Quick Reference — Adding New Features

**Add a new filter tab:**
Edit the `STATUS_OPTIONS` array in `LiveEventFeed.js`. Add `{ id, label, header, subtitle }`. The tab appears in `TelemetryControl` automatically.

**Change events per page:**
Edit `limit` prop on `<SectionFeed>` calls inside `LiveEventFeed.js`.

**Change which sections paginate:**
In `LiveEventFeed.js` → `SectionFeed`, you could conditionally skip the `bottomRef` sentinel for sections you don't want to paginate (e.g., `active` is usually small).

**Change modal entrance direction:**
In `ModalUI.js`, change `initial: { y: 60 }` to `x: 100` for a slide-from-right effect.
