// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@/test-utils/renderHook';
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
  { id: 'g-sav', name: 'ลงทุน/ออม', type: 'savings', allocation_type: 'savings', order_index: 4 },
];
const categories: any[] = [
  { id: 'c-room', name: 'ค่าห้อง', type: 'expense', cashflowGroup: 'g-need', allocation_type: 'need', order_index: 1 },
  { id: 'c-coffee', name: 'ค่ากาแฟ', type: 'expense', cashflowGroup: 'g-need', allocation_type: 'need', order_index: 2 },
  { id: 'c-travel', name: 'ค่าเดินทาง', type: 'expense', cashflowGroup: 'g-need', allocation_type: 'need', order_index: 3 },
  { id: 'c-food', name: 'อาหาร', type: 'expense', cashflowGroup: 'g-need', allocation_type: 'need', order_index: 4 },
  { id: 'c-ai', name: 'ซอฟต์แวร์ & AI', type: 'expense', cashflowGroup: 'g-need', allocation_type: 'want', order_index: 5 },
  { id: 'c-sal', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g-inc', order_index: 1 },
  { id: 'c-gold', name: 'ทอง', type: 'savings', cashflowGroup: 'g-sav', order_index: 1 },
];
const upload = (csv: string) => ({ target: { files: [{ text: async () => csv }] } }) as any;
const predictions = (map: Record<string, string>) => {
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { name: v }])) })) as any;
};

