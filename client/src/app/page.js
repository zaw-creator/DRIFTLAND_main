import Link from "next/link";
import styles from "./page.module.css";
import HeroSlideshow from "./HeroSlideshow";
import StatCounter from "./StatCounter";
import HomeEvents from "./HomeEvents";
import HomeGallery from "./HomeGallery";

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <HeroSlideshow />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Premier Drift Racing Events</p>
          <h1 className={styles.heroTitle}>DRIFT<span className={styles.heroAccent}>LAND</span> <br></br><span className={styles.heroAccent}>154</span> </h1>
        
          
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

      <div id="nav-trigger" />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>What We Do</p>
          <h2 className={styles.sectionTitle}>Built for the Culture of Drift</h2>
          <p className={styles.sectionBody}>
            Driftland is the go-to platform for organized drift events — from
            local practice days to full-scale competitions. We handle
            registration, safety checks, and class management so drivers can
            focus on what matters: pushing the limit.
          </p>
        </div>
      </section>

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
              <h3 className={styles.cardTitle}>Show Up &amp; Drift</h3>
              <p className={styles.cardBody}>
                Safety requirements handled upfront. Just bring your car and
                your A-game.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.statsInner}>
          <p className={styles.sectionEyebrow}>By the Numbers</p>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <StatCounter target={120} suffix="+" />
              <span className={styles.statLabel}>Events Run</span>
            </div>
            <div className={styles.statItem}>
              <StatCounter target={3400} />
              <span className={styles.statLabel}>Drivers Registered</span>
            </div>
            <div className={styles.statItem}>
              <StatCounter target={18} />
              <span className={styles.statLabel}>Partner Tracks</span>
            </div>
          </div>
        </div>
      </section>

      <HomeEvents />
      <HomeGallery />

      <section className={styles.quoteSection}>
        <div className={styles.quoteBgOverlay} />
        <figure className={styles.quoteInner}>
          <blockquote className={styles.quoteText}>
            &ldquo;One and Only Private Asphalt Drift Land In Myanmar 🇲🇲&rdquo;
          </blockquote>
          <figcaption className={styles.quoteAuthor}>
            —  Drift Land 154
          </figcaption>
        </figure>
      </section>

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