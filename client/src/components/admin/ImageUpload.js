'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ImageUpload.module.css';

/**
 * Props:
 *   currentImageUrl: string | null  — existing image URL (from server)
 *   onFileChange(file | null): called when a new file is selected or removed
 */
export default function ImageUpload({ currentImageUrl, onFileChange }) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [isObjectUrl, setIsObjectUrl] = useState(false);
  const inputRef = useRef(null);

  // Revoke object URL on cleanup to avoid memory leaks
  useEffect(() => {
    return () => {
      if (isObjectUrl && preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview, isObjectUrl]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isObjectUrl && preview) {
      URL.revokeObjectURL(preview);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsObjectUrl(true);
    onFileChange(file);
  }

  function handleRemove() {
    if (isObjectUrl && preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setIsObjectUrl(false);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={styles.container}>
      {preview ? (
        <div className={styles.previewWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Event preview" className={styles.preview} />
          <button type="button" className={styles.removeBtn} onClick={handleRemove}>
            Remove
          </button>
        </div>
      ) : (
        <div className={styles.placeholder}>No image selected</div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.input}
        onChange={handleFileChange}
      />
    </div>
  );
}
