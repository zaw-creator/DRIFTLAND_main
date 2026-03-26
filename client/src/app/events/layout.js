/**
 * EventsLayout.js  —  app/events/layout.js
 *
 * This layout enables the intercepting-routes modal pattern for the events feed.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *   Next.js parallel routes require the layout to declare named slots.
 *   The `modal` prop maps to the `@modal` folder in this directory.
 *   Without this layout, Next.js would not know to render @modal alongside children.
 *
 * ── How it works ─────────────────────────────────────────────────────────────
 *   • `children` → the events feed page (app/events/page.js)
 *   • `modal`    → the @modal slot (null by default, becomes the modal panel
 *                  when the user navigates to /events/[id] from the feed)
 *
 *   When a user clicks an EventCard:
 *     1. URL changes to /events/[id]
 *     2. Next.js intercepts via @modal/(.)[id]/page.js
 *     3. The modal renders ON TOP of the feed — feed stays mounted
 *     4. router.back() dismisses the modal, URL reverts to /events
 *
 *   If the user visits /events/[id] directly (fresh page load or shared link):
 *     Next.js does NOT intercept — app/events/[id]/page.js renders as a full page.
 */
export default function EventsLayout({ children, modal }) {
  return (
    <>
      {/* The main events feed */}
      {children}
      {/* @modal slot: null (default.js) when no modal, or the event panel when intercepted */}
      {modal}
    </>
  );
}
