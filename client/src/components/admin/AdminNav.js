'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/services/authService';
import styles from './AdminNav.module.css';

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Proceed with redirect even if logout API call fails
    }
    router.push('/admin/login');
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <div>
          <span className={styles.accent}>Drift</span>
          <span className={styles.brandName}>Land</span>
        </div>
        <p className={styles.subtitle}>Admin Portal</p>
      </div>

      <ul className={styles.links}>
        <li>
          <Link href="/admin/events" className={styles.link}>
            Events
          </Link>
        </li>
        <li>
          <Link href="/admin/gallery" className={styles.link}>
            Gallery
          </Link>
        </li>
      </ul>

      <button className={styles.logoutBtn} onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}