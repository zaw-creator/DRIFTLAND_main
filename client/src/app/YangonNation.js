import Link from "next/link";
import styles from "./page.module.css";

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/yangon.nation", icon: "IG" },
  { label: "Facebook",  href: "https://www.facebook.com/yangonnation",   icon: "FB" },
];

const HIGHLIGHTS = [
  { stat: "Community",    desc: "Built by locals, for locals" },
  { stat: "Culture",      desc: "Celebrating Myanmar car scene" },
  { stat: "Partnership",  desc: "Official Driftland 154 ally" },
];

export default function YangonNation() {
  return (
    <section className={styles.ynSection}>
      <div className={styles.ynInner}>

        <div className={styles.ynHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Official Partner</p>
            <h2 className={styles.sectionTitle}>
              Yangon <span className={styles.heroAccent}>Nation</span>
            </h2>
            <p className={styles.ynDesc}>
              Yangon Nation is the heartbeat of Myanmar&apos;s street and track car
              culture. From weekend meets to full-scale events, they bring
              together the community that makes it all happen — and they do it
              right here at Driftland 154.
            </p>
          </div>

          <div className={styles.ynBadge}>
            <span className={styles.ynBadgeLabel}>Official Partner</span>
            <span className={styles.ynBadgeName}>YANGON NATION</span>
            <span className={styles.ynBadgeSub}>× DRIFTLAND 154</span>
          </div>
        </div>

        <div className={styles.ynHighlights}>
          {HIGHLIGHTS.map((h) => (
            <div key={h.stat} className={styles.ynHighlightItem}>
              <span className={styles.ynHighlightStat}>{h.stat}</span>
              <span className={styles.ynHighlightDesc}>{h.desc}</span>
            </div>
          ))}
        </div>

        <div className={styles.ynPhotoGrid}>
          <div className={`${styles.ynPhoto} ${styles.ynPhotoMain}`}>
            <div className={styles.ynPhotoOverlay}>
              <span className={styles.ynPhotoTag}>Yangon Nation</span>
            </div>
          </div>
          <div className={styles.ynPhoto}>
            <div className={styles.ynPhotoOverlay}>
              <span className={styles.ynPhotoTag}>Track Days</span>
            </div>
          </div>
          <div className={styles.ynPhoto}>
            <div className={styles.ynPhotoOverlay}>
              <span className={styles.ynPhotoTag}>Community</span>
            </div>
          </div>
        </div>

        <div className={styles.ynActions}>
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ynSocialBtn}
            >
              <span className={styles.ynSocialIcon}>{s.icon}</span>
              {s.label}
            </a>
          ))}
          <Link href="/events" className={styles.ctaPrimary}>
            Join an Event →
          </Link>
        </div>

      </div>
    </section>
  );
}
