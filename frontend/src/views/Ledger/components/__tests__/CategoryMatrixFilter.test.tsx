// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CategoryMatrixFilter from '../common/CategoryMatrixFilter';
import { byText, click, key, q, type } from '@/test-utils/dom';
import type { Category, CashflowGroup } from '@/types';

const groups: CashflowGroup[] = [
  { id: 'g-sal', name: 'เงินเดือน', type: 'income', order_index: 1 },
  { id: 'g-food', name: 'ค่ากิน', type: 'expense', order_index: 2 },
  { id: 'g-fun', name: 'บันเทิง', type: 'expense', order_index: 3 },
  { id: 'g-sav', name: 'ลงทุน/ออม', type: 'savings', order_index: 4 },
] as CashflowGroup[];
const cats: Category[] = [
  { id: 'c-salary', name: 'เงินเดือนประจำ', type: 'income', cashflow_group_id: 'g-sal', color: '#10B981', order_index: 1 },
  { id: 'c-bonus', name: 'โบนัส', type: 'income', cashflow_group_id: 'g-sal', order_index: 2 },
  { id: 'c-lunch', name: 'มื้อกลางวัน', type: 'expense', cashflow_group_id: 'g-food', color: '#F97316', order_index: 2 },
  { id: 'c-coffee', name: 'กาแฟ', type: 'expense', cashflow_group_id: 'g-food', color: '#A855F7', order_index: 1, icon: 'wallet' },
  { id: 'c-movie', name: 'หนัง', type: 'expense', cashflowGroup: 'g-fun', order_index: 1 } as Category, // linked by the camel-case field
  { id: 'c-gold', name: 'ออมทอง', type: 'savings', cashflow_group_id: 'g-sav', order_index: 1 },
  { id: 'c-loose', name: 'ไม่มีกลุ่ม', type: 'expense', order_index: 1 },
];
const ALL_NAMES = cats.map(c => c.name);

