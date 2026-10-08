// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import PortfolioView from '../index';
import { click } from '@/test-utils/dom';
import { tc } from '@/constants/theme';
import { assetColorMap } from '../portfolioCharts';
import { mkAsset, mkPortfolio, trade } from './fixtures';
import type { PortfolioAsset } from '@/types';

const h = vi.hoisted(() => ({
  ctx: {} as Record<string, unknown>,
  openTrade: vi.fn(),
  summaryProps: [] as unknown[],
  modalProps: [] as { onClose: () => void }[],
}));
vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => h.ctx }));
vi.mock('@/context/AppUIContext', () => ({ useAppUI: () => ({ handleOpenTradeModal: h.openTrade }) }));
vi.mock('../PortfolioSummary', async () => {
  const React = await import('react');
  return { default: (p: unknown) => { h.summaryProps.push(p); return React.createElement('div', { 'data-testid': 'summary' }); } };
});
vi.mock('../AssetsModal', async () => {
  const React = await import('react');
  return { default: (p: { onClose: () => void }) => { h.modalProps.push(p); return React.createElement('div', { 'data-testid': 'modal' }, React.createElement('button', { onClick: p.onClose }, 'ปิดโมดัล')); } };
});

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

// Latin names so the sort order does not depend on Thai collation.
const alpha = () => mkAsset('a', { name: 'Alpha', units: 2, cost: 100, marketValue: 100, price: 50, unrealized: -10, unrealizedPct: -9, realized: 0, trades: [trade('t1', '2026-01-01', 'buy', 2, 110)] });
const bravo = () => mkAsset('b', { name: 'Bravo', units: 1, cost: 270, marketValue: 300, price: 300, unrealized: 30, unrealizedPct: 11, realized: 5, trades: [trade('t2', '2026-01-02', 'buy', 1, 270)] });
const charlie = () => mkAsset('c', { name: 'Charlie', units: 1, cost: 50, marketValue: null, price: null, unrealized: null, unrealizedPct: null, realized: 0 });
const delta = () => mkAsset('d', { name: 'Delta', units: 0, cost: 0, marketValue: null, price: null, unrealized: null, unrealizedPct: null, realized: 20, trades: [trade('t3', '2026-01-03', 'buy', 1, 10), trade('t4', '2026-01-04', 'sell', 1, 30)] });

const setCtx = (over: Record<string, unknown> = {}) => {
  h.ctx = {
    portfolio: mkPortfolio([alpha(), bravo(), charlie(), delta()], { marketValue: 400, cost: 370, unrealized: 20, realized: 25, oldestPriceAt: hoursAgo(1) }),
    isRefreshing: false,
    priceStatus: 'ok',
    failedPrices: {},
    refreshPrices: vi.fn(),
    setManualPrice: vi.fn(async () => true),
    ...over,
  };
};
const portfolioOf = (assets: PortfolioAsset[], totals = {}) => mkPortfolio(assets, { marketValue: 400, cost: 370, unrealized: 20, realized: 25, oldestPriceAt: hoursAgo(1), ...totals });

