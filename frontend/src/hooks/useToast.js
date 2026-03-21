// src/hooks/useToast.js
// ─────────────────────────────────────────────────────────────
// แทนที่ showToast boolean + alert() กระจายอยู่ทั่ว App.jsx
// รองรับทั้ง success และ error
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

export default function useToast(duration = 2500) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const show = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), duration);
  }, [duration]);

  const showSuccess = useCallback((message = 'ทำรายการสำเร็จ!') => show(message, 'success'), [show]);
  const showError   = useCallback((message = 'เกิดข้อผิดพลาด')  => show(message, 'error'),   [show]);

  return { toast, showSuccess, showError };
}