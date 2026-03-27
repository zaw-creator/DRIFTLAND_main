import { Suspense } from "react";
import LiveEventFeed from "@/components/events/LiveEventFeed";
import EventSkeleton from "@/components/events/EventSkeleton";
import { getEvents } from "@/services/eventService";
import styles from "./page.module.css";

export const metadata = {
  title: "Events | Driftland 154",
  description: "Find and register for Driftland 154 drift events.",
};

export default async function EventsPage({ searchParams }) {
  // Next.js 15: searchParams is a Promise
  const params = await searchParams;
  const status = params?.status || null;
  const initialEvents = await getEvents(status);

  return (
    <>
      <section className={styles.pageHero}>
        <div className={styles.pageHeroOverlay} />
        <div className={styles.pageHeroContent}>
          <p className={styles.pageHeroEyebrow}>Driftland 154</p>
          <h1 className={styles.pageHeroTitle}>EVENTS</h1>
          <p className={styles.pageHeroSub}>Register your ride. Show up. Drift.</p>
        </div>
      </section>

      <div className={styles.page}>
        <div className={styles.inner}>
          {/* Suspense is required whenever a client component calls useSearchParams() */}
          <Suspense fallback={<EventSkeleton />}>
            <LiveEventFeed initialEvents={initialEvents} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
