// src/components/ui/AnimatedNumber.jsx
import { useState, useEffect } from 'react';
import { formatMoney } from '../../utils/formatters';

export default function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 800;
    const initialValue = displayValue;
    const difference = value - initialValue;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(initialValue + difference * easeProgress);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{formatMoney(displayValue)}</span>;
}