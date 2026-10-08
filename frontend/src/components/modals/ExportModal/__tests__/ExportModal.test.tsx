// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ExportModal from '../index';
import type { ExportModalProps } from '../types';
import { flush, click, key, type, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category, DayType, TransactionDisplay } from '@/types';

// The real tree is rendered (header, sidebar, preview tables, backup view, footer) and the real CSV / JSON builders run.
// Replaced: the API (what the modal fetches), the period picker (it belongs to the layout), and the browser download itself.
const h = vi.hoisted(() => ({
  all: [] as unknown[],
  getAll: null as null | ((...a: unknown[]) => Promise<unknown>),
  getAllCalls: [] as unknown[][],
  downloads: [] as Array<[string, string, boolean | undefined]>,
  downloadThrows: false,
  picker: null as null | Record<string, unknown>,
}));
vi.mock('@/services/api', () => ({
  transactionService: { getAll: (...a: unknown[]) => { h.getAllCalls.push(a); return h.getAll ? h.getAll(...a) : Promise.resolve(h.all); } },
}));
vi.mock('../../../layout/PeriodPicker', async () => {
  const React = await import('react');
  return {
    default: (p: { filterPeriod: string; setFilterPeriod: (v: string) => void }) => (h.picker = p, React.createElement('div', { 'data-stub': 'PeriodPicker', 'data-period': p.filterPeriod },
      ['2026-09', '2026-10', 'ALL', '2026-09_2026-10', '2026-09,2026-10'].map(v => React.createElement('button', { key: v, type: 'button', 'data-set-period': v, onClick: () => p.setFilterPeriod(v) }, v)))),
  };
});
vi.mock('../exportUtils', async (orig) => ({
  ...(await orig<typeof import('../exportUtils')>()),
  downloadFileBlob: (content: string, filename: string, isJson?: boolean) => {
    if (h.downloadThrows) throw new Error('blocked');
    h.downloads.push([content, filename, isJson]);
  },
}));

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-exp', name: 'รายจ่ายประจำวัน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 },
];
const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', order_index: 1, cashflow_group_id: 'g-exp', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', order_index: 2, cashflow_group_id: 'g-exp', allocation_type: 'want' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', order_index: 3, cashflow_group_id: 'g-inc' },
  { id: 'c-save', name: 'ออมทอง', type: 'savings', order_index: 4, cashflow_group_id: 'g-sav', allocation_type: 'savings' },
];
const dayTypeConfig: DayType[] = [
  { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#10B981' },
  { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#DA291C' },
];
const tx = (id: string, date: string, category: string, category_id: string, amount: number, description: string, extra: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date, category, category_id, amount, description, ...extra });
const rows = {
  rice: tx('o1', '2026-10-07', 'ค่ากิน', 'c-food', 120, 'ข้าวมันไก่'),
  coffee: tx('o2', '2026-10-07', 'ค่ากิน', 'c-food', 65, 'กาแฟ'),
  movie: tx('o3', '2026-10-08', 'บันเทิง', 'c-fun', 300, 'ดูหนัง'),
  salary: tx('o4', '2026-10-05', 'เงินเดือน', 'c-salary', 30000, 'เงินเดือน ต.ค.'),
  sell: tx('o5', '2026-10-09', 'ออมทอง', 'c-save', -200, 'ขายทอง'),
  sept: tx('s1', '2026-09-30', 'ค่ากิน', 'c-food', 50, 'ข้าวเย็น'),
};
const october = [rows.rice, rows.coffee, rows.movie, rows.salary, rows.sell];

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: ExportModalProps;
const baseProps = (): ExportModalProps => ({
  isOpen: true, onClose: vi.fn(), transactions: [rows.rice], categories, cashflowGroups: groups, dayTypes: { '2026-10-10': 'dt-hol' }, dayTypeConfig,
  getFilterLabel: (p?: string) => `ป้าย:${p}`, initialPeriod: '2026-10',
});
const render = () => act(() => root!.render(<ExportModal {...props} />));
async function mount(p: Partial<ExportModalProps> = {}) {
  props = { ...baseProps(), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
  await flush();
}
/** Real wait inside act. */
const wait = (ms: number) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const update = async (p: Partial<ExportModalProps>) => { props = { ...props, ...p }; render(); await flush(); };

const dialog = () => q('[role="dialog"]');
const bodyRows = () => [...document.querySelectorAll('table tbody tr')];
const cellsOf = (tr: Element) => [...tr.querySelectorAll('td')].map(td => td.textContent!.trim());
const descriptions = () => bodyRows().map(tr => tr.querySelector('td[title]')?.textContent);
const headers = () => [...document.querySelectorAll('table thead th')].map(th => th.textContent!.trim());
const period = () => q('[data-stub="PeriodPicker"]')!.getAttribute('data-period');
const setPeriod = async (v: string) => { click(q(`[data-set-period="${v}"]`)); await flush(); };
const formatCard = (title: string) => [...document.querySelectorAll('h5')].find(e => e.textContent === title)!.closest('button')!;
const downloadBtn = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.startsWith('ดาวน์โหลด') || b.textContent!.includes('กำลังสร้างไฟล์'))!;
const cancelBtn = () => byText('button', 'ยกเลิก') as HTMLButtonElement;
const closeX = () => q<HTMLButtonElement>('button[title="ปิดหน้าต่าง"]')!;
const search = () => q<HTMLInputElement>('input[placeholder="ค้นหาในตัวอย่าง..."]');
const countLine = () => [...document.querySelectorAll('span')].map(s => s.textContent!).find(t => /^แสดง(ทั้งหมด|ตัวอย่าง)/.test(t));
const sidebarText = () => document.body.textContent!;

/** Presses download and lets the two timers (build the file, then close) run. */
async function exportNow() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0, 0));
  click(downloadBtn());
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
}

