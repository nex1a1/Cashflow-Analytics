// frontend/src/components/modals/ImportGuideModal/__tests__/guideUtils.test.ts
import { describe, it, expect } from 'vitest';
import {
  getLongHeaders,
  getLongSampleRows,
  generateLongCsvContent,
  getWideHeaders,
  getWideSampleRows,
  generateWideCsvContent,
  LONG_VARIATION_INFO,
} from '../guideUtils';

describe('Import Guide Utils', () => {
  describe('Long Format Utils', () => {
    it('returns correct 6 headers for full variation (Thai & EN)', () => {
      const headersTh = getLongHeaders('full', 'th');
      expect(headersTh).toEqual(['วันที่', 'ชนิดวัน', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน']);
      expect(headersTh.length).toBe(6);

      const headersEn = getLongHeaders('full', 'en');
      expect(headersEn).toEqual(['Date', 'DayType', 'Type', 'Category', 'Description', 'Amount']);
    });

    it('returns correct 5 headers for standard variation', () => {
      const headers = getLongHeaders('standard', 'th');
      expect(headers).toEqual(['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน']);
      expect(headers.length).toBe(5);
    });

    it('returns correct 4 headers for minimal variation', () => {
      const headers = getLongHeaders('minimal', 'th');
      expect(headers).toEqual(['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน']);
      expect(headers.length).toBe(4);
    });

    it('generates non-empty rows for sample preview matching export data feel', () => {
      const rows = getLongSampleRows();
      expect(rows.length).toBeGreaterThan(5);
      expect(rows[0].description).toBe('BGVP MX1 DAC/AMP (5/5)');
    });

    it('supports delimiter semicolon in generateLongCsvContent', () => {
      const csv = generateLongCsvContent('full', ';', 'th');
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('วันที่;ชนิดวัน;ประเภท;หมวดหมู่;รายละเอียด;จำนวนเงิน');
    });
  });

  describe('Wide Format Utils', () => {
    it('returns default categories if category array is empty', () => {
      const headers = getWideHeaders([], 'th');
      expect(headers[0]).toBe('Date');
      expect(headers[headers.length - 1]).toBe('Notes');
      expect(headers[headers.length - 2]).toBe('รวม (Total)');
    });

    it('supports English headers for wide format', () => {
      const headers = getWideHeaders(['Food', 'Transport'], 'en');
      expect(headers).toEqual(['Date', 'Food', 'Transport', 'Total', 'Notes']);
    });

    it('generates valid wide CSV content with semicolon delimiter', () => {
      const customCats = ['อาหาร', 'เดินทาง'];
      const csv = generateWideCsvContent(customCats, ';', 'th');
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('"Date";"อาหาร";"เดินทาง";"รวม (Total)";"Notes"');
    });
  });
});
