// frontend/src/components/modals/ImportGuideModal/guideUtils.ts
import { Category, DayType } from '../../../types';

export type LongVariation = 'full' | 'standard' | 'minimal';
export type HeaderLanguage = 'th' | 'en';
export type DelimiterChar = ',' | ';';

export interface SampleRow {
  id: string;
  date: string;
  dayType?: string;
  type?: 'income' | 'expense' | 'savings';
  category: string;
  description: string;
  amount: number;
}

export const LONG_VARIATION_INFO: Record<
  LongVariation,
  { title: string; subtitle: string; cols: number }
> = {
  full: {
    title: '6 คอลัมน์ (ครบวงจร)',
    subtitle: 'ระบุชนิดวันเพื่อซิงค์ปฏิทิน และระบุประเภท รายรับ/รายจ่าย/เงินออม',
    cols: 6,
  },
  standard: {
    title: '5 คอลัมน์ (มาตรฐาน)',
    subtitle: 'ระบุประเภท รายรับ/รายจ่าย (ชนิดวันจะถูกกำหนดตามวันทำการ/วันหยุด)',
    cols: 5,
  },
  minimal: {
    title: '4 คอลัมน์ (แบบย่อ)',
    subtitle: 'บันทึกเป็นรายจ่ายทั้งหมดอัตโนมัติ เหมาะกับสลิปค่าใช้จ่ายทั่วไป',
    cols: 4,
  },
};