beforeEach(() => { h.picker = null; h.all = [...october, rows.sept]; h.getAll = null; h.getAllCalls = []; h.downloads = []; h.downloadThrows = false; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ExportModal — opening and loading', () => {
  it('renders nothing and fetches nothing while closed', async () => {
    await mount({ isOpen: false });
    expect(dialog()).toBeNull();
    expect(h.getAllCalls).toHaveLength(0);
  });

  it('is a labelled modal dialog', async () => {
    await mount();
    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    expect(dialog()!.getAttribute('aria-label')).toBe('ส่งออกข้อมูล');
  });

  it('fetches the whole database itself (no date range) instead of using the rows the page already has', async () => {
    await mount();
    expect(h.getAllCalls).toEqual([[]]);
    expect(descriptions()).toEqual(expect.arrayContaining(['กาแฟ', 'ดูหนัง'])); // not just the one row passed in as a prop
    expect(bodyRows()).toHaveLength(5);
  });

  it('shows a loading message until the rows arrive', async () => {
    let arrive!: (v: unknown) => void;
    h.getAll = () => new Promise(r => { arrive = r; });
    await mount();
    expect(sidebarText()).toContain('กำลังดึงข้อมูลจากฐานข้อมูล...');
    expect(bodyRows()).toHaveLength(0);
    await act(async () => { arrive(october); await Promise.resolve(); });
    expect(sidebarText()).not.toContain('กำลังดึงข้อมูลจากฐานข้อมูล...');
    expect(bodyRows()).toHaveLength(5);
  });

  it('a failure that arrives late, after a newer request has answered, does not replace its rows', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let failLate!: (e: unknown) => void;
    let n = 0;
    h.getAll = () => (++n === 1 ? new Promise((_, rej) => { failLate = rej; }) : Promise.resolve([rows.coffee]));
    await mount({ transactions: [rows.rice] });
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(descriptions()).toEqual(['กาแฟ']);
    await act(async () => { failLate(new Error('late')); await Promise.resolve(); });
    expect(descriptions()).toEqual(['กาแฟ']); // not the page's fallback rows
  });

  it('the fallback is the page\'s rows as they are when the fetch fails, not as they were when it started', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (e: unknown) => void;
    h.getAll = () => new Promise((_, rej) => { fail = rej; });
    await mount({ transactions: [rows.rice] });
    await update({ transactions: [rows.coffee, rows.movie] }); // the page reloaded while the export was asking
    await act(async () => { fail(new Error('offline')); await Promise.resolve(); });
    expect(descriptions()).toEqual(['กาแฟ', 'ดูหนัง']);
  });

  it('falls back to the rows from the page when the fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.getAll = () => Promise.reject(new Error('offline'));
    await mount({ transactions: [rows.rice, rows.coffee] });
    expect(descriptions()).toEqual(['ข้าวมันไก่', 'กาแฟ']);
    expect(console.error).toHaveBeenCalled();
  });

  it('does not fetch again when the parent re-renders with the same props', async () => {
    await mount();
    await update({});
    await update({});
    expect(h.getAllCalls).toHaveLength(1);
  });

  it('does not fetch in a loop when the page passes no rows at all', async () => {
    h.getAll = () => new Promise(r => setTimeout(() => r(october), 5)); // a slow answer keeps a loop (if any) from starving the test itself
    await mount({ transactions: undefined });
    await wait(80);
    expect(h.getAllCalls.length).toBe(1);
    expect(bodyRows()).toHaveLength(5);
  });

  it('ignores an answer that arrives after the modal was closed and opened again', async () => {
    let late!: (v: unknown) => void;
    let n = 0;
    h.getAll = () => (++n === 1 ? new Promise(r => { late = r; }) : Promise.resolve([rows.coffee]));
    await mount();
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(descriptions()).toEqual(['กาแฟ']);
    await act(async () => { late(october); await Promise.resolve(); }); // the first, slower request finally answers
    expect(descriptions()).toEqual(['กาแฟ']);
  });

  it('an old answer does not switch off the loading message of the newer request', async () => {
    let first!: (v: unknown) => void;
    let n = 0;
    h.getAll = () => (++n === 1 ? new Promise(r => { first = r; }) : new Promise(() => {}));
    await mount();
    await update({ isOpen: false });
    await update({ isOpen: true });
    await act(async () => { first(october); await Promise.resolve(); });
    expect(sidebarText()).toContain('กำลังดึงข้อมูลจากฐานข้อมูล...'); // the second request is still out
    expect(bodyRows()).toHaveLength(0);
  });

  it('does not throw away the chosen period and search when the parent re-renders', async () => {
    await mount();
    await setPeriod('ALL');
    type(search(), 'กาแฟ');
    await update({ transactions: [rows.rice] }); // a new array, as a parent that filters on every render would pass
    expect(period()).toBe('ALL');
    expect(search()!.value).toBe('กาแฟ');
  });
});

