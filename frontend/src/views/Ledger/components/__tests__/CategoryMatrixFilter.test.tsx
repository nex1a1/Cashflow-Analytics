// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { act, useState } from 'react';
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
const popover = () => q('div.z-999');
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

});

describe('CategoryMatrixFilter — choosing', () => {

  it('with the type filter on income, choices only involve income categories', () => {
    mount({ typeFilter: 'INCOME' });
    click(byText('button', '[เลือกทั้งหมด]'));
    expect(names(sel)).toEqual(names(['เงินเดือนประจำ', 'โบนัส']));
  });

});

describe('CategoryMatrixFilter — edge cases', () => {

  it('income groups sit in their own green box; the other groups do not', () => {
    mount();
    expect(groupChip('เงินเดือน').parentElement!.className).toContain('bg-income/10');
    expect(groupChip('ค่ากิน').parentElement!.className).not.toContain('bg-income/10');
    expect(groupChip('ลงทุน/ออม').parentElement!.className).not.toContain('bg-income/10');
  });

});
