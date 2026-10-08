// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AssetRow from '../AssetRow';
import { click } from '@/test-utils/dom';
import { mkAsset, trade } from './fixtures';
import type { PortfolioAsset } from '@/types';

const setPrice = vi.fn(async () => true);
const onTrade = vi.fn();

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (asset: PortfolioAsset, props: { weight?: number | null; priceError?: string; color?: string } = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(
    <table><tbody>
      <AssetRow asset={asset} onSetPrice={setPrice} onTrade={onTrade} color={props.color ?? '#112233'} weight={props.weight === undefined ? null : props.weight} priceError={props.priceError} />
    </tbody></table>,
  ));
};
const cells = () => [...container!.querySelectorAll('tr')[0].querySelectorAll('td')];
const cellText = (i: number) => cells()[i].textContent ?? '';
const btn = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

beforeEach(() => { setPrice.mockClear(); onTrade.mockClear(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('AssetRow identity column', () => {
  it('shows the name with its kind and symbol; the symbol part is left out when there is none', () => {
    mount(mkAsset('a', { name: 'Dime - AAPL', kind: 'us_stock', symbol: 'AAPL' }));
    expect(cellText(0)).toContain('Dime - AAPL');
    expect(cellText(0)).toContain('หุ้นสหรัฐ · AAPL');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { name: 'ออมทอง', kind: 'gold_bar', symbol: null }));
    expect(cellText(0)).toContain('ทองคำแท่ง');
    expect(cellText(0)).not.toContain('·');
  });

  it('paints the swatch with the asset colour', () => {
    mount(mkAsset('a'), { color: 'rgb(1, 2, 3)' });
    const sw = container!.querySelector<HTMLElement>('span[aria-hidden="true"]')!;
    expect(sw.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('dims a row that is no longer held, and only that row', () => {
    mount(mkAsset('a', { units: 0 }));
    expect(container!.querySelector('tr')!.classList.contains('opacity-70')).toBe(true);
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { units: 2 }));
    expect(container!.querySelector('tr')!.classList.contains('opacity-70')).toBe(false);
  });
});

describe('AssetRow weight column', () => {
  it('shows a dash and no bar when the asset is not held (weight null)', () => {
    mount(mkAsset('a'), { weight: null });
    expect(cellText(1)).toBe('–');
    expect(cells()[1].querySelector('.h-full')).toBeNull();
  });

  it('rounds the percentage and sizes the bar to it', () => {
    mount(mkAsset('a'), { weight: 45.6 });
    expect(cellText(1)).toBe('46%');
    expect(cells()[1].querySelector<HTMLElement>('.h-full')!.style.width).toBe('45.6%');
  });

  it('keeps a sliver visible for a tiny weight (never below 2%)', () => {
    mount(mkAsset('a'), { weight: 0.4 });
    expect(cells()[1].querySelector<HTMLElement>('.h-full')!.style.width).toBe('2%');
  });

  it('a weight of exactly 0 still draws the 2% sliver and reads 0%', () => {
    mount(mkAsset('a'), { weight: 0 });
    expect(cellText(1)).toBe('0%');
    expect(cells()[1].querySelector<HTMLElement>('.h-full')!.style.width).toBe('2%');
  });
});

describe('AssetRow holding column', () => {
  it('shows units with the asset unit label', () => {
    mount(mkAsset('a', { units: 12.5, unitLabel: 'หุ้น' }));
    expect(cellText(2)).toBe('12.5 หุ้น');
  });

  it('falls back to หน่วย when the asset has no unit label', () => {
    mount(mkAsset('a', { units: 3, unitLabel: null }));
    expect(cellText(2)).toBe('3 หน่วย');
  });

  it('gold also shows the grams (1 baht-gold = 15.244 g)', () => {
    mount(mkAsset('a', { kind: 'gold_bar', units: 2, unitLabel: 'บาททอง' }));
    expect(cellText(2)).toContain('2 บาททอง');
    expect(cellText(2)).toContain('≈ 30.488 กรัม');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { kind: 'gold_ornament', units: 1, unitLabel: 'บาททอง' }));
    expect(cellText(2)).toContain('≈ 15.244 กรัม');
  });

  it('non-gold assets never show grams', () => {
    mount(mkAsset('a', { kind: 'crypto', units: 2 }));
    expect(cellText(2)).not.toContain('กรัม');
  });

  it('sold-out vs never-traded wording', () => {
    mount(mkAsset('a', { units: 0, trades: [trade('t', '2026-01-01', 'buy', 1, 10)] }));
    expect(cellText(2)).toBe('ขายหมดแล้ว');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { units: 0, trades: [] }));
    expect(cellText(2)).toBe('ยังไม่มีรายการ');
  });
});

