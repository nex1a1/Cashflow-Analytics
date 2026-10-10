// src/components/ui/AnimatedNumber.tsx
import React from 'react';
import { formatMoney } from '../../utils/formatters';

export interface AnimatedNumberProps {
  value?: number | null;
  /** a count: no decimals (toLocaleString rounds) */
  integer?: boolean;
}

export default function AnimatedNumber({ value, integer = false }: AnimatedNumberProps) {
  const numValue = value ?? 0;
  const formatted = integer
    ? numValue.toLocaleString('th-TH', { maximumFractionDigits: 0 })
    : formatMoney(numValue);

  return <span>{formatted}</span>;
}
