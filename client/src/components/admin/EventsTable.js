'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from '../events/StatusBadge';
import styles from './EventsTable.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function EnabledRolesBadges({ enabledRoles }) {
  if (!enabledRoles) return <span className={styles.allRoles}>All</span>;
  const roles = ['driver', 'participant', 'rider'].filter((r) => enabledRoles[r] !== false);
  if (roles.length === 3) return <span className={styles.allRoles}>All</span>;
  return (
    <span className={styles.roles}>
      {roles.map((r) => (
        <span key={r} className={styles.roleBadge}>
          {r.charAt(0).toUpperCase() + r.slice(1)}
        </span>
      ))}
    </span>
  );
}

/**
 * Props:
 *   events: array
 *   onDelete(id): called to trigger delete confirm dialog
 */
export default function EventsTable({ events, onDelete }) {
  const router = useRouter();

  if (!events.length) {
    return <p className={styles.empty}>No events yet.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Location</th>
            <th>Status</th>
            <th>Roles</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event._id}>
              <td className={styles.nameCell}>{event.name}</td>
              <td>{formatDate(event.eventDate)}</td>
              <td>{event.location}</td>
              <td>
                <StatusBadge status={event.status} />
              </td>
              <td>
                <EnabledRolesBadges enabledRoles={event.enabledRoles} />
              </td>
              <td className={styles.actions}>
                <button
                  className={styles.editBtn}
                  onClick={() => router.push(`/admin/events/${event._id}/edit`)}
                >
                  Edit
                </button>
                <button className={styles.deleteBtn} onClick={() => onDelete(event._id, event.name)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
