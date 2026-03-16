# DRIFTLAND — Events System Technical Documentation

**Document version:** 1.0
**Last updated:** 2026-03-16
**Scope:** Public event browsing, event detail & role selection, admin event management (CRUD), authentication

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack & Versions](#2-tech-stack--versions)
3. [Repository Structure](#3-repository-structure)
4. [System Architecture](#4-system-architecture)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Data Models](#6-data-models)
7. [API Reference](#7-api-reference)
8. [Client — Public Events Flow](#8-client--public-events-flow)
9. [Client — Admin Events Flow](#9-client--admin-events-flow)
10. [Component Inventory](#10-component-inventory)
11. [File Upload](#11-file-upload)
12. [Environment Variables](#12-environment-variables)
13. [Local Development Setup](#13-local-development-setup)

---

## 1. Overview

The Events System is the core feature of the DRIFTLAND motorsport platform. It exposes:

- A **public-facing events listing and detail experience** where visitors can browse events, view capacity/role availability, and initiate registration.
- An **admin management interface** where authenticated admins can create, edit, delete, and configure events, including per-event role permissions and image uploads.

### High-Level Request Flow

```
Browser
  │
  ├── GET /events            →  Next.js App Router (SSR/CSR)
  │     └── fetch /api/events  →  Express → MongoDB
  │
  ├── GET /events/:id        →  Next.js App Router (SSR/CSR)
  │     └── fetch /api/events/:id  →  Express → MongoDB
  │
  ├── GET /admin/*           →  Next.js Edge Middleware (cookie check)
  │     ├── no adminToken    →  redirect /admin/login
  │     └── has adminToken   →  pass through
  │           └── fetch /api/admin/events/*  →  Express (JWT verify) → MongoDB
  │
  └── POST /api/auth/login   →  Express → bcrypt compare → set httpOnly cookie
```

---

## 2. Tech Stack & Versions

### Server

| Package | Version | Purpose |
|---------|---------|---------|
| Node.js | ≥ 20 (ESM) | Runtime |
| express | ^5.2.1 | HTTP framework |
| mongoose | ^8.21.0 | MongoDB ODM |
| jsonwebtoken | ^9.0.3 | JWT signing/verification |
| bcrypt | ^6.0.0 | Password hashing |
| cookie-parser | ^1.4.7 | Parse httpOnly cookies |
| cors | ^2.8.5 | Cross-origin headers |
| multer | ^2.0.2 | Multipart image upload |
| dotenv | ^17.2.3 | Environment variable loading |
| nodemailer | ^7.0.12 | Transactional email (reserved) |
| qrcode | ^1.5.4 | QR code generation (reserved) |
| nodemon | ^3.1.11 | Dev auto-restart |
| jest | ^29.7.0 | Unit/integration testing |
| mongodb-memory-server | ^10.4.3 | In-memory MongoDB for tests |
| supertest | ^7.2.2 | HTTP integration testing |

### Client

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.1 | React framework (App Router) |
| react | 19.2.3 | UI library |
| react-dom | 19.2.3 | DOM rendering |
| tailwindcss | ^4.2.1 | Utility-first CSS |
| @tailwindcss/postcss | ^4.2.1 | PostCSS integration for Tailwind v4 |
| postcss | ^8.5.8 | CSS transformation pipeline |
| autoprefixer | ^10.4.27 | Vendor prefix auto-insertion |
| jest | ^29.7.0 | Unit testing |
| @testing-library/react | ^16.3.2 | React component testing |
| @testing-library/jest-dom | ^6.9.1 | Custom Jest matchers |
| jest-environment-jsdom | ^29.7.0 | Browser-like DOM for tests |
| eslint | ^9 | Linting |
| eslint-config-next | 16.1.1 | Next.js ESLint rules |

### Database

| System | Notes |
|--------|-------|
| MongoDB | Document database; default URI `mongodb://localhost:27017/driftland` |

---

## 3. Repository Structure

```
DRIFTLAND/
├── client/                          # Next.js 16 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── events/
│   │   │   │   ├── page.js          # Public events listing
│   │   │   │   ├── page.module.css
│   │   │   │   └── [id]/
│   │   │   │       └── page.js      # Public event detail
│   │   │   └── admin/
│   │   │       ├── layout.js        # Admin shell (AdminNav)
│   │   │       ├── (auth)/
│   │   │       │   └── login/
│   │   │       │       └── page.js  # Login form (no nav)
│   │   │       └── (protected)/
│   │   │           └── events/
│   │   │               ├── page.js         # Admin events list
│   │   │               ├── new/page.js     # Create event
│   │   │               └── [id]/edit/
│   │   │                   └── page.js     # Edit event
│   │   ├── components/
│   │   │   ├── events/              # Public event components
│   │   │   └── admin/               # Admin-only components
│   │   ├── services/
│   │   │   ├── eventService.js      # Public API calls
│   │   │   ├── adminEventService.js # Admin API calls
│   │   │   └── authService.js       # Auth API calls
│   │   └── middleware.js            # Next.js Edge route guard
│   ├── postcss.config.mjs
│   └── package.json
│
├── server/                          # Express 5 backend
│   ├── app.js                       # App entry point
│   ├── models/
│   │   ├── Event.js
│   │   └── User.js
│   ├── routes/
│   │   ├── events.js                # Public routes
│   │   ├── auth.js
│   │   └── admin/
│   │       └── events.js            # Admin routes
│   ├── controllers/
│   │   ├── adminEventController.js
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js                  # verifyToken, requireAdmin
│   ├── utils/
│   │   ├── multerConfig.js
│   │   └── createAdminUser.js       # Bootstrap script
│   ├── seeds/
│   ├── tests/
│   └── package.json
│
└── _specs/                          # Design specs and documentation
```

---

## 4. System Architecture

### Monorepo Layout

The project is a **monorepo** with two independent npm workspaces (`client/` and `server/`). They communicate exclusively over HTTP — no shared code between client and server.

### Request & Data Flow

```
┌─────────────────────────────────────────────────┐
│  Browser                                        │
│                                                 │
│  Next.js (port 3000)           Express (port 5000)
│  ├─ App Router pages           ├─ /api/events
│  ├─ CSS Modules + Tailwind     ├─ /api/auth
│  ├─ fetch() with credentials   ├─ /api/admin/events
│  └─ Edge Middleware            └─ /uploads (static)
│        │                              │
│        └──────── HTTP/REST ───────────┘
│                                       │
│                               MongoDB (port 27017)
│                               ├─ events collection
│                               └─ users collection
└─────────────────────────────────────────────────┘
```

### Module System

The server uses **ES Modules** (`"type": "module"` in `server/package.json`). All imports use the `.js` extension explicitly. The client is compiled by Next.js (no explicit module type required).

### Static Files

Uploaded event images are served directly by Express as static files from `server/uploads/`. The path stored in MongoDB is `/uploads/events/{filename}` and referenced in the client as `{SERVER_URL}/uploads/events/{filename}`.

---

## 5. Authentication & Authorization

### Overview

Admin access is controlled by a **JWT stored in an httpOnly cookie** named `adminToken`. No session store is used — the token is stateless and verified on every admin API request.

### Login Flow

```
1. Admin POST /api/auth/login { email, password }
2. Server: User.findOne({ email }) → user.comparePassword(password)
3. Server: jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '8h' })
4. Server: res.cookie('adminToken', token, {
     httpOnly: true,
     sameSite: 'lax',
     secure: (NODE_ENV === 'production'),
     maxAge: 28800000   // 8 hours in ms
   })
5. Client: receives { email, role } in response body; router.push('/admin/events')
```

### Route Protection — Server Layer

Two middleware functions in `server/middleware/auth.js`:

| Middleware | Logic | Error |
|------------|-------|-------|
| `verifyToken` | Reads `req.cookies.adminToken`, calls `jwt.verify()`, attaches decoded payload to `req.user` | `401 Unauthorized` if missing or invalid |
| `requireAdmin` | Checks `req.user.role === 'admin'` | `403 Forbidden` if not admin |

All admin event routes apply both: `router.use(verifyToken, requireAdmin)`.

### Route Protection — Client Layer (Next.js Edge Middleware)

`client/src/middleware.js` runs on the **Edge Runtime** (before the page renders). It can only check cookie presence — it cannot verify the JWT signature (no `jsonwebtoken` on Edge Runtime).

```
matcher: ['/admin/:path*']

- /admin/login  + no token  →  allow through
- /admin/login  + has token →  redirect /admin/events
- /admin/*      + no token  →  redirect /admin/login
- /admin/*      + has token →  allow through
```

> **Security note:** The Edge middleware is a UX guard only. Actual security enforcement is at the Express API layer via `verifyToken` + `requireAdmin`.

### Password Storage

Passwords are hashed with **bcrypt** at 12 salt rounds via a Mongoose pre-save hook on the User model. The plaintext password is never stored or returned. The `toJSON` transform strips the `password` field from all User document serialization.

### Logout Flow

```
1. Client POST /api/auth/logout (with credentials: 'include')
2. Server: verifyToken middleware (validates cookie)
3. Server: res.clearCookie('adminToken')
4. Client: router.push('/admin/login')
```

---

## 6. Data Models

### Event

**Collection:** `events`
**File:** `server/models/Event.js`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | Yes | — | Event display name |
| `description` | String | No | `''` | Long-form event description |
| `eventDate` | Date | Yes | — | Date the event takes place |
| `location` | String | Yes | — | Venue/location string |
| `registrationDeadline` | Date | No | `null` | Last datetime to register |
| `editDeadlineHours` | Number | No | `24` | Hours before event that edits lock |
| `driveTypes` | [String] | No | `[]` | Drive type labels (e.g. `['Drift', 'Time Attack']`) |
| `classes` | [ClassObject] | No | `[]` | Driver class definitions (see below) |
| `participantCapacity` | Number | No | `0` | Max non-driving participants |
| `participantRegisteredCount` | Number | No | `0` | Current participant registrations |
| `riderCapacity` | Number | No | `0` | Max passenger/riders |
| `riderRegisteredCount` | Number | No | `0` | Current rider registrations |
| `waitlistCount` | Number | No | `0` | Current waitlist count |
| `image` | String | No | `null` | Path to uploaded image or external URL |
| `startTime` | String | No | `null` | Event start time string (e.g. `"10:00"`) |
| `endTime` | String | No | `null` | Event end time string (e.g. `"18:00"`) |
| `enabledRoles.driver` | Boolean | No | `true` | Whether Driver role is open for this event |
| `enabledRoles.participant` | Boolean | No | `true` | Whether Participant role is open |
| `enabledRoles.rider` | Boolean | No | `true` | Whether Rider role is open |

**ClassObject structure:**

```json
{
  "driveType": "Drift",
  "name":      "Pro",
  "capacity":  20,
  "registeredCount": 5
}
```

**Computed Virtuals** (not stored in DB, derived at query time):

| Virtual | Computation |
|---------|-------------|
| `driverTotalCapacity` | Sum of `capacity` across all `classes` |
| `driverTotalRegisteredCount` | Sum of `registeredCount` across all `classes` |
| `isDriverFull` | `driverTotalRegisteredCount >= driverTotalCapacity` (when capacity > 0) |
| `isParticipantFull` | `participantRegisteredCount >= participantCapacity` (when capacity > 0) |
| `isRiderFull` | `riderRegisteredCount >= riderCapacity` (when capacity > 0) |

**Derived field `status`** (computed server-side by `computeStatus` utility, not stored):

| Status | Condition |
|--------|-----------|
| `ongoing` | Event date is today |
| `nearby` | Event date is within the next 7 days (exclusive of today) |
| `upcoming` | Event date is more than 7 days away |
| `previous` | Event date is in the past |

---

### User

**Collection:** `users`
**File:** `server/models/User.js`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `email` | String | Yes | — | Unique, lowercase, trimmed |
| `password` | String | Yes | — | bcrypt hash (12 rounds); stripped from JSON output |
| `role` | String (enum) | No | `'user'` | `'admin'` or `'user'` |

**Instance method:** `comparePassword(candidate: string): Promise<boolean>`

---

## 7. API Reference

**Base URL:** `http://localhost:5000` (dev)
All request and response bodies are `application/json` unless noted.

---

### Public Events API

#### `GET /api/events`

Returns all non-previous events grouped and sorted: ongoing → nearby → upcoming.

**Auth required:** No

**Response `200`:**
```json
[
  {
    "_id": "...",
    "name": "Summer Drift Open",
    "eventDate": "2026-04-10T00:00:00.000Z",
    "location": "Lakeside Circuit",
    "status": "upcoming",
    "driveTypes": ["Drift", "Time Attack"],
    "classes": [...],
    "participantCapacity": 50,
    "participantRegisteredCount": 12,
    "riderCapacity": 30,
    "riderRegisteredCount": 5,
    "enabledRoles": { "driver": true, "participant": true, "rider": false },
    "image": "/uploads/events/event-abc123-1710000000.jpg",
    "driverTotalCapacity": 40,
    "driverTotalRegisteredCount": 15,
    "isDriverFull": false,
    "isParticipantFull": false,
    "isRiderFull": false
  }
]
```

---

#### `GET /api/events/:id`

Returns a single event by ID, including previous events.

**Auth required:** No

**Response `200`:** Single event object (same shape as above)
**Response `404`:** `{ "error": "Event not found" }`

---

#### `POST /api/events/:id/image`

Upload or replace the banner image for an event.

**Auth required:** No (public route)
**Content-Type:** `multipart/form-data`
**Body field:** `image` (file, max 5 MB, image MIME types only)

**Response `200`:** `{ "image": "/uploads/events/event-{id}-{timestamp}.jpg" }`

---

### Auth API

#### `POST /api/auth/login`

Authenticate an admin user. Sets `adminToken` cookie on success.

**Auth required:** No

**Request body:**
```json
{ "email": "admin@example.com", "password": "secret" }
```

**Response `200`:**
```json
{ "email": "admin@example.com", "role": "admin" }
```
Cookie set: `adminToken=<JWT>; HttpOnly; SameSite=Lax; Max-Age=28800`

**Response `400`:** `{ "error": "Email and password are required" }`
**Response `401`:** `{ "error": "Invalid credentials" }`

---

#### `POST /api/auth/logout`

Clear the `adminToken` cookie.

**Auth required:** Yes (`verifyToken`)

**Response `200`:** `{ "message": "Logged out" }`
**Response `401`:** `{ "error": "Unauthorized" }`

---

#### `GET /api/auth/me`

Return the currently authenticated user from the JWT payload.

**Auth required:** Yes (`verifyToken`)

**Response `200`:** `{ "id": "...", "role": "admin" }`
**Response `401`:** `{ "error": "Unauthorized" }`

---

### Admin Events API

All routes require: `adminToken` cookie (verified by `verifyToken`) and `role === 'admin'` (enforced by `requireAdmin`).

#### `GET /api/admin/events`

Return all events including previous, sorted by `eventDate` descending.

**Response `200`:** Array of event objects with derived fields (`status`, `isDriverFull`, etc.)

---

#### `POST /api/admin/events`

Create a new event.

**Request body:** All Event schema fields. `name`, `eventDate`, and `location` are required.

```json
{
  "name": "Winter Cup 2026",
  "eventDate": "2026-12-05",
  "location": "Northern Raceway",
  "description": "Annual winter drift competition",
  "driveTypes": ["Drift"],
  "classes": [
    { "driveType": "Drift", "name": "Pro", "capacity": 20, "registeredCount": 0 }
  ],
  "participantCapacity": 100,
  "riderCapacity": 0,
  "enabledRoles": { "driver": true, "participant": true, "rider": false },
  "startTime": "09:00",
  "endTime": "17:00"
}
```

**Response `201`:** Created event object
**Response `400`:** `{ "error": "name, eventDate, and location are required" }`

---

#### `GET /api/admin/events/:id`

Return a single event by ID (for pre-filling the edit form).

**Response `200`:** Single event object
**Response `404`:** `{ "error": "Event not found" }`

---

#### `PUT /api/admin/events/:id`

Update an existing event. Only whitelisted fields are accepted to prevent mass assignment.

**Whitelisted update fields:** `name`, `description`, `eventDate`, `location`, `registrationDeadline`, `editDeadlineHours`, `driveTypes`, `classes`, `participantCapacity`, `participantRegisteredCount`, `riderCapacity`, `riderRegisteredCount`, `waitlistCount`, `startTime`, `endTime`, `enabledRoles`, `image`

**Response `200`:** Updated event object
**Response `404`:** `{ "error": "Event not found" }`

---

#### `DELETE /api/admin/events/:id`

Delete an event permanently.

**Response `200`:** `{ "message": "Event deleted" }`
**Response `404`:** `{ "error": "Event not found" }`

---

#### `POST /api/admin/events/:id/image`

Upload or replace the event banner image.

**Content-Type:** `multipart/form-data`
**Body field:** `image` (file, max 5 MB, image MIME types only)

**Response `200`:** `{ "image": "/uploads/events/event-{id}-{timestamp}.jpg" }`

---

## 8. Client — Public Events Flow

### Events Listing Page

**Route:** `/events`
**File:** `client/src/app/events/page.js`
**Type:** Client Component (`'use client'`)

#### State

| State | Type | Initial | Description |
|-------|------|---------|-------------|
| `events` | Array | `[]` | All events fetched from API |
| `loading` | Boolean | `true` | Fetch in-progress flag |
| `error` | String\|null | `null` | Error message if fetch fails |
| `activeFilter` | String | `"All"` | Currently selected tab in segmented bar |

#### Data Flow

```
useEffect (mount)
  └── fetchEvents()
        └── getEvents() → GET /api/events
              └── setEvents(data) / setError(msg)

Render:
  events → grouped by status (ongoing / nearby / upcoming)
  SECTIONS.filter(label matches activeFilter)
  → EventSegmentedBar (filter UI)
  → EventCard[] per section
```

#### UI States

| Condition | Rendered |
|-----------|----------|
| `loading === true` | 3× `EventSkeleton` placeholders |
| `error !== null` | Error message + Retry button |
| `events.length === 0` | Empty state message |
| `events.length > 0` | `EventSegmentedBar` + grouped `EventCard` sections |

---

### Event Detail Page

**Route:** `/events/:id`
**File:** `client/src/app/events/[id]/page.js`
**Type:** Client Component (`'use client'`)

#### Data Flow

```
useEffect (mount, id)
  └── getEventById(id) → GET /api/events/:id
        └── setEvent(data) / setError(msg)
```

#### Key UI Sections

| Section | Description |
|---------|-------------|
| Banner image | `{SERVER_URL}{event.image}` or placeholder gradient |
| Status badge | `<StatusBadge status={event.status} />` |
| Drive type badges | `event.driveTypes.map(t => <DriveTypeBadge type={t} />)` |
| Event meta | Date, time, location, registration deadline |
| Capacity table | Per-class driver capacity rows; participant/rider totals |
| Role selector | `<RoleSelector enabledRoles={event.enabledRoles} />` — only shows enabled roles |
| Register button | Routes to `/register?event={id}&role={selectedRole}` |

#### Registration Guard Logic

| Condition | Register button state |
|-----------|-----------------------|
| No role selected | Disabled — "Select a role to register" |
| Past registration deadline | Disabled — "Registration closed" |
| Selected role is full | Disabled — "This role is full" |
| All checks pass | Enabled — "Register for this Event" |

---

## 9. Client — Admin Events Flow

### Login

**Route:** `/admin/login`
**File:** `client/src/app/admin/(auth)/login/page.js`
**Layout:** `(auth)` route group — no `AdminNav` chrome

#### Flow

```
User submits email + password
  └── login(email, password) → POST /api/auth/login
        ├── Success → router.push('/admin/events')
        │             (adminToken cookie now set by server)
        └── Failure → display error.message
```

---

### Admin Events List

**Route:** `/admin/events`
**File:** `client/src/app/admin/(protected)/events/page.js`

#### Data Flow

```
useEffect (mount)
  └── getAdminEvents() → GET /api/admin/events (cookie auto-sent)
        └── setEvents(data)

Delete flow:
  EventsTable.onDelete(id, name)
    → setConfirmTarget({ id, name })
    → ConfirmDialog renders
  User confirms
    → deleteEvent(id) → DELETE /api/admin/events/:id
    → getAdminEvents() (refresh)
```

---

### Create Event

**Route:** `/admin/events/new`
**File:** `client/src/app/admin/(protected)/events/new/page.js`

#### Flow

```
EventForm.onSubmit(formData, imageFile)
  └── createEvent(formData) → POST /api/admin/events
        └── if imageFile:
              uploadEventImage(newEvent._id, imageFile)
                → POST /api/admin/events/:id/image
        └── router.push('/admin/events')
```

---

### Edit Event

**Route:** `/admin/events/:id/edit`
**File:** `client/src/app/admin/(protected)/events/[id]/edit/page.js`

#### Flow

```
useEffect (mount, id)
  └── getAdminEventById(id) → GET /api/admin/events/:id
        └── setInitialValues(event)

EventForm.onSubmit(formData, imageFile)
  └── updateEvent(id, formData) → PUT /api/admin/events/:id
        └── if imageFile:
              uploadEventImage(id, imageFile)
                → POST /api/admin/events/:id/image
        └── router.push('/admin/events')
```

---

### Client–Admin Interaction Summary

```
Client page          Service call              Server route           Response
──────────────       ─────────────────         ─────────────────      ──────────
Login page      →    authService.login()    →  POST /api/auth/login   adminToken cookie
Admin list      →    getAdminEvents()       →  GET  /api/admin/events  events[]
Create page     →    createEvent(data)      →  POST /api/admin/events  event
Create page     →    uploadEventImage()     →  POST /api/admin/events/:id/image  {image}
Edit page       →    getAdminEventById(id)  →  GET  /api/admin/events/:id  event
Edit page       →    updateEvent(id, data)  →  PUT  /api/admin/events/:id  event
Admin list      →    deleteEvent(id)        →  DELETE /api/admin/events/:id  {message}
AdminNav logout →    authService.logout()   →  POST /api/auth/logout  clears cookie
```

---

## 10. Component Inventory

### Public Event Components (`client/src/components/events/`)

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `EventCard` | `EventCard.js` | `event` (object) | Event summary card — image, status, date, location, capacity, link to detail |
| `EventSegmentedBar` | `EventSegmentedBar.js` | `status` (string[]), `selected` (string), `onSelect` (fn) | Filter tab bar; first item has special clip-path shape |
| `EventSkeleton` | `EventSkeleton.js` | none | Animated loading placeholder matching EventCard layout |
| `RoleSelector` | `RoleSelector.js` | `value` (string\|null), `onChange` (fn), `enabledRoles` (object) | Driver/Participant/Rider role picker; hides roles where `enabledRoles[role] === false` |
| `StatusBadge` | `StatusBadge.js` | `status` (string) | Color-coded pill: ongoing=green, nearby=yellow, upcoming=blue, previous=grey |
| `DriveTypeBadge` | `DriveTypeBadge.js` | `type` (string) | Dark pill label for a drive type |

---

### Admin Components (`client/src/components/admin/`)

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `AdminNav` | `AdminNav.js` | none | Top nav with branding, Events link, Logout button |
| `EventForm` | `EventForm.js` | `initialValues` (object\|null), `onSubmit` (fn), `loading` (bool) | Full create/edit form — basic info, image, role config, driver classes |
| `EventsTable` | `EventsTable.js` | `events` (array), `onDelete` (fn) | Admin table — name, date, location, status, enabled roles, edit/delete actions |
| `RoleConfig` | `RoleConfig.js` | `value` (object), `onChange` (fn), `driverEnabled` (bool), `onDriverToggle` (fn) | Enable/disable Driver/Participant/Rider; shows capacity inputs for Participant/Rider |
| `ConfirmDialog` | `ConfirmDialog.js` | `open` (bool), `message` (string), `onConfirm` (fn), `onCancel` (fn), `loading` (bool) | Modal confirmation dialog for destructive actions |
| `ImageUpload` | `ImageUpload.js` | `value` (string\|null), `onChange` (fn) | File picker with preview; passes raw `File` to parent; image uploaded post-save |

---

### Admin Layout Structure

```
app/admin/
  layout.js                 ← renders AdminNav + {children}
  (auth)/
    layout.js               ← overrides parent: renders {children} only (no AdminNav)
    login/page.js
  (protected)/
    events/
      page.js
      new/page.js
      [id]/edit/page.js
```

Route groups (`(auth)` and `(protected)`) are a Next.js App Router feature. They affect layout inheritance but not the URL path.

---

## 11. File Upload

**Handler:** `server/utils/multerConfig.js`
**Storage:** Disk (local filesystem)

| Setting | Value |
|---------|-------|
| Destination directory | `server/uploads/events/` |
| Filename format | `event-{eventId}-{Date.now()}{ext}` |
| Max file size | 5 MB |
| Accepted MIME types | Any `image/*` |
| Static serving | `app.use('/uploads', express.static('uploads'))` in `server/app.js` |

**Upload sequence for Create:**
1. `POST /api/admin/events` — create event, receive `_id` in response
2. `POST /api/admin/events/:id/image` — upload image using the new `_id`
3. Server saves path `/uploads/events/event-{id}-{ts}.jpg` to `event.image`

Image upload is always a separate step after event creation/update so that the event `_id` is available for the filename.

---

## 12. Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | No | `mongodb://localhost:27017/driftland` | MongoDB connection string |
| `PORT` | No | `5000` | Express server port |
| `NODE_ENV` | No | `development` | Set to `production` to enable secure cookies |
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing; must be strong in production |
| `CLIENT_URL` | No | `http://localhost:3000` | Allowed CORS origin |
| `ADMIN_EMAIL` | Bootstrap only | — | Used by `createAdminUser.js` script |
| `ADMIN_PASSWORD` | Bootstrap only | — | Used by `createAdminUser.js` script |
| `EMAIL_HOST` | Optional | — | SMTP host for Nodemailer |
| `EMAIL_PORT` | Optional | — | SMTP port |
| `EMAIL_USER` | Optional | — | SMTP username |
| `EMAIL_PASSWORD` | Optional | — | SMTP password / app password |
| `EMAIL_FROM` | Optional | — | From address for outgoing emails |

### Client (Next.js)

Next.js environment variables are set in `client/.env.local`. Variables prefixed `NEXT_PUBLIC_` are exposed to the browser.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No (defaults to empty string → same host) | Base URL for API calls (e.g. `http://localhost:5000`) |

---

## 13. Local Development Setup

### Prerequisites

- Node.js ≥ 20
- MongoDB running locally on port 27017 (or set `MONGO_URI`)

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### 2. Configure environment

```bash
# server/.env (minimum required)
MONGO_URI=mongodb://localhost:27017/driftland
JWT_SECRET=change-this-to-a-strong-secret
ADMIN_EMAIL=admin@yoursite.com
ADMIN_PASSWORD=yourpassword
```

### 3. Seed the database (optional sample events)

```bash
cd server && npm run seed
```

### 4. Create the admin user

```bash
cd server && node utils/createAdminUser.js
```

This script reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env` and creates a User document with `role: 'admin'`. It is idempotent — safe to run multiple times.

### 5. Start the servers

```bash
# Terminal 1 — API server (port 5000)
cd server && npm run dev

# Terminal 2 — Next.js dev server (port 3000)
cd client && npm run dev
```

### 6. Access

| URL | Description |
|-----|-------------|
| `http://localhost:3000/events` | Public events listing |
| `http://localhost:3000/events/:id` | Event detail page |
| `http://localhost:3000/admin/login` | Admin login |
| `http://localhost:3000/admin/events` | Admin event management |
| `http://localhost:5000/health` | Server health check |

### 7. Run tests

```bash
# Server integration tests
cd server && npm test

# Client unit tests
cd client && npm test
```

---

*End of document.*
