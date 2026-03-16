## Spec for Event Listing & Detail Pages

figma_component (if used): N/A

## Summary

A public-facing events section consisting of two pages:

1. **Event Listing Page (`/events`)** — displays all non-previous events grouped by status, each as a responsive horizontal row card (30% image / 70% brief info). Clicking a card navigates to the event detail page.
2. **Event Detail Page (`/events/[id]`)** — displays full event information and a role selector (Driver / Participant / Rider) that must be chosen before the registration CTA becomes active.

---

## Status Logic

Event status is **computed dynamically** based on the current date/time, not stored as a static value:

| Status | Condition |
|--------|-----------|
| `ongoing` | `eventDate` is today OR current time falls within the event's time range (startTime–endTime) |
| `nearby` | `eventDate` is within the next 7 days (but not today) |
| `upcoming` | `eventDate` is more than 7 days from now |
| `previous` | `eventDate` has passed (event is over) |

- The Event model's stored `status` enum field is replaced by a computed virtual using this logic.
- The listing page **excludes `previous` events**.

---

## Functional Requirements

### Event Listing Page (`/events`)

#### Layout

- FR1: WHEN a user visits `/events`, THE SYSTEM SHALL display all non-previous events grouped into sections by computed status.
- FR2: THE SYSTEM SHALL display sections in this order: **Ongoing → Nearby → Upcoming**.
- FR3: WHEN a status section has no events, THE SYSTEM SHALL hide that section entirely.
- FR4: THE SYSTEM SHALL render each event as a single horizontal row card occupying the full available width of the container.
- FR5: THE SYSTEM SHALL allocate **30% of the row width** to the event image and **70% to brief event details**.
- FR6: The row card width SHALL adapt fluidly to the viewport/monitor width (no fixed pixel widths).
- FR7: On mobile viewports, THE SYSTEM SHALL stack the image above the details (image on top, details below).

#### Brief Info on Listing Card (70% section)

Each row card shows only essential info — no description:
- Event name
- Date and time (formatted, e.g. "Sat, 15 Mar 2026 · 10:00 AM")
- Location
- Drive type badges (e.g. "Drift", "Time Attack")
- Computed status badge (Ongoing / Nearby / Upcoming)
- Capacity indicator (e.g. "42 / 100" or "FULL" badge)
- "View Details" button → navigates to `/events/[id]`

#### Image

- FR8: WHEN an event has an image, THE SYSTEM SHALL display it in the 30% image column.
- FR9: WHEN an event has no image, THE SYSTEM SHALL display a styled placeholder.

#### Loading & States

- FR10: WHILE events are loading, THE SYSTEM SHALL display a skeleton loading state.
- FR11: WHEN no non-previous events exist, THE SYSTEM SHALL display a friendly empty state.
- FR12: IF the API request fails, THE SYSTEM SHALL display an error state with a retry button.

---

### Event Detail Page (`/events/[id]`)

#### Full Event Information

- FR13: THE SYSTEM SHALL display the full event banner image at the top.
- FR14: THE SYSTEM SHALL display complete event details:
  - Event name
  - Computed status badge
  - Full description
  - Date and time
  - Location
  - Drive type badges
  - Capacity (registered / total, waitlist count if applicable)
  - Registration deadline

#### Role Selector

- FR15: AT THE BOTTOM of the detail page, THE SYSTEM SHALL display a role selector with three options: **Driver**, **Participant**, **Rider**.
- FR16: Each role SHALL display a one-line description:
  - Driver — You are driving a vehicle in the event
  - Participant — You are taking part in activities (non-driving)
  - Rider — You are a passenger in a vehicle
- FR17: THE SYSTEM SHALL NOT enable the Register button until a role is selected.
- FR18: WHEN a role is selected, THE SYSTEM SHALL visually highlight the selected option.
- FR19: WHEN the user clicks "Register" after selecting a role, THE SYSTEM SHALL navigate to `/register?event={id}&role={role}`.
- FR20: WHEN the event is `previous`, THE SYSTEM SHALL display the detail page in read-only mode with no role selector or Register button.
- FR21: WHEN the event is full, THE SYSTEM SHALL disable the Register button and show a "FULL" indicator.
- FR22: WHEN the registration deadline has passed, THE SYSTEM SHALL disable the Register button and show "Registration Closed".

