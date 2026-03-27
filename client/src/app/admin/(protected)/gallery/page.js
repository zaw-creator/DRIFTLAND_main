'use client';

import { useEffect, useRef, useState } from 'react';
import { getAdminGallery, uploadGalleryItem, deleteGalleryItem } from '@/services/adminGalleryService';
import styles from './page.module.css';

const CATEGORIES = ['Events', 'Cars', 'Track', 'Other'];

export default function AdminGalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload form state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Events');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  async function fetchItems() {
    try {
      setError(null);
      const data = await getAdminGallery();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearForm() {
    setFile(null);
    setPreview(null);
    setTitle('');
    setCategory('Events');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return setUploadError('Please select an image.');
    if (!title.trim()) return setUploadError('Please enter a title.');
    setUploading(true);
    setUploadError(null);
    try {
      const item = await uploadGalleryItem(file, title.trim(), category);
      setItems((prev) => [item, ...prev]);
      clearForm();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGalleryItem(deleteTarget._id);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Gallery</h1>
          <p className={styles.subheading}>{items.length} photo{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Upload form ── */}
      <form className={styles.uploadCard} onSubmit={handleUpload}>
        <h2 className={styles.cardTitle}>Upload Photo</h2>

        <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Preview" className={styles.preview} />
          ) : (
            <div className={styles.uploadPlaceholder}>
              <span className={styles.uploadIcon}>+</span>
              <span>Click to select image</span>
              <span className={styles.uploadHint}>JPG, PNG, WEBP</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. Opening Ceremony"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {uploadError && <p className={styles.uploadError}>{uploadError}</p>}

        <div className={styles.formActions}>
          {preview && (
            <button type="button" className={styles.clearBtn} onClick={clearForm}>
              Clear
            </button>
          )}
          <button type="submit" className={styles.uploadBtn} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>

      {/* ── Grid ── */}
      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>No photos yet. Upload one above.</p>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <div key={item._id} className={styles.card}>
              <img src={item.src} alt={item.title} className={styles.cardImg} />
              <div className={styles.cardInfo}>
                <span className={styles.cardCategory}>{item.category}</span>
                <span className={styles.cardTitle2}>{item.title}</span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={() => setDeleteTarget(item)}
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogText}>
              Delete <strong>{deleteTarget.title}</strong>? This also removes it from Cloudinary.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