describe('AssetRow money columns', () => {
  it('average cost: a dash when unknown', () => {
    mount(mkAsset('a', { avgCostPerUnit: null }));
    expect(cellText(3)).toBe('–');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { avgCostPerUnit: 1234.5 }));
    expect(cellText(3)).toBe('1,234.50');
  });

  it('no price yet: amber notice instead of a number', () => {
    mount(mkAsset('a', { price: null }));
    expect(cellText(4)).toContain('ยังไม่มีราคา');
    expect(cells()[4].querySelector('.text-warn')!.textContent).toBe('ยังไม่มีราคา');
  });

  it('shows the latest price with a muted timestamp when it is fresh', () => {
    mount(mkAsset('a', { price: 250.5, priceAt: hoursAgo(1) }));
    expect(cellText(4)).toContain('250.50');
    expect(cellText(4)).not.toContain('ยังไม่มีราคา');
    const stamp = [...cells()[4].querySelectorAll('div')].find(d => d.textContent!.startsWith('ข้อมูล ณ'))!;
    expect(stamp.classList.contains('text-ink-muted')).toBe(true);
    expect(stamp.classList.contains('text-warn')).toBe(false);
  });

  it('turns the timestamp amber when the price is older than a day', () => {
    mount(mkAsset('a', { price: 250.5, priceAt: hoursAgo(30) }));
    const stamp = [...cells()[4].querySelectorAll('div')].find(d => d.textContent!.startsWith('ข้อมูล ณ'))!;
    expect(stamp.classList.contains('text-warn')).toBe(true);
  });

  it('a price without a timestamp shows no date line', () => {
    mount(mkAsset('a', { price: 10, priceAt: null }));
    expect(cells()[4].querySelector('div')).toBeNull();
  });

  it('a failed refresh adds a warning that carries the error as tooltip', () => {
    mount(mkAsset('a', { price: 10 }), { priceError: 'HTTP 500' });
    const note = [...cells()[4].querySelectorAll('div')].find(d => d.textContent === 'ดึงราคาไม่สำเร็จ ใช้ราคาเดิม')!;
    expect(note.getAttribute('title')).toBe('HTTP 500');
    expect(note.classList.contains('text-warn')).toBe(true);
  });

  it('no error, no warning', () => {
    mount(mkAsset('a', { price: 10 }));
    expect(cellText(4)).not.toContain('ดึงราคาไม่สำเร็จ');
  });

  it('market value: dash when unpriced', () => {
    mount(mkAsset('a', { marketValue: null }));
    expect(cellText(5)).toBe('–');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { marketValue: 9876.5 }));
    expect(cellText(5)).toBe('9,876.50');
  });
});

describe('AssetRow profit and loss', () => {
  it('unrealised gain: plus sign, percentage and the income colour', () => {
    mount(mkAsset('a', { unrealized: 1200, unrealizedPct: 12.345 }));
    expect(cellText(6)).toBe('+1,200.00+12.35%');
    expect(cells()[6].classList.contains('text-income')).toBe(true);
  });

  it('unrealised loss: no plus, no red - a soft grey', () => {
    mount(mkAsset('a', { unrealized: -300, unrealizedPct: -3 }));
    expect(cellText(6)).toBe('−300.00-3.00%');
    expect(cells()[6].classList.contains('text-ink-soft')).toBe(true);
    expect(cells()[6].classList.contains('text-expense')).toBe(false);
  });

  it('unrealised unknown (no price): a dash', () => {
    mount(mkAsset('a', { unrealized: null, unrealizedPct: null }));
    expect(cellText(6)).toBe('–');
  });

  it('known amount but no percentage (zero cost): the amount only', () => {
    mount(mkAsset('a', { unrealized: 50, unrealizedPct: null }));
    expect(cellText(6)).toBe('+50.00');
  });

  it('a break-even position shows 0.00 with the neutral colour and no plus', () => {
    mount(mkAsset('a', { unrealized: 0, unrealizedPct: 0 }));
    expect(cellText(6)).toBe('0.000.00%');
    expect(cells()[6].classList.contains('text-ink-display')).toBe(true);
  });

  it('realised: dash at zero, plus for gain, minus for loss', () => {
    mount(mkAsset('a', { realized: 0 }));
    expect(cellText(7)).toBe('–');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { realized: 250 }));
    expect(cellText(7)).toBe('+250.00');
    expect(cells()[7].classList.contains('text-income')).toBe(true);
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('c', { realized: -75 }));
    expect(cellText(7)).toBe('−75.00');
    expect(cells()[7].classList.contains('text-ink-soft')).toBe(true);
  });
});