describe('ExportModal — period', () => {
  it('starts on the page\'s month', async () => {
    await mount({ initialPeriod: '2026-10' });
    expect(period()).toBe('2026-10');
    expect(bodyRows()).toHaveLength(5);
  });

  it('a pay-cycle period is turned into the calendar month it mostly covers (export is always calendar)', async () => {
    await mount({ initialPeriod: 'cycle:2026-09' }); // 25 Sep → 24 Oct
    expect(period()).toBe('2026-10');
    expect(bodyRows()).toHaveLength(5);
  });

  it('an empty period means everything', async () => {
    await mount({ initialPeriod: '' });
    expect(period()).toBe('ALL');
    expect(bodyRows()).toHaveLength(6);
  });

  it('changing the period filters the preview and the counts', async () => {
    await mount();
    await setPeriod('2026-09');
    expect(descriptions()).toEqual(['ข้าวเย็น']);
    await setPeriod('ALL');
    expect(bodyRows()).toHaveLength(6);
    expect(countLine()).toBe('แสดงทั้งหมด 6 รายการ');
  });

  it('reopening starts from the page\'s period again and clears the search', async () => {
    await mount();
    await setPeriod('2026-09');
    type(search(), 'ข้าว');
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(period()).toBe('2026-10');
    expect(search()!.value).toBe('');
  });
});

