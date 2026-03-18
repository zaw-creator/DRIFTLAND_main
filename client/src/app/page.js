import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      {/* Hero — full viewport, nav hidden while this is on screen */}
      <section id="hero-end" className={styles.hero}>
        <div id="hero-end" className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Premier Drift Racing Events</p>
          <h1 className={styles.heroTitle}>DRIFTLAND s</h1>
          <p className={styles.heroSub}>
            Experience the thrill of professional drift racing. Find events,
            register your ride, and join the community.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/events" className={styles.ctaPrimary}>
              Browse Events
            </Link>
            <Link href="/about" className={styles.ctaSecondary}>
              Learn More
            </Link>
          </div>
        </div>

        <div className={styles.scrollHint}>
          <div className={styles.scrollArrow} />
          Scroll
        </div>
      </section>

      {/* Sentinel — OUTSIDE the overflow:hidden hero. Nav appears when this exits viewport. */}
      <div id="nav-trigger" />

      {/* Section 2 — What is Driftland */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>What We Do</p>
          <h2 className={styles.sectionTitle}>
            Built for the Culture of Drift
          </h2>
          <p className={styles.sectionBody}>
            Driftland is the go-to platform for organized drift events — from
            local practice days to full-scale competitions. We handle
            registration, safety checks, and class management so drivers can
            focus on what matters: pushing the limit.
          </p>
        </div>
      </section>

      {/* Section 3 — Feature cards */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <p className={styles.sectionEyebrow}>How It Works</p>
          <h2 className={styles.sectionTitle}>Everything in One Place</h2>
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>01</div>
              <h3 className={styles.cardTitle}>Find Events</h3>
              <p className={styles.cardBody}>
                Browse ongoing, nearby, and upcoming drift events filtered by
                class and location.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>02</div>
              <h3 className={styles.cardTitle}>Register Your Ride</h3>
              <p className={styles.cardBody}>
                Sign up as a driver, participant, or spectator rider. Capacity
                is tracked live per class.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>03</div>
              <h3 className={styles.cardTitle}>Show Up & Drift</h3>
              <p className={styles.cardBody}>
                Safety requirements handled upfront. Just bring your car and
                your A-game.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — CTA banner */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Ready to Hit the Track?</h2>
        <p className={styles.ctaBannerSub}>
          Browse all active events and secure your spot before they fill up.
        </p>
        <Link href="/events" className={styles.ctaPrimary}>
          See All Events →
        </Link>
      </section>
    </>
  );
}
