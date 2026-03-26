/**
 * page.js  —  app/events/@modal/(.)[id]/page.js
 *
 * SERVER component rendered inside the @modal parallel route slot when a user
 * navigates to /events/[id] while already on the /events feed page.
 *
 * ── Rendering path ───────────────────────────────────────────────────────────
 *   User on /events → clicks EventCard → URL becomes /events/[id]
 *   Next.js sees the (.)[id] intercepting route and renders THIS file into the
 *   @modal slot defined in app/events/layout.js — the feed page stays mounted.
 *
 * ── NOT rendered when ────────────────────────────────────────────────────────
 *   - User visits /events/[id] directly (fresh page load / shared link)
 *     → app/events/[id]/page.js handles that case instead
 *   - User is NOT on the /events page when clicking the link
 *
 * ── What to edit ─────────────────────────────────────────────────────────────
 *   • Modal shell (size, animation, close button) → ModalUI.js + EventModal.module.css
 *   • Event detail content (title, capacity, register) → LiveEventDetails.js
 *     (changes there apply to BOTH this modal AND the full /events/[id] page)
 */

import { notFound } from "next/navigation";
import { getEventById } from "@/services/eventService";
import LiveEventDetails from "@/components/events/LiveEventDetails";
import ModalUI from "./ModalUI";

export default async function InterceptedEventModal({ params }) {
  const { id } = await params;

  let event;
  try {
    event = await getEventById(id);
  } catch {
    notFound();
  }

  if (!event) notFound();

  return (
    <ModalUI>
      <LiveEventDetails initialEvent={event} eventId={id} />
    </ModalUI>
  );
}
