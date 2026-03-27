import styles from "./page.module.css";

export const metadata = {
  title: "Shop | DriftLand",
  description: "The DriftLand shop is coming soon.",
};

export default function ShopPage() {
  return (
    <main className={styles.page}>

      {/* ── Hatched top accent line ── */}
      <div className={styles.accentLine} />

      <div className={styles.content}>

        {/* ── Eyebrow label ── */}
        <p className={styles.eyebrow}>
          <span className={styles.blinker} />
          DRIFTLAND STORE
        </p>

        {/* ── Main heading ── */}
        <h1 className={styles.heading}>COMING<br />SOON</h1>

        {/* ── Divider ── */}
        <div className={styles.divider} />

        {/* ── Sub-copy ── */}
        <p className={styles.body}>
          Gear up. Official DriftLand merchandise,<br />
          apparel, and accessories — dropping soon.
        </p>

      </div>

      {/* ── Corner watermark ── */}
      <span className={styles.watermark}>SHOP</span>

    </main>
  );
}
