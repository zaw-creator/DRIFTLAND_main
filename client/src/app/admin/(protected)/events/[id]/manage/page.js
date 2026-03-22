'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLeaderboardPanel from '@/components/admin/AdminLeaderboardPanel';
import AdminBracketManager from '@/components/admin/AdminBracketManager';
import AdminSafetyRulesEditor from '@/components/admin/AdminSafetyRulesEditor';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

async function authRequest(path, options = {}) {
  const token = getCookie('adminToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',           // send cookies with every request
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed: ${res.status}`);
  }
  const json = await res.json();
  // handle both { data: ... } and { success, data: ... } shapes
  return json.data ?? json;
}

const TABS = ['Safety Rules', 'Qualifying', 'Bracket'];

export default function ManageEventPage() {
  const router = useRouter();
  const { id } = useParams();

  const [event, setEvent]           = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState('Safety Rules');

  // End event confirm dialog
  const [endDialog, setEndDialog]   = useState(false);
  const [ending, setEnding]         = useState(false);
  const [endError, setEndError]     = useState(null);

  // Fetch event + leaderboard
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      authRequest(`/api/admin/events/${id}`),
      authRequest(`/api/events/${id}/leaderboard`).catch(() => ({ data: [] })),
    ])
      .then(([eventData, lbData]) => {
        setEvent(eventData);
        setLeaderboard(lbData?.data ?? []);
      })
      .catch((err) => setError(err.message || 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [id]);

  // SSE — update event status live (e.g. auto-ended)
  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`${API_URL}/api/events/${id}/stream`);
    es.addEventListener('event-updated', (e) => {
      const patch = JSON.parse(e.data);
      if (patch.type === 'EVENT_ENDED') {
        setEvent((prev) => ({ ...prev, status: 'ended' }));
      }
      if (patch.type === 'LEADERBOARD_UPDATE') {
        setLeaderboard(patch.leaderboard ?? []);
      }
    });
    return () => es.close();
  }, [id]);

  async function handleForceEnd() {
    setEnding(true);
    setEndError(null);
    try {
      await authRequest(`/api/admin/events/${id}/end`, { method: 'POST' });
      setEvent((prev) => ({ ...prev, status: 'ended' }));
      setEndDialog(false);
    } catch (err) {
      setEndError(err.message || 'Failed to end event');
    } finally {
      setEnding(false);
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonBar} />
          <div className={styles.skeletonContent} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p className={styles.errorMsg}>⚠️ {error}</p>
          <button className={styles.backBtn} onClick={() => router.push('/admin/events')}>
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const isEnded    = event.status === 'ended' || event.status === 'archived';
  const isUpcoming = event.status === 'upcoming';

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push('/admin/events')}
        >
          ← Events
        </button>

        <div className={styles.titleRow}>
          <div className={styles.titleBlock}>
            <div className={styles.redBar} />
            <div>
              <h1 className={styles.title}>{event.name}</h1>
              <p className={styles.subtitle}>{event.location}</p>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Status badge */}
            <span className={`${styles.statusBadge} ${styles[event.status]}`}>
              {event.status.toUpperCase()}
            </span>

            {/* Register event ID field */}
            <div className={styles.registerIdRow}>
              <span className={styles.registerIdLabel}>Register Event ID</span>
              <RegisterEventIdField
                eventId={id}
                initialValue={event.registerEventId || ''}
                onSaved={(val) => setEvent((prev) => ({ ...prev, registerEventId: val }))}
              />
            </div>

            {/* Edit event button */}
            <button
              className={styles.editBtn}
              onClick={() => router.push(`/admin/events/${id}/edit`)}
            >
              Edit details
            </button>

            {/* Force end button — only show if not already ended */}
            {!isEnded && (
              <button
                className={styles.endBtn}
                onClick={() => setEndDialog(true)}
              >
                End event
              </button>
            )}

            {isEnded && (
              <span className={styles.endedNote}>
                {event.pushedToRegisterAt
                  ? 'Results pushed to register DB'
                  : 'Pushing results...'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className={styles.tabContent}>

        {activeTab === 'Safety Rules' && (
          <AdminSafetyRulesEditor
            eventId={id}
            initialRules={event.safetyRules || []}
          />
        )}

        {activeTab === 'Qualifying' && (
          <>
            {isUpcoming && (
              <div className={styles.notice}>
                Event has not started yet. You can pre-enter scores but
                the leaderboard won&apos;t be visible publicly until the
                event is active.
              </div>
            )}
            {isEnded && (
              <div className={styles.notice}>
                This event has ended. Scores are read-only.
              </div>
            )}
            <AdminLeaderboardPanel
              eventId={id}
              disabled={isEnded}
            />
          </>
        )}

        {activeTab === 'Bracket' && (
          <>
            {isEnded && (
              <div className={styles.notice}>
                This event has ended. Bracket is read-only.
              </div>
            )}
            <AdminBracketManager
              eventId={id}
              leaderboard={leaderboard}
              disabled={isEnded}
            />
          </>
        )}
      </div>

      {/* ── Force end confirm dialog ────────────────────────────────────── */}
      <ConfirmDialog
        open={endDialog}
        title="End Event"
        message={`Are you sure you want to end "${event.name}"? This will push all results to the register database and cannot be undone.`}
        onConfirm={handleForceEnd}
        onCancel={() => { setEndDialog(false); setEndError(null); }}
        loading={ending}
      />

      {endError && (
        <p className={styles.endError}>⚠️ {endError}</p>
      )}
    </div>
  );
}

// ── Inline sub-component: register event ID field ─────────────────────────────
// Small self-contained field — not worth a separate file
function RegisterEventIdField({ eventId, initialValue, onSaved }) {
  const [value, setValue]   = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await authRequest(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ registerEventId: value.trim() }),
      });
      onSaved(value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.registerIdField}>
      <input
        className={styles.registerIdInput}
        placeholder="Paste register event ID..."
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <button
        className={`${styles.registerIdBtn} ${saved ? styles.savedBtn : ''}`}
        onClick={handleSave}
        disabled={saving || !value.trim()}
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Link'}
      </button>
    </div>
  );
}