// @vitest-environment jsdom
// frontend/src/components/modals/ImportGuideModal/__tests__/guideUtils.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getLongHeaders,
  getLongSampleRows,
  generateLongCsvContent,
  getWideHeaders,
  getWideSampleRows,
  generateWideCsvContent,
  LONG_VARIATION_INFO,
  resolveDayTypeVisual,
  downloadSampleCsv,
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

    it('sample rows use the first four categories, filling missing ones with sample names', () => {
      const keys = (cats: string[]) => getWideSampleRows(cats).flatMap(r => Object.keys(r.categoryAmounts));
      expect(new Set(keys([]))).toEqual(new Set(['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI']));
      expect(new Set(keys(['ข้าว', 'กาแฟ']))).toEqual(new Set(['ข้าว', 'กาแฟ', 'การเดินทาง', 'ซอฟต์แวร์ & AI']));
      expect(new Set(keys(['a', 'b', 'c', 'd', 'e']))).toEqual(new Set(['a', 'b', 'c', 'd']));
      for (const r of getWideSampleRows([])) {
        expect(Object.values(r.categoryAmounts).reduce((s: number, v) => s + (v ?? 0), 0)).toBeCloseTo(r.total, 2); // each row adds up
      }
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

describe('Import Guide Utils — wide cells', () => {
  const lines = generateWideCsvContent(['อาหาร', 'ช้อป', 'เดินทาง', 'ซอฟต์'], ',', 'th').trim().split('\n');

  it('writes amounts as quoted baht strings and an empty cell as a quoted dash', () => {
    expect(lines[1]).toBe('"01/09/2026","฿ 43.00","฿ -","฿ 55.00","฿ -","฿ 98.00","ข้าวเที่ยง + ข้าวเย็น"');
    expect(lines[5]).toBe('"05/09/2026","฿ -","฿ 49.00","฿ -","฿ -","฿ 49.00","Shopee VIP"');
  });

  it('doubles a quote inside a note', () => {
    expect(generateWideCsvContent(['a'], ',', 'th')).not.toContain('""""');
  });
});

describe('Import Guide Utils — long file text', () => {
  it('quotes descriptions (doubling any quote), and writes the kind in the language of the headers', () => {
    const th = generateLongCsvContent('full', ',', 'th').split('\n');
    expect(th[1]).toBe('01/09/2026,ทำงาน,รายจ่าย,เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง,"BGVP MX1 DAC/AMP (5/5)",427.6');
    expect(th[9]).toContain(',รายรับ,');
    expect(th[10]).toContain(',เงินออม,');
    const en = generateLongCsvContent('standard', ',', 'en').split('\n');
    expect(en[1]).toBe('01/09/2026,EXPENSE,เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง,"BGVP MX1 DAC/AMP (5/5)",427.6');
    expect(en[9]).toContain(',INCOME,');
    expect(en[10]).toContain(',SAVINGS,');
  });

  it('the minimal layout has neither a kind nor a day type', () => {
    expect(generateLongCsvContent('minimal', ',', 'th').split('\n')[2]).toBe('01/09/2026,อาหาร,"ข้าวเที่ยง",23');
  });

  it('the day type column falls back to "ทำงาน"', () => {
    expect(generateLongCsvContent('full', ',', 'th')).toContain('01/09/2026,ทำงาน,');
  });
});

describe('Import Guide Utils — day type of a sample date', () => {
  const cfg = [
    { id: 'h', name: 'holiday', label: 'Holiday', color: '#112233' },
    { id: 'w', name: 'workday', label: 'Workday', color: '#445566' },
  ] as any[];

  it('the 5th is the sample holiday, in either date style', () => {
    expect(resolveDayTypeVisual('05/09/2026', cfg)).toEqual({ label: 'Holiday', color: '#112233' });
    expect(resolveDayTypeVisual('2026-09-05', cfg)).toEqual({ label: 'Holiday', color: '#112233' });
  });

  it('every other day is a workday', () => {
    expect(resolveDayTypeVisual('04/09/2026', cfg)).toEqual({ label: 'Workday', color: '#445566' });
    expect(resolveDayTypeVisual('2026-09-06', cfg)).toEqual({ label: 'Workday', color: '#445566' });
  });

  it('Thai labels are recognised too', () => {
    const th = [{ id: 'h', label: 'วันหยุด', color: '#aa0000' }, { id: 'w', label: 'ทำงาน', color: '#00aa00' }] as any[];
    expect(resolveDayTypeVisual('05/09/2026', th)).toEqual({ label: 'วันหยุด', color: '#aa0000' });
    expect(resolveDayTypeVisual('01/09/2026', th)).toEqual({ label: 'ทำงาน', color: '#00aa00' });
  });

  it('with no matching configuration it still answers with the usual labels and colours', () => {
    expect(resolveDayTypeVisual('05/09/2026', [])).toEqual({ label: 'วันหยุด', color: '#EF4444' });
    expect(resolveDayTypeVisual('01/09/2026', [])).toEqual({ label: 'ทำงาน', color: '#10B981' });
  });
});

describe('Import Guide Utils — downloading', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hands the browser a UTF-8 CSV that starts with a BOM (so Excel reads Thai), under the given name, and cleans up', async () => {
    let blob: Blob | undefined;
    (URL as any).createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:test'; });
    (URL as any).revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('t.csv');
      expect(this.href).toContain('blob:test');
      expect(document.body.contains(this)).toBe(true);
    });

    downloadSampleCsv('t.csv', 'วันที่,x');

    expect(click).toHaveBeenCalledTimes(1);
    expect(blob!.type).toBe('text/csv;charset=utf-8;');
    const bytes = new Uint8Array(await new Promise<ArrayBuffer>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as ArrayBuffer); fr.readAsArrayBuffer(blob!); }));
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]); // the UTF-8 byte order mark
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('วันที่,x');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(document.querySelector('a[download]')).toBeNull(); // the temporary link is gone
  });
});