describe('ExportModal — what is in the preview', () => {
  it('lists each row with its Thai date, day type, type, category, description and signed amount', async () => {
    await mount();
    const row = bodyRows().find(tr => cellsOf(tr).includes('ข้าวมันไก่'))!;
    const cells = cellsOf(row);
    expect(cells[0]).toMatch(/07/);              // date
    expect(cells[1]).toBe('วันทำงาน');          // Wednesday: unmarked day falls back to the workday type
    expect(cells[2]).toBe('EXPENSE');
    expect(cells[3]).toBe('ค่ากิน');
    expect(cells[5]).toBe('−120.00');
    expect(cellsOf(bodyRows().find(tr => cellsOf(tr).includes('เงินเดือน ต.ค.'))!)[5]).toBe('+30,000.00');
    expect(cellsOf(bodyRows().find(tr => cellsOf(tr).includes('ขายทอง'))!)[5]).toBe('−200.00'); // one sign, not '±-200.00'
  });

  it('a savings buy keeps the ± mark', async () => {
    h.all = [tx('b1', '2026-10-09', 'ออมทอง', 'c-save', 500, 'ซื้อทอง')];
    await mount();
    expect(cellsOf(bodyRows()[0])[5]).toBe('±500.00');
  });

  it('a day marked in the calendar shows its own type, even against the weekday default', async () => {
    h.all = [tx('d1', '2026-10-07', 'ค่ากิน', 'c-food', 10, 'พุธที่ลา')]; // a Wednesday
    await mount({ dayTypes: { '2026-10-07': 'dt-hol' } });
    expect(cellsOf(bodyRows()[0])[1]).toBe('วันหยุด');
    act(() => root!.unmount()); container!.remove();
    await mount({ dayTypes: {} });
    expect(cellsOf(bodyRows()[0])[1]).toBe('วันทำงาน');
  });

  it('a row whose category name no longer matches is still found by its id, and one with neither takes the type stored on the row', async () => {
    h.all = [
      tx('r1', '2026-10-07', 'ชื่อเก่า', 'c-salary', 100, 'เงินเข้า'),
      tx('r2', '2026-10-07', 'หมวดที่ถูกลบ', 'gone', 50, 'ไม่รู้หมวด', { group_type: 'income' }),
      tx('r3', '2026-10-07', 'หมวดที่ถูกลบ', 'gone', 5, ''),
    ];
    await mount();
    const typeOf = (d: string) => cellsOf(bodyRows().find(tr => cellsOf(tr).includes(d) || cellsOf(tr)[4] === d)!)[2];
    expect(typeOf('เงินเข้า')).toBe('INCOME');
    expect(typeOf('ไม่รู้หมวด')).toBe('INCOME');
    expect(cellsOf(bodyRows()[2])[4]).toBe('—'); // an empty description is shown as a dash
    expect(cellsOf(bodyRows()[2])[2]).toBe('EXPENSE');
  });

  it('the full-detail group name works with categories that carry their group as "cashflowGroup"', async () => {
    const camel = categories.map(({ cashflow_group_id, ...c }) => ({ ...c, cashflowGroup: cashflow_group_id }));
    await mount({ categories: camel as Category[] });
    click(formatCard('รายงานละเอียด'));
    expect(cellsOf(bodyRows().find(tr => cellsOf(tr).includes('ข้าวมันไก่'))!)).toContain('รายจ่ายประจำวัน');
  });

  it('shows the count of what will be exported, and caps the preview at 25 rows', async () => {
    h.all = Array.from({ length: 30 }, (_, i) => tx(`m${i}`, '2026-10-07', 'ค่ากิน', 'c-food', i + 1, `รายการ ${i}`));
    await mount();
    expect(bodyRows()).toHaveLength(25);
    expect(countLine()).toBe('แสดงตัวอย่าง 25 จาก 30 รายการ');
    expect(sidebarText()).toContain('30 รายการ'); // sidebar telemetry
  });

  it('exactly 25 rows is "all", not "preview"', async () => {
    h.all = Array.from({ length: 25 }, (_, i) => tx(`m${i}`, '2026-10-07', 'ค่ากิน', 'c-food', i + 1, `รายการ ${i}`));
    await mount();
    expect(countLine()).toBe('แสดงทั้งหมด 25 รายการ');
  });

  it('the ✕ in the search box is there only when there is something to clear', async () => {
    await mount();
    expect(q('button.absolute')).toBeNull();
    type(search(), 'กาแฟ');
    expect(q('button.absolute')).not.toBeNull();
  });

  it('the sidebar counts days for the wide format and writes big counts with separators', async () => {
    h.all = Array.from({ length: 1200 }, (_, i) => tx(`m${i}`, `2026-10-${String(1 + (i % 30)).padStart(2, '0')}`, 'ค่ากิน', 'c-food', 1, `r${i}`));
    await mount();
    const target = () => byText('span', 'จำนวนข้อมูลเป้าหมาย:')!.nextElementSibling!.textContent; // the sidebar's own figure, not the button's
    expect(target()).toBe('1,200 รายการ');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(target()).toBe('30 วัน');
  });

  it('tells the user when nothing matches, and refuses to download', async () => {
    h.all = [];
    await mount();
    expect(sidebarText()).toContain('ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก');
    expect(downloadBtn().disabled).toBe(true);
    expect(countLine()).toBeUndefined();
  });
});

