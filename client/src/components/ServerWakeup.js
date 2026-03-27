'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function ServerWakeup() {
  useEffect(() => {
    fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {});
  }, []);

  return null;
}
