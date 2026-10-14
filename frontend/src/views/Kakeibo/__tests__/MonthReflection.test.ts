import { describe, expect, it } from 'vitest';
import { parseReflections, previousPeriod } from '../MonthReflection';

describe('MonthReflection helpers', () => {
  it('previousPeriod keeps the mode and crosses the year', () => {
    expect(previousPeriod('2026-01')).toBe('2025-12');
    expect(previousPeriod('cycle:2026-10')).toBe('cycle:2026-09');
  });
  it('parseReflections rejects junk', () => {
    expect(parseReflections(undefined)).toEqual({});
    expect(parseReflections([1])).toEqual({});
    expect(parseReflections({ '2026-10': { good: 'x' } })).toEqual({ '2026-10': { good: 'x' } });
  });
});