---

## Data Requirements & Model Changes

### Fields to Add to Event Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | String | No | Event banner image URL or upload path |
| `startTime` | String | No | Event start time (e.g. "10:00") for ongoing detection |
| `endTime` | String | No | Event end time (e.g. "18:00") for ongoing detection |

### Status Computation (Virtual / Utility)

Replace stored `status` enum with a computed utility function:

```
today = current date (date only, no time)
eventDay = eventDate (date only)

if eventDay == today AND current time is between startTime and endTime → "ongoing"
else if eventDay == today AND no time range defined → "ongoing"
else if eventDay > today AND eventDay <= today + 7 days → "nearby"
else if eventDay > today + 7 days → "upcoming"
else → "previous"
```

### Backend API Changes

- `GET /api/events` — returns all events with computed status, excludes `previous` by default, sorted: ongoing → nearby → upcoming, each group sorted by `eventDate` ascending.
- `GET /api/events?includeAll=true` — optionally includes previous events.
- `GET /api/events/:id` — returns single event with computed status.

---

## Possible Edge Cases

- Event spans midnight (startTime/endTime cross days) → ongoing detection must handle date boundary
- Multiple events on the same day → sorted by startTime within that day
- Broken image URL → fallback placeholder renders without errors
- All sections empty → single friendly empty state, no orphaned section headers
- User visits `/events/[id]` for a previous event via direct URL → read-only detail view, no CTA
- User navigates back from registration to detail page → role selection resets (no stale state)
- Event with no `startTime`/`endTime` on its day → treated as ongoing all day
- Long event names in listing card → truncated with ellipsis, no layout break
- Events with both "Drift" and "Time Attack" driveTypes → both badges render without overflow

---

## Acceptance Criteria

- AC1: `/events` shows events grouped into Ongoing, Nearby, Upcoming sections in that order.
- AC2: `previous` events never appear on the listing page.
- AC3: Each section header is hidden when that section has no events.
- AC4: Each event row is 30% image / 70% details, fluid to viewport width.
- AC5: On mobile, image stacks above details.
- AC6: Status badges reflect computed status (ongoing/nearby/upcoming).
- AC7: Clicking "View Details" navigates to `/events/[id]`.
- AC8: `/events/[id]` displays full info including description and banner image.
- AC9: Role selector (Driver / Participant / Rider) appears at the bottom of the detail page.
- AC10: Register button is disabled until a role is selected.
- AC11: After selecting a role and clicking Register, user navigates to `/register?event={id}&role={role}`.
- AC12: Full events show "FULL" badge; Register is disabled.
- AC13: Past-deadline events show "Registration Closed"; Register is disabled.
- AC14: `previous` events render detail page in read-only mode with no CTA.
- AC15: Loading skeleton shown during data fetch on listing page.
- AC16: Empty state shown when no non-previous events exist.
- AC17: Error state with retry shown on API failure.
- AC18: Fallback placeholder shown when event has no image.

---

## Open Questions

- OQ1: Should event images be uploaded via admin (Multer) or stored as external URLs for now?
- OQ2: Are there differences in registration form fields between Driver, Participant, and Rider roles, or is the same form used for all three?
- OQ3: Should the listing page show all events at once or be paginated? (Default assumption: all at once with sticky section headers)

---

## Testing Guidelines

Create test file(s) in `./tests` for:

- Status computation: ongoing / nearby / upcoming / previous based on date/time
- Listing page renders sections in correct order (Ongoing → Nearby → Upcoming)
- `previous` events excluded from listing page
- 30/70 image/detail split renders correctly
- Fallback image renders when no image set
- Section header hidden when section is empty
- Empty state when all events are previous
- Error state + retry when API fails
- Detail page renders full event info and banner
- Register button disabled before role selection
- Register button enabled after role selection
- Correct `/register?event=&role=` URL per role selection
- Register disabled when event is full
- Register disabled when registration deadline passed
- Detail page read-only mode for previous events
