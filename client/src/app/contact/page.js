"use client";

import { useState } from "react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const SUBJECTS = [
  "General Inquiry",
  "Event Registration",
  "Partnership / Sponsorship",
  "Media & Press",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
      setForm({ name: "", email: "", subject: SUBJECTS[0], message: "" });
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  return (
    <>
      {/* ── Header ── */}
      <section className={styles.header}>
        <div className={styles.headerOverlay} />
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Get in Touch</p>
          <h1 className={styles.title}>CONTACT</h1>
          <p className={styles.subtitle}>Questions, partnerships, or just want to talk drift — we're here.</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* ── Info column ── */}
        <aside className={styles.info}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Location</span>
            <p className={styles.infoValue}>Driftland 154<br />Taungoo, Myanmar 🇲🇲</p>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Email</span>
            <a href="mailto:info@driftland154.com" className={styles.infoLink}>
              driftlandevent@gmail.com
            </a>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Follow Us</span>
            <div className={styles.socials}>
              <a href="#" className={styles.socialLink}>Facebook</a>
              <a href="#" className={styles.socialLink}>Instagram</a>
              <a href="#" className={styles.socialLink}>TikTok</a>
            </div>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Track Hours</span>
            <p className={styles.infoValue}>
              Event days only<br />
              <span className={styles.infoMuted}>Check Events page for schedule</span>
            </p>
          </div>
        </aside>

        {/* ── Form column ── */}
        <div className={styles.formWrap}>
          {status === "success" ? (
            <div className={styles.successBox}>
              <span className={styles.successIcon}>✓</span>
              <h2 className={styles.successTitle}>Message Sent</h2>
              <p className={styles.successBody}>
                Thanks for reaching out. We'll get back to you as soon as possible.
              </p>
              <button className={styles.resetBtn} onClick={() => setStatus(null)}>
                Send Another
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    className={styles.input}
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <select
                  className={styles.input}
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                >
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Message</label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  name="message"
                  placeholder="Write your message here…"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={6}
                />
              </div>

              {status === "error" && (
                <p className={styles.errorMsg}>{errorMsg}</p>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Send Message →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
