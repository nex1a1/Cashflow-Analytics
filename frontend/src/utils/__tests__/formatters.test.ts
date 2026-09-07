import { describe, it, expect } from 'vitest';
import { 
  formatMoney, 
  getThaiMonth, 
  getFilterLabel, 
  hexToRgb, 
  getThaiDayInfo, 
  calculatePeriodDelta 
} from '../formatters';

describe('formatters utility', () => {
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
});
