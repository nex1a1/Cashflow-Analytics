// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import ImportPreviewModal from '../ImportPreviewModal';
import { flush, click, key, type, choose, q, byText } from '@/test-utils/dom';

const preview = {
  items: [{ id: '1', date: '2026-10-03', category: 'อาหาร', description: 'x', amount: 10, dayNote: '' }],
  updatedCategories: [],
  isConfigChanged: false,
  isCategoryChanged: false,
  newDayTypes: {},
};

// MainLayout mounts the modal permanently and importPreview stays null until a CSV is parsed, so the
// render that shows the dialog must call exactly the same hooks as the empty render before it. A hook
// below `if (!importPreview) return null` makes React throw "Rendered more hooks than during the
// previous render" and, with no error boundary, unmounts the whole app. renderToStaticMarkup renders
// once and cannot catch that, so this needs a real client root and a re-render.
describe('ImportPreviewModal', () => {
  it('shows the dialog when a preview arrives after the empty first render', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const show = (importPreview: typeof preview | null) =>
      act(() =>
        root.render(
          <ImportPreviewModal
            importPreview={importPreview}
            setImportPreview={() => {}}
            confirmImport={() => {}}
            categories={[]}
          />,
        ),
      );

    show(null);
    expect(container.innerHTML).toBe('');

    expect(() => show(preview)).not.toThrow();
    expect(container.querySelector('[role="dialog"][aria-label="ตรวจสอบข้อมูลก่อนนำเข้า"]')).not.toBeNull();

    act(() => root.unmount());
    container.remove();
  });
});

// ── the behaviour of the dialog itself ────────────────────────────────────────────────────────────────────────────
// A small stateful host plays the part of useImportCSV: it owns the preview and hands the modal the same setter.
const cats = [
  { id: 'c1', name: 'อาหาร', type: 'expense' },
  { id: 'c2', name: 'เงินเดือน', type: 'income' },
  { id: 'c3', name: 'ออมทอง', type: 'savings' },
  { id: 'c4', name: 'เดินทาง', type: 'expense' },
];
const item = (id: string, date: string, category: string, description: string, amount: number | string) => ({ id, date, category, description, amount, dayNote: '' });
const base = (items: any[], extra: Record<string, unknown> = {}) => ({ items, updatedCategories: cats, isConfigChanged: false, isCategoryChanged: false, newDayTypes: {}, ...extra });

let root: Root | null = null;
let container: HTMLElement | null = null;
let state: any;
let setPreview: (v: any) => void;
let host: { confirmImport: ReturnType<typeof vi.fn>; isProcessing?: boolean };

