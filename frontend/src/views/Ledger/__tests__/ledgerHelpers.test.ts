import { describe, it, expect } from 'vitest';
import { formatCellAmount } from '../components/HorizontalView/HeatmapCell';

describe('formatCellAmount', () => {
  it('always formats numbers with exactly 2 decimal places', () => {
    expect(formatCellAmount(0)).toBe('0.00');
    expect(formatCellAmount(43)).toBe('43.00');
    expect(formatCellAmount(750)).toBe('750.00');
    expect(formatCellAmount(1781)).toBe('1,781.00');
    expect(formatCellAmount(1000)).toBe('1,000.00');
    expect(formatCellAmount(593.5)).toBe('593.50');
    expect(formatCellAmount(12500.75)).toBe('12,500.75');
  });
});

describe('Ledger Date Normalization & Parsing', () => {
  function computeUniqueMonths(dates: string[]): number {
    const months = new Set<string>();
    dates.forEach(date => {
      if (!date) return;
      if (date.includes('-')) {
        const parts = date.split('-');
        if (parts.length >= 2) months.add(`${parts[0]}-${parts[1]}`);
      } else {
        const parts = date.split('/');
        if (parts.length === 3) months.add(`${parts[2]}-${parts[1]}`);
      }
    });
    return months.size;
  }

  function normalizeDateForSort(d: string): string {
    if (!d) return '';
    if (d.includes('-')) return d.replace(/-/g, '');
    const parts = d.split('/');
    if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`;
    return d;
  }

  it('correctly calculates uniqueMonths for ISO YYYY-MM-DD format', () => {
    const dates = [
      '2026-08-15',
      '2026-08-20',
      '2026-09-01',
      '2026-09-10',
      '2026-10-05'
    ];
    expect(computeUniqueMonths(dates)).toBe(3);
  });

  it('correctly returns 1 for dates in single month', () => {
    const dates = ['2026-09-01', '2026-09-05', '2026-09-28'];
    expect(computeUniqueMonths(dates)).toBe(1);
  });

  it('correctly calculates uniqueMonths for slash DD/MM/YYYY format', () => {
    const dates = ['15/08/2026', '20/08/2026', '01/09/2026'];
    expect(computeUniqueMonths(dates)).toBe(2);
  });

  it('normalizes dates for lexicographical sort consistency', () => {
    expect(normalizeDateForSort('2026-09-08')).toBe('20260908');
    expect(normalizeDateForSort('08/09/2026')).toBe('20260908');
    expect(normalizeDateForSort('2026-12-31')).toBe('20261231');
  });
});
