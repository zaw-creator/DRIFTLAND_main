'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminEvents, deleteEvent } from '@/services/adminEventService';
import EventsTable from '@/components/admin/EventsTable';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import styles from './page.module.css';

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function fetchEvents() {
    try {
      setError(null);
      const { data } = await getAdminEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  function handleDeleteRequest(id, name) {
    setDeleteTarget({ id, name });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
      await fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <button className={styles.createBtn} onClick={() => router.push('/admin/events/new')}>
          + Create Event
        </button>
      </div>

      {loading && <p className={styles.status}>Loading events…</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {!loading && (
        <EventsTable events={events} onDelete={handleDeleteRequest} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