let sel: 'ALL' | string[];
interface HarnessProps {
  initial?: 'ALL' | string[]; active?: Set<string> | null; typeFilter?: string; categories?: Category[]; cashflowGroups?: CashflowGroup[];
}
function Harness({ initial = 'ALL', active = null, typeFilter = 'ALL', categories = cats, cashflowGroups = groups }: HarnessProps) {
  const [value, setValue] = useState<'ALL' | string[]>(initial);
  sel = value;
  return <CategoryMatrixFilter categories={categories} cashflowGroups={cashflowGroups} selectedCategories={value} onChange={setValue} activeCategoryNames={active} typeFilter={typeFilter} />;
}

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (props: HarnessProps = {}, open = true) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<Harness {...props} />));
  if (open) click(trigger());
};
const trigger = () => q<HTMLButtonElement>('button[title="คลิกเพื่อเลือกกลุ่มและหมวดหมู่ย่อย"]')!;
const popover = () => q('div.z-\\[999\\]');
const catChip = (name: string) => q<HTMLButtonElement>(`button[title^="คลิก: เปิด/ปิดหมวดหมู่ \\"${name}\\""]`)!;
const groupChip = (name: string) => q<HTMLButtonElement>(`button[title="คลิกเพื่อสลับเลือกหมวดหมู่ทั้งหมดในกลุ่ม ${name}"]`)!;
const isolateGroup = (name: string) => q<HTMLButtonElement>(`button[title="เลือกเฉพาะกลุ่ม ${name}"]`)!;
const label = () => trigger().querySelector('div.truncate')!.textContent!;
const isOn = (chip: HTMLElement) => chip.querySelector('svg.lucide-check') !== null;
const dblclick = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); });
const mousedown = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
const names = (v: 'ALL' | string[]) => (v === 'ALL' ? v : [...v].sort());

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('CategoryMatrixFilter — the button', () => {
  it('"all": shows the number of categories on offer', () => {
    mount({}, false);
    expect(label()).toBe(`หมวดหมู่ทั้งหมด (${cats.length})`);
  });

  it('the type filter limits what is on offer', () => {
    mount({ typeFilter: 'INCOME' }, false);
    expect(label()).toBe('หมวดหมู่ทั้งหมด (2)');
    act(() => root!.unmount()); container!.remove();
    mount({ typeFilter: 'EXPENSE' }, false);
    expect(label()).toBe('หมวดหมู่ทั้งหมด (4)');
  });

  it('nothing chosen', () => {
    mount({ initial: [] }, false);
    expect(label()).toBe('ไม่ได้เลือกหมวดหมู่ (0)');
  });

  it('every category chosen', () => {
    mount({ initial: ALL_NAMES }, false);
    expect(label()).toBe(`เลือกทุกหมวดหมู่ (${cats.length})`);
  });

  it('exactly the categories that have rows', () => {
    mount({ initial: ['กาแฟ', 'โบนัส', 'หนัง'], active: new Set(['กาแฟ', 'โบนัส', 'หนัง']) }, false);
    expect(label()).toBe(`เฉพาะที่มีรายการ (3/${cats.length})`);
  });

  it('one or two: their names, with a comma between', () => {
    mount({ initial: ['กาแฟ'] }, false);
    expect(label()).toBe('กาแฟ');
    act(() => root!.unmount()); container!.remove();
    mount({ initial: ['กาแฟ', 'หนัง'] }, false);
    expect(label()).toBe('กาแฟ,หนัง');
  });

  it('more: a count and how many groups they span', () => {
    mount({ initial: ['กาแฟ', 'มื้อกลางวัน', 'หนัง'] }, false);
    expect(label()).toBe('เลือกแล้ว 3 หมวด (2 กลุ่ม)');
  });

  it('is plain while "all", and shows a count + a reset ✕ once something is chosen', () => {
    mount({}, false);
    expect(q('button[title^="รีเซ็ต"]')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    mount({ initial: ['กาแฟ', 'หนัง', 'โบนัส'] }, false);
    expect(container!.textContent).toContain('3');
    click(q('button[title^="รีเซ็ต"]'));
    expect(sel).toBe('ALL');
    expect(popover()).toBeNull(); // resetting does not also open the menu
  });

  it('never puts a button inside a button (invalid HTML, confuses screen readers)', () => {
    mount({ initial: ['กาแฟ'] });
    expect(container!.querySelectorAll('button button')).toHaveLength(0);
  });

  it('names that cannot be offered (not in this type) are ignored', () => {
    mount({ initial: ['กาแฟ', 'เงินเดือนประจำ'], typeFilter: 'EXPENSE' }, false);
    expect(label()).toBe('กาแฟ'); // the income one is not an expense category
  });

  it('a single name (not a list) works', () => {
    mount({ initial: 'กาแฟ' as unknown as string[] }, false);
    expect(label()).toBe('กาแฟ');
  });

  it('a single name that is not on offer counts as everything', () => {
    mount({ initial: 'ไม่มีหมวดนี้' as unknown as string[] });
    expect(isOn(catChip('กาแฟ'))).toBe(true);
    expect(isOn(catChip('หนัง'))).toBe(true);
  });
});

describe('CategoryMatrixFilter — opening and closing', () => {
  it('opens on click and closes on the button, the done button, Esc, or a click outside', () => {
    mount({}, false);
    expect(popover()).toBeNull();
    click(trigger());
    expect(popover()).not.toBeNull();
    click(trigger());
    expect(popover()).toBeNull();
    click(trigger());
    click(byText('button', 'เสร็จสิ้น'));
    expect(popover()).toBeNull();
    click(trigger());
    key(document.body, 'Escape');
    expect(popover()).toBeNull();
    click(trigger());
    mousedown(document.body);
    expect(popover()).toBeNull();
  });

  it('a click inside it does not close it', () => {
    mount();
    mousedown(popover()!);
    expect(popover()).not.toBeNull();
  });

  it('focuses the search box shortly after opening', async () => {
    mount();
    await act(async () => { await new Promise(r => setTimeout(r, 80)); });
    expect(document.activeElement).toBe(q('input[placeholder="ค้นหา..."]'));
  });
});

describe('CategoryMatrixFilter — the two tiers', () => {
  it('groups with how many of their categories are ticked, income apart from the rest', () => {
    mount({ initial: ['กาแฟ', 'หนัง'] });
    expect(groupChip('ค่ากิน').textContent).toContain('1/2');
    expect(groupChip('บันเทิง').textContent).toContain('1/1');
    expect(groupChip('เงินเดือน').textContent).toContain('0/2');
    expect(popover()!.textContent).toContain('ชั้นที่ 1');
    expect(popover()!.textContent).toContain('ชั้นที่ 2');
  });

  it('two income groups sit side by side; one fills the row', () => {
    const two = [...groups, { id: 'g-side', name: 'งานเสริม', type: 'income', order_index: 5 } as CashflowGroup];
    mount({ cashflowGroups: two, categories: [...cats, { id: 'c-side', name: 'ฟรีแลนซ์', type: 'income', cashflow_group_id: 'g-side', order_index: 1 }] });
    const box = () => isolateGroup('เงินเดือน').closest('div.bg-income\\/10')!;
    expect(box().classList.contains('sm:grid-cols-2')).toBe(true);
    act(() => root!.unmount()); container!.remove();
    mount();
    expect(box().classList.contains('grid-cols-1')).toBe(true);
    expect(box().classList.contains('sm:grid-cols-2')).toBe(false);
  });

  it('a click keeps the list where it was scrolled', async () => {
    mount({ initial: ['กาแฟ'] });
    const list = popover()!.querySelector<HTMLElement>('.overflow-y-auto') ?? popover()!;
    list.scrollTop = 120;
    click(catChip('หนัง'));
    list.scrollTop = 0; // a re-render that jumped back to the top
    await act(async () => { await new Promise(r => requestAnimationFrame(() => r(null))); });
    expect(list.scrollTop).toBe(120);
  });

  it('a category with no group lands in "หมวดหมู่อื่นๆ"', () => {
    mount();
    expect(popover()!.textContent).toContain('หมวดหมู่อื่นๆ');
    expect(catChip('ไม่มีกลุ่ม')).not.toBeNull();
  });

  it('a category linked by the camel-case field is still under its group', () => {
    mount();
    expect(groupChip('บันเทิง').textContent).toContain('/1');
  });

  it('categories are shown in their Settings order inside a group', () => {
    mount();
    const food = [...q('div.z-\\[999\\]')!.querySelectorAll('button[title^="คลิก: เปิด/ปิดหมวดหมู่"]')].map(b => b.textContent!.trim());
    expect(food.indexOf('กาแฟ')).toBeLessThan(food.indexOf('มื้อกลางวัน')); // order_index 1 before 2
  });

  it('counts: chosen of available, in the header and the footer', () => {
    mount({ initial: ['กาแฟ', 'หนัง'] });
    expect(popover()!.textContent).toContain('เลือก 2/7');
    expect(popover()!.textContent).toContain('เลือก 2 จาก 7 หมวดหมู่');
    expect(popover()!.textContent).toContain('2 / 5 กลุ่ม'); // 2 groups hold a pick, out of 5 shown (income, food, fun, savings and "other")
  });
});

describe('CategoryMatrixFilter — choosing', () => {
  it('a click turns one category off, a second turns it back on', () => {
    mount({ initial: ALL_NAMES });
    click(catChip('กาแฟ'));
    expect(names(sel)).toEqual(names(ALL_NAMES.filter(n => n !== 'กาแฟ')));
    expect(isOn(catChip('กาแฟ'))).toBe(false);
    click(catChip('กาแฟ'));
    expect(names(sel)).toEqual(names(ALL_NAMES));
  });

  it('while "all", the ticks are the categories that have rows; a click then edits THAT set', () => {
    mount({ active: new Set(['กาแฟ', 'หนัง']) });
    expect(isOn(catChip('กาแฟ'))).toBe(true);
    expect(isOn(catChip('มื้อกลางวัน'))).toBe(false);
    click(catChip('มื้อกลางวัน'));
    expect(names(sel)).toEqual(names(['กาแฟ', 'หนัง', 'มื้อกลางวัน']));
  });

  it('while "all" with no row info, everything is ticked', () => {
    mount({ active: new Set() });
    expect(cats.every(c => isOn(catChip(c.name)))).toBe(true);
  });

  it('a double-click isolates one category', () => {
    mount({ initial: ALL_NAMES });
    dblclick(catChip('หนัง'));
    expect(sel).toEqual(['หนัง']);
  });

  it('a group chip turns the whole group off when it is fully on, else on', () => {
    mount({ initial: ALL_NAMES });
    click(groupChip('ค่ากิน'));
    expect(names(sel)).toEqual(names(ALL_NAMES.filter(n => n !== 'กาแฟ' && n !== 'มื้อกลางวัน')));
    click(groupChip('ค่ากิน'));
    expect(names(sel)).toEqual(names(ALL_NAMES));
  });

  it('a half-ticked group is completed by its chip', () => {
    mount({ initial: ['กาแฟ'] });
    click(groupChip('ค่ากิน'));
    expect(names(sel)).toEqual(names(['กาแฟ', 'มื้อกลางวัน']));
  });

  it('[เฉพาะ] picks only that group', () => {
    mount({ initial: ALL_NAMES });
    click(isolateGroup('ค่ากิน'));
    expect(names(sel)).toEqual(names(['กาแฟ', 'มื้อกลางวัน']));
  });

  it('[เลือกทั้งหมด] picks every category on offer', () => {
    mount({ initial: ['กาแฟ'] });
    click(byText('button', '[เลือกทั้งหมด]'));
    expect(names(sel)).toEqual(names(ALL_NAMES));
  });

  it('[ล้างการเลือก] picks nothing', () => {
    mount({ initial: ALL_NAMES });
    click(byText('button', '[ล้างการเลือก]'));
    expect(sel).toEqual([]);
    expect(label()).toBe('ไม่ได้เลือกหมวดหมู่ (0)');
  });

  it('[เฉพาะที่มีรายการ] picks the categories with rows — and only exists when the Ledger told us which', () => {
    mount({ active: new Set(['กาแฟ', 'โบนัส', 'ชื่อที่ไม่มีในรายการ']) });
    click(byText('button', '[เฉพาะที่มีรายการ (3)]'));
    expect(names(sel)).toEqual(names(['กาแฟ', 'โบนัส']));
    act(() => root!.unmount()); container!.remove();
    mount({ active: new Set() });
    expect(byText('button', '[เฉพาะที่มีรายการ (0)]')).toBeNull();
    expect([...document.querySelectorAll('button')].some(b => b.textContent!.includes('เฉพาะที่มีรายการ'))).toBe(false);
  });

  it('with the type filter on income, choices only involve income categories', () => {
    mount({ typeFilter: 'INCOME' });
    click(byText('button', '[เลือกทั้งหมด]'));
    expect(names(sel)).toEqual(names(['เงินเดือนประจำ', 'โบนัส']));
  });

  it('the matching quick button is lit', () => {
    const lit = (t: string, cls: string) => byText('button', t)!.classList.contains(cls); // (every button has a hover: variant, so match whole classes)
    mount({ initial: ALL_NAMES });
    expect(lit('[เลือกทั้งหมด]', 'text-accent-ink')).toBe(true);
    expect(lit('[ล้างการเลือก]', 'text-danger')).toBe(false);
    click(byText('button', '[ล้างการเลือก]'));
    expect(lit('[ล้างการเลือก]', 'text-danger')).toBe(true);
    expect(lit('[เลือกทั้งหมด]', 'text-accent-ink')).toBe(false);
  });
});

describe('CategoryMatrixFilter — search', () => {
  it('a group name keeps the whole group', () => {
    mount();
    type(q('input[placeholder="ค้นหา..."]'), 'ค่ากิน');
    expect(catChip('กาแฟ')).not.toBeNull();
    expect(catChip('มื้อกลางวัน')).not.toBeNull();
    expect(q('button[title*="\\"หนัง\\""]')).toBeNull();
  });

  it('a category name keeps just the matches (and their group)', () => {
    mount();
    type(q('input[placeholder="ค้นหา..."]'), 'กาแฟ');
    expect(catChip('กาแฟ')).not.toBeNull();
    expect(q('button[title*="\\"มื้อกลางวัน\\""]')).toBeNull();
    expect(groupChip('ค่ากิน')).not.toBeNull();
  });

  it('ignores letter case and surrounding spaces; nothing found says so', () => {
    mount({ categories: [...cats, { id: 'c-nf', name: 'Netflix', type: 'expense', cashflow_group_id: 'g-fun' } as Category] });
    type(q('input[placeholder="ค้นหา..."]'), '  netflix ');
    expect(catChip('Netflix')).not.toBeNull();
    type(q('input[placeholder="ค้นหา..."]'), 'zzzz');
    expect(popover()!.textContent).toContain('ไม่พบหมวดหมู่ที่ค้นหา');
  });

  it('the ✕ in the box clears the search', () => {
    mount();
    type(q('input[placeholder="ค้นหา..."]'), 'กาแฟ');
    click(q('input[placeholder="ค้นหา..."]')!.parentElement!.querySelector('button'));
    expect((q('input[placeholder="ค้นหา..."]') as HTMLInputElement).value).toBe('');
  });

  it('searching does not change what is chosen', () => {
    mount({ initial: ['กาแฟ'] });
    type(q('input[placeholder="ค้นหา..."]'), 'หนัง');
    expect(sel).toEqual(['กาแฟ']);
  });
});

describe('CategoryMatrixFilter — edge cases', () => {
  it('no categories at all', () => {
    mount({ categories: [], cashflowGroups: [] });
    expect(label()).toBe('หมวดหมู่ทั้งหมด (0)');
    expect(popover()!.textContent).toContain('ไม่พบหมวดหมู่ที่ค้นหา');
    expect(byText('button', '[เลือกทั้งหมด]')!.classList.contains('text-accent-ink')).toBe(false); // nothing is "all selected" when nothing exists
  });

  it('income groups sit in their own green box; the other groups do not', () => {
    mount();
    expect(groupChip('เงินเดือน').parentElement!.className).toContain('bg-income/10');
    expect(groupChip('ค่ากิน').parentElement!.className).not.toContain('bg-income/10');
    expect(groupChip('ลงทุน/ออม').parentElement!.className).not.toContain('bg-income/10');
  });

  it('a group with no available categories is not listed', () => {
    mount({ typeFilter: 'INCOME' });
    expect(q('button[title="คลิกเพื่อสลับเลือกหมวดหมู่ทั้งหมดในกลุ่ม ค่ากิน"]')).toBeNull();
    expect(groupChip('เงินเดือน')).not.toBeNull();
  });

  it('works with no group list', () => {
    mount({ cashflowGroups: [] });
    expect(popover()!.textContent).toContain('หมวดหมู่อื่นๆ');
    expect(catChip('กาแฟ')).not.toBeNull();
  });
});
