// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LedgerHeaderActions from '../LedgerHeaderActions';
import LedgerCommandPanel, { LedgerGroupBreakdownSection, getSavingsRateStyle } from '../LedgerCommandPanel';
import SegmentGroup from '../common/SegmentGroup';
import { byText, click } from '@/test-utils/dom';
import { BUDGET_RULES } from '@/constants/budgetRules';

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

});

describe('LedgerCommandPanel', () => {
  const panel = (over: Partial<React.ComponentProps<typeof LedgerCommandPanel>> = {}) => {
    const setShow = vi.fn();
    mount(
      <LedgerCommandPanel
        sumInc={30000} sumExp={10000} sumSav={1500} net={20000} savingsRate={67}
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
    expect(net.textContent).toContain('−฿2,500.00');
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

  it('mentions the investing inside the net — with a minus for a net sell — and hides it at zero', () => {
    panel({ sumSav: 1500 });
    expect(text()).toContain('ในนี้ลงทุน/ออม ฿1,500.00');
    act(() => root!.unmount()); container!.remove();
    panel({ sumSav: -400 });
    expect(text()).toContain('ในนี้ลงทุน/ออม −฿400.00');
    act(() => root!.unmount()); container!.remove();
    panel({ sumSav: 0 });
    expect(text()).not.toContain('ในนี้ลงทุน/ออม');
  });

});

describe('LedgerGroupBreakdownSection', () => {
  const card = (k: string) => <div key={k} data-card={k}>{k}</div>;
  const section = (inc: string[], sav: string[], exp: string[]) =>
    mount(<LedgerGroupBreakdownSection activeIncomeCards={inc.map(card)} activeSavingsCards={sav.map(card)} activeExpenseCards={exp.map(card)} />);

  it('a divider only when both income and savings are shown', () => {
    section(['i1'], ['s1'], []);
    expect(container!.querySelector('.w-px')).not.toBeNull();
    act(() => root!.unmount()); container!.remove();
    section(['i1'], [], ['e1']);
    expect(container!.querySelector('.w-px')).toBeNull();
  });

  it('expense-only still renders', () => {
    section([], [], ['e1', 'e2']);
    expect(container!.querySelectorAll('[data-card]')).toHaveLength(2);
    expect(text()).not.toContain('รายรับ');
  });
});

