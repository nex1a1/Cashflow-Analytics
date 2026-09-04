// src/components/ui/AnimatedNumber.jsx
import React from 'react';
import { formatMoney } from '../../utils/formatters';

export default function AnimatedNumber({ value, integer = false }) {
  const numValue = value ?? 0;
  const formatted = integer 
    ? Math.round(numValue).toLocaleString('th-TH', { maximumFractionDigits: 0 }) 
    : formatMoney(numValue);

  return <span>{formatted}</span>;
}