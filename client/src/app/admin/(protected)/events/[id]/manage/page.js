'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLeaderboardPanel from '@/components/admin/AdminLeaderboardPanel';
import AdminBracketManager from '@/components/admin/AdminBracketManager';
import AdminSafetyRulesEditor from '@/components/admin/AdminSafetyRulesEditor';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

async function authRequest(path, options = {}) {
  const token = getCookie('adminToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
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
  return json.data ?? json;
}

const TABS = ['Safety Rules', 'Qualifying', 'Bracket'];

export default function ManageEventPage() {
  const router = useRouter();
  const { id } = useParams();

  const [event, setEvent]             = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState('Safety Rules');
  const [endDialog, setEndDialog]     = useState(false);
  const [ending, setEnding]           = useState(false);
  const [endError, setEndError]       = useState(null);
  const [bracketUpdate, setBracketUpdate]           = useState(null);
  const [leaderboardUpdate, setLeaderboardUpdate]   = useState(null);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState(null);

  // ── Fetch event data ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [eventData, scoresData] = await Promise.all([
        authRequest(`/api/admin/events/${id}`),
        authRequest(`/api/admin/events/${id}/scores`).catch(() => []),
      ]);
      setEvent(eventData);
      setLeaderboard(Array.isArray(scoresData) ? scoresData : []);
    } catch (err) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── SSE ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`${API_URL}/api/events/${id}/stream`);

    es.addEventListener('event-updated', (e) => {
      try {
        const patch = JSON.parse(e.data);
        if (patch.type === 'EVENT_ENDED') {
          setEvent((prev) => ({ ...prev, status: 'ended' }));
        }
        if (patch.type === 'LEADERBOARD_UPDATE') {
          setLeaderboard(patch.leaderboard ?? []);
          setLeaderboardUpdate(patch.leaderboard ?? []);
        }
        if (
          patch.type === 'BRACKET_UPDATE' ||
          patch.type === 'BRACKET_GENERATED' ||
          patch.type === 'BRACKET_REGENERATED'
        ) {
          setBracketUpdate({ bracket: patch.bracket ?? [] });
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    es.onerror = () => es.close();
    return () => es.close();
  }, [id]);

  // ── Sync registrations from register DB ────────────────────────────────
  async function handleSyncRegistrations() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await authRequest(`/api/admin/events/${id}/sync-registrations`, { method: 'POST' });
      setSyncMsg({ type: 'ok', text: result.message || 'Sync complete' });
      // refresh event so the registration counts update on this page too
      const updated = await authRequest(`/api/admin/events/${id}`);
      setEvent(updated);
    } catch (err) {
      setSyncMsg({ type: 'err', text: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  // ── Force end ───────────────────────────────────────────────────────────
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

  // ── Loading / error states ───────────────────────────────────────────────
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

  // ── Derived state — MUST be after null checks ────────────────────────────
  const isEnded    = event.status === 'ended' || event.status === 'archived';
  const isUpcoming = event.status === 'upcoming';

  return (
    <div className={styles.page}>

      {/* ── Header ────────────────────────────────────────────────────── */}
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
            <span className={`${styles.statusBadge} ${styles[event.status]}`}>
              {event.status.toUpperCase()}
            </span>

            <div className={styles.registerIdRow}>
              <span className={styles.registerIdLabel}>Register Event ID</span>
              <RegisterEventIdField
                eventId={id}
                initialValue={event.registerEventId || ''}
                onSaved={(val) => setEvent((prev) => ({ ...prev, registerEventId: val }))}
              />
              {event.registerEventId && (
                <button
                  className={`${styles.syncBtn} ${syncing ? styles.syncBtnLoading : ''}`}
                  onClick={handleSyncRegistrations}
                  disabled={syncing}
                  title="Pull registration counts from register DB"
                >
                  {syncing ? 'Syncing...' : '↻ Sync Registrations'}
                </button>
              )}
              {syncMsg && (
                <span className={syncMsg.type === 'ok' ? styles.syncOk : styles.syncErr}>
                  {syncMsg.text}
                </span>
              )}
            </div>

            <button
              className={styles.editBtn}
              onClick={() => router.push(`/admin/events/${id}/edit`)}
            >
              Edit details
            </button>

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

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
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

      {/* ── Tab content ───────────────────────────────────────────────── */}
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
              bracketUpdate={bracketUpdate}
            />
          </>
        )}
      </div>

      {/* ── Confirm dialog ────────────────────────────────────────────── */}
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

// ── Register event ID field ───────────────────────────────────────────────────
function RegisterEventIdField({ eventId, initialValue, onSaved }) {
  const [value, setValue] = useState(initialValue);
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