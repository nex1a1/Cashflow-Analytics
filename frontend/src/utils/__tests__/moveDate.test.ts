import { describe, it, expect } from 'vitest';
import { parseDateMove, applyDateMove } from '../moveDate';

describe('parseDateMove', () => {
  it('reads a full date, ISO or D/M/YYYY with a Buddhist year', () => {
    expect(parseDateMove('2026-11-03')).toEqual({ kind: 'set', date: '2026-11-03' });
    expect(parseDateMove(' 3/11/2569 ')).toEqual({ kind: 'set', date: '2026-11-03' });
  });

  it('reads a bare day of the month', () => {
    expect(parseDateMove('25')).toEqual({ kind: 'day', day: 25 });
    expect(parseDateMove('0')).toBeNull();
    expect(parseDateMove('32')).toBeNull();
  });

  it('reads day and month shifts, with a hyphen or a true minus', () => {
    expect(parseDateMove('+3')).toEqual({ kind: 'shift', days: 3, months: 0 });
    expect(parseDateMove('-1d')).toEqual({ kind: 'shift', days: -1, months: 0 });
    expect(parseDateMove('−2d')).toEqual({ kind: 'shift', days: -2, months: 0 });
    expect(parseDateMove('+1M')).toEqual({ kind: 'shift', days: 0, months: 1 });
    expect(parseDateMove('+1 เดือน')).toEqual({ kind: 'shift', days: 0, months: 1 });
    expect(parseDateMove('+0')).toBeNull();
  });

  it('rejects anything else, including impossible dates', () => {
    for (const s of ['', 'พรุ่งนี้', '2026-02-30', '+1y', '1+']) expect(parseDateMove(s)).toBeNull();
  });
});

describe('applyDateMove', () => {
  it('set ignores the row date', () => {
    expect(applyDateMove({ kind: 'set', date: '2026-12-01' }, '2026-01-05')).toBe('2026-12-01');
  });

  it('day keeps the month and clamps to its length', () => {
    expect(applyDateMove({ kind: 'day', day: 25 }, '2026-01-05')).toBe('2026-01-25');
    expect(applyDateMove({ kind: 'day', day: 31 }, '2026-02-10')).toBe('2026-02-28');
  });

  it('day shifts cross month and year ends', () => {
    expect(applyDateMove({ kind: 'shift', days: 1, months: 0 }, '2026-12-31')).toBe('2027-01-01');
    expect(applyDateMove({ kind: 'shift', days: -1, months: 0 }, '2026-03-01')).toBe('2026-02-28');
  });

  it('month shifts keep the day, clamped, across years both ways', () => {
    expect(applyDateMove({ kind: 'shift', days: 0, months: 1 }, '2026-01-31')).toBe('2026-02-28');
    expect(applyDateMove({ kind: 'shift', days: 0, months: 1 }, '2028-01-31')).toBe('2028-02-29');
    expect(applyDateMove({ kind: 'shift', days: 0, months: 2 }, '2026-11-25')).toBe('2027-01-25');
    expect(applyDateMove({ kind: 'shift', days: 0, months: -1 }, '2026-01-15')).toBe('2025-12-15');
  });
});
