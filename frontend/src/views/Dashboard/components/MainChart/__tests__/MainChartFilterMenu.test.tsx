// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act, useRef, useState } from 'react';
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
const panel = () => q('div.z-\\[45\\]');
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

describe('MainChartFilterMenu — opening and closing', () => {
  it('starts closed and the button opens and closes it', () => {
    mount({ open: false });
    expect(panel()).toBeNull();
    click(trigger());
    expect(panel()).not.toBeNull();
    expect(panel()!.textContent).toContain('ตัวเลือกกราฟ');
    click(trigger());
    expect(panel()).toBeNull();
  });

  it('the X in the panel closes it', () => {
    mount();
    click(q('div.z-\\[45\\] div.border-b button'));
    expect(probe.open).toBe(false);
    expect(panel()).toBeNull();
  });
});

describe('MainChartFilterMenu — the trigger says when something is filtered', () => {
  const lit = () => trigger().className.includes('text-accent-ink');

  it('plain when nothing is filtered', () => {
    mount({ open: false });
    expect(lit()).toBe(false);
    expect(trigger().textContent).toBe('ตัวเลือกแสดงผล');
  });

  it('lit, with the number of chosen categories, when a category filter is on', () => {
    mount({ open: false, category: ['ค่ากิน', 'บันเทิง'] });
    expect(lit()).toBe(true);
    expect(trigger().textContent).toContain('2');
  });

  it('lit — without a number — for the log scale or a NEED/WANT filter', () => {
    for (const props of [{ log: true }, { hideFixed: true }, { hideWant: true }]) {
      mount({ open: false, ...props });
      expect(lit()).toBe(true);
      expect(trigger().textContent).toBe('ตัวเลือกแสดงผล');
      act(() => root!.unmount()); container!.remove();
    }
  });

  it('"everything selected" is not a filter', () => {
    mount({ open: false, category: ['ALL'] });
    expect(lit()).toBe(false);
  });
});

describe('MainChartFilterMenu — scale and NEED/WANT', () => {
  it('the log switch says "ปิด" / "เปิด" and flips', () => {
    mount();
    expect(byText('button', 'ปิด')).toBeTruthy();
    click(byText('button', 'ปิด'));
    expect(probe.log).toBe(true);
    expect(byText('button', 'เปิด')).toBeTruthy();
    click(byText('button', 'เปิด'));
    expect(probe.log).toBe(false);
  });

  it('NEED / WANT choices reach the dashboard flags', () => {
    mount();
    click(btn('เฉพาะ WANT'));
    expect([probe.hideFixed, probe.hideWant]).toEqual([true, false]);
    click(btn('เฉพาะ NEED'));
    expect([probe.hideFixed, probe.hideWant]).toEqual([false, true]);
    click(btn('ทั้งหมด'));
    expect([probe.hideFixed, probe.hideWant]).toEqual([false, false]);
  });

  it('the log switch and NEED/WANT choices are disabled while loading', () => {
    mount({ showSkeleton: true });
    expect(btn('ปิด').disabled).toBe(true);
    expect(btn('เฉพาะ WANT').disabled).toBe(true);
  });
});

