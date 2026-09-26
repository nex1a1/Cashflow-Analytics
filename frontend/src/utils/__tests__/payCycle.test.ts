import { describe, it, expect } from 'vitest';
import { toCycleKey, cycleRange, cycleLabel, cycleRangeLabel, cycleSpanLabel, convertPeriodMode, matchCyclePreset, monthsBetween, monthsToPeriod } from '../payCycle';
import { getFilterLabel } from '../formatters';
import { isDateInFilter, getPeriodDateRange, generateDatesForPeriod } from '../dateHelpers';

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
    expect(cycleSpanLabel('2026-07')).toBe('25 ก.ค. 26 – 24 ส.ค. 26 · 31 วัน');
    expect(cycleSpanLabel('2026-12', '2027-01')).toBe('25 ธ.ค. 26 – 24 ก.พ. 27 · 62 วัน');
  });

  it('filters dates by pay cycle when the period is cycle-prefixed', () => {
    expect(isDateInFilter('2026-08-10', 'cycle:2026-07')).toBe(true);
    expect(isDateInFilter('2026-07-25', 'cycle:2026-07')).toBe(true);
    expect(isDateInFilter('2026-07-24', 'cycle:2026-07')).toBe(false);
    expect(isDateInFilter('10/01/2027', 'cycle:2026-12')).toBe(true); // DD/MM/YYYY + year boundary
    expect(isDateInFilter('2026-05-01', 'cycle:2026-03_2026-04')).toBe(true);
    expect(isDateInFilter('2026-05-25', 'cycle:2026-03_2026-04')).toBe(false);
    expect(isDateInFilter('2020-01-01', 'cycle:ALL')).toBe(true);
    // calendar mode unchanged
    expect(isDateInFilter('2026-07-24', '2026-07')).toBe(true);
    expect(isDateInFilter('2026-08-10', '2026-07')).toBe(false);
  });

  it('resolves cycle bounds for fetching and day lists', () => {
    expect(getPeriodDateRange('cycle:2026-07')).toEqual({
      startDate: '2026-07-25', endDate: '2026-08-24', fetchStartDate: '2026-04-25',
    });
    const dates = generateDatesForPeriod('cycle:2026-07', []);
    expect(dates[0]).toBe('2026-07-25');
    expect(dates.at(-1)).toBe('2026-08-24');
    expect(dates).toHaveLength(31);
    // multi-select cycles: each cycle's 25 → 24 days, not calendar months
    const multi = generateDatesForPeriod('cycle:2026-07,2026-03', []);
    expect([multi[0], multi.at(-1), multi.length]).toEqual(['2026-03-25', '2026-08-24', 62]);
    expect(isDateInFilter('2026-04-10', 'cycle:2026-03,2026-07')).toBe(true);
    expect(isDateInFilter('2026-05-10', 'cycle:2026-03,2026-07')).toBe(false);
  });

  it('labels cycle year/half/quarter presets', () => {
    expect(getFilterLabel('cycle:2026-01_2026-03')).toBe('รอบ Q1/2026 (25 ม.ค. 26 – 24 เม.ย. 26)');
    expect(getFilterLabel('cycle:2026-01_2026-12')).toBe('รอบปี 2026 (25 ม.ค. 26 – 24 ม.ค. 27)');
    expect(matchCyclePreset('2026-02_2026-04')).toBeNull();
  });

  it('converts periods between modes', () => {
    expect(convertPeriodMode('2026-09', true)).toBe('cycle:2026-08'); // 1–24 ก.ย. อยู่ในรอบ ส.ค.
    expect(convertPeriodMode('cycle:2026-08', false)).toBe('2026-09');
    expect(convertPeriodMode('2026-01', true)).toBe('cycle:2025-12');
    expect(convertPeriodMode('cycle:2026-03_2026-07', false)).toBe('2026-04_2026-08');
    expect(convertPeriodMode('cycle:ALL', false)).toBe('ALL');
    expect(convertPeriodMode('2026-02,2026-05', true)).toBe('cycle:2026-01,2026-04');
    expect(convertPeriodMode('2026-Q1', true)).toMatch(/^cycle:\d{4}-\d{2}$/);
  });
});

describe('month selection → period', () => {
  it('expands a span across a year boundary', () => {
    expect(monthsBetween('2026-02', '2025-11')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('collapses single / contiguous / scattered picks', () => {
    expect(monthsToPeriod(['2026-03'])).toBe('2026-03');
    expect(monthsToPeriod(['2026-01', '2025-12', '2026-02'])).toBe('2025-12_2026-02');
    expect(monthsToPeriod(['2026-04', '2026-01'])).toBe('2026-01,2026-04');
  });
});