export function getLongHeaders(variation: LongVariation, lang: HeaderLanguage = 'th'): string[] {
  if (lang === 'en') {
    switch (variation) {
      case 'full':
        return ['Date', 'DayType', 'Type', 'Category', 'Description', 'Amount'];
      case 'standard':
        return ['Date', 'Type', 'Category', 'Description', 'Amount'];
      case 'minimal':
        return ['Date', 'Category', 'Description', 'Amount'];
    }
  }

  switch (variation) {
    case 'full':
      return ['วันที่', 'ชนิดวัน', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'];
    case 'standard':
      return ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'];
    case 'minimal':
      return ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'];
  }
}

export function getLongSampleRows(): SampleRow[] {
  return [
    { id: '1', date: '01/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง', description: 'BGVP MX1 DAC/AMP (5/5)', amount: 427.60 },
    { id: '2', date: '01/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'อาหาร', description: 'ข้าวเที่ยง', amount: 23.00 },
    { id: '3', date: '01/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'อาหาร', description: 'ข้าวเย็น', amount: 20.00 },
    { id: '4', date: '01/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'อื่นๆ', description: 'ค่าธรรมเนียมรายปีบัตรเดบิต (SCB)', amount: 200.00 },
    { id: '5', date: '02/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'ซอฟต์แวร์ & AI', description: 'Gemini Pro', amount: 750.00 },
    { id: '6', date: '02/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'อาหาร', description: 'ข้าวเที่ยง', amount: 20.00 },
    { id: '7', date: '02/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'อาหาร', description: 'ข้าวเย็น', amount: 20.00 },
    { id: '8', date: '02/09/2026', dayType: 'ทำงาน', type: 'expense', category: 'ช้อปปิ้งออนไลน์', description: 'สตรูหัวเวเฟอร์ 16 มม.', amount: 24.00 },
    { id: '9', date: '03/09/2026', dayType: 'ทำงาน', type: 'income', category: 'เงินเดือน', description: 'เงินเดือนประจำเดือน', amount: 35000.00 },
    { id: '10', date: '03/09/2026', dayType: 'ทำงาน', type: 'savings', category: 'การลงทุนและออมเงิน', description: 'โอนออมหุ้น DCA', amount: 5000.00 },
    { id: '11', date: '05/09/2026', dayType: 'วันหยุด', type: 'expense', category: 'สมาชิกช้อปปิ้ง', description: 'Shopee VIP', amount: 49.00 },
  ];
}

export function generateLongCsvContent(
  variation: LongVariation,
  delimiter: DelimiterChar = ',',
  lang: HeaderLanguage = 'th'
): string {
  const headers = getLongHeaders(variation, lang);
  const rows = getLongSampleRows();

  let csv = headers.join(delimiter) + '\n';
  rows.forEach(r => {
    let rowValues: string[] = [];
    let typeLabel = '';
    if (lang === 'en') {
      typeLabel = r.type === 'income' ? 'INCOME' : r.type === 'savings' ? 'SAVINGS' : 'EXPENSE';
    } else {
      typeLabel = r.type === 'income' ? 'รายรับ' : r.type === 'savings' ? 'เงินออม' : 'รายจ่าย';
    }

    if (variation === 'full') {
      rowValues = [
        r.date,
        r.dayType || 'ทำงาน',
        typeLabel,
        r.category,
        `"${r.description.replaceAll('"', '""')}"`,
        String(r.amount),
      ];
    } else if (variation === 'standard') {
      rowValues = [
        r.date,
        typeLabel,
        r.category,
        `"${r.description.replaceAll('"', '""')}"`,
        String(r.amount),
      ];
    } else {
      rowValues = [
        r.date,
        r.category,
        `"${r.description.replaceAll('"', '""')}"`,
        String(r.amount),
      ];
    }
    csv += rowValues.join(delimiter) + '\n';
  });

  return csv;
}

export function getWideHeaders(categories: string[], lang: HeaderLanguage = 'th'): string[] {
  const safeCats = categories.length > 0
    ? categories
    : ['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI', 'ของใช้ในบ้าน'];
  const totalLabel = lang === 'en' ? 'Total' : 'รวม (Total)';
  const notesLabel = lang === 'en' ? 'Notes' : 'Notes';
  return ['Date', ...safeCats, totalLabel, notesLabel];
}

export interface WideSampleRow {
  id: string;
  date: string;
  dayType: string;
  categoryAmounts: Record<string, number | null>;
  total: number;
  note: string;
}

export function getWideSampleRows(categories: string[]): WideSampleRow[] {
  const cats = categories.length > 0
    ? categories
    : ['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI', 'ของใช้ในบ้าน'];

  const c0 = cats[0] || 'อาหาร';
  const c1 = cats[1] || 'ช้อปปิ้งออนไลน์';
  const c2 = cats[2] || 'การเดินทาง';
  const c3 = cats[3] || 'ซอฟต์แวร์ & AI';

  return [
    {
      id: 'w1',
      date: '01/09/2026',
      dayType: 'ทำงาน',
      categoryAmounts: { [c0]: 43.00, [c2]: 55.00 },
      total: 98.00,
      note: 'ข้าวเที่ยง + ข้าวเย็น',
    },
    {
      id: 'w2',
      date: '02/09/2026',
      dayType: 'ทำงาน',
      categoryAmounts: { [c0]: 40.00, [c1]: 24.00, [c3]: 750.00 },
      total: 814.00,
      note: 'Gemini Pro + สตรูหัวเวเฟอร์',
    },
    {
      id: 'w3',
      date: '03/09/2026',
      dayType: 'ทำงาน',
      categoryAmounts: { [c0]: 37.00, [c2]: 92.00 },
      total: 129.00,
      note: 'ข้าวเที่ยง + BTS',
    },
    {
      id: 'w4',
      date: '04/09/2026',
      dayType: 'ทำงาน',
      categoryAmounts: { [c0]: 39.00 },
      total: 39.00,
      note: 'ข้าวเที่ยง ข้าวเย็น',
    },
    {
      id: 'w5',
      date: '05/09/2026',
      dayType: 'วันหยุด',
      categoryAmounts: { [c1]: 49.00 },
      total: 49.00,
      note: 'Shopee VIP',
    },
  ];
}

export function generateWideCsvContent(
  categories: string[],
  delimiter: DelimiterChar = ',',
  lang: HeaderLanguage = 'th'
): string {
  const headers = getWideHeaders(categories, lang);
  const rows = getWideSampleRows(categories);
  const dataCatCols = headers.slice(1, headers.length - 2); // ตัด Date, รวม, Notes

  let csv = headers.map(h => `"${h}"`).join(delimiter) + '\n';

  rows.forEach(r => {
    const rowCells: string[] = [`"${r.date}"`];
    dataCatCols.forEach(cat => {
      const amt = r.categoryAmounts[cat];
      rowCells.push(amt ? `"฿ ${amt.toFixed(2)}"` : '"฿ -"');
    });
    rowCells.push(`"฿ ${r.total.toFixed(2)}"`);
    rowCells.push(`"${(r.note || '').replaceAll('"', '""')}"`);
    csv += rowCells.join(delimiter) + '\n';
  });

  return csv;
}

export function downloadSampleCsv(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function resolveDayTypeVisual(date: string, dayTypeConfig: DayType[]) {
  const found = dayTypeConfig.find(d => d.label === 'วันหยุด' || d.label === 'Holiday');
  const work = dayTypeConfig.find(d => d.label === 'ทำงาน' || d.label === 'Workday');

  if (date.startsWith('05/') || date.endsWith('-05')) {
    return {
      label: found?.label || 'วันหยุด',
      color: found?.color || '#EF4444',
    };
  }
  return {
    label: work?.label || 'ทำงาน',
    color: work?.color || '#10B981',
  };
}