describe('ExportModal — type filter and search', () => {
  it.each([
    ['รายจ่าย', ['ข้าวมันไก่', 'กาแฟ', 'ดูหนัง']],
    ['รายรับ', ['เงินเดือน ต.ค.']],
    ['เงินออม', ['ขายทอง']],
  ])('"%s" keeps only that kind of row', async (label, expected) => {
    await mount();
    click(byText('button', label));
    expect(descriptions().sort()).toEqual([...expected].sort());
    click(byText('button', 'ทั้งหมด'));
    expect(bodyRows()).toHaveLength(5);
  });

  it('search matches the description or the category, ignores case and surrounding spaces', async () => {
    h.all = [...october, tx('e1', '2026-10-07', 'ค่ากิน', 'c-food', 5, 'Latte Coffee')];
    await mount();
    type(search(), '  กาแฟ ');
    expect(descriptions()).toEqual(['กาแฟ']);
    type(search(), 'latte');
    expect(descriptions()).toEqual(['Latte Coffee']);
    type(search(), 'บันเทิง'); // by category
    expect(descriptions()).toEqual(['ดูหนัง']);
  });

  it('the ✕ clears the search', async () => {
    await mount();
    type(search(), 'กาแฟ');
    expect(bodyRows()).toHaveLength(1);
    click(q('button.absolute'));
    expect(search()!.value).toBe('');
    expect(bodyRows()).toHaveLength(5);
  });

  it('the type filter, the search and the period combine', async () => {
    await mount();
    click(byText('button', 'รายจ่าย'));
    type(search(), 'ข้าว');
    expect(descriptions()).toEqual(['ข้าวมันไก่']); // the September 'ข้าวเย็น' is outside the period
  });

  it('what the search and the type filter hide is also not exported', async () => {
    await mount();
    click(byText('button', 'รายรับ'));
    await exportNow();
    const lines = h.downloads[0][0].trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('เงินเดือน ต.ค.');
  });
});