function Host({ initial }: { initial: any }) {
  const [s, set] = React.useState<any>(initial);
  state = s; setPreview = set;
  return <ImportPreviewModal importPreview={s} setImportPreview={set} confirmImport={host.confirmImport} isProcessing={host.isProcessing} categories={[{ id: 'p1', name: 'จาก props', type: 'expense' }]} />;
}
async function mount(initial: any, over: Partial<typeof host> = {}) {
  host = { confirmImport: vi.fn(), ...over };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<Host initial={initial} />));
  await flush();
}
const dialog = () => q('[role="dialog"]');
const rowEls = () => [...document.querySelectorAll('select')].map(s => s.closest('.grid') as HTMLElement);
const badges = () => rowEls().map(r => r.querySelector('span')!.textContent);
const dateHeaders = () => [...document.querySelectorAll('div.sticky')].map(d => d.textContent);
const descs = () => [...document.querySelectorAll<HTMLInputElement>('input[type="text"]')].map(i => i.value);
const amountInputs = () => [...document.querySelectorAll<HTMLInputElement>('input[type="number"]')];
const pageLabel = () => [...document.querySelectorAll('span')].find(s => s.textContent!.startsWith('หน้า '))!;
const prevBtn = () => pageLabel().previousElementSibling as HTMLButtonElement;
const nextBtn = () => pageLabel().nextElementSibling as HTMLButtonElement;
const importBtn = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => /^Import |กำลังนำเข้า/.test(b.textContent!.trim()))!;
const deleteBtn = (i: number) => rowEls()[i].querySelector('button') as HTMLButtonElement;
const header = () => q('h3')!.textContent!;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('ImportPreviewModal — what the user is shown', () => {
  it('counts the rows and lists each date once, in front of its first row', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50), item('b', '2026-10-03', 'อาหาร', 'กาแฟ', 60), item('c', '2026-10-04', 'อาหาร', 'ขนม', 20)]));
    expect(dialog()!.textContent).toContain('พบ 3 รายการ');
    expect(dateHeaders()).toEqual(['2026-10-03', '2026-10-04']);
    expect(descs()).toEqual(['ข้าว', 'กาแฟ', 'ขนม']);
    expect(amountInputs().map(i => i.value)).toEqual(['50', '60', '20']);
  });

  it('says what the import will create or skip, and nothing when there is nothing to say', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    for (const t of ['จะสร้างหมวดหมู่ใหม่', 'ข้าม', 'ที่มีอยู่แล้ว', 'วันที่ไม่ถูกต้อง']) expect(dialog()!.textContent).not.toContain(t);
    act(() => setPreview({ ...state, isCategoryChanged: true, skippedDuplicates: 4, skippedInvalid: 2 }));
    expect(dialog()!.textContent).toContain('จะสร้างหมวดหมู่ใหม่');
    expect(dialog()!.textContent).toContain('ข้าม 4 รายการที่มีอยู่แล้ว');
    expect(dialog()!.textContent).toContain('ข้าม 2 แถวที่วันที่ไม่ถูกต้อง');
  });

  it('names the kind of each row: income, savings and expense (an unknown category counts as an expense)', async () => {
    await mount(base([
      item('a', '2026-10-03', 'เงินเดือน', 'เดือนนี้', 30000), item('b', '2026-10-03', 'ออมทอง', 'ซื้อ', 500),
      item('c', '2026-10-03', 'อาหาร', 'ข้าว', 50), item('d', '2026-10-03', 'ไม่มีหมวดนี้', 'งง', 5),
    ]));
    expect(badges()).toEqual(['รายรับ', 'เงินออม', 'รายจ่าย', 'รายจ่าย']);
  });

  it('offers the categories of the file (including the ones it creates); the page\'s own list is the fallback', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    expect([...document.querySelectorAll('option')].map(o => o.textContent)).toEqual(['อาหาร', 'เงินเดือน', 'ออมทอง', 'เดินทาง']);
    act(() => root!.unmount()); container!.remove();
    await mount({ ...base([item('a', '2026-10-03', 'จาก props', 'ข้าว', 50)]), updatedCategories: undefined });
    expect([...document.querySelectorAll('option')].map(o => o.textContent)).toEqual(['จาก props']);
  });

  it('has no emoji in its title (icons are Lucide)', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    expect(header()).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(header()).toContain('ตรวจสอบก่อนนำเข้า');
  });
});

