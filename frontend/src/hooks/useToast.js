// src/hooks/useToast.js
// ─────────────────────────────────────────────────────────────
// แทนที่ showToast boolean + alert() กระจายอยู่ทั่ว App.jsx
// รองรับทั้ง success และ error
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';

export default function useToast(duration = 2500) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const timerRef = useRef(null);

  const show = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current); // ล้างตัวเก่าถ้ากดซ้ำ
    
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, duration);
  }, [duration]);

  useEffect(() => {
    // 🚀 Cleanup เมื่อ unmount ป้องกัน Memory Leak
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { toast, showSuccess: (m) => show(m, 'success'), showError: (m) => show(m, 'error') };
}