describe('AssetRow trade buttons', () => {
  it('ซื้อ and ขาย hand the asset id and side to onTrade', () => {
    mount(mkAsset('a1', { name: 'ทองเก็บ', units: 1 }));
    click(btn('บันทึกซื้อ ทองเก็บ'));
    click(btn('บันทึกขาย ทองเก็บ'));
    expect(onTrade.mock.calls).toEqual([['a1', 'buy'], ['a1', 'sell']]);
  });

  it('ขาย is disabled when nothing is held; ซื้อ is always available', () => {
    mount(mkAsset('a1', { name: 'X', units: 0 }));
    expect(btn('บันทึกขาย X').disabled).toBe(true);
    expect(btn('บันทึกซื้อ X').disabled).toBe(false);
    click(btn('บันทึกขาย X'));
    expect(onTrade).not.toHaveBeenCalled();
  });

  it('clicking a trade button does not also open the detail row', () => {
    mount(mkAsset('a1', { name: 'X', units: 1 }));
    click(btn('บันทึกซื้อ X'));
    expect(container!.querySelectorAll('tr').length).toBe(1);
  });
});

describe('AssetRow detail toggle', () => {
  it('starts collapsed and the name button says it will open', () => {
    mount(mkAsset('a', { name: 'X' }));
    const b = btn('ดูรายละเอียด X');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(container!.querySelectorAll('tr').length).toBe(1);
  });

  it('clicking the name button opens the detail row spanning all 9 columns, clicking again closes it', () => {
    mount(mkAsset('a', { name: 'X' }));
    click(btn('ดูรายละเอียด X'));
    const rows = container!.querySelectorAll('tr');
    expect(rows.length).toBe(2);
    expect(rows[1].querySelector('td')!.getAttribute('colspan')).toBe('9');
    expect(btn('ซ่อนรายละเอียด X').getAttribute('aria-expanded')).toBe('true');
    click(btn('ซ่อนรายละเอียด X'));
    expect(container!.querySelectorAll('tr').length).toBe(1);
    expect(btn('ดูรายละเอียด X').getAttribute('aria-expanded')).toBe('false');
  });

  it('the chevron points right when closed and down when open', () => {
    mount(mkAsset('a', { name: 'X' }));
    const icon = () => btn(container!.querySelector('button[aria-expanded]')!.getAttribute('aria-label')!).querySelector('svg')!;
    expect(icon().classList.contains('lucide-chevron-right')).toBe(true);
    click(container!.querySelector('button[aria-expanded]'));
    expect(icon().classList.contains('lucide-chevron-down')).toBe(true);
    expect(icon().classList.contains('lucide-chevron-right')).toBe(false);
  });

  it('the whole row is clickable too (not only the button)', () => {
    mount(mkAsset('a', { name: 'X' }));
    click(container!.querySelector('tr'));
    expect(container!.querySelectorAll('tr').length).toBe(2);
    click(container!.querySelector('tr'));
    expect(container!.querySelectorAll('tr').length).toBe(1);
  });

  it('the opened detail gets the asset, its unit and the price setter', async () => {
    mount(mkAsset('a1', { name: 'X', unitLabel: 'เหรียญ', units: 1 }));
    click(btn('ดูรายละเอียด X'));
    const detail = container!.querySelectorAll('tr')[1];
    expect(detail.textContent).toContain('กรอกราคาเอง (บาทต่อเหรียญ)');
    const input = detail.querySelector<HTMLInputElement>('input#price-a1')!;
    expect(input).not.toBeNull();
  });

  it('without a unit label the detail falls back to หน่วย', () => {
    mount(mkAsset('a1', { name: 'X', unitLabel: null }));
    click(btn('ดูรายละเอียด X'));
    expect(container!.querySelectorAll('tr')[1].textContent).toContain('กรอกราคาเอง (บาทต่อหน่วย)');
  });
});