describe('ExportModal — formats', () => {
  it('starts on the long ledger and highlights the chosen card', async () => {
    await mount();
    expect(formatCard('รายงานแยกรายการ').className).toContain('border-accent-ink');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(formatCard('สเปรดชีตวิเคราะห์').className).toContain('border-accent-ink');
    expect(formatCard('รายงานแยกรายการ').className).not.toContain('border-accent-ink');
  });

  it('wide: days run oldest first whatever order the rows come in, and the day type is shown', async () => {
    h.all = [rows.movie, rows.salary, rows.rice]; // 8, 5, 7 Oct
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(bodyRows().map(tr => cellsOf(tr)[0].slice(0, 2))).toEqual(['05', '07', '08']);
    expect(cellsOf(bodyRows()[0])[1]).toBe('วันทำงาน');
  });

  it('wide: a category nobody used in the period gets no column; one found only by id still does', async () => {
    h.all = [tx('w1', '2026-10-07', 'ชื่อเก่า', 'c-fun', 80, 'ย้ายชื่อ')];
    await mount({ categories: [...categories, { id: 'c-unused', name: 'ไม่ได้ใช้', type: 'expense', order_index: 9, cashflow_group_id: 'g-exp' } as Category] });
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(headers()).toEqual(['วันที่', 'ประเภทวัน', 'บันเทิง', 'รวมสุทธิ']);
  });

  it('wide: a day\'s savings sell is written in the category cell in the muted-free "value" style', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    const row = bodyRows().find(tr => cellsOf(tr)[0].includes('09'))!;
    const sellCell = row.querySelectorAll('td')[5];
    expect(sellCell.textContent).toBe('−200.00');
    expect(sellCell.className).toContain('text-neutral-200'); // not the grey used for an empty "—" cell
    expect(row.querySelectorAll('td')[2].className).toContain('text-neutral-600');
  });

  it('wide: one row per day, one column per category used, counted in days', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(headers()).toEqual(['วันที่', 'ประเภทวัน', 'ค่ากิน', 'บันเทิง', 'เงินเดือน', 'ออมทอง', 'รวมสุทธิ']);
    expect(bodyRows()).toHaveLength(4); // 5, 7, 8 and 9 Oct — the two rows of the 7th share one line
  });

  it('full detail: adds the group column with the group names', async () => {
    await mount();
    click(formatCard('รายงานละเอียด'));
    expect(headers()).toContain('กลุ่มกระแสเงิน');
    expect(cellsOf(bodyRows().find(tr => cellsOf(tr).includes('ข้าวมันไก่'))!)).toContain('รายจ่ายประจำวัน');
  });

  it('long: has no group column', async () => {
    await mount();
    expect(headers()).not.toContain('กลุ่มกระแสเงิน');
  });

  it('the CSV options (delimiter, header language, type filter) are not offered for the JSON backup', async () => {
    await mount();
    expect(sidebarText()).toContain('เครื่องหมายคั่น');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(sidebarText()).not.toContain('เครื่องหมายคั่น');
    expect(sidebarText()).not.toContain('ภาษาของหัวตาราง');
    expect(search()).toBeNull();
  });

  it('the backup view counts everything in the database, not just the chosen period', async () => {
    await mount();
    await setPeriod('2026-09');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    const count = (title: string) => [...document.querySelectorAll('h5')].find(e => e.textContent === title)!.closest('div.flex.items-center.justify-between')!.querySelector('.tabular-nums')!.textContent;
    expect(count('ประวัติรายการ')).toBe('6');
    expect(count('หมวดหมู่การเงิน')).toBe('4');
    expect(count('กลุ่มรายรับ-รายจ่าย')).toBe('3');
    expect(count('ปฏิทินวันทำงาน')).toBe('1');
    expect(downloadBtn().disabled).toBe(false);
  });

  it('marks the recommended format and the JSON one with a badge, and no other', async () => {
    await mount();
    const badgeOf = (title: string) => formatCard(title).querySelector('span.uppercase')?.textContent ?? null;
    expect(badgeOf('รายงานแยกรายการ')).toBe('แนะนำ');
    expect(badgeOf('สำรองข้อมูลทั้งระบบ')).toBe('JSON');
    expect(badgeOf('สเปรดชีตวิเคราะห์')).toBeNull();
    expect(badgeOf('รายงานละเอียด')).toBeNull();
  });

  it('hands the period picker the period, the options the page has (or an empty set) and the floating style', async () => {
    const groupedOptions = { yearsMap: { 2026: ['2026-10'] }, sortedYears: [2026] } as unknown as ExportModalProps['groupedOptions'];
    await mount({ groupedOptions });
    expect(h.picker).toMatchObject({ filterPeriod: '2026-10', groupedOptions, floating: true });
    act(() => root!.unmount()); container!.remove();
    await mount({ groupedOptions: undefined });
    expect(h.picker).toMatchObject({ groupedOptions: { yearsMap: {}, sortedYears: [] } });
  });

  it('the backup view shows only a small sample of the JSON, however much there is', async () => {
    h.all = Array.from({ length: 10 }, (_, i) => tx(`m${i}`, '2026-10-07', 'ค่ากิน', 'c-food', i + 1, `r${i}`));
    await mount();
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    const sample = JSON.parse(q('pre')!.textContent!);
    expect(sample.data.transactions).toHaveLength(3);
    expect(sample.data.categories).toHaveLength(3);
    expect(sample.data.cashflowGroups).toEqual(groups); // groups are small and shown whole
  });

  it('the backup can be downloaded even when the period has no rows', async () => {
    h.all = [];
    await mount();
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(downloadBtn().disabled).toBe(false);
    expect(sidebarText()).not.toContain('ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก');
  });
});

