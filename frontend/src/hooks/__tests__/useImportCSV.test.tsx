// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';
import useImportCSV from '../useImportCSV';

const api = vi.hoisted(() => ({
  transactionService: { getAll: vi.fn() },
  categoryService: { save: vi.fn() },
  dayTypeService: { save: vi.fn() },
  calendarService: { save: vi.fn() },
}));
vi.mock('../../services/api', () => api);
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => toast }));

const groups: any[] = [
  { id: 'g-inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-need', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-misc', name: 'ผันแปรอื่นๆ', type: 'expense', allocation_type: 'want', order_index: 3 },
  { id: 'g-sav', name: 'ลงทุน/ออม', type: 'savings', allocation_type: 'savings', order_index: 4 },
];
const categories: any[] = [
  { id: 'c-food', name: 'อาหาร', type: 'expense', cashflowGroup: 'g-need', allocation_type: 'need', order_index: 1 },
  { id: 'c-sal', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g-inc', order_index: 1 },
];
const dayTypeConfig: any[] = [{ id: 'dt-work', label: 'ทำงาน' }, { id: 'dt-hol', label: 'วันหยุด' }];

const HEADER = 'วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน';
const upload = (csv: string) => ({ target: { files: [{ text: async () => csv }] } }) as any;

function setup(over: Partial<Parameters<typeof useImportCSV>[0]> = {}) {
  const saveToDb = vi.fn().mockResolvedValue({ success: true });
  const props = {
    categories, cashflowGroups: groups, dayTypes: { '2026-10-04': 'dt-work' } as Record<string, string>, dayTypeConfig,
    setDayTypes: vi.fn(), setDayTypeConfig: vi.fn(), setCategories: vi.fn(),
    ...over,
    saveToDb,
  };
  const hook = renderHook(() => useImportCSV(props));
  return { ...hook, props, saveToDb };
}

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as any).mockReset()));
  toast.showToast.mockReset();
  api.transactionService.getAll.mockResolvedValue([]);
  api.categoryService.save.mockResolvedValue({ success: true });
  api.dayTypeService.save.mockResolvedValue({ success: true });
  api.calendarService.save.mockResolvedValue({ success: true });
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as any; // /transactions/predict
  vi.spyOn(console, 'error').mockImplementation(() => {}); // the failure cases below log on purpose
});

describe('useImportCSV — building the preview', () => {
  it('normalises dates (incl. Buddhist year), skips unreadable dates and rows that already exist', async () => {
    api.transactionService.getAll.mockResolvedValue([{ date: '2026-10-04', category: 'อาหาร', description: 'กาแฟ', amount: 50 }]);
    const { result } = setup();
    await act(async () => {
      await result.current.handleFileUpload(upload([
        HEADER,
        '5/10/2569,วันหยุด,รายจ่าย,อาหาร,ข้าวมันไก่,60',
        '4/10/2026,ทำงาน,รายจ่าย,อาหาร,กาแฟ,50', // already stored
        '1/2,ทำงาน,รายจ่าย,อาหาร,วันที่เสีย,10', // no year
      ].join('\n')));
    });
    const p = result.current.importPreview;
    expect(p.items.map((i: any) => [i.date, i.description])).toEqual([['2026-10-05', 'ข้าวมันไก่']]);
    expect(p.skippedDuplicates).toBe(1);
    expect(p.skippedInvalid).toBe(1);
    expect(p.newDayTypes['2026-10-05']).toBe('dt-hol'); // keyed by the ISO date, not the raw "5/10/2569"
  });

  it('a new category gets a REAL group (the one named "อื่น…" if there is one) and a lucide icon, not a made-up id or an emoji', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleFileUpload(upload([HEADER, '5/10/2026,ทำงาน,รายจ่าย,ค่าใหม่,ของใหม่,100'].join('\n')));
    });
    const created = result.current.importPreview.updatedCategories.find((c: any) => c.name === 'ค่าใหม่');
    expect(created.cashflowGroup).toBe('g-misc');
    expect(created.type).toBe('expense');
    expect(created.icon).toBe('tag');
  });

  it('refuses the file when a new category has no group of its type to live in', async () => {
    const { result } = setup({ cashflowGroups: groups.filter(g => g.type !== 'expense') });
    await act(async () => {
      await result.current.handleFileUpload(upload([HEADER, '5/10/2026,ทำงาน,รายจ่าย,ค่าใหม่,ของใหม่,100'].join('\n')));
    });
    expect(result.current.importPreview).toBeNull();
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringMatching(/กลุ่ม/), 'error');
  });

  it('tells the user when every row already exists instead of opening an empty preview', async () => {
    api.transactionService.getAll.mockResolvedValue([{ date: '2026-10-05', category: 'อาหาร', description: 'ข้าว', amount: 60 }]);
    const { result } = setup();
    await act(async () => {
      await result.current.handleFileUpload(upload([HEADER, '5/10/2026,ทำงาน,รายจ่าย,อาหาร,ข้าว,60'].join('\n')));
    });
    expect(result.current.importPreview).toBeNull();
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringMatching(/มีอยู่แล้ว/), 'info');
  });
});

