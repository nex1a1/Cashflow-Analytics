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
  formatRangeLabel,
} from '../datePickerHelpers';

describe('datePickerHelpers', () => {
  describe('splitDateValue', () => {
    it('handles single date and comma-separated dates', () => {
      expect(splitDateValue('2026-09-13')).toEqual(['2026-09-13']);
      expect(splitDateValue('2026-09-13,2026-09-14')).toEqual(['2026-09-13', '2026-09-14']);
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

    it('a pay cycle opens on its salary month; a year or a range is not one month, so today', () => {
      const c = parseValue('WEEKDAY', 'cycle:2026-07');
      expect([c.getFullYear(), c.getMonth()]).toEqual([2026, 6]);
      const now = new Date();
      for (const p of ['2026', '2026-01_2026-03']) {
        const d = parseValue('ALL', p);
        expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([now.getFullYear(), now.getMonth(), now.getDate()]);
      }
    });

    it('a list opens on its first date; junk falls back', () => {
      expect(toValueStr(parseValue('2026-03-05,2026-04-01'))).toBe('2026-03-05');
      expect(toValueStr(parseValue('2026-03', '2027-11'))).toBe('2027-11-01');
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

  describe('groupContiguousDates (input order does not matter)', () => {
    it('sorts before grouping', () => {
      expect(groupContiguousDates(['2026-09-03', '2026-09-01', '2026-09-02', '2026-09-07'])).toEqual([
        ['2026-09-01', '2026-09-02', '2026-09-03'], ['2026-09-07'],
      ]);
      expect(groupContiguousDates([])).toEqual([]);
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
      expect(formatDisplay('2026-09-01,2026-09-02,2026-09-03')).toBe('1 - 3 ก.ย. 2026');
    });

    it('a range that crosses a month names both months', () => {
      expect(formatDisplay('2026-01-30,2026-01-31,2026-02-01,2026-02-02')).toBe('30 ม.ค. - 2 ก.พ. 2026');
    });

    it('a range that crosses a year names both years', () => {
      expect(formatDisplay('2025-12-31,2026-01-01')).toBe('31 ธ.ค. 2025 - 1 ม.ค. 2026');
    });

    it('several ranges in one month name the month once', () => {
      expect(formatDisplay('2026-09-01,2026-09-03,2026-09-04,2026-09-05')).toBe('1, 3-5 ก.ย.');
    });

    it('several ranges over several months give each its month', () => {
      expect(formatDisplay('2026-01-05,2026-01-30,2026-01-31,2026-02-01,2026-02-10')).toBe('5 ม.ค., 30 ม.ค.-1 ก.พ., 10 ก.พ.');
    });

    it('an unreadable value falls back to the placeholder', () => {
      expect(formatDisplay('abc', 'วันที่')).toBe('วันที่');
      expect(formatDisplay('', 'วันที่')).toBe('วันที่');
      expect(formatDisplay('ALL', 'วันที่')).toBe('วันที่');
    });
  });

  describe('stepMonth at the year limits', () => {
    it('stays put instead of leaving 2000..2050', () => {
      expect(toValueStr(stepMonth(new Date(2000, 0, 15), -1))).toBe('2000-01-15');
      expect(toValueStr(stepMonth(new Date(2050, 11, 15), 1))).toBe('2050-12-15');
      expect(toValueStr(stepMonth(new Date(2050, 10, 30), 1))).toBe('2050-12-30');
    });
  });

  describe('stepYear on 29 Feb', () => {
    it('lands on 28 Feb in a common year', () => {
      expect(toValueStr(stepYear(new Date(2028, 1, 29), 1))).toBe('2029-02-28');
      expect(toValueStr(stepYear(new Date(2028, 1, 29), -4))).toBe('2024-02-29');
    });
  });

  describe('formatRangeLabel', () => {
    it('one day, a range inside a month, and a range across months', () => {
      expect(formatRangeLabel(['2026-09-13'])).toBe('13 ก.ย.');
      expect(formatRangeLabel(['2026-09-13', '2026-09-14', '2026-09-15'])).toBe('13 - 15 ก.ย.');
      expect(formatRangeLabel(['2026-01-31', '2026-02-01'])).toBe('31 ม.ค. - 1 ก.พ.');
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

    it('steps years correctly and clamps within MIN_YEAR and MAX_YEAR', () => {
      const date = new Date(2026, 8, 13);
      const prevYear = stepYear(date, -1);
      expect(prevYear.getFullYear()).toBe(2025);
      const nextYear = stepYear(date, 2);
      expect(nextYear.getFullYear()).toBe(2028);

      // Clamping test
      const clampedMin = stepYear(new Date(2002, 0, 1), -10);
      expect(clampedMin.getFullYear()).toBe(2000);

      const clampedMax = stepYear(new Date(2045, 0, 1), 20);
      expect(clampedMax.getFullYear()).toBe(2050);
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
