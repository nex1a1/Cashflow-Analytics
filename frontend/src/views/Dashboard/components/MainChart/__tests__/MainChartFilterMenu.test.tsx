// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MainChartFilterMenu, MainChartCategorySelector } from '../MainChartCategoryFilter';
import { click, byText, q, type } from '@/test-utils/dom';
import type { Category } from '@/types';

const categories: Category[] = [
  { id: 'c-rent', name: 'ค่าเช่า', type: 'expense', allocation_type: 'need', color: '#3B82F6' },
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', color: '#F97316', icon: 'wallet' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want', color: '#A855F7' },
  { id: 'c-trip', name: 'เที่ยว', type: 'expense', color: '#FDE047' }, // no allocation: counts as a WANT-side category
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', color: '#10B981' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings' },
  { id: 'c-empty', name: 'ไม่มีข้อมูล', type: 'expense', allocation_type: 'want' },
];
// Names that have data in the period — income / savings never appear in the picker, and 'ไม่มีข้อมูล' has none.
const withData = new Set(['ค่าเช่า', 'ค่ากิน', 'บันเทิง', 'เที่ยว', 'เงินเดือน', 'ออมทอง']);

type Probe = { open: boolean; category: string[]; log: boolean; hideFixed: boolean; hideWant: boolean };
let probe: Probe;

interface HarnessProps {
  open?: boolean; category?: string | string[]; log?: boolean; hideFixed?: boolean; hideWant?: boolean;
  showSkeleton?: boolean; cats?: Category[]; data?: Set<string>;
}
function Harness({ open = true, category = ['ALL'], log = false, hideFixed = false, hideWant = false, showSkeleton = false, cats = categories, data = withData }: HarnessProps) {
  const [isOpen, setOpen] = useState(open);
  const [cat, setCat] = useState<string | string[]>(category);
  const [isLog, setLog] = useState(log);
  const [hf, setHf] = useState(hideFixed);
  const [hw, setHw] = useState(hideWant);
  const ref = useRef<HTMLDivElement>(null);
  probe = { open: isOpen, category: Array.isArray(cat) ? cat : [cat], log: isLog, hideFixed: hf, hideWant: hw };
  return (
    <MainChartFilterMenu
      showSkeleton={showSkeleton} showCatMenu={isOpen} setShowCatMenu={setOpen} filterMenuRef={ref}
      dashboardCategory={cat} setDashboardCategory={setCat}
      categories={cats} categoriesWithData={data}
      isLogScale={isLog} setIsLogScale={setLog}
      hideFixedExpenses={hf} setHideFixedExpenses={setHf}
      hideWantExpenses={hw} setHideWantExpenses={setHw}
    />
  );
}

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (props: HarnessProps = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<Harness {...props} />));
};
const btn = (text: string) => byText('button', text) as HTMLButtonElement;
// The count badge is part of the button's text once a category filter is on, so match the start.
const trigger = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.startsWith('ตัวเลือกแสดงผล'))!;
const panel = () => q('div.z-45');
const chips = () => [...document.querySelectorAll<HTMLButtonElement>('div.grid.grid-cols-2 button')];
const chip = (name: string) => chips().find(c => c.textContent?.trim() === name)!;
const isOn = (c: HTMLElement) => c.querySelector('span.w-3.h-3 svg') !== null;
const footer = () => q('div.border-t.pt-2\\.5')!.textContent!.replace(/\s+/g, ' ').trim();
const search = () => q<HTMLInputElement>('input[placeholder="ค้นหาหมวดหมู่..."]')!;

beforeEach(() => { probe = undefined as unknown as Probe; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('MainChartCategorySelector — the list', () => {
  it('offers expense categories that have data in the period — not income, savings or empty ones', () => {
    mount();
    expect(chips().map(c => c.textContent!.trim())).toEqual(['ค่าเช่า', 'ค่ากิน', 'บันเทิง', 'เที่ยว']);
  });

});

