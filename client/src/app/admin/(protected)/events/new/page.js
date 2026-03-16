'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent, uploadEventImage } from '@/services/adminEventService';
import EventForm from '@/components/admin/EventForm';
import styles from './page.module.css';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(formData, imageFile) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await createEvent(formData);
      if (imageFile) {
        await uploadEventImage(data._id, imageFile);
      }
      router.push('/admin/events');
    } catch (err) {
      setError(err.message || 'Failed to create event');
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className={styles.title}>Create Event</h1>
      <EventForm initialValues={null} onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
