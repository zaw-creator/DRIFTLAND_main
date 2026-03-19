# DRIFTLAND — Design & Architecture

## Overview

DRIFTLAND is a commercial website for drift racing events. It is a full-stack monorepo with a **Next.js frontend** and an **Express/MongoDB backend**, connected over a REST API with Server-Sent Events for live updates.

```
DRIFTLAND/
├── client/     # Next.js 16 frontend (React 19)
├── server/     # Express 5 backend (Node.js, ES modules)
├── _designs/   # Design assets / mockups
└── _specs/     # Feature specifications
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js 16 (App Router), React 19 |
| Styling | CSS Modules + Tailwind CSS 4 |
| Animations | Framer Motion 12 |
| Backend framework | Express 5 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT (httpOnly cookies) + bcrypt |
| Image hosting | Cloudinary (via Multer) |
| Real-time | Server-Sent Events (SSE) |
| Testing | Jest + React Testing Library (client), Jest (server) |

---

## Frontend Architecture

### App Router Structure (`client/src/app/`)

```
app/
├── layout.js               # Root layout — mounts Navbar02, applies fonts
├── globals.css
├── page.js                 # Home / landing page
├── events/
│   ├── page.js             # Public event listing
│   └── [id]/page.js        # Single event detail
└── admin/
    ├── layout.js           # Admin shell layout (AdminNav sidebar)
    ├── (auth)/
    │   └── login/page.js   # Login form (unauthenticated)
    └── (protected)/
        └── events/
            ├── page.js         # Admin event list
            ├── new/page.js     # Create event form
            └── [id]/edit/page.js  # Edit event form
```

Route groups (`(auth)`, `(protected)`) use Next.js's grouped layout convention — they share a layout without adding a URL segment.

### Component Groups (`client/src/components/`)

#### `Navbar/`
- **Navbar02.js** — current scroll-aware navbar (see Navbar Design below)
- **Navbar.js** — deprecated, kept for reference

#### `events/`
- **EventCard** — card UI for a single event in the listing
- **EventSkeleton** — loading placeholder for EventCard
- **EventSegmentedBar** — capacity bar split by role (Driver / Participant / Rider)
- **StatusBadge** — pill showing event status (Ongoing / Upcoming / Past)
- **DriveTypeBadge** — pill for drive type (Drift / Time Attack)
- **Leaderboard** — rankings table for an event
- **RoleSelector** — dropdown/button group for choosing a registration role

#### `admin/`
- **AdminNav** — sidebar navigation for the admin panel
- **EventForm** — shared create/edit form for events
- **EventsTable** — paginated table of events with action buttons
- **ImageUpload** — Cloudinary upload widget wrapper
- **ConfirmDialog** — reusable modal for destructive-action confirmation
- **RoleConfig** — per-event role configuration (enable/disable roles, set capacity)

---

## Navbar Design (`Navbar02`)

The navbar is **context-aware**: it collapses its links into a hamburger when any element marked with `data-nav-fold` is visible in the viewport, and restores the full link bar when none are visible.

### How it works

1. **Selector prop** — `<Navbar02 foldSelector="[data-nav-fold]" />` accepts any CSS selector. Any page can mark elements with `data-nav-fold` to participate.

2. **Immediate sync check** — on mount/navigation, `getBoundingClientRect()` is called synchronously on each matched element so the correct fold state is applied before the first paint (no flash of the wrong state).

3. **IntersectionObserver** — an observer watches all matched elements. A `Set` tracks how many are currently intersecting, so the navbar stays folded when two adjacent full-screen sections are both visible at once.

4. **Page navigation** — `pathname` from `usePathname()` is in the effect's dependency array, so the observer is rebuilt on every client-side navigation and picks up `data-nav-fold` elements on the new page.

5. **Mobile menu** — Framer Motion powers a fullscreen overlay with staggered spring-animated links. The menu auto-closes when the navbar unfolds (scroll past hero) and locks `document.body` scroll while open.

### Usage on a page

```jsx
// Mark any section that should fold the navbar while visible
<section data-nav-fold className={styles.hero}>
  ...hero content...
</section>

// Multiple elements are supported — nav stays folded while ANY is visible
<section data-nav-fold className={styles.stats}>
  ...stats...
</section>
```

---

## Backend Architecture

### Layer Structure (`server/`)

```
server/
├── app.js                  # Express entry point, CORS, middleware, route mounting
├── config/
│   └── database.js         # MongoDB connection + admin user seed
├── routes/
│   ├── auth.js             # POST /api/auth/login, /logout
│   ├── events.js           # GET  /api/events (public, SSE)
│   └── admin/events.js     # CRUD /api/admin/events (protected)
├── controllers/
│   ├── authController.js
│   ├── eventController.js
│   └── adminEventController.js
├── middleware/
│   └── auth.js             # JWT cookie verification
├── models/
│   ├── Event.js            # Mongoose schema for events
│   └── User.js             # Mongoose schema for admin users
└── utils/
    ├── computeStatus.js    # Derives event status from dates/capacity
    ├── sseManager.js       # Manages SSE client connections
    ├── multerConfig.js     # Multer + Cloudinary storage config
    └── createAdminUser.js  # Seeds the default admin user on startup
```

### Request Flow

```
Client → Express → route → middleware (auth if protected) → controller → model → MongoDB
                                                                        ↓
                                                              SSE broadcast (on mutations)
```

---

## Auth Flow

1. `POST /api/auth/login` — validates credentials, signs a JWT, sets it as an httpOnly cookie.
2. Every protected request hits `middleware/auth.js`, which reads the cookie, verifies the JWT, and attaches the decoded user to `req.user`.
3. Admin routes under `/api/admin/*` are all protected by this middleware.
4. `POST /api/auth/logout` — clears the cookie.
5. On the frontend, the admin `(protected)` layout checks auth state and redirects to `/admin/login` if unauthenticated.

---

## Real-time Updates (SSE)

Event capacity changes (registrations) need to be reflected live on the public events page without polling.

- `sseManager.js` maintains a list of connected SSE clients.
- `GET /api/events` upgrades to an SSE stream when the client sends `Accept: text/event-stream`.
- When `adminEventController` mutates capacity (register/unregister), it calls `sseManager.broadcast(event)` to push the updated event to all connected clients.
- The frontend `EventCard` listens to the SSE stream and updates capacity bars in real time.

---

## Image Uploads

1. The admin `EventForm` uses the `ImageUpload` component to select a file.
2. On submit, the file is `POST`-ed to `/api/admin/events` (or the edit endpoint) as `multipart/form-data`.
3. `multerConfig.js` configures `multer-storage-cloudinary` — the file is streamed directly to Cloudinary without touching the local filesystem.
4. Cloudinary returns a URL which is stored in the `Event` model's `imageUrl` field.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | No | List all events (SSE-upgradeable) |
| GET | `/api/events/:id` | No | Single event detail |
| POST | `/api/auth/login` | No | Admin login |
| POST | `/api/auth/logout` | No | Clear auth cookie |
| GET | `/api/admin/events` | JWT | List events (admin view) |
| POST | `/api/admin/events` | JWT | Create event |
| PUT | `/api/admin/events/:id` | JWT | Update event |
| DELETE | `/api/admin/events/:id` | JWT | Delete event |
| GET | `/health` | No | Server health check |
