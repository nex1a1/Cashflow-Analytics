// src/components/ui/AnimatedNumber.jsx
import { useState, useEffect, useRef } from 'react';
import { formatMoney } from '../../utils/formatters';

export default function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef(null);
  const displayRef = useRef(displayValue); // เก็บค่าปัจจุบันไว้เทียบ

  useEffect(() => {
    let startTimestamp = null;
    const duration = 800;
    const initialValue = displayRef.current;
    const difference = value - initialValue;

    if (difference === 0) return; // ถ้าค่าเดิม ไม่ต้อง animate

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      const currentVal = initialValue + difference * easeProgress;
      setDisplayValue(currentVal);
      displayRef.current = currentVal;

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
        displayRef.current = value;
      }
    };
    
    animationRef.current = window.requestAnimationFrame(step);

    // 🚨 สำคัญมาก: ต้องมี Cleanup function หยุด Animation ถ้า Component ถูกปิด
    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  return <span>{formatMoney(displayValue)}</span>;
}