function setup(cashflowGroups: any = groups) {
  const hook = renderHook(() => useImportCSV({
    categories, cashflowGroups, dayTypes: {}, dayTypeConfig: [],
    setDayTypes: vi.fn(), setDayTypeConfig: vi.fn(), setCategories: vi.fn(), saveToDb: vi.fn().mockResolvedValue({}),
  }));
  return hook;
}
const importText = async (csv: string) => {
  const { result } = setup();
  await act(async () => { await result.current.handleFileUpload(upload(csv)); });
  return result;
};

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as any).mockReset()));
  toast.showToast.mockReset();
  api.transactionService.getAll.mockResolvedValue([]);
  predictions({});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('wide table (one column per category)', () => {
  // แม่แบบแนวนอนในคู่มือใช้ชื่อหมวดของผู้ใช้เป็นหัวคอลัมน์ — ยอดแต่ละช่องต้องเข้าหมวดของคอลัมน์นั้น ไม่ใช่หมวดรายจ่ายแรก
  it('each amount goes into the category its column names', async () => {
    const r = await importText(['Date,ค่าห้อง,ค่ากาแฟ,ค่าเดินทาง,รวม (Total),Notes', '5/10/2026,4500,60,30,4590,'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => [i.category, i.amount])).toEqual([
      ['ค่าห้อง', 4500], ['ค่ากาแฟ', 60], ['ค่าเดินทาง', 30],
    ]);
  });

  it('the day note is part of every description but does not change the categories', async () => {
    predictions({ 'ข้าวมันไก่': 'อาหาร' });
    const r = await importText(['Date,ค่าห้อง,ค่าเดินทาง,Notes', '5/10/2026,100,30,ข้าวมันไก่'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => [i.category, i.description, i.dayNote])).toEqual([
      ['ค่าห้อง', 'ค่าห้อง · ข้าวมันไก่', 'ข้าวมันไก่'],
      ['ค่าเดินทาง', 'ค่าเดินทาง · ข้าวมันไก่', 'ข้าวมันไก่'],
    ]);
  });

  it('an unknown column header becomes a new expense category shown in the preview; English suffixes are dropped', async () => {
    const r = await importText(['Date,ค่าขนม (Snack),Laundry,Notes', '5/10/2026,25,40,'].join('\n'));
    const p = r.current.importPreview;
    expect(p.items.map((i: any) => i.category)).toEqual(['ค่าขนม', 'Laundry']);
    expect(p.newCategories.map((c: any) => [c.name, c.type, c.cashflowGroup])).toEqual([['ค่าขนม', 'expense', 'g-need'], ['Laundry', 'expense', 'g-need']]);
  });

  it('a multi-line header is read as one name', async () => {
    const r = await importText(['Date,"ค่า\nกาแฟ",Notes', '5/10/2026,60,'].join('\n'));
    expect(r.current.importPreview.items[0].category).toBe('ค่า กาแฟ');
  });

  it('empty cells, the date / total columns and a short row are skipped', async () => {
    const r = await importText(['Date,ค่าห้อง,ค่ากาแฟ,Total,Notes', '5/10/2026,,60,60,', '6/10/2026,10'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => [i.date, i.category, i.dayNote])).toEqual([
      ['2026-10-05', 'ค่ากาแฟ', ''], ['2026-10-06', 'ค่าห้อง', ''],
    ]);
  });

  it('a category of the user whose name contains English is kept whole', async () => {
    const r = await importText(['Date,ซอฟต์แวร์ & AI,Notes', '5/10/2026,750,'].join('\n'));
    expect(r.current.importPreview.items[0].category).toBe('ซอฟต์แวร์ & AI');
    expect(r.current.importPreview.newCategories).toEqual([]);
  });

  it('a known category whose name contains "รวม" / "date" is not mistaken for the total or date column', async () => {
    const { result } = renderHook(() => useImportCSV({
      categories: [...categories, { id: 'c-mix', name: 'ข้าวรวมมิตร', type: 'expense', cashflowGroup: 'g-need', order_index: 9 }],
      cashflowGroups: groups, dayTypes: {}, dayTypeConfig: [],
      setDayTypes: vi.fn(), setDayTypeConfig: vi.fn(), setCategories: vi.fn(), saveToDb: vi.fn(),
    }));
    await act(async () => { await result.current.handleFileUpload(upload(['Date,ข้าวรวมมิตร,รวม (Total),Notes', '5/10/2026,45,45,'].join('\n'))); });
    expect(result.current.importPreview.items.map((i: any) => [i.category, i.amount])).toEqual([['ข้าวรวมมิตร', 45]]);
  });

  it('without a Notes column the last column is still a category', async () => {
    const r = await importText(['Date,ค่าห้อง,ค่ากาแฟ', '5/10/2026,100,60'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => [i.category, i.dayNote])).toEqual([['ค่าห้อง', ''], ['ค่ากาแฟ', '']]);
  });

  it('a singular "Note" column with a number in it is still the note, not a category', async () => {
    const r = await importText(['Date,ค่าห้อง,Note', '5/10/2026,100,15'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => [i.category, i.dayNote])).toEqual([['ค่าห้อง', '15']]);
  });

  it('an unknown header with an English word after the Thai keeps only the Thai part', async () => {
    const r = await importText(['Date,ค่าอาหาร Food,Notes', '5/10/2026,80,'].join('\n'));
    expect(r.current.importPreview.items[0].category).toBe('ค่าอาหาร');
  });

  it('a Thai "หมายเหตุ" column is the note', async () => {
    const r = await importText(['วันที่,ค่าห้อง,หมายเหตุ', '5/10/2026,100,จ่ายช้า'].join('\n'));
    expect(r.current.importPreview.items[0]).toMatchObject({ category: 'ค่าห้อง', dayNote: 'จ่ายช้า', description: 'ค่าห้อง · จ่ายช้า' });
  });

  it('negative cells are imported as positive spending', async () => {
    const r = await importText(['Date,ค่าห้อง,Notes', '5/10/2026,-100,'].join('\n'));
    expect(r.current.importPreview.items[0].amount).toBe(100);
  });
});

