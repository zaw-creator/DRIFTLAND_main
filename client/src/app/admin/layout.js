import AdminNav from '@/components/admin/AdminNav';
import styles from './layout.module.css';

export const metadata = { title: 'DRIFTLAND Admin' };

export default function AdminLayout({ children }) {
  return (
    <div className={styles.shell}>
      <AdminNav />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
