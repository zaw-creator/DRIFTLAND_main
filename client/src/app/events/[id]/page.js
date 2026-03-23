import { getEventById } from "@/services/eventService";
import LiveEventDetails from "@/components/events/LiveEventDetails";
import { notFound } from "next/navigation";

// 🚀 Premium SEO: Dynamically generate social share cards for each specific event!
export async function generateMetadata({ params }) {
  try {
    // 1. Await the params Promise here!
    const { id } = await params;

    // 2. Pass the unwrapped ID
    const event = await getEventById(id);

    return {
      title: `${event.name} | DriftLand`,
      description:
        event.description || "Join us for this upcoming DriftLand event.",
      openGraph: {
        images: [event.image || "/default-event-bg.jpg"],
      },
    };
  } catch (error) {
    return { title: "Event Not Found" };
  }
}

export default async function EventDetailPage({ params }) {
  try {
    // 1. Await the params Promise here too!
    const { id } = await params;

    // 2. Fetch the data instantly on the server using the unwrapped ID.
    const initialEvent = await getEventById(id);

    // 3. Pass it to the interactive client component
    // We will update LiveEventDetails next to handle the Leaderboard and Bracket!
    return <LiveEventDetails initialEvent={initialEvent} eventId={id} />;
  } catch (error) {
    // If the ID is invalid, Next.js natively routes to your 404 / not-found.js page
    notFound();
  }
}