describe('MainChartCategorySelector — the list', () => {
  it('offers expense categories that have data in the period — not income, savings or empty ones', () => {
    mount();
    expect(chips().map(c => c.textContent!.trim())).toEqual(['ค่าเช่า', 'ค่ากิน', 'บันเทิง', 'เที่ยว']);
  });

  it('with "all" every chip is ticked and the footer counts them', () => {
    mount();
    expect(chips().every(isOn)).toBe(true);
    expect(footer()).toContain('เลือก 4 จาก 4 หมวดหมู่');
    expect(byText('button', 'ล้างตัวกรอง')).toBeNull();
  });

  it('shows a category by name or by its id, and counts what is chosen', () => {
    mount({ category: ['ค่ากิน', 'c-fun'] });
    expect(chips().map(isOn)).toEqual([false, true, true, false]);
    expect(footer()).toContain('เลือก 2 จาก 4 หมวดหมู่');
  });

  it('naming every category is the same as "all": all ticked, nothing to clear, the "all" preset lit', () => {
    mount({ category: ['ค่าเช่า', 'ค่ากิน', 'บันเทิง', 'เที่ยว'] });
    expect(chips().every(isOn)).toBe(true);
    expect(byText('button', 'ล้างตัวกรอง')).toBeNull();
    expect(btn('ทั้งหมด (รวม)').className).toContain('text-accent-ink');
  });

  it('accepts a single name (not an array) as the current selection', () => {
    mount({ category: 'ค่ากิน' });
    expect(chips().map(isOn)).toEqual([false, true, false, false]);
  });

  it('a category with an icon draws it; the glyph is decorative', () => {
    mount();
    expect(chip('ค่ากิน').querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('MainChartCategorySelector — choosing', () => {
  it('clicking one while "all" is on switches just that one off', () => {
    mount();
    click(chip('ค่ากิน'));
    expect(probe.category).toEqual(['ค่าเช่า', 'บันเทิง', 'เที่ยว']);
    expect(isOn(chip('ค่ากิน'))).toBe(false);
    expect(footer()).toContain('เลือก 3 จาก 4 หมวดหมู่');
  });

  it('clicking an unticked one adds it', () => {
    mount({ category: ['ค่ากิน'] });
    click(chip('บันเทิง'));
    expect(probe.category).toEqual(['ค่ากิน', 'บันเทิง']);
  });

  it('ticking the last missing one is "all" again', () => {
    mount({ category: ['ค่าเช่า', 'ค่ากิน', 'บันเทิง'] });
    click(chip('เที่ยว'));
    expect(probe.category).toEqual(['ALL']);
  });

  it('unticking the last chosen one is "all" again (an empty chart is never a state)', () => {
    mount({ category: ['ค่ากิน'] });
    click(chip('ค่ากิน'));
    expect(probe.category).toEqual(['ALL']);
  });

  it('"ล้างตัวกรอง" appears only while filtered, and resets to all', () => {
    mount({ category: ['ค่ากิน'] });
    click(byText('button', 'ล้างตัวกรอง'));
    expect(probe.category).toEqual(['ALL']);
    expect(byText('button', 'ล้างตัวกรอง')).toBeNull();
  });
});

describe('MainChartCategorySelector — presets', () => {
  it('"ทั้งหมด (รวม)" selects everything', () => {
    mount({ category: ['ค่ากิน'] });
    click(btn('ทั้งหมด (รวม)'));
    expect(probe.category).toEqual(['ALL']);
  });

  it('"เฉพาะตามใจ" selects the categories that are not NEED (a category with no allocation counts as WANT)', () => {
    mount();
    click(btn('เฉพาะตามใจ'));
    expect(probe.category).toEqual(['บันเทิง', 'เที่ยว']);
  });

  it('with no WANT-side category it falls back to everything instead of an empty selection', () => {
    mount({ cats: categories.filter(c => c.allocation_type === 'need' || c.type !== 'expense'), data: new Set(['ค่าเช่า', 'ค่ากิน']) });
    click(btn('เฉพาะตามใจ'));
    expect(probe.category).toEqual(['ALL']);
  });

  it('a WANT-side category with no data in the period is not part of the preset', () => {
    mount();
    click(btn('เฉพาะตามใจ'));
    expect(probe.category).not.toContain('ไม่มีข้อมูล');
  });

  it('highlights the preset that matches the selection', () => {
    const lit = (b: HTMLElement) => b.className.includes('text-accent-ink');
    mount();
    expect([btn('ทั้งหมด (รวม)'), btn('เฉพาะตามใจ')].map(lit)).toEqual([true, false]);
    click(btn('เฉพาะตามใจ'));
    expect([btn('ทั้งหมด (รวม)'), btn('เฉพาะตามใจ')].map(lit)).toEqual([false, true]);
    click(chip('บันเทิง'));
    expect([btn('ทั้งหมด (รวม)'), btn('เฉพาะตามใจ')].map(lit)).toEqual([false, false]);
  });

  it('the WANT preset matches whatever order the names were picked in', () => {
    mount({ category: ['เที่ยว', 'บันเทิง'] });
    expect(btn('เฉพาะตามใจ').className).toContain('text-accent-ink');
  });
});

describe('MainChartCategorySelector — search', () => {
  it('narrows the list by name, ignoring case', () => {
    mount();
    type(search(), 'กิน');
    expect(chips().map(c => c.textContent!.trim())).toEqual(['ค่ากิน']);
  });

  it('ignores letter case in a Latin name', () => {
    mount({ cats: [...categories, { id: 'c-nf', name: 'Netflix', type: 'expense' }], data: new Set([...withData, 'Netflix']) });
    type(search(), 'netflix');
    expect(chips().map(c => c.textContent!.trim())).toEqual(['Netflix']);
    type(search(), 'NETFLIX');
    expect(chips().map(c => c.textContent!.trim())).toEqual(['Netflix']);
  });

  it('also finds a category by its icon key', () => {
    mount();
    type(search(), 'wallet');
    expect(chips().map(c => c.textContent!.trim())).toEqual(['ค่ากิน']);
  });

  it('says so when nothing matches, and the footer still counts the whole period', () => {
    mount();
    type(search(), 'zzz');
    expect(chips()).toHaveLength(0);
    expect(panel()!.textContent).toContain('ไม่พบหมวดหมู่ที่ต้องการ');
    expect(footer()).toContain('เลือก 4 จาก 4 หมวดหมู่');
  });

  it('the ✕ clears the search; it is only there once something is typed', () => {
    mount();
    const clearBtn = () => search().parentElement!.querySelector('button');
    expect(clearBtn()).toBeNull();
    type(search(), 'บัน');
    click(clearBtn());
    expect(search().value).toBe('');
    expect(chips()).toHaveLength(4);
  });

  it('a search is not kept when the menu is closed and opened again', () => {
    mount();
    type(search(), 'บัน');
    click(trigger());
    click(trigger());
    expect(search().value).toBe('');
    expect(chips()).toHaveLength(4);
  });

  it('choosing while searching keeps the choice for the whole list', () => {
    mount();
    type(search(), 'กิน');
    click(chip('ค่ากิน'));
    expect(probe.category).toEqual(['ค่าเช่า', 'บันเทิง', 'เที่ยว']);
  });
});

describe('MainChartCategorySelector — on its own', () => {
  it('renders with an empty category list', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(
      <MainChartCategorySelector
        dashboardCategory={['ALL']} setDashboardCategory={() => {}} categories={[]} categoriesWithData={new Set()}
        searchQuery="" setSearchQuery={() => {}}
      />,
    ));
    expect(container.textContent).toContain('ไม่พบหมวดหมู่ที่ต้องการ');
    expect(container.textContent).toContain('เลือก 0 จาก 0 หมวดหมู่');
  });
});
