// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import PortfolioSnapshot from '../PortfolioSnapshot';
import { click } from '@/test-utils/dom';
import type { Portfolio } from '@/types';

const h = vi.hoisted(() => ({ portfolio: null as unknown, priceStatus: 'ok', setActiveTab: vi.fn() }));
vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => ({ portfolio: h.portfolio, priceStatus: h.priceStatus }) }));
vi.mock('@/context/AppUIContext', () => ({ useAppUI: () => ({ setActiveTab: h.setActiveTab }) }));

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
const portfolio = (totals: Partial<Portfolio['totals']> = {}, assets = 1): Portfolio => ({
  assets: Array.from({ length: assets }, (_, i) => ({ id: `a${i}` })) as Portfolio['assets'],
  totals: { cost: 100_000, marketValue: 112_500, unrealized: 12_500, realized: 3_000, bought: 100_000, unpricedCount: 0, unpricedCost: 0, oldestPriceAt: hoursAgo(1), ...totals },
  generalSavings: 0, history: [],
} as Portfolio);

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<PortfolioSnapshot />));
};
const text = () => container!.textContent ?? '';
const stat = (label: string) => [...container!.querySelectorAll('div')].find(d => d.firstElementChild?.textContent === label)!;

beforeEach(() => { h.portfolio = portfolio(); h.priceStatus = 'ok'; h.setActiveTab.mockClear(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('PortfolioSnapshot', () => {
  it('renders nothing until there is at least one asset (people who do not invest never see it)', () => {
    h.portfolio = null;
    mount();
    expect(container!.innerHTML).toBe('');
    act(() => root!.unmount()); container!.remove();
    h.portfolio = portfolio({}, 0);
    mount();
    expect(container!.innerHTML).toBe('');
  });

  it('shows market value, cost, unrealised gain with its percentage, and what was already sold', () => {
    mount();
    expect(stat('มูลค่าปัจจุบัน').textContent).toContain('฿112,500.00');
    expect(stat('ต้นทุน').textContent).toContain('฿100,000.00');
    const gain = stat('กำไร/ขาดทุน ที่ยังไม่ขาย');
    expect(gain.textContent).toContain('+12,500.00');
    expect(gain.textContent).toContain('+12.5%');
    expect(gain.className).toContain('bg-income/10');
    expect(stat('ขายแล้ว').textContent).toContain('+3,000.00');
  });

  it('a loss is shown without a plus, in the soft colour, and without the gain highlight', () => {
    h.portfolio = portfolio({ marketValue: 90_000, unrealized: -10_000, realized: -500 });
    mount();
    const loss = stat('กำไร/ขาดทุน ที่ยังไม่ขาย');
    expect(loss.textContent).toContain('−10,000.00');
    expect(loss.textContent).toContain('-10.0%');
    expect(loss.textContent).not.toContain('+');
    expect(loss.className).not.toContain('bg-income/10');
    expect(loss.querySelector('.text-ink-soft')).not.toBeNull();
    expect(stat('ขายแล้ว').textContent).toContain('−500.00');
  });

  it('zero cost: no percentage (no division by zero)', () => {
    h.portfolio = portfolio({ cost: 0, marketValue: 0, unrealized: 0, realized: 0 });
    mount();
    expect(text()).not.toMatch(/NaN|Infinity/);
    expect(stat('กำไร/ขาดทุน ที่ยังไม่ขาย').textContent).not.toContain('%');
  });

  it('fresh prices: calm, with the age of the data', () => {
    mount();
    expect(text()).toContain('ราคา');
    expect(container!.querySelector('.bg-warn\\/10')).toBeNull();
  });

  it('old prices, partial or offline fetches: the warning style (cached numbers are still shown)', () => {
    h.portfolio = portfolio({ oldestPriceAt: hoursAgo(72) });
    mount();
    expect(container!.querySelector('.bg-warn\\/10')).not.toBeNull();
    act(() => root!.unmount()); container!.remove();

    h.portfolio = portfolio();
    h.priceStatus = 'offline';
    mount();
    expect(container!.querySelector('.bg-warn\\/10')).not.toBeNull();
    expect(stat('มูลค่าปัจจุบัน').textContent).toContain('฿112,500.00');
    act(() => root!.unmount()); container!.remove();

    h.priceStatus = 'partial';
    mount();
    expect(container!.querySelector('.bg-warn\\/10')).not.toBeNull();
  });

  it('says there is no price when none was ever fetched', () => {
    h.portfolio = portfolio({ oldestPriceAt: null });
    mount();
    expect(text()).toContain('ยังไม่มีราคา');
  });

  it('the whole strip is one button that opens the portfolio tab', () => {
    mount();
    expect(container!.querySelector('button')!.textContent).toContain('ไปที่หน้าพอร์ตลงทุน');
    click(container!.querySelector('button'));
    expect(h.setActiveTab).toHaveBeenCalledWith('portfolio');
  });

  it('the bottom line shows cost vs value: shared part grey, the rest green for a gain', () => {
    mount();
    const [shared, rest] = container!.querySelectorAll<HTMLElement>('button > span[aria-hidden="true"] span');
    expect(shared.style.width).toBe('88.88888888888889%'); // 100,000 of 112,500
    expect(rest.className).toContain('bg-income');
  });
});
