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

describe('AssetsModal shell', () => {
  it('is a labelled modal dialog and takes focus', () => {
    mount();
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(dialog().getAttribute('aria-label')).toBe('จัดการสินทรัพย์ลงทุน');
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it('opens on "add new" with a blank form', () => {
    mount([gold()]);
    expect(newBtn().getAttribute('aria-current')).toBe('true');
    expect(listButtons()[0].getAttribute('aria-current')).toBe('false');
    expect(heading()).toBe('เพิ่มสินทรัพย์ใหม่');
    expect(section().getAttribute('aria-label')).toBe('เพิ่มสินทรัพย์ใหม่');
    expect(pressedKind()).toEqual(['หุ้นสหรัฐ']);
  });

  it('a portfolio that is still loading shows an empty list instead of crashing', () => {
    mount(null);
    expect(nav().textContent).toContain('สินทรัพย์ของฉัน (0)');
    expect(nav().textContent).toContain('ยังไม่มีสินทรัพย์');
  });

  it('empty portfolio: count 0 and a first-asset hint', () => {
    mount([]);
    expect(nav().textContent).toContain('สินทรัพย์ของฉัน (0)');
    expect(nav().textContent).toContain('เริ่มเพิ่มตัวแรกได้ที่ฟอร์มด้านขวา');
  });

  it('the hint disappears as soon as there are assets', () => {
    mount([gold()]);
    expect(nav().textContent).not.toContain('เริ่มเพิ่มตัวแรกได้ที่ฟอร์มด้านขวา');
    expect(nav().textContent).toContain('สินทรัพย์ของฉัน (1)');
  });
});

describe('AssetsModal asset list', () => {
  it('shows name, kind with symbol and what is held for each asset', () => {
    mount([gold(), aapl(), sold()]);
    const t = listButtons().map(b => b.textContent);
    expect(t[0]).toContain('ออมทอง');
    expect(t[0]).toContain('ทองคำแท่ง');
    expect(t[0]).toContain('1.5 บาททอง');
    expect(t[1]).toContain('หุ้นสหรัฐ · AAPL');
    expect(t[1]).toContain('ยังไม่มีรายการ');
    expect(t[2]).toContain('คริปโต · bitcoin');
    expect(t[2]).toContain('ขายหมด');
  });

  it('a held asset without a unit label shows just the number', () => {
    mount([mkAsset('a', { units: 3, unitLabel: null })]);
    expect(listButtons()[0].textContent).toContain('3');
    expect(listButtons()[0].textContent).not.toContain('undefined');
    expect(listButtons()[0].textContent).not.toContain('null');
  });

  it('every asset gets its own colour swatch from the shared palette', () => {
    mount([gold(), aapl(), sold()]);
    const colours = listButtons().map(b => b.querySelector<HTMLElement>('span[aria-hidden="true"]')!.style.backgroundColor);
    expect(new Set(colours).size).toBe(3);
    expect(colours.every(c => c.startsWith('rgb'))).toBe(true);
  });
});

describe('AssetsModal selecting', () => {
  it('picking an asset opens it for editing', () => {
    mount([gold(), aapl()]);
    click(listButtons()[0]);
    expect(heading()).toBe('แก้ไข: ออมทอง');
    expect(section().getAttribute('aria-label')).toBe('แก้ไข ออมทอง');
    expect(listButtons()[0].getAttribute('aria-current')).toBe('true');
    expect(newBtn().getAttribute('aria-current')).toBe('false');
    expect(pressedKind()).toEqual(['ทองคำแท่ง']);
    expect(q<HTMLInputElement>('#asset-name')!.value).toBe('ออมทอง');
  });

  it('switching assets loads the other one into the form', () => {
    mount([gold(), aapl()]);
    click(listButtons()[0]);
    click(listButtons()[1]);
    expect(heading()).toBe('แก้ไข: Dime AAPL');
    expect(q<HTMLInputElement>('#asset-name')!.value).toBe('Dime AAPL');
    expect(q<HTMLInputElement>('#asset-symbol')!.value).toBe('AAPL');
  });

  it('going back to "add new" gives a blank form again', () => {
    mount([gold()]);
    click(listButtons()[0]);
    click(newBtn());
    expect(heading()).toBe('เพิ่มสินทรัพย์ใหม่');
    expect(q<HTMLInputElement>('#asset-name')!.value).toBe('หุ้นสหรัฐ');
    expect(newBtn().getAttribute('aria-current')).toBe('true');
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

  it('the confirmation goes away when you pick something else', async () => {
    mount([aapl(), gold()]);
    click(listButtons()[0]);
    click(submitBtn());
    await flush();
    expect(notice()).not.toBeNull();
    click(listButtons()[1]);
    expect(notice()).toBeNull();
  });

  it('the add confirmation also goes away on picking "add new" again', async () => {
    mount([]);
    click(kindBtn('กองทุน'));
    click(submitBtn());
    await flush();
    expect(notice()).not.toBeNull();
    click(newBtn());
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

describe('AssetsModal closing', () => {
  it('Esc closes it', () => {
    mount();
    key(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('other keys do not', () => {
    mount();
    key(document.body, 'Enter');
    key(document.body, 'a');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc that something else already handled is left alone', () => {
    mount();
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('keydown', stop);
    key(document.body, 'Escape');
    document.removeEventListener('keydown', stop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc while a delete is armed only disarms it; a second Esc closes', () => {
    mount([aapl()]);
    click(listButtons()[0]);
    click(deleteBtn());
    expect(deleteBtn().textContent).toBe('กดอีกครั้งเพื่อยืนยัน');
    key(document.body, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
    expect(deleteBtn().textContent).toBe('ลบสินทรัพย์');
    key(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the listener is released on unmount', () => {
    mount();
    act(() => root!.unmount());
    root = null;
    key(document.body, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('follows a new onClose callback instead of calling the old one', () => {
    mount();
    const next = vi.fn();
    act(() => root!.render(ui(next)));
    key(document.body, 'Escape');
    expect(next).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the X button closes', () => {
    mount();
    click(dialog().querySelector('button[aria-label="ปิด"]'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancel in the form closes (new asset) as does the close button (existing asset)', () => {
    mount([aapl()]);
    click([...section().querySelectorAll('button')].find(b => b.textContent === 'ยกเลิก'));
    expect(onClose).toHaveBeenCalledTimes(1);
    click(listButtons()[0]);
    click([...section().querySelectorAll('button')].find(b => b.textContent === 'ปิด'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('pressing on the dark backdrop closes; pressing inside the panel does not', () => {
    mount();
    const backdrop = container!.firstElementChild as HTMLElement;
    act(() => { dialog().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
