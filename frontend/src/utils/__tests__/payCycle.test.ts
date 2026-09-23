import { describe, it, expect } from 'vitest';
import { toCycleKey, cycleRange, cycleLabel, cycleRangeLabel } from '../payCycle';

describe('payCycle', () => {
  it('assigns dates to the salary month they belong to', () => {
    expect(toCycleKey('2026-07-25')).toBe('2026-07');
    expect(toCycleKey('2026-07-31')).toBe('2026-07');
    expect(toCycleKey('2026-08-24')).toBe('2026-07');
    expect(toCycleKey('2026-03-25')).toBe('2026-03');
  });

  it('crosses the year boundary', () => {
    expect(toCycleKey('2027-01-10')).toBe('2026-12');
    expect(cycleRange('2026-12')).toEqual({ start: '2026-12-25', end: '2027-01-24' });
  });

  it('formats labels', () => {
    expect(cycleLabel('2026-07')).toBe('รอบ ก.ค. 2026');
    expect(cycleRangeLabel('2026-07')).toBe('25 ก.ค. – 24 ส.ค.');
  });
});