describe('useImportCSV — confirming', () => {
  const twoRows = [HEADER, '5/10/2569,วันหยุด,รายจ่าย,อาหาร,ข้าวมันไก่,60', '5/10/2569,วันหยุด,รายจ่าย,ค่าใหม่,ของใหม่,100', '4/10/2026,ทำงาน,รายจ่าย,อาหาร,กาแฟ,50'].join('\n');

  it('saves new categories first, sends category_id, and only touches calendar days that changed', async () => {
    const { result, saveToDb } = setup();
    await act(async () => { await result.current.handleFileUpload(upload(twoRows)); });
    await act(async () => { await result.current.confirmImport({}); });

    expect(api.categoryService.save).toHaveBeenCalledTimes(1);
    const saved = api.categoryService.save.mock.calls[0][0];
    expect(saved).toMatchObject({ name: 'ค่าใหม่', cashflow_group_id: 'g-misc' });

    const items = saveToDb.mock.calls[0][0];
    expect(items.find((i: any) => i.description === 'ข้าวมันไก่').category_id).toBe('c-food');
    expect(items.find((i: any) => i.description === 'ของใหม่').category_id).toBe(saved.id);
    expect(api.categoryService.save.mock.invocationCallOrder[0]).toBeLessThan(saveToDb.mock.invocationCallOrder[0]);

    // 2026-10-04 is already ทำงาน, so only the 5th is sent
    expect(api.calendarService.save.mock.calls).toEqual([['2026-10-05', 'dt-hol']]);
    expect(api.dayTypeService.save).not.toHaveBeenCalled();
  });

  it('sends amounts as numbers, including the ones the user retyped in the preview (the field hands back text)', async () => {
    const { result, saveToDb } = setup();
    await act(async () => { await result.current.handleFileUpload(upload(twoRows)); });
    act(() => result.current.setImportPreview((p: any) => ({
      ...p, items: p.items.map((i: any) => (i.description === 'ข้าวมันไก่' ? { ...i, amount: '72.5' } : i)),
    })));
    await act(async () => { await result.current.confirmImport({}); });

    const sent = saveToDb.mock.calls[0][0];
    expect(sent.map((i: any) => i.amount)).toEqual(expect.arrayContaining([72.5, 100, 50]));
    expect(sent.every((i: any) => typeof i.amount === 'number')).toBe(true);
  });

  it('a day type label that does not exist yet is saved before the calendar uses it', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleFileUpload(upload([HEADER, '5/10/2026,ลาพักร้อน,รายจ่าย,อาหาร,ข้าว,60'].join('\n')));
    });
    await act(async () => { await result.current.confirmImport({}); });

    expect(api.dayTypeService.save).toHaveBeenCalledTimes(1);
    const dt = api.dayTypeService.save.mock.calls[0][0];
    expect(dt.label).toBe('ลาพักร้อน');
    expect(api.calendarService.save).toHaveBeenCalledWith('2026-10-05', dt.id);
    expect(api.dayTypeService.save.mock.invocationCallOrder[0]).toBeLessThan(api.calendarService.save.mock.invocationCallOrder[0]);
  });

  it('does not save any transaction when a new category could not be saved', async () => {
    api.categoryService.save.mockRejectedValue(new Error('boom'));
    const { result, saveToDb } = setup();
    await act(async () => { await result.current.handleFileUpload(upload(twoRows)); });
    await act(async () => { await result.current.confirmImport({}); });

    expect(saveToDb).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringContaining('boom'), 'error');
  });

  it('does not report plain success when some calendar days failed to save', async () => {
    api.calendarService.save.mockRejectedValue(new Error('fk'));
    const { result, saveToDb } = setup();
    await act(async () => { await result.current.handleFileUpload(upload(twoRows)); });
    await act(async () => { await result.current.confirmImport({}); });
    await flush();

    expect(saveToDb).toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringMatching(/ประเภทวันไม่สำเร็จ/), 'error');
    expect(toast.showToast).not.toHaveBeenCalledWith(expect.stringMatching(/สำเร็จ$/), 'success');
  });
});
