// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AssetsModal from '../AssetsModal';
import { click, key, q } from '@/test-utils/dom';
import { mkAsset, mkPortfolio, trade } from './fixtures';
import type { PortfolioAsset } from '@/types';

const h = vi.hoisted(() => ({
  portfolio: null as unknown,
  saveAsset: vi.fn(),
  deleteAsset: vi.fn(),
  setManualPrice: vi.fn(),
  previewPrice: vi.fn(),
}));
vi.mock('@/context/PortfolioContext', () => ({
  usePortfolio: () => ({ portfolio: h.portfolio, saveAsset: h.saveAsset, deleteAsset: h.deleteAsset, setManualPrice: h.setManualPrice }),
}));
vi.mock('@/services/api', () => ({ portfolioService: { previewPrice: h.previewPrice } }));

const onClose = vi.fn();
let root: Root | null = null;
let container: HTMLElement | null = null;
const ui = (close = onClose) => <AssetsModal onClose={close} />;
const mount = (assets: PortfolioAsset[] | null = []) => {
  h.portfolio = assets ? mkPortfolio(assets) : null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui()));
};
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const dialog = () => q('[role="dialog"]')!;
const nav = () => q('nav')!;
const listButtons = () => [...nav().querySelectorAll<HTMLButtonElement>('ul button')];
const newBtn = () => [...nav().querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.includes('เพิ่มสินทรัพย์ใหม่'))!;
const section = () => q('section')!;
const heading = () => section().querySelector('h4')!.textContent;
const notice = () => section().querySelector('[role="status"]')?.textContent ?? null;
const kindBtn = (label: string) => [...section().querySelectorAll<HTMLButtonElement>('fieldset button')].find(b => b.textContent!.includes(label))!;
const submitBtn = () => section().querySelector<HTMLButtonElement>('button[type="submit"]')!;
const deleteBtn = () => [...section().querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'ลบสินทรัพย์' || b.textContent === 'กดอีกครั้งเพื่อยืนยัน')!;
const pressedKind = () => [...section().querySelectorAll('fieldset button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.querySelector('span')!.textContent);

const gold = () => mkAsset('g1', { name: 'ออมทอง', kind: 'gold_bar', unitLabel: 'บาททอง', units: 1.5, cost: 90000, trades: [trade('t1', '2026-01-01', 'buy', 1.5, 90000)] });
const aapl = () => mkAsset('s1', { name: 'Dime AAPL', kind: 'us_stock', symbol: 'AAPL', unitLabel: 'หุ้น', units: 0, cost: 0, trades: [] });
const sold = () => mkAsset('x1', { name: 'ขายหมดแล้ว', kind: 'crypto', symbol: 'bitcoin', units: 0, trades: [trade('t1', '2026-01-01', 'buy', 1, 10), trade('t2', '2026-02-01', 'sell', 1, 12)] });

beforeEach(() => {
  onClose.mockClear();
  h.saveAsset.mockReset().mockResolvedValue('id-1');
  h.deleteAsset.mockReset().mockResolvedValue(true);
  h.setManualPrice.mockReset().mockResolvedValue(true);
  h.previewPrice.mockReset().mockResolvedValue({ ok: true, price: 1, source: 's' });
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('AssetsModal asset list', () => {

  it('a held asset without a unit label shows just the number', () => {
    mount([mkAsset('a', { units: 3, unitLabel: null })]);
    expect(listButtons()[0].textContent).toContain('3');
    expect(listButtons()[0].textContent).not.toContain('undefined');
    expect(listButtons()[0].textContent).not.toContain('null');
  });

});

describe('AssetsModal saving', () => {
  it('after adding: confirms with the name and gives a fresh blank form for the next one', async () => {
    mount([]);
    click(kindBtn('กองทุน'));
    click(submitBtn());
    await flush();
    expect(h.saveAsset).toHaveBeenCalledWith({ id: undefined, name: 'กองทุน', kind: 'fund', symbol: null, unit_label: 'หน่วย' });
    expect(notice()).toBe('เพิ่ม "กองทุน" แล้ว เพิ่มตัวต่อไปได้เลย');
    expect(pressedKind()).toEqual(['หุ้นสหรัฐ']); // form was remounted
    expect(heading()).toBe('เพิ่มสินทรัพย์ใหม่');
  });

  it('after editing: confirms and stays on the same asset', async () => {
    mount([aapl()]);
    click(listButtons()[0]);
    click(submitBtn());
    await flush();
    expect(h.saveAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', name: 'Dime AAPL' }));
    expect(notice()).toBe('บันทึก "Dime AAPL" แล้ว');
    expect(heading()).toBe('แก้ไข: Dime AAPL');
  });

  it('a failed save shows no confirmation', async () => {
    h.saveAsset.mockResolvedValue(undefined);
    mount([aapl()]);
    click(listButtons()[0]);
    click(submitBtn());
    await flush();
    expect(notice()).toBeNull();
  });

});

describe('AssetsModal deleting', () => {
  it('a deleted asset sends you back to "add new" and clears any message', async () => {
    mount([aapl()]);
    click(listButtons()[0]);
    click(submitBtn());
    await flush();
    expect(notice()).not.toBeNull();
    click(deleteBtn());
    click(deleteBtn());
    await flush();
    expect(h.deleteAsset).toHaveBeenCalledWith('s1');
    expect(heading()).toBe('เพิ่มสินทรัพย์ใหม่');
    expect(newBtn().getAttribute('aria-current')).toBe('true');
    expect(notice()).toBeNull();
  });

  it('a refused delete leaves the asset selected', async () => {
    h.deleteAsset.mockResolvedValue(false);
    mount([aapl()]);
    click(listButtons()[0]);
    click(deleteBtn());
    click(deleteBtn());
    await flush();
    expect(heading()).toBe('แก้ไข: Dime AAPL');
  });
});

