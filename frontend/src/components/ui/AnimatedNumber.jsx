// src/components/ui/AnimatedNumber.jsx
import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { formatMoney } from '../../utils/formatters';

export default function AnimatedNumber({ value, integer = false }) {
  const animatedValue = useCountUp(value, 800);

  const formatted = integer 
    ? Math.round(animatedValue).toLocaleString('th-TH', { maximumFractionDigits: 0 }) 
    : formatMoney(animatedValue);

  return <span>{formatted}</span>;
}