describe('ExportModal — the summary and the download button', () => {
  it('the footer repeats the format, the period (as the page labels it), the delimiter and the header language', async () => {
    await mount();
    const footer = byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent!;
    expect(footer).toContain('Long Ledger CSV');
    expect(footer).toContain('ป้าย:2026-10');
    expect(footer).toContain('Comma (,)');
    expect(footer).toContain('ไทย');
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).toContain('Semicolon (;)');
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).toContain('English (EN)');
  });

  it('the option buttons set what they say and the chosen one is the highlighted one', async () => {
    await mount();
    const on = (label: string) => byText('button', label)!.classList.contains('bg-accent');
    const footer = () => byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent!;
    expect([on('Comma ( , )'), on('Semicolon ( ; )'), on('ภาษาไทย'), on('English (EN)')]).toEqual([true, false, true, false]);

    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    expect([on('Comma ( , )'), on('Semicolon ( ; )'), on('ภาษาไทย'), on('English (EN)')]).toEqual([false, true, false, true]);
    expect(footer()).toContain('Semicolon (;)');
    expect(footer()).toContain('English (EN)');

    click(byText('button', 'Comma ( , )'));
    click(byText('button', 'ภาษาไทย'));
    expect([on('Comma ( , )'), on('Semicolon ( ; )'), on('ภาษาไทย'), on('English (EN)')]).toEqual([true, false, true, false]);
    expect(footer()).toContain('Comma (,)');
    expect(footer()).toContain('ไทย');
  });

  it('the type filter highlights the chosen kind', async () => {
    await mount();
    const on = (label: string) => byText('button', label)!.classList.contains('border-accent-ink');
    expect([on('ทั้งหมด'), on('รายจ่าย'), on('รายรับ'), on('เงินออม')]).toEqual([true, false, false, false]);
    click(byText('button', 'รายรับ'));
    expect([on('ทั้งหมด'), on('รายจ่าย'), on('รายรับ'), on('เงินออม')]).toEqual([false, false, true, false]);
  });

  it('the footer names each format', async () => {
    await mount();
    const format = () => byText('span', 'รูปแบบ:')!.nextElementSibling!.textContent;
    expect(format()).toBe('Long Ledger CSV');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(format()).toBe('Wide Matrix CSV');
    click(formatCard('รายงานละเอียด'));
    expect(format()).toBe('Full Detail CSV');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(format()).toBe('Full Backup JSON');
  });

  it('the backup shows no "N rows" line above the preview', async () => {
    await mount();
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(countLine()).toBeUndefined();
  });

  it('shows the raw period when the page gives no label function', async () => {
    await mount({ getFilterLabel: undefined });
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).toContain('2026-10');
  });

  it('the download button states the row count in the unit of the format', async () => {
    await mount();
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด CSV (5 รายการ)');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด CSV (4 วัน)');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด JSON (6 รายการ)');
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).toContain('Full Backup JSON');
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).not.toContain('คั่น');
  });

  it('shows the estimated size (rows × 0.16 KB, wide 0.38, backup 0.45)', async () => {
    h.all = Array.from({ length: 100 }, (_, i) => tx(`m${i}`, `2026-10-${String(1 + (i % 20)).padStart(2, '0')}`, 'ค่ากิน', 'c-food', 1, `r${i}`));
    await mount();
    expect(sidebarText()).toContain('16.0 KB');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(sidebarText()).toContain('7.6 KB'); // 20 days × 0.38
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(sidebarText()).toContain('45.0 KB');
  });
});

