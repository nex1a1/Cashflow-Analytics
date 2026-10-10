// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LedgerHeaderActions from '../LedgerHeaderActions';
import LedgerCommandPanel, { LedgerGroupBreakdownSection, getSavingsRateStyle } from '../LedgerCommandPanel';
import SegmentButton from '../common/SegmentButton';
import { byText, click } from '@/test-utils/dom';
import { BUDGET_RULES } from '@/views/Dashboard/components/SummaryCards/helpers';
import { formatMoney } from '@/utils/formatters';

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (el: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
};
const btn = (text: string) => byText('button', text)!;
const text = () => container!.textContent!;
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('LedgerHeaderActions', () => {
  const fns = () => ({ setViewMode: vi.fn(), setFilterOpen: vi.fn(), setHorizontalFilterOpen: vi.fn(), handleOpenAddModal: vi.fn() });
  const actions = (over: Partial<React.ComponentProps<typeof LedgerHeaderActions>> = {}) => {
    const f = fns();
    mount(<LedgerHeaderActions viewMode="list" filterOpen={false} isFilterActive={false} horizontalFilterOpen={false} isHorizontalFilterActive={false} {...f} {...over} />);
    return f;
  };
  const filterBtn = () => [...document.querySelectorAll('button')].find(b => b.textContent!.startsWith('ตัวกรอง'))!;

  it('the add buttons open the modal for income, savings and expense with no date', () => {
    const f = actions();
    click(btn('เพิ่มรายรับ'));
    expect(f.handleOpenAddModal).toHaveBeenLastCalledWith('', 'income');
    click(btn('เพิ่มลงทุน/ออม'));
    expect(f.handleOpenAddModal).toHaveBeenLastCalledWith('', 'savings');
    click(btn('เพิ่มรายจ่าย'));
    expect(f.handleOpenAddModal).toHaveBeenLastCalledWith('', 'expense');
  });

  it('switches between list and table view, marking the current one', () => {
    const f = actions({ viewMode: 'list' });
    expect(document.querySelector('button[title="มุมมองรายการ"]')!.className).toContain('text-accent-ink');
    expect(document.querySelector('button[title="มุมมองตารางแนวนอน"]')!.className).not.toContain('text-accent-ink');
    click(document.querySelector('button[title="มุมมองตารางแนวนอน"]'));
    expect(f.setViewMode).toHaveBeenLastCalledWith('horizontal');
    click(document.querySelector('button[title="มุมมองรายการ"]'));
    expect(f.setViewMode).toHaveBeenLastCalledWith('list');
  });

  it('the filter button drives the list filter panel in list view', () => {
    const f = actions({ viewMode: 'list' });
    expect(filterBtn().textContent).toBe('ตัวกรอง');
    expect(filterBtn().title).toContain('แผงตัวกรองรายการ');
    click(filterBtn());
    const updater = f.setFilterOpen.mock.lastCall![0] as (v: boolean) => boolean;
    expect([updater(false), updater(true)]).toEqual([true, false]);
    expect(f.setHorizontalFilterOpen).not.toHaveBeenCalled();
  });

  it('…and the table filter panel in table view (labelled ตัวกรองตาราง)', () => {
    const f = actions({ viewMode: 'horizontal' });
    expect(filterBtn().textContent).toBe('ตัวกรองตาราง');
    click(filterBtn());
    const updater = f.setHorizontalFilterOpen.mock.lastCall![0] as (v: boolean) => boolean;
    expect([updater(false), updater(true)]).toEqual([true, false]);
    expect(f.setFilterOpen).not.toHaveBeenCalled();
  });

  it('shows an amber dot when the filters of the CURRENT view are on, not the other view\'s', () => {
    actions({ viewMode: 'list', isFilterActive: true, isHorizontalFilterActive: false });
    expect(filterBtn().className).toContain('!border-warn');
    expect(filterBtn().querySelector('.bg-warn')).not.toBeNull();
    act(() => root!.unmount()); container!.remove();
    actions({ viewMode: 'horizontal', isFilterActive: true, isHorizontalFilterActive: false });
    expect(filterBtn().className).not.toContain('!border-warn');
    expect(filterBtn().querySelector('.bg-warn')).toBeNull();
  });

  it('highlights the button while its panel is open', () => {
    actions({ viewMode: 'list', filterOpen: true });
    expect(filterBtn().className).toContain('text-accent-ink');
    act(() => root!.unmount()); container!.remove();
    actions({ viewMode: 'horizontal', filterOpen: true, horizontalFilterOpen: false });
    expect(filterBtn().className).not.toContain('border-accent-ink');
  });
});

