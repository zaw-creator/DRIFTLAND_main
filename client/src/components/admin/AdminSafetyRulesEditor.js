'use client';

import { useState, useEffect } from 'react';
import styles from './AdminSafetyRulesEditor.module.css';

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

const EMPTY_RULE = { category: '', description: '', mandatory: true };

export default function AdminSafetyRulesEditor({ eventId, initialRules = [] }) {
  const [rules, setRules]     = useState(initialRules);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [adding, setAdding]   = useState(false);
  const [deleting, setDeleting] = useState(null); // index being deleted

  // Sync if parent passes updated rules
  useEffect(() => { setRules(initialRules); }, [initialRules]);

  async function handleAdd() {
    if (!newRule.category.trim() || !newRule.description.trim()) return;
    setAdding(true);
    try {
      const updated = await authRequest(
        `/api/admin/events/${eventId}/safety-rules`,
        { method: 'POST', body: JSON.stringify(newRule) }
      );
      setRules(updated);
      setNewRule(EMPTY_RULE);
    } catch (err) {
      alert(`Failed to add rule: ${err.message}`);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(index) {
    if (!confirm('Delete this safety rule?')) return;
    setDeleting(index);
    try {
      const updated = await authRequest(
        `/api/admin/events/${eventId}/safety-rules/${index}`,
        { method: 'DELETE' }
      );
      setRules(updated);
    } catch (err) {
      alert(`Failed to delete rule: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleMandatory(index) {
    const updated = [...rules];
    updated[index] = { ...updated[index], mandatory: !updated[index].mandatory };
    try {
      const res = await authRequest(
        `/api/admin/events/${eventId}/safety-rules/${index}`,
        { method: 'PUT', body: JSON.stringify(updated[index]) }
      );
      setRules(res);
    } catch (err) {
      alert(`Failed to update rule: ${err.message}`);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.redBar} />
        <h2>Safety rules</h2>
      </div>

      {/* Existing rules */}
      {rules.length === 0 && (
        <p className={styles.empty}>No safety rules added yet.</p>
      )}

      <div className={styles.ruleList}>
        {rules.map((rule, index) => (
          <div key={index} className={styles.ruleItem}>
            <div className={styles.ruleLeft}>
              <span className={styles.ruleCategory}>{rule.category}</span>
              <span className={styles.ruleDesc}>{rule.description}</span>
            </div>
            <div className={styles.ruleRight}>
              <button
                className={`${styles.mandatoryBtn} ${rule.mandatory ? styles.mandatory : styles.optional}`}
                onClick={() => handleToggleMandatory(index)}
                title="Toggle mandatory"
              >
                {rule.mandatory ? 'Mandatory' : 'Optional'}
              </button>
              <button
                className={styles.deleteBtn}
                disabled={deleting === index}
                onClick={() => handleDelete(index)}
              >
                {deleting === index ? '...' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new rule */}
      <div className={styles.addForm}>
        <h3 className={styles.addHeading}>Add rule</h3>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            placeholder="Category (e.g. Helmet)"
            value={newRule.category}
            onChange={(e) => setNewRule((p) => ({ ...p, category: e.target.value }))}
          />
          <input
            className={`${styles.input} ${styles.inputWide}`}
            placeholder="Description"
            value={newRule.description}
            onChange={(e) => setNewRule((p) => ({ ...p, description: e.target.value }))}
          />
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={newRule.mandatory}
              onChange={(e) => setNewRule((p) => ({ ...p, mandatory: e.target.checked }))}
            />
            Mandatory
          </label>
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={adding || !newRule.category.trim() || !newRule.description.trim()}
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}