'use client';

import { useState } from 'react';
import RoleConfig from './RoleConfig';
import ImageUpload from './ImageUpload';
import styles from './EventForm.module.css';

const DRIVE_TYPE_OPTIONS = ['Drift', 'Time Attack'];

function toLocalDateString(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildInitialState(initial) {
  return {
    name:                 initial?.name                 || '',
    description:          initial?.description          || '',
    location:             initial?.location             || '',
    eventDate:            toLocalDateString(initial?.eventDate),
    eventEndDate:         toLocalDateString(initial?.eventEndDate),
    startTime:            initial?.startTime            || '',
    endTime:              initial?.endTime              || '',
    registrationDeadline: initial?.registrationDeadline
      ? (() => {
          const d   = new Date(initial.registrationDeadline);
          const y   = d.getFullYear();
          const mo  = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const h   = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          return `${y}-${mo}-${day}T${h}:${min}`;
        })()
      : '',
    editDeadlineHours:    initial?.editDeadlineHours    ?? 24,
    driveTypes:           initial?.driveTypes           || [],
    classes:              initial?.classes              || [],
    enabledRoles:         initial?.enabledRoles         || { driver: true, participant: true, rider: true },
    participantCapacity:  initial?.participantCapacity  ?? 0,
    riderCapacity:        initial?.riderCapacity        ?? 0,
    imageFile:            null,
    existingImageUrl:     initial?.image                || null,
  };
}

/**
 * Props:
 *   initialValues: event object | null (null = create mode)
 *   onSubmit(formData, imageFile): async function
 *   loading: bool
 *   error: string | null
 */
export default function EventForm({ initialValues, onSubmit, loading, error }) {
  const [form, setForm] = useState(() => buildInitialState(initialValues));

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDriveType(type) {
    setForm((prev) => {
      const has = prev.driveTypes.includes(type);
      return {
        ...prev,
        driveTypes: has ? prev.driveTypes.filter((t) => t !== type) : [...prev.driveTypes, type],
      };
    });
  }

  // Driver classes
  function addDriverClass() {
    setForm((prev) => ({
      ...prev,
      classes: [...prev.classes, { driveType: 'Drift', name: '', capacity: 0, registeredCount: 0 }],
    }));
  }

  function updateClass(index, field, value) {
    setForm((prev) => {
      const updated = prev.classes.map((c, i) =>
        i === index ? { ...c, [field]: field === 'capacity' ? Number(value) : value } : c
      );
      return { ...prev, classes: updated };
    });
  }

  function removeDriverClass(index) {
    setForm((prev) => ({ ...prev, classes: prev.classes.filter((_, i) => i !== index) }));
  }

  // RoleConfig value shape
  const roleConfigValue = {
    enabledRoles: form.enabledRoles,
    participantCapacity: form.participantCapacity,
    riderCapacity: form.riderCapacity,
  };

  function handleRoleConfigChange(updated) {
    setForm((prev) => ({
      ...prev,
      enabledRoles: updated.enabledRoles,
      participantCapacity: updated.participantCapacity,
      riderCapacity: updated.riderCapacity,
    }));
  }

  function handleDriverToggle(enabled) {
    setForm((prev) => ({
      ...prev,
      enabledRoles: { ...prev.enabledRoles, driver: enabled },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { imageFile, existingImageUrl, ...rest } = form;
    onSubmit(rest, imageFile);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.error}>{error}</p>}

      {/* Basic Info */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Info</h3>

        <div className={styles.field}>
          <label className={styles.label}>Event Name *</label>
          <input
            className={styles.input}
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Location *</label>
          <input
            className={styles.input}
            type="text"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Event Date *</label>
            <input
              className={styles.input}
              type="date"
              value={form.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
    <label className={styles.label}>Event End Date</label>
    <input
      className={styles.input}
      type="date"
      value={form.eventEndDate}
      onChange={(e) => set('eventEndDate', e.target.value)}
      min={form.eventDate} // can't end before it starts
    />
  </div>
          <div className={styles.field}>
            <label className={styles.label}>Start Time</label>
            <input
              className={styles.input}
              type="time"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>End Time</label>
            <input
              className={styles.input}
              type="time"
              value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Registration Deadline</label>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(e) => set('registrationDeadline', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Edit Deadline (hours before event)</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              value={form.editDeadlineHours}
              onChange={(e) => set('editDeadlineHours', Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Drive Types</label>
          <div className={styles.checkboxGroup}>
            {DRIVE_TYPE_OPTIONS.map((type) => (
              <label key={type} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.driveTypes.includes(type)}
                  onChange={() => toggleDriveType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Image */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Event Image</h3>
        <ImageUpload
          currentImageUrl={form.existingImageUrl}
          onFileChange={(file) => set('imageFile', file)}
        />
      </section>

      {/* Role Configuration */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Role Configuration</h3>
        <RoleConfig
          value={roleConfigValue}
          onChange={handleRoleConfigChange}
          driverEnabled={form.enabledRoles.driver !== false}
          onDriverToggle={handleDriverToggle}
        />
      </section>

      {/* Driver Classes */}
      {form.enabledRoles.driver !== false && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Driver Classes</h3>
          {form.classes.length === 0 && (
            <p className={styles.hint}>No classes yet. Add at least one class for drivers.</p>
          )}
          {form.classes.map((cls, i) => (
            <div key={i} className={styles.classRow}>
              <select
                className={styles.select}
                value={cls.driveType}
                onChange={(e) => updateClass(i, 'driveType', e.target.value)}
              >
                {DRIVE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                className={styles.input}
                type="text"
                placeholder="Class name (e.g. Class A)"
                value={cls.name}
                onChange={(e) => updateClass(i, 'name', e.target.value)}
              />
              <input
                className={`${styles.input} ${styles.narrow}`}
                type="number"
                min={0}
                placeholder="Capacity"
                value={cls.capacity}
                onChange={(e) => updateClass(i, 'capacity', e.target.value)}
              />
              <button
                type="button"
                className={styles.removeClassBtn}
                onClick={() => removeDriverClass(i)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className={styles.addClassBtn} onClick={addDriverClass}>
            + Add Class
          </button>
        </section>
      )}

      <div className={styles.footer}>
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Saving…' : 'Save Event'}
        </button>
      </div>
    </form>
  );
}