describe('getSavingsRateStyle', () => {
  it('green from the target rate up, red below it', () => {
    expect(getSavingsRateStyle(BUDGET_RULES.surplus.min)).toContain('text-income');
    expect(getSavingsRateStyle(BUDGET_RULES.surplus.min + 30)).toContain('text-income');
    expect(getSavingsRateStyle(BUDGET_RULES.surplus.min - 1)).toContain('text-danger');
    expect(getSavingsRateStyle(-10)).toContain('text-danger');
  });
});

describe('LedgerCommandPanel', () => {
  const panel = (over: Partial<React.ComponentProps<typeof LedgerCommandPanel>> = {}) => {
    const setShow = vi.fn();
    mount(
      <LedgerCommandPanel
        sumInc={30000} sumExp={10000} sumSav={1500} net={20000} savingsRate={67} formatMoney={formatMoney}
        getSubValue={(v: number) => `avg ${v}`} showGroupBreakdown={false} setShowGroupBreakdown={setShow} totalActiveGroupCards={4}
        {...over}
      />,
    );
    return setShow;
  };
  const block = (label: string) => [...container!.querySelectorAll<HTMLElement>('.grid > div')].find(d => d.textContent!.includes(label))!;

  it('three blocks: income, expense, net — each with its average line', () => {
    panel();
    expect(block('รายรับรวม').textContent).toContain('30,000.00');
    expect(block('รายรับรวม').textContent).toContain('avg 30000');
    expect(block('รายจ่ายรวม').textContent).toContain('10,000.00');
    expect(block('รายจ่ายรวม').textContent).toContain('avg 10000');
    expect(block('คงเหลือสุทธิ').textContent).toContain('20,000.00');
    expect(block('คงเหลือสุทธิ').textContent).toContain('avg 20000');
  });

  it('a surplus: green "เหลือ" and the rate of income', () => {
    panel();
    const net = block('คงเหลือสุทธิ');
    expect(net.textContent).toContain('เหลือ');
    expect(net.textContent).not.toContain('ขาดดุล');
    expect(net.textContent).toContain('67% ของรายรับ');
    expect(net.className).toContain('border-l-income');
  });

  it('a deficit: red "ขาดดุล", the negative amount and a red edge', () => {
    panel({ net: -2500, sumInc: 1000, sumExp: 3500, savingsRate: -250 });
    const net = block('คงเหลือสุทธิ');
    expect(net.textContent).toContain('ขาดดุล');
    expect(net.textContent).toContain('−2,500.00');
    expect(net.className).toContain('border-l-expense');
    expect(net.querySelector('.text-danger')).not.toBeNull();
  });

  it('break-even counts as a surplus (the label "คงเหลือสุทธิ" already contains "เหลือ", so look at the badge)', () => {
    panel({ net: 0, sumInc: 100, sumExp: 100, savingsRate: 0 });
    const net = block('คงเหลือสุทธิ');
    const badges = [...net.querySelectorAll('span')].map(s => s.textContent);
    expect(badges).toContain('เหลือ');
    expect(badges).not.toContain('ขาดดุล');
    expect(net.className).toContain('border-l-income');
  });

  it('no rate chip when there is no income', () => {
    panel({ sumInc: 0, net: -100, sumExp: 100, savingsRate: 0 });
    expect(text()).not.toContain('ของรายรับ');
  });

  it('a low rate is flagged red even in a surplus', () => {
    panel({ savingsRate: BUDGET_RULES.surplus.min - 1 });
    const chip = [...container!.querySelectorAll('span, div')].find(e => e.textContent!.endsWith('% ของรายรับ') && e.className.includes('border'))!;
    expect(chip.className).toContain('text-danger');
  });

  it('mentions the investing inside the net — with a minus for a net sell — and hides it at zero', () => {
    panel({ sumSav: 1500 });
    expect(text()).toContain('ในนี้ลงทุน/ออม 1,500.00');
    act(() => root!.unmount()); container!.remove();
    panel({ sumSav: -400 });
    expect(text()).toContain('ในนี้ลงทุน/ออม −400.00');
    act(() => root!.unmount()); container!.remove();
    panel({ sumSav: 0 });
    expect(text()).not.toContain('ในนี้ลงทุน/ออม');
  });

  it('the group breakdown toggle shows the number of groups and flips the flag', () => {
    const setShow = panel({ totalActiveGroupCards: 4 });
    expect(text()).toContain('ขยายดูการจำแนกตามกลุ่มรายรับ-รายจ่าย (4 กลุ่ม)');
    click(container!.querySelector('button[title^="ขยาย/หุบ"]'));
    const updater = setShow.mock.lastCall![0] as (v: boolean) => boolean;
    expect([updater(false), updater(true)]).toEqual([true, false]);
  });

  it('…and says "collapse" while open', () => {
    panel({ showGroupBreakdown: true });
    expect(text()).toContain('หุบการจำแนกตามกลุ่มรายรับ-รายจ่าย');
    expect(text()).not.toContain('ขยายดู');
  });

  it('no toggle at all when there are no groups to show', () => {
    panel({ totalActiveGroupCards: 0 });
    expect(container!.querySelector('button[title^="ขยาย/หุบ"]')).toBeNull();
  });
});