describe('long table predictions', () => {
  it('a row without a category (or "อื่นๆ") takes the category the history predicts for its description', async () => {
    predictions({ 'ลาเต้': 'ค่ากาแฟ', 'แท็กซี่': 'ค่าเดินทาง' });
    const r = await importText(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,,ลาเต้,60', '5/10/2026,อื่นๆ,แท็กซี่,90', '5/10/2026,ค่าห้อง,ลาเต้,1'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => i.category)).toEqual(['ค่ากาแฟ', 'ค่าเดินทาง', 'ค่าห้อง']);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('predict'), expect.objectContaining({
      method: 'POST', body: JSON.stringify({ descriptions: ['ลาเต้', 'แท็กซี่'] }),
    }));
  });

  it('the description column follows the header layout (4, 5 or 6 columns)', async () => {
    predictions({});
    await importText(['Date,Type,Category,Description,Amount', '5/10/2026,รายจ่าย,ค่าห้อง,ห้อง,1'].join('\n'));
    expect(JSON.parse((globalThis.fetch as any).mock.calls[0][1].body).descriptions).toEqual(['ห้อง']);
    predictions({});
    await importText(['Date,DayType,Type,Category,Description,Amount', '5/10/2026,ทำงาน,รายจ่าย,ค่าห้อง,ห้อง6,1'].join('\n'));
    expect(JSON.parse((globalThis.fetch as any).mock.calls[0][1].body).descriptions).toEqual(['ห้อง6']);
  });

  it('a failing or refusing prediction service just means no predictions', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); }) as any;
    let r = await importText(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,ค่าห้อง,ห้อง,10'].join('\n'));
    expect(r.current.importPreview.items[0].category).toBe('ค่าห้อง');
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ 'ห้อง': { name: 'อาหาร' } }) })) as any;
    r = await importText(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,,ห้อง,10'].join('\n'));
    expect(r.current.importPreview.items[0].category).toBe('ค่าห้อง'); // no prediction → first expense category
  });

  it('nothing to predict: no request at all', async () => {
    globalThis.fetch = vi.fn() as any;
    await importText(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,ค่าห้อง,,10'].join('\n'));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('a savings category keeps the sign (sell); a zero amount is dropped', async () => {
    const r = await importText(['วันที่,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,เงินออม,ทอง,ขายทอง,-500', '5/10/2026,รายจ่าย,ค่าห้อง,x,0', '5/10/2026,รายจ่าย,ค่าห้อง,คืน,-20'].join('\n'));
    expect(r.current.importPreview.items.map((i: any) => [i.category, i.amount])).toEqual([['ทอง', -500], ['ค่าห้อง', 20]]);
  });
});

describe('refusals and errors', () => {
  it('an empty file', async () => {
    const r = await importText('   \n  ');
    expect(toast.showToast).toHaveBeenCalledWith('ไม่พบข้อมูล', 'error');
    expect(r.current.isProcessing).toBe(false);
  });

  it('a header only', async () => {
    await importText('วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน');
    expect(toast.showToast).toHaveBeenCalledWith('ข้อมูลไม่ถูกต้อง หรือมีน้อยกว่า 2 บรรทัด', 'error');
  });

  it('rows that give nothing to save', async () => {
    await importText(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', 'รวม,,,'].join('\n'));
    expect(toast.showToast).toHaveBeenCalledWith('ไม่พบข้อมูลที่จะบันทึก ตรวจสอบรูปแบบข้อมูลอีกครั้ง', 'error');
  });

  it('the duplicate check failing still opens the preview with every row', async () => {
    api.transactionService.getAll.mockRejectedValue(new Error('down'));
    const r = await importText(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,ค่าห้อง,ห้อง,10'].join('\n'));
    expect(r.current.importPreview.items).toHaveLength(1);
    expect(r.current.importPreview.skippedDuplicates).toBe(0);
  });

  it('an error while processing is reported and the spinner stops', async () => {
    const { result } = setup(null); // groups missing: creating the new category below throws
    await act(async () => { await result.current.handleFileUpload(upload(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,หมวดใหม่,x,10'].join('\n'))); });
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringMatching(/^เกิดข้อผิดพลาดในการประมวลผลไฟล์: /), 'error');
    expect(result.current.isProcessing).toBe(false);
  });

  it('a file that cannot be read', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleFileUpload({ target: { files: [{ text: async () => { throw new Error('locked'); } }] } } as any);
    });
    expect(toast.showToast).toHaveBeenCalledWith('เกิดข้อผิดพลาดในการอ่านไฟล์', 'error');
    expect(result.current.isProcessing).toBe(false);
  });

  it('no file picked: nothing happens', async () => {
    const { result } = setup();
    await act(async () => { await result.current.handleFileUpload({ target: { files: [] } } as any); });
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it('the file input is cleared after a successful read so the same file can be picked again', async () => {
    const { result } = setup();
    const input = document.createElement('input');
    input.type = 'file';
    result.current.fileInputRef.current = input;
    const spy = vi.spyOn(input, 'value', 'set');
    await act(async () => { await result.current.handleFileUpload(upload(['วันที่,หมวดหมู่,รายละเอียด,จำนวนเงิน', '5/10/2026,ค่าห้อง,ห้อง,10'].join('\n'))); });
    expect(spy).toHaveBeenCalledWith('');
  });
});
