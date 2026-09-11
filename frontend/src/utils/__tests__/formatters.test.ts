import { describe, it, expect } from 'vitest';
import { 
  formatMoney, 
  satangToBaht,
  bahtToSatang,
  getThaiMonth, 
  getFilterLabel, 
  hexToRgb, 
  getThaiDayInfo, 
  calculatePeriodDelta,
  formatNumberWithCommas,
  parseCleanNumber
} from '../formatters';

describe('formatters utility', () => {
  describe('satangToBaht & bahtToSatang (Satang-First Mandate)', () => {
    it('correctly converts Satang to Baht', () => {
      expect(satangToBaht(100)).toBe(1);
      expect(satangToBaht(10050)).toBe(100.5);
      expect(satangToBaht(5000000)).toBe(50000);
      expect(satangToBaht(0)).toBe(0);
      expect(satangToBaht('2500')).toBe(25);
    });

    it('handles invalid inputs for satangToBaht gracefully', () => {
      expect(satangToBaht('invalid')).toBe(0);
      expect(satangToBaht(Number.NaN)).toBe(0);
    });

    it('correctly converts Baht to integer Satang with exact rounding', () => {
      expect(bahtToSatang(1)).toBe(100);
      expect(bahtToSatang(100.5)).toBe(10050);
      expect(bahtToSatang(50000)).toBe(5000000);
      expect(bahtToSatang(19.99)).toBe(1999);
      expect(bahtToSatang('50.25')).toBe(5025);
      expect(bahtToSatang(0)).toBe(0);
    });

    it('handles invalid inputs for bahtToSatang gracefully', () => {
      expect(bahtToSatang('invalid')).toBe(0);
      expect(bahtToSatang(Number.NaN)).toBe(0);
    });
  });

  describe('formatMoney', () => {
    it('formats numbers with 2 decimals and commas', () => {
      expect(formatMoney(1000)).toBe('1,000.00');
      expect(formatMoney(1234567.89)).toBe('1,234,567.89');
      expect(formatMoney(0)).toBe('0.00');
      expect(formatMoney('500.5')).toBe('500.50');
    });

    it('handles non-numeric inputs gracefully', () => {
      expect(formatMoney('')).toBe('0.00');
      expect(formatMoney(Number.NaN)).toBe('0.00');
    });
  });

  describe('getThaiMonth', () => {
    it('correctly maps ISO year-month string to Thai month name', () => {
      expect(getThaiMonth('2026-01')).toBe('มกราคม 2026');
      expect(getThaiMonth('2026-08')).toBe('สิงหาคม 2026');
      expect(getThaiMonth('2026-12')).toBe('ธันวาคม 2026');
    });

    it('returns raw string if not matching YYYY-MM format', () => {
      expect(getThaiMonth('invalid')).toBe('invalid');
      expect(getThaiMonth('')).toBe('');
    });
  });

  describe('getFilterLabel', () => {
    it('formats special period identifiers', () => {
      expect(getFilterLabel('ALL')).toBe('ดูภาพรวมทั้งหมด (All Time)');
      expect(getFilterLabel('2026')).toBe('ปี 2026');
      expect(getFilterLabel('2026-Q1')).toBe('ไตรมาส 1 (Q1/2026)');
      expect(getFilterLabel('2026-H1')).toBe('ครึ่งปีแรก (H1/2026)');
      expect(getFilterLabel('2026-05')).toBe('พฤษภาคม 2026');
    });

    it('formats range periods separated by underscore', () => {
      expect(getFilterLabel('2026-01_2026-03')).toBe('มกราคม 2026 - มีนาคม 2026');
    });

    it('formats comma-separated multi-month periods', () => {
      expect(getFilterLabel('2026-01,2026-02,2026-03')).toBe('เลือกเฉพาะเจาะจง (3 เดือน)');
    });
  });

  describe('hexToRgb', () => {
    it('converts 6-digit hex color to rgb string', () => {
      expect(hexToRgb('#da291c')).toBe('218, 41, 28');
      expect(hexToRgb('#ffffff')).toBe('255, 255, 255');
      expect(hexToRgb('#000000')).toBe('0, 0, 0');
    });

    it('converts 3-digit shorthand hex', () => {
      expect(hexToRgb('#f00')).toBe('255, 0, 0');
    });

    it('returns fallback rgb for invalid colors', () => {
      expect(hexToRgb('')).toBe('148, 163, 184');
      expect(hexToRgb('invalid')).toBe('148, 163, 184');
    });
  });

  describe('getThaiDayInfo', () => {
    it('resolves correct day info for a given date string', () => {
      // 2026-09-07 is Monday
      const dayInfo = getThaiDayInfo('2026-09-07');
      expect(dayInfo).not.toBeNull();
      expect(dayInfo?.label).toBe('จ.');
      expect(dayInfo?.fullName).toContain('วันจันทร์');
    });

    it('returns null for empty or invalid dates', () => {
      expect(getThaiDayInfo(null)).toBeNull();
      expect(getThaiDayInfo('invalid')).toBeNull();
    });
  });

  describe('calculatePeriodDelta', () => {
    it('calculates positive delta for income', () => {
      const result = calculatePeriodDelta({
        current: 12000,
        prev: 10000,
        hasPriorData: true,
        type: 'income',
      });
      expect(result.hasDelta).toBe(true);
      expect(result.diff).toBe(2000);
      expect(result.formattedPct).toBe('20.0%');
      expect(result.arrow).toBe('↑');
      expect(result.isGood).toBe(true);
    });

    it('calculates negative delta for expense (which is good when expense decreases)', () => {
      const result = calculatePeriodDelta({
        current: 8000,
        prev: 10000,
        hasPriorData: true,
        type: 'expense',
      });
      expect(result.hasDelta).toBe(true);
      expect(result.diff).toBe(-2000);
      expect(result.formattedPct).toBe('20.0%');
      expect(result.arrow).toBe('↓');
      expect(result.isGood).toBe(true); // Less expense is good!
    });
  });

  describe('formatNumberWithCommas & parseCleanNumber', () => {
    it('correctly adds commas to integers and decimals', () => {
      expect(formatNumberWithCommas(3991)).toBe('3,991');
      expect(formatNumberWithCommas('3991')).toBe('3,991');
      expect(formatNumberWithCommas('3991.50')).toBe('3,991.50');
      expect(formatNumberWithCommas('3991.')).toBe('3,991.');
      expect(formatNumberWithCommas('1000000')).toBe('1,000,000');
      expect(formatNumberWithCommas('')).toBe('');
      expect(formatNumberWithCommas(null)).toBe('');
      expect(formatNumberWithCommas(undefined)).toBe('');
    });

    it('correctly parses comma-formatted strings to numbers', () => {
      expect(parseCleanNumber('3,991')).toBe(3991);
      expect(parseCleanNumber('3,991.50')).toBe(3991.5);
      expect(parseCleanNumber('1,000,000')).toBe(1000000);
      expect(parseCleanNumber('')).toBeNull();
      expect(parseCleanNumber(null)).toBeNull();
      expect(parseCleanNumber('invalid')).toBeNull();
    });
  });
});