describe('ExportModal — downloading', () => {
  it('long ledger: a CSV named after the format, the period and today, with Thai headers and signed amounts', async () => {
    await mount();
    await exportNow();
    expect(h.downloads).toHaveLength(1);
    const [content, filename, isJson] = h.downloads[0];
    expect(filename).toBe('CashflowShark_Ledger_2026-10_2026-10-07.csv');
    expect(isJson).toBeFalsy();
    const lines = content.trim().split('\n');
    expect(lines[0]).toBe('วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน');
    expect(lines).toHaveLength(6);
    expect(lines).toContain('2026-10-07,วันทำงาน,รายจ่าย,ค่ากิน,ข้าวมันไก่,120.00');
    expect(lines).toContain('2026-10-09,วันทำงาน,เงินออม,ออมทอง,ขายทอง,-200.00');
  });

  it('the delimiter and header language are applied', async () => {
    await mount();
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    await exportNow();
    expect(h.downloads[0][0].split('\n')[0]).toBe('Date;DayType;Type;Category;Description;Amount');
  });

  it('wide and full detail also follow the delimiter and the header language', async () => {
    await mount();
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    click(formatCard('สเปรดชีตวิเคราะห์'));
    await exportNow();
    expect(h.downloads[0][0].split('\n')[0]).toBe('Date;DayType;ค่ากิน;บันเทิง;เงินเดือน;ออมทอง;Total');

    vi.useRealTimers();
    await update({ isOpen: false });
    await update({ isOpen: true });
    h.downloads = [];
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    click(formatCard('รายงานละเอียด'));
    await exportNow();
    expect(h.downloads[0][0].split('\n')[0]).toBe('TransactionID;Date;DayType;GroupType;GroupName;Category;AllocationType;Description;Amount');
  });

  it('wide matrix', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    await exportNow();
    expect(h.downloads[0][1]).toBe('CashflowShark_WideMatrix_2026-10_2026-10-07.csv');
    const lines = h.downloads[0][0].trim().split('\n');
    expect(lines[0]).toBe('วันที่,ชนิดวัน,ค่ากิน,บันเทิง,เงินเดือน,ออมทอง,รวมสุทธิ');
    expect(lines).toContain('2026-10-07,วันทำงาน,185.00,0.00,0.00,0.00,185.00');
  });

  it('full detail, with the group names', async () => {
    await mount();
    click(formatCard('รายงานละเอียด'));
    await exportNow();
    expect(h.downloads[0][1]).toBe('CashflowShark_FullDetail_2026-10_2026-10-07.csv');
    expect(h.downloads[0][0]).toContain('รายจ่ายประจำวัน');
    expect(h.downloads[0][0]).not.toContain('—');
  });

  it('JSON backup: everything in the database (not only the period), with the groups, as JSON', async () => {
    await mount();
    await setPeriod('2026-09');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    await exportNow();
    const [content, filename, isJson] = h.downloads[0];
    expect(filename).toBe('CashflowShark_Backup_2026-10-07.json');
    expect(isJson).toBe(true);
    const json = JSON.parse(content);
    expect(json.app).toBe('CashflowShark');
    expect(json.data.transactions).toHaveLength(6);
    expect(json.data.cashflowGroups).toEqual(groups);
    expect(json.data.categories).toHaveLength(4);
    expect(json.data.dayTypes).toEqual({ '2026-10-10': 'dt-hol' });
    expect(json.stats).toMatchObject({ transactionsCount: 6, categoriesCount: 4, cashflowGroupsCount: 3, calendarDaysCount: 1, dayTypeConfigCount: 2 });
  });

  it('the period goes into the file name with anything unsafe turned into "_"', async () => {
    await mount();
    await setPeriod('2026-09,2026-10');
    await exportNow();
    expect(h.downloads[0][1]).toBe('CashflowShark_Ledger_2026-09_2026-10_2026-10-07.csv');
  });

  it('nothing is downloaded when there is nothing to export', async () => {
    h.all = [];
    await mount();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    downloadBtn().click();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(h.downloads).toHaveLength(0);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('while it works: the button says so, cancel and ✕ are locked, Esc and a second click do nothing; then it closes by itself', async () => {
    await mount();
    await exportNow();
    expect(downloadBtn().textContent).toContain('กำลังสร้างไฟล์...');
    expect(downloadBtn().disabled).toBe(true);
    expect(cancelBtn().disabled).toBe(true);
    expect(closeX().disabled).toBe(true);
    key(document.body, 'Escape');
    downloadBtn().click();
    expect(props.onClose).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(h.downloads).toHaveLength(1); // one file, even though download was clicked twice
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด');
  });

  it('a file that cannot be made is reported next to the button and the modal stays open', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.downloadThrows = true;
    await mount();
    await exportNow();
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(props.onClose).not.toHaveBeenCalled();
    expect(sidebarText()).toContain('สร้างไฟล์ไม่สำเร็จ');
    expect(downloadBtn().disabled).toBe(false);
  });
});

describe('ExportModal — a failed export', () => {
  it('the message goes away when the next attempt works (and that attempt then closes the modal)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.downloadThrows = true;
    await mount();
    await exportNow();
    expect(sidebarText()).toContain('สร้างไฟล์ไม่สำเร็จ');
    h.downloadThrows = false;
    click(downloadBtn());
    expect(sidebarText()).not.toContain('สร้างไฟล์ไม่สำเร็จ'); // cleared as soon as it tries again
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(h.downloads).toHaveLength(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('the message does not follow the user into the next time the modal is opened', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.downloadThrows = true;
    await mount();
    await exportNow();
    vi.useRealTimers();
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(sidebarText()).not.toContain('สร้างไฟล์ไม่สำเร็จ');
  });
});

describe('ExportModal — closing', () => {
  it('Esc, the ✕ and cancel close it when idle', async () => {
    await mount();
    key(document.body, 'Escape');
    click(closeX());
    click(cancelBtn());
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it('other keys do not', async () => {
    await mount();
    key(document.body, 'Enter');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('Esc is ignored once the modal is closed', async () => {
    await mount();
    await update({ isOpen: false });
    key(document.body, 'Escape');
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe('ExportModal — the wide preview matches the file', () => {
  it('a savings sell shows as a negative amount, not as "—" (the preview shows −200.00, the CSV file keeps the plain -200.00)', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    const row = bodyRows().find(tr => cellsOf(tr)[0].includes('09'))!;
    const cells = cellsOf(row);
    expect(cells.slice(2)).toEqual(['—', '—', '—', '−200.00', '−200.00']); // the ออมทอง column itself, then the day total
  });
});