describe('LedgerGroupBreakdownSection', () => {
  const card = (k: string) => <div key={k} data-card={k}>{k}</div>;
  const section = (inc: string[], sav: string[], exp: string[]) =>
    mount(<LedgerGroupBreakdownSection activeIncomeCards={inc.map(card)} activeSavingsCards={sav.map(card)} activeExpenseCards={exp.map(card)} />);

  it('headings for each kind that has cards', () => {
    section(['i1'], ['s1'], ['e1']);
    expect(text()).toContain('รายรับ');
    expect(text()).toContain('การออมและลงทุน');
    expect(text()).toContain('รายจ่าย');
    expect(container!.querySelectorAll('[data-card]')).toHaveLength(3);
  });

  it('a kind with no cards has no heading', () => {
    section(['i1'], [], []);
    expect(text()).not.toContain('การออมและลงทุน');
    expect(text()).not.toContain('รายจ่าย');
  });

  it('a divider only when both income and savings are shown', () => {
    section(['i1'], ['s1'], []);
    expect(container!.querySelector('.w-\\[1px\\]')).not.toBeNull();
    act(() => root!.unmount()); container!.remove();
    section(['i1'], [], ['e1']);
    expect(container!.querySelector('.w-\\[1px\\]')).toBeNull();
  });

  it('expense-only still renders', () => {
    section([], [], ['e1', 'e2']);
    expect(container!.querySelectorAll('[data-card]')).toHaveLength(2);
    expect(text()).not.toContain('รายรับ');
  });
});

describe('SegmentButton', () => {
  const seg = (active: boolean, colorScheme?: React.ComponentProps<typeof SegmentButton>['colorScheme']) => {
    const onClick = vi.fn();
    mount(<SegmentButton label="ทดสอบ" active={active} onClick={onClick} colorScheme={colorScheme} />);
    return { onClick, el: btn('ทดสอบ') };
  };

  it('is a plain button that reports clicks', () => {
    const { onClick, el } = seg(false);
    expect(el.getAttribute('type')).toBe('button');
    click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('idle looks the same whatever its colour scheme', () => {
    const a = seg(false, 'emerald').el.className;
    act(() => root!.unmount()); container!.remove();
    const b = seg(false, 'rose').el.className;
    expect(a).toBe(b);
    expect(a).not.toContain('font-black text-income');
  });

  it.each([
    ['emerald', 'text-income'], ['rose', 'text-expense'], ['indigo', 'text-savings'], ['amber', 'text-warn'],
    ['sky', 'text-info'], ['red', 'text-accent-ink'], ['blue', 'text-ink-display'],
  ] as const)('active %s uses %s', (scheme, cls) => {
    expect(seg(true, scheme).el.className).toContain(cls);
  });

  it('active with no scheme is the neutral one', () => {
    expect(seg(true).el.className).toContain('text-ink-display');
  });
});