let root: Root | null = null;
let container: HTMLElement | null = null;
const render = () => act(() => root!.render(<PortfolioView />));
const mount = (over: Record<string, unknown> = {}) => {
  setCtx(over);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const text = () => container!.textContent ?? '';
const rowNames = () => [...container!.querySelectorAll('tbody tr')].map(r => r.querySelector('td span.font-bold')!.textContent);
const th = (label: string) => [...container!.querySelectorAll('thead th')].find(t => t.textContent === label) as HTMLElement;
const sortBtn = (label: string) => th(label).querySelector('button') as HTMLButtonElement;
const topBtn = (label: string) => [...container!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.includes(label))!;
const footerCells = () => [...container!.querySelectorAll('tfoot td')];

beforeEach(() => { h.openTrade.mockClear(); h.summaryProps.length = 0; h.modalProps.length = 0; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('PortfolioView states', () => {
  it('shows a loading line until the portfolio arrives, and nothing else', () => {
    mount({ portfolio: null });
    expect(text()).toBe('กำลังโหลดพอร์ต…');
    expect(container!.querySelector('table')).toBeNull();
  });

  it('with no assets: an explanation and a single add button, no table and no summary', () => {
    mount({ portfolio: mkPortfolio([]) });
    expect(text()).toContain('ยังไม่มีสินทรัพย์ลงทุน');
    expect(container!.querySelector('table')).toBeNull();
    expect(container!.querySelector('[data-testid="summary"]')).toBeNull();
    click(topBtn('เพิ่มสินทรัพย์'));
    expect(container!.querySelector('[data-testid="modal"]')).not.toBeNull();
  });

  it('with assets: the summary and the table, not the empty state', () => {
    mount();
    expect(container!.querySelector('[data-testid="summary"]')).not.toBeNull();
    expect(container!.querySelector('table')).not.toBeNull();
    expect(text()).not.toContain('ยังไม่มีสินทรัพย์ลงทุน');
    expect((h.summaryProps[0] as { portfolio: unknown }).portfolio).toBe((h.ctx as { portfolio: unknown }).portfolio);
  });

  it('renders the page title', () => {
    mount();
    expect(container!.querySelector('h1')!.textContent).toBe('พอร์ตลงทุน');
  });
});

describe('PortfolioView header', () => {
  it('price age: muted when fresh and online', () => {
    mount();
    const age = [...container!.querySelectorAll('span')].find(s => s.textContent!.startsWith('ราคา ณ'))!;
    expect(age).toBeDefined();
    expect(age.textContent).not.toContain('ข้อมูล');
    expect(age.classList.contains('text-ink-muted')).toBe(true);
    expect(age.classList.contains('text-warn')).toBe(false);
  });

  it('price age: amber when older than a day', () => {
    mount({ portfolio: portfolioOf([alpha()], { oldestPriceAt: hoursAgo(30) }) });
    const age = [...container!.querySelectorAll('span')].find(s => s.textContent!.startsWith('ราคา ณ'))!;
    expect(age.classList.contains('text-warn')).toBe(true);
  });

  it('price age: amber when the last refresh was only partly successful, even if recent', () => {
    mount({ priceStatus: 'partial' });
    const age = [...container!.querySelectorAll('span')].find(s => s.textContent!.startsWith('ราคา ณ'))!;
    expect(age.classList.contains('text-warn')).toBe(true);
  });

  it('price age: amber when offline', () => {
    mount({ priceStatus: 'offline' });
    const age = [...container!.querySelectorAll('span')].find(s => s.textContent!.startsWith('ราคา ณ'))!;
    expect(age.classList.contains('text-warn')).toBe(true);
  });

  it('no price date at all, no age label', () => {
    mount({ portfolio: portfolioOf([alpha()], { oldestPriceAt: null }) });
    expect([...container!.querySelectorAll('span')].some(s => s.textContent!.startsWith('ราคา ณ'))).toBe(false);
  });

  it('refresh button asks for new prices', () => {
    mount();
    click(topBtn('ดึงราคาใหม่'));
    expect(h.ctx.refreshPrices).toHaveBeenCalledTimes(1);
  });

  it('while refreshing it says so, is disabled and spins', () => {
    mount({ isRefreshing: true });
    const b = topBtn('กำลังดึงราคา…');
    expect(b.disabled).toBe(true);
    expect(b.querySelector('svg')!.getAttribute('class')).toContain('animate-spin');
    click(b);
    expect(h.ctx.refreshPrices).not.toHaveBeenCalled();
  });

  it('when idle the icon does not spin', () => {
    mount();
    expect(topBtn('ดึงราคาใหม่').querySelector('svg')!.getAttribute('class')).not.toContain('animate-spin');
  });
});

describe('PortfolioView offline notice', () => {
  it('nothing when prices are fine or there was nothing to fetch', () => {
    mount({ priceStatus: 'ok' });
    expect(container!.querySelector('[role="status"]')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    mount({ priceStatus: 'idle' });
    expect(container!.querySelector('[role="status"]')).toBeNull();
  });

  it('offline: explains and says the last known prices are shown', () => {
    mount({ priceStatus: 'offline' });
    const note = container!.querySelector('[role="status"]')!;
    expect(note.textContent).toContain('ดึงราคาออนไลน์ไม่ได้ (อาจไม่มีอินเทอร์เน็ต)');
    expect(note.textContent).toContain('แสดงราคาล่าสุดที่เคยดึงหรือกรอกไว้');
  });

  it('partial: lists which assets failed', () => {
    mount({ priceStatus: 'partial', failedPrices: { a: 'HTTP 500', b: 'timeout' } });
    const note = container!.querySelector('[role="status"]')!;
    expect(note.textContent).toContain('ดึงราคาได้ไม่ครบทุกสินทรัพย์ (ไม่สำเร็จ: Alpha, Bravo)');
    expect(note.textContent).not.toContain('ออนไลน์ไม่ได้');
  });

  it('partial without any known failing asset leaves the list out', () => {
    mount({ priceStatus: 'partial', failedPrices: {} });
    const note = container!.querySelector('[role="status"]')!;
    expect(note.textContent).toContain('ดึงราคาได้ไม่ครบทุกสินทรัพย์ — ');
    expect(note.textContent).not.toContain('ไม่สำเร็จ:');
  });

  it('failures for assets that no longer exist are not listed', () => {
    mount({ priceStatus: 'partial', failedPrices: { gone: 'x', c: 'y' } });
    expect(container!.querySelector('[role="status"]')!.textContent).toContain('(ไม่สำเร็จ: Charlie)');
  });

  it('shows the notice even when there are no assets yet', () => {
    mount({ portfolio: mkPortfolio([]), priceStatus: 'offline' });
    expect(container!.querySelector('[role="status"]')).not.toBeNull();
  });
});

describe('PortfolioView manage-assets modal', () => {
  it('opens from the header button and closes through its own close handler', () => {
    mount();
    expect(container!.querySelector('[data-testid="modal"]')).toBeNull();
    click(topBtn('จัดการสินทรัพย์'));
    expect(container!.querySelector('[data-testid="modal"]')).not.toBeNull();
    click(topBtn('ปิดโมดัล'));
    expect(container!.querySelector('[data-testid="modal"]')).toBeNull();
  });

  it('hands the modal the same close function across re-renders (its Esc listener depends on it)', () => {
    mount();
    click(topBtn('จัดการสินทรัพย์'));
    const first = h.modalProps[h.modalProps.length - 1].onClose;
    click(sortBtn('สินทรัพย์'));
    click(sortBtn('มูลค่า'));
    expect(h.modalProps.length).toBeGreaterThan(1);
    expect(h.modalProps[h.modalProps.length - 1].onClose).toBe(first);
  });
});

describe('PortfolioView table', () => {
  it('has the eight data columns, the sortable ones as buttons, plus a hidden trade column', () => {
    mount();
    const heads = [...container!.querySelectorAll('thead th')].map(t => t.textContent);
    expect(heads).toEqual(['สินทรัพย์', 'สัดส่วน', 'ที่ถืออยู่', 'ต้นทุนเฉลี่ย/หน่วย', 'ราคาล่าสุด', 'มูลค่า', 'กำไร/ขาดทุน (ยังไม่ขาย)', 'ขายแล้ว', 'บันทึกซื้อ/ขาย']);
    const sortable = [...container!.querySelectorAll('thead th')].filter(t => t.querySelector('button')).map(t => t.textContent);
    expect(sortable).toEqual(['สินทรัพย์', 'สัดส่วน', 'มูลค่า', 'กำไร/ขาดทุน (ยังไม่ขาย)', 'ขายแล้ว']);
    expect(container!.querySelector('thead th:last-child span')!.className).toContain('sr-only');
  });

  it('starts sorted by value, biggest first, assets without a price after them', () => {
    mount();
    expect(rowNames()).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta']);
    expect(th('มูลค่า').getAttribute('aria-sort')).toBe('descending');
    expect(th('สินทรัพย์').hasAttribute('aria-sort')).toBe(false);
  });

  it('clicking the active column flips direction; empty values stay last either way', () => {
    mount();
    click(sortBtn('มูลค่า'));
    expect(rowNames()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(th('มูลค่า').getAttribute('aria-sort')).toBe('ascending');
    click(sortBtn('มูลค่า'));
    expect(rowNames()).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta']);
    expect(th('มูลค่า').getAttribute('aria-sort')).toBe('descending');
  });

  it('name starts A to Z, a second click Z to A', () => {
    mount();
    click(sortBtn('สินทรัพย์'));
    expect(rowNames()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(th('สินทรัพย์').getAttribute('aria-sort')).toBe('ascending');
    click(sortBtn('สินทรัพย์'));
    expect(rowNames()).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha']);
    expect(th('สินทรัพย์').getAttribute('aria-sort')).toBe('descending');
  });

  it('numeric columns start high to low on first click', () => {
    mount();
    click(sortBtn('กำไร/ขาดทุน (ยังไม่ขาย)'));
    expect(rowNames()).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta']);
    expect(th('กำไร/ขาดทุน (ยังไม่ขาย)').getAttribute('aria-sort')).toBe('descending');
    click(sortBtn('ขายแล้ว'));
    expect(rowNames()).toEqual(['Delta', 'Bravo', 'Alpha', 'Charlie']);
    expect(th('ขายแล้ว').getAttribute('aria-sort')).toBe('descending');
    expect(th('กำไร/ขาดทุน (ยังไม่ขาย)').hasAttribute('aria-sort')).toBe(false);
  });

  it('share column sorts by the portfolio weight; not-held assets go last', () => {
    mount();
    click(sortBtn('สัดส่วน'));
    expect(rowNames()).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta']);
    click(sortBtn('สัดส่วน'));
    expect(rowNames()).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);
  });

  it('switching back to name after another column starts ascending again', () => {
    mount();
    click(sortBtn('สินทรัพย์')); click(sortBtn('สินทรัพย์')); // now descending
    click(sortBtn('มูลค่า'));
    click(sortBtn('สินทรัพย์'));
    expect(rowNames()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
  });

  it('the arrow points down for descending and up for ascending', () => {
    mount();
    const arrow = () => sortBtn('มูลค่า').querySelector('svg')!.classList;
    expect(arrow().contains('lucide-arrow-down')).toBe(true);
    click(sortBtn('มูลค่า'));
    expect(arrow().contains('lucide-arrow-up')).toBe(true);
    expect(arrow().contains('lucide-arrow-down')).toBe(false);
  });

  it('the active sort header is highlighted and shows an arrow; others do not', () => {
    mount();
    expect(sortBtn('มูลค่า').classList.contains('text-ink-display')).toBe(true);
    expect(sortBtn('มูลค่า').querySelector('svg')).not.toBeNull();
    expect(sortBtn('สินทรัพย์').classList.contains('text-ink-display')).toBe(false);
    expect(sortBtn('สินทรัพย์').querySelector('svg')).toBeNull();
    const down = sortBtn('มูลค่า').querySelector('svg')!.getAttribute('class');
    click(sortBtn('มูลค่า'));
    expect(sortBtn('มูลค่า').querySelector('svg')!.getAttribute('class')).not.toBe(down);
  });
});

describe('PortfolioView rows', () => {
  it('each row gets its share of the portfolio (held assets only) and the shared colour', () => {
    mount();
    const rows = [...container!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
    const byName = Object.fromEntries(rows.map(r => [r.querySelector('td span.font-bold')!.textContent!, r]));
    // Alpha 100 + Bravo 300 + Charlie cost 50 = 450
    expect(byName.Bravo.querySelectorAll('td')[1].textContent).toBe('67%');
    expect(byName.Alpha.querySelectorAll('td')[1].textContent).toBe('22%');
    expect(byName.Charlie.querySelectorAll('td')[1].textContent).toBe('11%');
    expect(byName.Delta.querySelectorAll('td')[1].textContent).toBe('–');
    const palette = assetColorMap([alpha(), bravo(), charlie(), delta()]);
    const swatch = (n: string) => byName[n].querySelector<HTMLElement>('td span[aria-hidden="true"]')!.style.backgroundColor;
    const probe = document.createElement('i');
    probe.style.backgroundColor = tc(palette.b);
    expect(swatch('Bravo')).toBe(probe.style.backgroundColor);
  });

  it('shares and colours follow a fresh portfolio (not the first one that was shown)', () => {
    mount();
    const shareOf = (name: string) => [...container!.querySelectorAll('tbody tr')].find(r => r.querySelector('td span.font-bold')!.textContent === name)!.querySelectorAll('td')[1].textContent;
    expect(shareOf('Bravo')).toBe('67%');
    const bigAlpha = { ...alpha(), marketValue: 900, cost: 800 };
    h.ctx = { ...h.ctx, portfolio: portfolioOf([bigAlpha, bravo()]) };
    click(sortBtn('สินทรัพย์')); // the mocked hook has no subscription, so any state change re-renders with the new context
    expect(shareOf('Alpha')).toBe('75%'); // 900 of 1200
    expect(shareOf('Bravo')).toBe('25%');
  });

  it('a failed price fetch shows on that asset only', () => {
    mount({ priceStatus: 'partial', failedPrices: { a: 'HTTP 500' } });
    const rows = [...container!.querySelectorAll('tbody tr')];
    const warned = rows.filter(r => r.textContent!.includes('ดึงราคาไม่สำเร็จ ใช้ราคาเดิม')).map(r => r.querySelector('td span.font-bold')!.textContent);
    expect(warned).toEqual(['Alpha']);
  });

  it('row ซื้อ/ขาย buttons open the add-transaction modal for that asset', () => {
    mount();
    click(container!.querySelector('button[aria-label="บันทึกซื้อ Bravo"]'));
    click(container!.querySelector('button[aria-label="บันทึกขาย Alpha"]'));
    expect(h.openTrade.mock.calls).toEqual([['b', 'buy'], ['a', 'sell']]);
  });

  it('typing a manual price in a row goes to the context', async () => {
    mount();
    click(container!.querySelector('button[aria-label="ดูรายละเอียด Charlie"]'));
    const input = container!.querySelector<HTMLInputElement>('input#price-c')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => { setter.call(input, '75'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    click([...container!.querySelectorAll('button')].find(b => b.textContent === 'บันทึกราคา'));
    await act(async () => { await Promise.resolve(); });
    expect(h.ctx.setManualPrice).toHaveBeenCalledWith('c', 75);
  });
});

describe('PortfolioView hide-inactive filter', () => {
  it('offered only when something is no longer held, with the count', () => {
    mount();
    const label = [...container!.querySelectorAll('label')].find(l => l.textContent!.includes('ซ่อนที่ไม่ได้ถืออยู่'))!;
    expect(label.textContent).toContain('(1)');
    act(() => root!.unmount()); container!.remove();
    mount({ portfolio: portfolioOf([alpha(), bravo()]) });
    expect([...container!.querySelectorAll('label')].some(l => l.textContent!.includes('ซ่อนที่ไม่ได้ถืออยู่'))).toBe(false);
  });

  it('ticking hides sold-out assets, unticking brings them back', () => {
    mount();
    const box = container!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(box.checked).toBe(false);
    click(box);
    expect(rowNames()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(box.checked).toBe(true);
    click(box);
    expect(rowNames()).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta']);
  });

  it('counts every inactive asset', () => {
    const d2 = mkAsset('d2', { name: 'Echo', units: 0 });
    mount({ portfolio: portfolioOf([alpha(), delta(), d2]) });
    const label = [...container!.querySelectorAll('label')].find(l => l.textContent!.includes('ซ่อนที่ไม่ได้ถืออยู่'))!;
    expect(label.textContent).toContain('(2)');
  });
});

describe('PortfolioView footer total', () => {
  it('market value, unrealised with sign and percentage of cost, realised with sign', () => {
    mount();
    const c = footerCells();
    expect(c[0].textContent).toBe('รวมทั้งพอร์ต (เฉพาะสินทรัพย์ที่มีราคา)');
    expect(c[0].getAttribute('colspan')).toBe('5');
    expect(c[1].textContent).toBe('400.00');
    expect(c[2].textContent).toBe('+20.00+5.41%'); // 20 / 370
    expect(c[2].classList.contains('text-income')).toBe(true);
    expect(c[3].textContent).toBe('+25.00');
    expect(c[3].classList.contains('text-income')).toBe(true);
  });

  it('each footer figure takes the colour of its own sign', () => {
    mount({ portfolio: portfolioOf([alpha()], { unrealized: -40, realized: 25, cost: 200 }) });
    expect(footerCells()[2].classList.contains('text-ink-soft')).toBe(true);
    expect(footerCells()[3].classList.contains('text-income')).toBe(true);
    act(() => root!.unmount()); container!.remove();
    mount({ portfolio: portfolioOf([alpha()], { unrealized: 40, realized: -25, cost: 200 }) });
    expect(footerCells()[2].classList.contains('text-income')).toBe(true);
    expect(footerCells()[3].classList.contains('text-ink-soft')).toBe(true);
  });

  it('exactly break-even with a cost basis: 0.00% with no plus', () => {
    mount({ portfolio: portfolioOf([alpha()], { unrealized: 0, cost: 100 }) });
    expect(footerCells()[2].textContent).toBe('0.000.00%');
  });

  it('a loss has no plus and uses the soft grey', () => {
    mount({ portfolio: portfolioOf([alpha()], { unrealized: -40, realized: -5, cost: 200 }) });
    const c = footerCells();
    expect(c[2].textContent).toBe('−40.00-20.00%');
    expect(c[2].classList.contains('text-ink-soft')).toBe(true);
    expect(c[3].textContent).toBe('−5.00');
    expect(c[3].classList.contains('text-ink-soft')).toBe(true);
  });

  it('no percentage when there is no cost basis; realised zero is a dash', () => {
    mount({ portfolio: portfolioOf([alpha()], { unrealized: 0, realized: 0, cost: 0 }) });
    const c = footerCells();
    expect(c[2].textContent).toBe('0.00');
    expect(c[2].querySelector('div')).toBeNull();
    expect(c[3].textContent).toBe('–');
  });

  it('a gain on zero cost shows the amount but never divides by zero', () => {
    mount({ portfolio: portfolioOf([alpha()], { unrealized: 15, cost: 0 }) });
    expect(footerCells()[2].textContent).toBe('+15.00');
  });
});