describe('ImportPreviewModal — editing before the import', () => {
  it('a row\'s category, description and amount can be changed, and only that row changes', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50), item('b', '2026-10-03', 'อาหาร', 'กาแฟ', 60)]));
    choose(document.querySelectorAll('select')[1], 'เดินทาง');
    type(document.querySelectorAll('input[type="text"]')[1], 'แท็กซี่');
    type(amountInputs()[1], '120.5');
    expect(state.items).toEqual([
      expect.objectContaining({ id: 'a', category: 'อาหาร', description: 'ข้าว', amount: 50 }),
      expect.objectContaining({ id: 'b', category: 'เดินทาง', description: 'แท็กซี่', amount: '120.5' }),
    ]);
    expect(badges()).toEqual(['รายจ่าย', 'รายจ่าย']);
  });

  it('changing a row to an income category changes its badge', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    choose(document.querySelector('select'), 'เงินเดือน');
    expect(badges()).toEqual(['รายรับ']);
  });

  it('a row can be removed, and the count follows', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50), item('b', '2026-10-04', 'อาหาร', 'กาแฟ', 60)]));
    click(deleteBtn(0));
    expect(state.items.map((i: any) => i.id)).toEqual(['b']);
    expect(dialog()!.textContent).toContain('พบ 1 รายการ');
    expect(dateHeaders()).toEqual(['2026-10-04']);
  });

  it('with every row removed it says so and refuses to import', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    click(deleteBtn(0));
    expect(dialog()!.textContent).toContain('ไม่มีรายการข้อมูล');
    expect(importBtn().disabled).toBe(true);
    expect(pageLabel().textContent).toBe('หน้า 1/1 (0 รายการ)');
  });
});

describe('ImportPreviewModal — amounts that would be saved wrongly', () => {
  const withAmount = (amount: number | string, category = 'อาหาร') => base([item('a', '2026-10-03', category, 'ข้าว', 50), item('b', '2026-10-03', category, 'กาแฟ', amount)]);

  it.each([['blank', ''], ['zero', '0'], ['not a number', 'abc'], ['a negative expense', '-5']])('%s: marks the field, says how many rows need fixing and does not import', async (_n, bad) => {
    await mount(withAmount(bad as string));
    expect(amountInputs()[1].getAttribute('aria-invalid')).toBe('true');
    expect(amountInputs()[0].getAttribute('aria-invalid')).toBe('false');
    expect(importBtn().disabled).toBe(true);
    expect(dialog()!.textContent).toContain('แก้จำนวนเงิน 1 รายการ');
    click(importBtn());
    expect(host.confirmImport).not.toHaveBeenCalled();
  });

  it('fixing the amount brings the import button back', async () => {
    await mount(withAmount(''));
    type(amountInputs()[1], '60');
    expect(importBtn().disabled).toBe(false);
    expect(dialog()!.textContent).not.toContain('แก้จำนวนเงิน');
    expect(amountInputs()[1].getAttribute('aria-invalid')).toBe('false');
  });

  it('removing the bad row also fixes it', async () => {
    await mount(withAmount('0'));
    click(deleteBtn(1));
    expect(importBtn().disabled).toBe(false);
  });

  it('a negative amount is fine on a savings row (it is a sell) and is counted per row', async () => {
    await mount(withAmount('-200', 'ออมทอง'));
    expect(importBtn().disabled).toBe(false);
    expect(amountInputs()[1].getAttribute('aria-invalid')).toBe('false');
    type(amountInputs()[1], '0');
    expect(importBtn().disabled).toBe(true);
  });

  it('a negative income is refused too: only savings rows may be negative', async () => {
    await mount(withAmount('-30000', 'เงินเดือน'));
    expect(amountInputs()[1].getAttribute('aria-invalid')).toBe('true');
    expect(importBtn().disabled).toBe(true);
  });

  it('counts every bad row', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'a', ''), item('b', '2026-10-03', 'อาหาร', 'b', 0), item('c', '2026-10-03', 'อาหาร', 'c', 5)]));
    expect(dialog()!.textContent).toContain('แก้จำนวนเงิน 2 รายการ');
  });

});

