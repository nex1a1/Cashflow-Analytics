// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import PortfolioSummary from '../PortfolioSummary';
import '@/test-utils/dom'; // sets IS_REACT_ACT_ENVIRONMENT
import { mkAsset, mkPortfolio, trade } from './fixtures';
import type { Portfolio } from '@/types';

const h = vi.hoisted(() => ({ cost: [] as unknown[], alloc: [] as unknown[] }));
vi.mock('../CostVsValue', async () => {
  const React = await import('react');
  return { default: (p: unknown) => { h.cost.push(p); return React.createElement('div', { 'data-testid': 'cost' }); } };
});
vi.mock('../AllocationPanel', async () => {
  const React = await import('react');
  return { default: (p: unknown) => { h.alloc.push(p); return React.createElement('div', { 'data-testid': 'alloc' }); } };
});

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (p: Portfolio) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<PortfolioSummary portfolio={p} />));
};
const text = () => container!.textContent ?? '';
/** The <dd> next to a <dt> with this exact label. */
const row = (label: string) => {
  const dt = [...container!.querySelectorAll('dt')].find(d => d.textContent === label);
  return dt ? (dt.nextElementSibling as HTMLElement) : null;
};

beforeEach(() => {
  h.cost.length = 0; h.alloc.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 8, 12, 0, 0)); // 8 Oct 2026
});
afterEach(() => {
  vi.useRealTimers();
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('PortfolioSummary headline', () => {
  it('big number is the market value; held cost sits under it', () => {
    mount(mkPortfolio([mkAsset('a')], { marketValue: 112_500, cost: 100_000 }));
    expect(container!.querySelector('p.text-\\[32px\\]')!.textContent).toBe('฿112,500.00');
    expect(text()).toContain('ต้นทุนที่ถืออยู่ ฿100,000.00');
  });

  it('says how long the first trade was ago (first by date, across assets)', () => {
    const a = mkAsset('a', { trades: [trade('t1', '2026-06-01', 'buy', 1, 10)] });
    const b = mkAsset('b', { trades: [trade('t2', '2026-08-20', 'buy', 1, 10)] });
    mount(mkPortfolio([a, b]));
    expect(text()).toContain('· ถือมา 4 เดือน');
  });

  it('no trades, no holding-time phrase', () => {
    mount(mkPortfolio([mkAsset('a', { trades: [] })]));
    expect(text()).not.toContain('ถือมา');
  });
});

describe('PortfolioSummary profit and loss', () => {
  it('total = unrealised + realised, with the percentage of everything bought', () => {
    mount(mkPortfolio([mkAsset('a')], { unrealized: 12_500, realized: 3_000, bought: 100_000 }));
    const total = row('กำไร/ขาดทุนรวม')!;
    expect(total.textContent).toBe('+฿15,500.00+15.50%');
    expect(total.querySelector('span')!.classList.contains('text-income')).toBe(true);
    expect(row('ยังไม่ขาย')!.textContent).toBe('+฿12,500.00');
    expect(row('ขายแล้ว')!.textContent).toBe('+฿3,000.00');
    expect(row('% คิดจากเงินที่ซื้อทั้งหมด')!.textContent).toBe('฿100,000.00');
  });

  it('a loss uses a real minus sign, no plus, and the soft grey - not red', () => {
    mount(mkPortfolio([mkAsset('a')], { unrealized: -2_000, realized: 500, bought: 100_000 }));
    const total = row('กำไร/ขาดทุนรวม')!;
    expect(total.textContent).toBe('−฿1,500.00−1.50%');
    expect(total.querySelector('span')!.classList.contains('text-ink-soft')).toBe(true);
    expect(row('ยังไม่ขาย')!.textContent).toBe('−฿2,000.00');
    expect(row('ขายแล้ว')!.textContent).toBe('+฿500.00');
  });

  it('break-even has no sign and the neutral colour', () => {
    mount(mkPortfolio([mkAsset('a')], { unrealized: 0, realized: 0, bought: 500 }));
    const total = row('กำไร/ขาดทุนรวม')!;
    expect(total.textContent).toBe('฿0.00' + '0.00%');
    expect(total.querySelector('span')!.classList.contains('text-ink-display')).toBe(true);
  });

  it('nothing bought: the amount without a percentage', () => {
    mount(mkPortfolio([mkAsset('a')], { unrealized: 0, realized: 40, bought: 0 }));
    expect(row('กำไร/ขาดทุนรวม')!.textContent).toBe('+฿40.00');
  });

  it('a gentle note appears only while the total is a loss', () => {
    mount(mkPortfolio([mkAsset('a')], { unrealized: -1, realized: 0, bought: 100 }));
    expect(text()).toContain('มูลค่าต่ำกว่าต้นทุนชั่วคราว');
    act(() => root!.unmount()); container!.remove();
    mount(mkPortfolio([mkAsset('a')], { unrealized: -1, realized: 1, bought: 100 }));
    expect(text()).not.toContain('มูลค่าต่ำกว่าต้นทุนชั่วคราว');
  });
});

describe('PortfolioSummary annual return', () => {
  it('hidden until there is a trade to measure from', () => {
    mount(mkPortfolio([mkAsset('a', { trades: [] })]));
    expect(row('ผลตอบแทนเฉลี่ยต่อปี')).toBeNull();
  });

  it('under a year: a dash with the reason', () => {
    const a = mkAsset('a', { units: 1, marketValue: 110, trades: [trade('t1', '2026-06-01', 'buy', 1, 100)] });
    mount(mkPortfolio([a]));
    expect(row('ผลตอบแทนเฉลี่ยต่อปี')!.textContent).toBe('–ถือยังไม่ถึง 1 ปี');
  });

  it('over a year: the money-weighted annual rate', () => {
    // 100 in on 2025-01-01, worth 110 on 2026-10-08 (645 days)
    const a = mkAsset('a', { units: 1, marketValue: 110, trades: [trade('t1', '2025-01-01', 'buy', 1, 100)] });
    mount(mkPortfolio([a]));
    const expected = ((1.1 ** (365 / 645)) - 1) * 100;
    const r = row('ผลตอบแทนเฉลี่ยต่อปี')!;
    expect(r.textContent).toBe(`+${expected.toFixed(2)}%`);
    expect(r.querySelector('span')!.classList.contains('text-income')).toBe(true);
  });

  it('a losing year shows a real minus', () => {
    const a = mkAsset('a', { units: 1, marketValue: 90, trades: [trade('t1', '2025-01-01', 'buy', 1, 100)] });
    mount(mkPortfolio([a]));
    const expected = Math.abs((0.9 ** (365 / 645)) - 1) * 100;
    const r = row('ผลตอบแทนเฉลี่ยต่อปี')!;
    expect(r.textContent).toBe(`−${expected.toFixed(2)}%`);
    expect(r.querySelector('span')!.classList.contains('text-ink-soft')).toBe(true);
  });

  it('over a year but no way to compute: a dash and no "under a year" excuse', () => {
    const a = mkAsset('a', { units: 1, marketValue: 0, trades: [trade('t1', '2025-01-01', 'buy', 1, 100)] });
    mount(mkPortfolio([a]));
    expect(row('ผลตอบแทนเฉลี่ยต่อปี')!.textContent).toBe('–');
  });
});

describe('PortfolioSummary colours and refresh', () => {
  const cls = (label: string) => row(label)!.querySelector('span')!.classList;

  it('total, unrealised and realised each take the colour of their own sign', () => {
    // unrealised -2000, realised +5000 -> total +3000
    mount(mkPortfolio([mkAsset('a')], { unrealized: -2_000, realized: 5_000, bought: 100_000 }));
    expect(cls('กำไร/ขาดทุนรวม').contains('text-income')).toBe(true);
    expect(cls('ยังไม่ขาย').contains('text-ink-soft')).toBe(true);
    expect(cls('ขายแล้ว').contains('text-income')).toBe(true);
    act(() => root!.unmount()); container!.remove();
    // unrealised +2000, realised -5000 -> total -3000
    mount(mkPortfolio([mkAsset('a')], { unrealized: 2_000, realized: -5_000, bought: 100_000 }));
    expect(cls('กำไร/ขาดทุนรวม').contains('text-ink-soft')).toBe(true);
    expect(cls('ยังไม่ขาย').contains('text-income')).toBe(true);
    expect(cls('ขายแล้ว').contains('text-ink-soft')).toBe(true);
  });

  it('the annual-return row follows a new set of assets', () => {
    const none = mkPortfolio([mkAsset('a', { trades: [] })]);
    mount(none);
    expect(row('ผลตอบแทนเฉลี่ยต่อปี')).toBeNull();
    const traded = mkPortfolio([mkAsset('a', { units: 1, marketValue: 110, trades: [trade('t1', '2025-01-01', 'buy', 1, 100)] })]);
    act(() => root!.render(<PortfolioSummary portfolio={traded} />));
    expect(row('ผลตอบแทนเฉลี่ยต่อปี')).not.toBeNull();
  });

  it('exactly one year with nothing to compute: a bare dash, not the "under a year" excuse', () => {
    const a = mkAsset('a', { units: 1, marketValue: 0, trades: [trade('t1', '2025-10-08', 'buy', 1, 100)] });
    mount(mkPortfolio([a]));
    expect(row('ผลตอบแทนเฉลี่ยต่อปี')!.textContent).toBe('–');
  });
});

describe('PortfolioSummary general savings and unpriced notes', () => {
  it('negative general savings (more taken out than put in) read −฿500.00, not ฿-500.00', () => {
    mount(mkPortfolio([mkAsset('a')], { marketValue: 1_000 }, { generalSavings: -500 }));
    expect(row('เงินออมทั่วไป (ไม่ผูกสินทรัพย์ ไม่มีมูลค่าตลาด)')!.textContent).toBe('−฿500.00');
    expect(row('รวมพอร์ตและเงินออมทั่วไป')!.textContent).toBe('฿500.00'); // 1,000 - 500
  });

  it('general savings: shown with the combined total', () => {
    mount(mkPortfolio([mkAsset('a')], { marketValue: 1_000 }, { generalSavings: 5_000 }));
    expect(row('เงินออมทั่วไป (ไม่ผูกสินทรัพย์ ไม่มีมูลค่าตลาด)')!.textContent).toBe('฿5,000.00');
    expect(row('รวมพอร์ตและเงินออมทั่วไป')!.textContent).toBe('฿6,000.00');
  });

  it('no general savings, no extra block', () => {
    mount(mkPortfolio([mkAsset('a')], { marketValue: 1_000 }, { generalSavings: 0 }));
    expect(row('รวมพอร์ตและเงินออมทั่วไป')).toBeNull();
  });

  it('unpriced assets are flagged with their count and cost', () => {
    mount(mkPortfolio([mkAsset('a')], { unpricedCount: 2, unpricedCost: 3_500 }));
    expect(text()).toContain('2 สินทรัพย์ยังไม่มีราคา (ต้นทุน ฿3,500.00)');
    expect(text()).toContain('จึงไม่รวมในมูลค่าและกำไร/ขาดทุนด้านบน');
  });

  it('everything priced: no warning', () => {
    mount(mkPortfolio([mkAsset('a')], { unpricedCount: 0 }));
    expect(text()).not.toContain('ยังไม่มีราคา');
  });
});

describe('PortfolioSummary panels', () => {
  it('has three labelled sections; the charts get the same portfolio', () => {
    const p = mkPortfolio([mkAsset('a')]);
    mount(p);
    expect([...container!.querySelectorAll('section')].map(s => s.getAttribute('aria-label'))).toEqual(['สรุปพอร์ต', 'เงินที่ลงไปเทียบมูลค่าตอนนี้', 'สัดส่วนพอร์ต']);
    expect((h.cost[0] as { portfolio: Portfolio }).portfolio).toBe(p);
    expect((h.alloc[0] as { portfolio: Portfolio }).portfolio).toBe(p);
  });
});
