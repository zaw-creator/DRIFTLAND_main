'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAdminEventById, updateEvent, uploadEventImage } from '@/services/adminEventService';
import EventForm from '@/components/admin/EventForm';
import styles from './page.module.css';

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await getAdminEventById(id);
        setEvent(data);
      } catch (err) {
        setFetchError(err.message || 'Failed to load event');
      }
    }
    load();
  }, [id]);

  async function handleSubmit(formData, imageFile) {
    setSaveLoading(true);
    setSaveError(null);
    try {
      await updateEvent(id, formData);
      if (imageFile) {
        await uploadEventImage(id, imageFile);
      }
      router.push('/admin/events');
    } catch (err) {
      setSaveError(err.message || 'Failed to save event');
      setSaveLoading(false);
    }
  }

  if (fetchError) {
    return <p className={styles.fetchError}>{fetchError}</p>;
  }

  if (!event) {
    return <p className={styles.loading}>Loading…</p>;
  }

  return (
    <div>
      <h1 className={styles.title}>Edit Event</h1>
      <EventForm
        initialValues={event}
        onSubmit={handleSubmit}
        loading={saveLoading}
        error={saveError}
      />
    </div>
  );
}
