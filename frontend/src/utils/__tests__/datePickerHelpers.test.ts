import { describe, it, expect } from 'vitest';
import {
  splitDateValue,
  parseValue,
  toValueStr,
  getDatesInRange,
  groupContiguousDates,
  formatDisplay,
  getDecadeWindow,
  stepDate,
  stepMonth,
  stepYear,
  getPresetDates,
} from '../datePickerHelpers';

describe('datePickerHelpers', () => {
  describe('splitDateValue', () => {
    it('handles single date, comma-separated, and colon-separated dates', () => {
      expect(splitDateValue('2026-09-13')).toEqual(['2026-09-13']);
      expect(splitDateValue('2026-09-13,2026-09-14')).toEqual(['2026-09-13', '2026-09-14']);
      expect(splitDateValue('2026-09-13:2026-09-14')).toEqual(['2026-09-13', '2026-09-14']);
      expect(splitDateValue('')).toEqual([]);
    });
  });

  describe('parseValue and toValueStr', () => {
    it('parses YYYY-MM-DD string to Date object and formats back', () => {
      const parsed = parseValue('2026-09-13');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(8); // 0-indexed: Sept = 8
      expect(parsed.getDate()).toBe(13);
      expect(toValueStr(parsed)).toBe('2026-09-13');
    });

    it('parses filterPeriod YYYY-MM format when value is not specific', () => {
      const parsed = parseValue(null, '2027-11');
      expect(parsed.getFullYear()).toBe(2027);
      expect(parsed.getMonth()).toBe(10); // Nov = 10
      expect(parsed.getDate()).toBe(1);
    });
  });

  describe('getDatesInRange', () => {
    it('generates an array of all dates in inclusive range', () => {
      const dates = getDatesInRange('2026-09-10', '2026-09-13');
      expect(dates).toEqual(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
    });

    it('works regardless of start and end order', () => {
      const dates = getDatesInRange('2026-09-13', '2026-09-11');
      expect(dates).toEqual(['2026-09-11', '2026-09-12', '2026-09-13']);
    });
  });

  describe('groupContiguousDates', () => {
    it('groups consecutive dates into range buckets', () => {
      const grouped = groupContiguousDates(['2026-09-10', '2026-09-11', '2026-09-15', '2026-09-16', '2026-09-17']);
      expect(grouped).toEqual([
        ['2026-09-10', '2026-09-11'],
        ['2026-09-15', '2026-09-16', '2026-09-17'],
      ]);
    });
  });

  describe('formatDisplay', () => {
    it('formats single date with day of week and Thai month', () => {
      // 2026-09-13 is Sunday (อา.)
      const formatted = formatDisplay('2026-09-13');
      expect(formatted).toBe('อา. 13 ก.ย. 2026');
    });

    it('handles special values like WEEKDAY and WEEKEND', () => {
      expect(formatDisplay('WEEKDAY')).toContain('วันทำงาน');
      expect(formatDisplay('WEEKEND')).toContain('วันหยุด');
    });

    it('formats continuous ranges', () => {
      const formatted = formatDisplay('2026-09-01,2026-09-02,2026-09-03');
      expect(formatted).toContain('1 - 3 ก.ย. 2026');
    });
  });

  describe('getDecadeWindow', () => {
    it('computes 12-year window for a given year', () => {
      const window = getDecadeWindow(2026, 12);
      expect(window.start).toBe(2016);
      expect(window.end).toBe(2027);
      expect(window.years).toHaveLength(12);
      expect(window.years).toContain(2026);
      expect(window.years[0]).toBe(2016);
      expect(window.years[11]).toBe(2027);
    });
  });

  describe('stepDate, stepMonth, stepYear', () => {
    it('steps dates correctly across day boundaries', () => {
      expect(stepDate('2026-09-13', 1)).toBe('2026-09-14');
      expect(stepDate('2026-09-13', -1)).toBe('2026-09-12');
      expect(stepDate('2026-09-01', -1)).toBe('2026-08-31');
    });

    it('steps months correctly clamping max days', () => {
      const date = new Date(2026, 0, 31); // Jan 31, 2026
      const nextMonth = stepMonth(date, 1); // Feb 2026 (non-leap year has 28 days)
      expect(nextMonth.getMonth()).toBe(1); // Feb
      expect(nextMonth.getDate()).toBe(28);
    });

    it('steps years correctly', () => {
      const date = new Date(2026, 8, 13);
      const prevYear = stepYear(date, -1);
      expect(prevYear.getFullYear()).toBe(2025);
      const nextYear = stepYear(date, 2);
      expect(nextYear.getFullYear()).toBe(2028);
    });
  });

  describe('getPresetDates', () => {
    it('returns today, yesterday, startOfMonth, and endOfMonth', () => {
      const testDate = new Date(2026, 8, 13); // 13 Sept 2026
      const presets = getPresetDates(testDate);
      expect(presets.today).toBe('2026-09-13');
      expect(presets.yesterday).toBe('2026-09-12');
      expect(presets.startOfMonth).toBe('2026-09-01');
      expect(presets.endOfMonth).toBe('2026-09-30');
    });
  });
});
