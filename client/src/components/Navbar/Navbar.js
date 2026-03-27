'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const [visible, setVisible] = useState(!isHome);
  const [hasLive, setHasLive] = useState(false);

  // Scroll trigger — only on home page
  useEffect(() => {
    if (!isHome) {
      setVisible(true);
      return;
    }

    setVisible(false);

    const sentinel = document.getElementById('nav-trigger');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isHome]);

  // Check for live/ongoing events
  useEffect(() => {
    fetch('/api/events?includeAll=true')
      .then((r) => r.json())
      .then((data) => {
        const live = data.events?.some((e) => e.status === 'ongoing');
        setHasLive(live ?? false);
      })
      .catch(() => {});
  }, []);

  return (
    <nav className={`${styles.nav} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <Image src="/logo.png" alt="Driftland" height={36} width={120} priority />
        </Link>

        <ul className={styles.links}>
          <li>
            <Link href="/" className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/events" className={`${styles.link} ${pathname.startsWith('/events') ? styles.active : ''}`}>
              Events
            </Link>
          </li>
          <li>
            <Link href="/about" className={`${styles.link} ${pathname === '/about' ? styles.active : ''}`}>
              About
            </Link>
          </li>
          <li>
            <Link href="/contact" className={`${styles.link} ${pathname === '/contact' ? styles.active : ''}`}>
              Contact
            </Link>
          </li>
          {hasLive && (
            <li>
              <Link href="/events" className={styles.liveLink}>
                <span className={styles.liveDot} />
                LIVE
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
