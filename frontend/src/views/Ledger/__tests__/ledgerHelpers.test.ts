import { describe, it, expect } from 'vitest';
import { formatMoney } from '../../../utils/formatters';

describe('formatMoney (heatmap cell amounts)', () => {
  it('always formats numbers with exactly 2 decimal places', () => {
    expect(formatMoney(0)).toBe('0.00');
    expect(formatMoney(43)).toBe('43.00');
    expect(formatMoney(750)).toBe('750.00');
    expect(formatMoney(1781)).toBe('1,781.00');
    expect(formatMoney(1000)).toBe('1,000.00');
    expect(formatMoney(593.5)).toBe('593.50');
    expect(formatMoney(12500.75)).toBe('12,500.75');
  });
});