describe('ImportPreviewModal — pages', () => {
  const many = (n: number) => base(Array.from({ length: n }, (_, i) => item(`i${i}`, '2026-10-03', 'อาหาร', `รายการ ${i}`, i + 1)));

  it('30 rows to a page, with a counter and arrows that stop at the ends', async () => {
    await mount(many(61));
    expect(rowEls()).toHaveLength(30);
    expect(pageLabel().textContent).toBe('หน้า 1/3 (61 รายการ)');
    expect(prevBtn().disabled).toBe(true);
    click(nextBtn());
    expect(pageLabel().textContent).toBe('หน้า 2/3 (61 รายการ)');
    expect(descs()[0]).toBe('รายการ 30');
    click(nextBtn());
    expect(rowEls()).toHaveLength(1);
    expect(nextBtn().disabled).toBe(true);
    click(prevBtn());
    expect(pageLabel().textContent).toBe('หน้า 2/3 (61 รายการ)');
  });

  it('exactly 30 rows is one page', async () => {
    await mount(many(30));
    expect(pageLabel().textContent).toBe('หน้า 1/1 (30 รายการ)');
    expect(nextBtn().disabled).toBe(true);
    expect(prevBtn().disabled).toBe(true);
  });

  it('a preview opened later starts again from page 1', async () => {
    await mount(many(61));
    click(nextBtn());
    act(() => setPreview(null));
    act(() => setPreview(many(40)));
    expect(pageLabel().textContent).toBe('หน้า 1/2 (40 รายการ)');
    expect(descs()[0]).toBe('รายการ 0');
  });

  it('editing or removing a row keeps you on the page you are on', async () => {
    await mount(many(61));
    click(nextBtn());
    expect(descs()[0]).toBe('รายการ 30');
    type(document.querySelectorAll('input[type="text"]')[0], 'แก้แล้ว');
    expect(pageLabel().textContent).toBe('หน้า 2/3 (61 รายการ)');
    expect(descs()[0]).toBe('แก้แล้ว');
    choose(document.querySelectorAll('select')[0], 'เดินทาง');
    type(amountInputs()[0], '99');
    expect(pageLabel().textContent).toBe('หน้า 2/3 (61 รายการ)');
    click(deleteBtn(0));
    expect(pageLabel().textContent).toBe('หน้า 2/2 (60 รายการ)'); // 60 rows are two pages now
    expect(descs()[0]).toBe('รายการ 31');
  });

  it('removing the last row of the last page moves to the page before it — the counter, arrows and rows agree', async () => {
    await mount(many(61));
    click(nextBtn());
    click(nextBtn()); // page 3: one row
    click(deleteBtn(0));
    expect(rowEls()).toHaveLength(30);
    expect(pageLabel().textContent).toBe('หน้า 2/2 (60 รายการ)');
    expect(nextBtn().disabled).toBe(true);
    click(prevBtn());
    expect(pageLabel().textContent).toBe('หน้า 1/2 (60 รายการ)'); // one click, not two
    expect(descs()[0]).toBe('รายการ 0');
  });
});

describe('ImportPreviewModal — confirming and cancelling', () => {
  it('the button names the number of rows and starts the import', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50), item('b', '2026-10-03', 'อาหาร', 'กาแฟ', 60)]));
    expect(importBtn().textContent).toBe('Import 2 รายการ');
    click(importBtn());
    expect(host.confirmImport).toHaveBeenCalledTimes(1);
  });

  it('while importing it says so and cannot be pressed again', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]), { isProcessing: true });
    expect(importBtn().textContent).toBe('กำลังนำเข้า...');
    expect(importBtn().disabled).toBe(true);
  });

  it('Esc, the ✕ and cancel throw the preview away; Esc with nothing open does nothing', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    key(document.body, 'Escape');
    expect(state).toBeNull();
    expect(dialog()).toBeNull();
    act(() => setPreview(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)])));
    click(dialog()!.querySelector('button'));
    expect(state).toBeNull();
    act(() => setPreview(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)])));
    click(byText('button', 'ยกเลิก'));
    expect(state).toBeNull();
    key(document.body, 'Escape'); // nothing open: must not throw or reopen
    expect(state).toBeNull();
  });

  it('other keys do nothing', async () => {
    await mount(base([item('a', '2026-10-03', 'อาหาร', 'ข้าว', 50)]));
    key(document.body, 'Enter');
    expect(state).not.toBeNull();
  });
});
