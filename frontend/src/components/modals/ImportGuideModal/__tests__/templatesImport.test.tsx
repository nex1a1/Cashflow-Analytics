// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@/test-utils/renderHook';
import useImportCSV from '@/hooks/useImportCSV';
import { generateLongCsvContent, generateWideCsvContent, getLongSampleRows, getWideSampleRows, type LongVariation } from '../guideUtils';

// The import guide hands the user template files and promises they import. This feeds every template it can produce
// (both languages, both delimiters, every column layout) through the real importer, so a change on either side that
// breaks the promise shows up here.
const api = vi.hoisted(() => ({
  transactionService: { getAll: vi.fn() },
  categoryService: { save: vi.fn() },
  dayTypeService: { save: vi.fn() },
  calendarService: { save: vi.fn() },
}));
vi.mock('@/services/api', () => api);
vi.mock('../../../../services/api', () => api);
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => toast }));

const groups: any[] = [
  { id: 'g-inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-need', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-misc', name: 'ผันแปรอื่นๆ', type: 'expense', allocation_type: 'want', order_index: 3 },
  { id: 'g-sav', name: 'ลงทุน/ออม', type: 'savings', allocation_type: 'savings', order_index: 4 },
];
const dayTypeConfig: any[] = [{ id: 'dt-work', label: 'ทำงาน' }, { id: 'dt-hol', label: 'วันหยุด' }];
const upload = (csv: string) => ({ target: { files: [{ text: async () => csv }] } }) as any;

function setup(categories: any[] = []) {
  return renderHook(() => useImportCSV({
    categories, cashflowGroups: groups, dayTypes: {}, dayTypeConfig,
    setDayTypes: vi.fn(), setDayTypeConfig: vi.fn(), setCategories: vi.fn(),
    saveToDb: vi.fn().mockResolvedValue({ success: true }),
  }));
}
const importIt = async (csv: string, categories: any[] = []) => {
  const hook = setup(categories);
  await act(async () => { await hook.result.current.handleFileUpload(upload(csv)); });
  return hook.result.current;
};

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as any).mockReset()));
  toast.showToast.mockReset();
  api.transactionService.getAll.mockResolvedValue([]);
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as any;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const samples = getLongSampleRows();
const variations: LongVariation[] = ['full', 'standard', 'minimal'];

describe('Import guide — long templates are importable', () => {
  const cases = variations.flatMap(v => (['th', 'en'] as const).flatMap(lang => ([',', ';'] as const).map(d => [v, lang, d] as const)));
  it.each(cases)('%s / %s / delimiter "%s": every sample row arrives, with its date and amount', async (variation, lang, delimiter) => {
    const state = await importIt(generateLongCsvContent(variation, delimiter, lang));
    const preview = state.importPreview;
    expect(preview, 'the importer rejected the template').not.toBeNull();
    expect(preview.items).toHaveLength(samples.length);
    expect(preview.skippedInvalid ?? 0).toBe(0);
    const arrived = preview.items.map((i: any) => [i.date, Math.abs(Number(i.amount))]);
    const expected = samples.map(s => [`${s.date.slice(6, 10)}-${s.date.slice(3, 5)}-${s.date.slice(0, 2)}`, s.amount]);
    expect(arrived).toEqual(expected);
  });

  it.each(variations)('%s: descriptions and categories survive (quotes included)', async (variation) => {
    const { importPreview } = await importIt(generateLongCsvContent(variation, ',', 'th'));
    const desc = importPreview.items.map((i: any) => i.description);
    expect(desc).toContain('BGVP MX1 DAC/AMP (5/5)');
    expect(desc).toContain('ค่าธรรมเนียมรายปีบัตรเดบิต (SCB)');
    expect(importPreview.items.map((i: any) => i.category)).toContain('ซอฟต์แวร์ & AI');
  });

  it('the full and standard templates carry the kind of each row: income, savings and expenses', async () => {
    for (const variation of ['full', 'standard'] as const) {
      for (const lang of ['th', 'en'] as const) {
        const { importPreview } = await importIt(generateLongCsvContent(variation, ',', lang));
        const byDesc = (d: string) => importPreview.items.find((i: any) => i.description === d);
        const typeOf = (d: string) => importPreview.updatedCategories.find((c: any) => c.name === byDesc(d).category)?.type;
        expect(typeOf('เงินเดือนประจำเดือน'), `${variation}/${lang}`).toBe('income');
        expect(typeOf('โอนออมหุ้น DCA'), `${variation}/${lang}`).toBe('savings');
        expect(typeOf('ข้าวเที่ยง'), `${variation}/${lang}`).toBe('expense');
      }
    }
  });

  it('the minimal template records everything as an expense, as its own description says', async () => {
    const { importPreview } = await importIt(generateLongCsvContent('minimal', ',', 'th'));
    const kinds = new Set(importPreview.items.map((i: any) => importPreview.updatedCategories.find((c: any) => c.name === i.category)?.type));
    expect([...kinds]).toEqual(['expense']);
  });

  it('the full template marks 5 September as a holiday in the calendar and the other days as workdays', async () => {
    const { importPreview } = await importIt(generateLongCsvContent('full', ',', 'th'));
    expect(importPreview.newDayTypes['2026-09-05']).toBe('dt-hol');
    expect(importPreview.newDayTypes['2026-09-01']).toBe('dt-work');
  });
});

describe('Import guide — wide templates are importable', () => {
  const sets: Array<[string, string[]]> = [
    ['the standard categories', ['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI', 'ของใช้ในบ้าน']],
    ['the user\'s own categories', ['ค่าห้อง', 'ค่ากาแฟ', 'ค่าเดินทาง']],
  ];
  const existing = (names: string[]) => names.map((name, i) => ({ id: `c${i}`, name, type: 'expense', cashflowGroup: 'g-need', allocation_type: 'need', order_index: i }));

  it.each(sets.flatMap(([label, names]) => (['th', 'en'] as const).flatMap(lang => ([',', ';'] as const).map(d => [label, names, lang, d] as const))))(
    '%s / %s / "%s": each filled cell becomes one row with its amount, and the total and notes columns are not imported',
    async (_label, names, lang, delimiter) => {
      const state = await importIt(generateWideCsvContent(names, delimiter, lang), existing(names));
      const preview = state.importPreview;
      expect(preview, 'the importer rejected the template').not.toBeNull();

      const filled = getWideSampleRows(names).flatMap(r => Object.entries(r.categoryAmounts).filter(([c, a]) => a && names.slice(0, 5).includes(c)).map(([c, a]) => [r.date, c, a]));
      expect(preview.items).toHaveLength(filled.length);
      expect(preview.items.reduce((s: number, i: any) => s + Number(i.amount), 0)).toBeCloseTo(filled.reduce((s, f) => s + (f[2] as number), 0), 2);
      expect(preview.items.some((i: any) => i.category === 'Notes' || /Total|รวม/.test(i.category))).toBe(false);
    },
  );
});
