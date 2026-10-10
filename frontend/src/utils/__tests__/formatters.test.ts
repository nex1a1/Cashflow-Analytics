import { describe, it, expect } from 'vitest';
import { 
  formatMoney, 
  formatAmount,
  formatBaht,
  formatBahtShort,
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

  describe('negative amounts: a true minus, in front of the baht sign', () => {
    it('formatMoney and formatAmount use the minus sign (U+2212), not a hyphen', () => {
      expect(formatMoney(-500)).toBe('−500.00');
      expect(formatMoney(-1234567.891)).toBe('−1,234,567.89');
      expect(formatMoney('-0.5')).toBe('−0.50');
      expect(formatAmount(-100)).toBe('−100');
      expect(formatAmount(-100.5)).toBe('−100.5');
      expect(formatMoney(-500)).not.toContain('-');
    });

    it('a value that rounds to zero shows no sign at all', () => {
      expect(formatMoney(-0.004)).toBe('0.00');
      expect(formatMoney(-0)).toBe('0.00');
      expect(formatAmount(-0.001)).toBe('0');
      expect(formatBaht(-0.004)).toBe('฿0.00');
    });

    it('formatBaht puts the minus before the baht sign: −฿500.00, never ฿-500.00', () => {
      expect(formatBaht(500)).toBe('฿500.00');
      expect(formatBaht(-500)).toBe('−฿500.00');
      expect(formatBaht(-1234.5)).toBe('−฿1,234.50');
      expect(formatBaht('-12')).toBe('−฿12.00');
      expect(formatBaht(0)).toBe('฿0.00');
      expect(formatBaht(Number.NaN)).toBe('฿0.00');
    });

    it('formatBahtShort is the same without trailing zeros', () => {
      expect(formatBahtShort(100)).toBe('฿100');
      expect(formatBahtShort(-100)).toBe('−฿100');
      expect(formatBahtShort(-100.5)).toBe('−฿100.5');
    });

    it('the period-delta tooltip writes a negative change the same way', () => {
      const r = calculatePeriodDelta({ current: 8000, prev: 10000, hasPriorData: true, type: 'expense' });
      expect(r.tooltipText).toBe('ช่วงก่อนหน้า: ฿10,000.00 (−฿2,000.00)');
      const up = calculatePeriodDelta({ current: 12000, prev: 10000, hasPriorData: true, type: 'income' });
      expect(up.tooltipText).toBe('ช่วงก่อนหน้า: ฿10,000.00 (+฿2,000.00)');
      const loss = calculatePeriodDelta({ current: -3000, prev: -1000, hasPriorData: true, type: 'net' });
      expect(loss.tooltipText).toBe('ช่วงก่อนหน้า: −฿1,000.00 (−฿2,000.00)');
      const fresh = calculatePeriodDelta({ current: -500, prev: 0, hasPriorData: true, type: 'net' });
      expect(fresh.tooltipText).toBe('ช่วงก่อนหน้า: ฿0.00 (ส่วนต่าง −฿500.00)');
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
      expect(getThaiMonth('2026-13')).toBe('2026-13');
      expect(getThaiMonth('2026-00')).toBe('2026-00');
    });
  });

  describe('getFilterLabel', () => {
    it('formats special period identifiers', () => {
      expect(getFilterLabel('ALL')).toBe('ดูภาพรวมทั้งหมด');
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

    it('every half and quarter has its Thai name; an unknown code or text is shown as is', () => {
      expect(getFilterLabel('2026-H2')).toBe('ครึ่งปีหลัง (H2/2026)');
      expect(getFilterLabel('2026-Q2')).toBe('ไตรมาส 2 (Q2/2026)');
      expect(getFilterLabel('2026-Q3')).toBe('ไตรมาส 3 (Q3/2026)');
      expect(getFilterLabel('2026-Q4')).toBe('ไตรมาส 4 (Q4/2026)');
      expect(getFilterLabel('2026-X9')).toBe('2026-X9');
      expect(getFilterLabel('junk')).toBe('junk');
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

    it('anything that is not a hex colour falls back to the ink-body token', () => {
      for (const bad of ['', null, undefined, 'invalid', '#12345', '#zzzzzz', 'rgb(1,2,3)']) {
        expect(hexToRgb(bad)).toBe('156, 163, 175'); // #9CA3AF
      }
      expect(hexToRgb('#0a0B0c')).toBe('10, 11, 12');
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

    const d = (current: number, prev: number, type: 'income' | 'expense' | 'net' = 'income', periodLabel = 'MoM') =>
      calculatePeriodDelta({ current, prev, hasPriorData: true, type, periodLabel });
    const GOOD = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    const BAD = 'border-danger/30 bg-danger/10 text-danger';
    const FLAT = 'border-neutral-800 bg-neutral-900/60 text-neutral-400';

    it('says in Thai what it compares with; an unknown code is shown as is, PoP by default', () => {
      expect(d(12, 10).text).toBe('↑ 20.0% เทียบเดือนก่อน');
      expect(d(12, 10, 'income', 'QoQ').text).toBe('↑ 20.0% เทียบไตรมาสก่อน');
      expect(d(12, 10, 'income', 'HoH').text).toBe('↑ 20.0% เทียบครึ่งปีก่อน');
      expect(d(12, 10, 'income', 'YoY').text).toBe('↑ 20.0% เทียบปีก่อน');
      expect(d(12, 10, 'income', 'XYZ').text).toBe('↑ 20.0% XYZ');
      expect(calculatePeriodDelta({ current: 12, prev: 10, hasPriorData: true }).text).toBe('↑ 20.0% เทียบช่วงก่อน');
    });

    it('more spending is bad, more income or net is good; the colour follows', () => {
      expect(d(12, 10, 'expense')).toMatchObject({ isGood: false, cls: BAD, arrow: '↑' });
      expect(d(8, 10, 'income')).toMatchObject({ isGood: false, cls: BAD, arrow: '↓' });
      expect(d(12, 10, 'net')).toMatchObject({ isGood: true, cls: GOOD });
      expect(d(8, 10, 'expense')).toMatchObject({ isGood: true, cls: GOOD });
    });

    it('a change within ±0.05% is flat: neutral, no arrow', () => {
      expect(d(10004, 10000)).toMatchObject({ isFlat: true, arrow: '–', isGood: false, cls: FLAT, text: '0.0% เทียบเดือนก่อน' });
      expect(d(9996, 10000, 'expense')).toMatchObject({ isFlat: true, cls: FLAT });
      expect(d(10006, 10000)).toMatchObject({ isFlat: false, arrow: '↑', formattedPct: '0.1%' });
    });

    it('a negative previous total compares against its size; a huge change is capped at >999%', () => {
      expect(d(500, -1000, 'net')).toMatchObject({ diff: 1500, formattedPct: '150.0%', arrow: '↑', isGood: true });
      expect(d(20000, 10).formattedPct).toBe('>999%');
      expect(d(10009, 1000).formattedPct).toBe('900.9%');
      expect(d(1100, 100).formattedPct).toBe('>999%'); // exactly +1000%
    });

    it('the tooltip writes the previous total and the signed change in baht', () => {
      expect(d(12, 10).tooltipText).toBe('ช่วงก่อนหน้า: ฿10.00 (+฿2.00)');
      expect(d(10, 10).tooltipText).toBe('ช่วงก่อนหน้า: ฿10.00 (+฿0.00)');
      expect(d(8, 10).tooltipText).toBe('ช่วงก่อนหน้า: ฿10.00 (−฿2.00)');
    });

    it('nothing before and nothing now: flat 0%', () => {
      expect(d(0, 0)).toMatchObject({ hasDelta: true, formattedPct: '0.0%', arrow: '–', isFlat: true, isGood: false, text: '0.0% เทียบเดือนก่อน', cls: FLAT });
    });

    it('nothing before but something now: "ใหม่", good or bad by type', () => {
      expect(d(500, 0)).toMatchObject({ formattedPct: 'ใหม่', arrow: '↑', diff: 500, prev: 0, isGood: true, isFlat: false, cls: GOOD, text: 'ใหม่ (เทียบเดือนก่อน)', tooltipText: 'ช่วงก่อนหน้า: ฿0.00 (ส่วนต่าง +฿500.00)' });
      expect(d(500, 0, 'expense')).toMatchObject({ isGood: false, cls: BAD });
      expect(d(-500, 0, 'net')).toMatchObject({ arrow: '↓', isGood: false, cls: BAD, tooltipText: 'ช่วงก่อนหน้า: ฿0.00 (ส่วนต่าง −฿500.00)' });
      expect(d(-500, 0, 'expense').isGood).toBe(true);
    });

    it('no earlier data, or the whole history: no comparison at all', () => {
      expect(calculatePeriodDelta({ current: 5, prev: 1, hasPriorData: false })).toMatchObject({ hasDelta: false, text: 'ช่วงแรก', tooltipText: 'ไม่มีข้อมูลช่วงก่อนหน้าให้เทียบ', isFlat: true, diff: 0 });
      expect(calculatePeriodDelta({ current: 5, prev: 1, hasPriorData: true, periodLabel: 'ALL' })).toMatchObject({ hasDelta: false, text: 'ทั้งหมด', tooltipText: 'แสดงข้อมูลทั้งหมด (ไม่มีช่วงก่อนหน้าให้เทียบ)' });
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
