// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AssetDetail from '../AssetDetail';
import { click, flush, key, q, type } from '@/test-utils/dom';
import { formatThaiDateShort } from '@/utils/formatters';
import { mkAsset, trade } from './fixtures';
import type { PortfolioAsset } from '@/types';

let setPrice: ReturnType<typeof vi.fn>;
let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (asset: PortfolioAsset, unit = 'หุ้น') => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<AssetDetail asset={asset} unit={unit} onSetPrice={setPrice as never} />));
};
const tile = (label: string) => [...container!.querySelectorAll('.bg-canvas')].find(d => d.firstElementChild?.textContent === label) as HTMLElement;
const tileValue = (label: string) => tile(label).children[1];
const tileSub = (label: string) => tile(label).children[2]?.textContent;
const priceInput = () => container!.querySelector<HTMLInputElement>('input[id^="price-"]')!;
const saveBtn = () => [...container!.querySelectorAll('button')].find(b => b.textContent === 'บันทึกราคา')!;
const errBox = () => container!.querySelector('[id^="price-err-"]');
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

beforeEach(() => { setPrice = vi.fn(async () => true); });
afterEach(() => {
  vi.useRealTimers();
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('AssetDetail warnings', () => {
  it('warns when more was sold than held', () => {
    mount(mkAsset('a', { oversold: true }));
    expect(container!.textContent).toContain('มีรายการขายมากกว่าจำนวนที่ถือ');
  });

  it('says nothing when the numbers add up', () => {
    mount(mkAsset('a', { oversold: false }));
    expect(container!.textContent).not.toContain('มีรายการขายมากกว่าจำนวนที่ถือ');
  });
});

describe('AssetDetail tiles', () => {
  it('held cost with its average per unit', () => {
    mount(mkAsset('a', { units: 4, cost: 4000, avgCostPerUnit: 1000 }), 'หุ้น');
    expect(tileValue('ต้นทุนที่ถืออยู่').textContent).toBe('4,000.00');
    expect(tileSub('ต้นทุนที่ถืออยู่')).toBe('เฉลี่ย 1,000.00 / หุ้น');
  });

  it('nothing held: a dash instead of a stale cost, and no average line', () => {
    mount(mkAsset('a', { units: 0, cost: 4000, avgCostPerUnit: null }));
    expect(tileValue('ต้นทุนที่ถืออยู่').textContent).toBe('–');
    expect(tileSub('ต้นทุนที่ถืออยู่')).toBeUndefined();
  });

  it('market value with the unit price, or a dash and "no price yet"', () => {
    mount(mkAsset('a', { marketValue: 5500, price: 1375 }), 'หุ้น');
    expect(tileValue('มูลค่าตอนนี้').textContent).toBe('5,500.00');
    expect(tileSub('มูลค่าตอนนี้')).toBe('1,375.00 / หุ้น');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { marketValue: null, price: null }));
    expect(tileValue('มูลค่าตอนนี้').textContent).toBe('–');
    expect(tileSub('มูลค่าตอนนี้')).toBe('ยังไม่มีราคา');
  });

  it('unrealised gain is signed, green and carries its percentage of cost', () => {
    mount(mkAsset('a', { unrealized: 1500, unrealizedPct: 37.5 }));
    const v = tileValue('กำไร/ขาดทุน (ยังไม่ขาย)');
    expect(v.textContent).toBe('+1,500.00');
    expect(v.classList.contains('text-income')).toBe(true);
    expect(tileSub('กำไร/ขาดทุน (ยังไม่ขาย)')).toBe('+37.50% ของต้นทุน');
  });

  it('unrealised loss: minus from the formatter, grey, percentage without plus', () => {
    mount(mkAsset('a', { unrealized: -200, unrealizedPct: -5 }));
    const v = tileValue('กำไร/ขาดทุน (ยังไม่ขาย)');
    expect(v.textContent).toBe('−200.00');
    expect(v.classList.contains('text-ink-soft')).toBe(true);
    expect(tileSub('กำไร/ขาดทุน (ยังไม่ขาย)')).toBe('-5.00% ของต้นทุน');
  });

  it('unrealised exactly zero: no plus anywhere', () => {
    mount(mkAsset('a', { unrealized: 0, unrealizedPct: 0 }));
    expect(tileValue('กำไร/ขาดทุน (ยังไม่ขาย)').textContent).toBe('0.00');
    expect(tileSub('กำไร/ขาดทุน (ยังไม่ขาย)')).toBe('0.00% ของต้นทุน');
    expect(tileValue('กำไร/ขาดทุน (ยังไม่ขาย)').classList.contains('text-ink-display')).toBe(true);
  });

  it('realised exactly zero after a sell: 0.00 without a plus', () => {
    mount(mkAsset('a', { realized: 0, trades: [trade('t1', '2026-01-01', 'buy', 1, 100), trade('t2', '2026-02-01', 'sell', 1, 100)] }));
    expect(tileValue('กำไร/ขาดทุน (ขายแล้ว)').textContent).toBe('0.00');
  });

  it('unrealised unknown: a dash and no percentage line', () => {
    mount(mkAsset('a', { unrealized: null, unrealizedPct: null }));
    expect(tileValue('กำไร/ขาดทุน (ยังไม่ขาย)').textContent).toBe('–');
    expect(tileSub('กำไร/ขาดทุน (ยังไม่ขาย)')).toBeUndefined();
  });

  it('realised: "never sold" while there are no sells', () => {
    mount(mkAsset('a', { realized: 0, trades: [trade('t1', '2026-01-01', 'buy', 1, 100)] }));
    expect(tileValue('กำไร/ขาดทุน (ขายแล้ว)').textContent).toBe('–');
    expect(tileSub('กำไร/ขาดทุน (ขายแล้ว)')).toBe('ยังไม่เคยขาย');
  });

  it('realised after selling: signed profit plus the number of sells and proceeds', () => {
    mount(mkAsset('a', {
      realized: 250,
      trades: [trade('t1', '2026-01-01', 'buy', 2, 1000), trade('t2', '2026-02-01', 'sell', 1, 750), trade('t3', '2026-03-01', 'sell', 1, 600)],
    }));
    const v = tileValue('กำไร/ขาดทุน (ขายแล้ว)');
    expect(v.textContent).toBe('+250.00');
    expect(v.classList.contains('text-income')).toBe(true);
    expect(tileSub('กำไร/ขาดทุน (ขายแล้ว)')).toBe('ขาย 2 ครั้ง · ได้เงิน 1,350.00');
  });

  it('a sold-at-a-loss position shows no plus and the soft grey', () => {
    mount(mkAsset('a', { realized: -50, trades: [trade('t1', '2026-01-01', 'buy', 1, 100), trade('t2', '2026-02-01', 'sell', 1, 50)] }));
    const v = tileValue('กำไร/ขาดทุน (ขายแล้ว)');
    expect(v.textContent).toBe('−50.00');
    expect(v.classList.contains('text-ink-soft')).toBe(true);
  });

  it('everything bought: total, number of buys and units', () => {
    mount(mkAsset('a', { trades: [trade('t1', '2026-01-01', 'buy', 1.5, 300), trade('t2', '2026-02-01', 'buy', 2, 500), trade('t3', '2026-03-01', 'sell', 1, 400)] }), 'เหรียญ');
    expect(tileValue('ซื้อทั้งหมด').textContent).toBe('800.00');
    expect(tileSub('ซื้อทั้งหมด')).toBe('2 ครั้ง · 3.5 เหรียญ');
  });

  it('no trades: zero bought, dash for holding time', () => {
    mount(mkAsset('a', { trades: [] }));
    expect(tileValue('ซื้อทั้งหมด').textContent).toBe('0.00');
    expect(tileValue('ถือมาแล้ว').textContent).toBe('–');
    expect(tileSub('ถือมาแล้ว')).toBeUndefined();
  });

  it('holding time counts from the first trade up to today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12, 0, 0));
    mount(mkAsset('a', { trades: [trade('t2', '2026-06-01', 'buy', 1, 10), trade('t1', '2025-08-08', 'buy', 1, 10)] }));
    expect(tileValue('ถือมาแล้ว').textContent).toBe('1 ปี 2 เดือน');
    expect(tileSub('ถือมาแล้ว')).toBe(`ซื้อครั้งแรก ${formatThaiDateShort('2025-08-08')}`);
  });
});

describe('AssetDetail trade history', () => {
  it('empty history explains where to record trades', () => {
    mount(mkAsset('a', { trades: [] }));
    expect(container!.textContent).toContain('ประวัติซื้อขาย (0)');
    expect(container!.textContent).toContain('ยังไม่มีรายการ — บันทึกที่หน้าฐานข้อมูลบัญชี');
    expect(container!.querySelector('table')).toBeNull();
  });

  const traded = () => mkAsset('a', {
    trades: [
      trade('t3', '2026-03-05', 'sell', 1, 700, 'ขายบางส่วน'),
      trade('t1', '2026-01-10', 'buy', 2, 1000),
      trade('t2', '2026-02-01', 'buy', 2, 1400, 'DCA'),
    ],
  });
  const bodyRows = () => [...container!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
  const rowCells = (r: HTMLTableRowElement) => [...r.querySelectorAll('td')].map(td => td.textContent);

  it('lists newest first with a running balance and the count in the heading', () => {
    mount(traded());
    expect(container!.textContent).toContain('ประวัติซื้อขาย (3)');
    const rows = bodyRows();
    expect(rows).toHaveLength(3);
    expect(rowCells(rows[0])[0]).toBe(formatThaiDateShort('2026-03-05'));
    expect(rowCells(rows[2])[0]).toBe(formatThaiDateShort('2026-01-10'));
    // balances after each trade: 2, 4, 3
    expect(rows.map(r => rowCells(r)[5])).toEqual(['3', '4', '2']);
  });

  it('buy and sell pills, units, unit price and signed amounts', () => {
    mount(traded());
    const [sell, , buy] = bodyRows();
    expect(rowCells(sell).slice(1, 5)).toEqual(['ขาย', '1', '700.00', '−700.00']);
    expect(rowCells(buy).slice(1, 5)).toEqual(['ซื้อ', '2', '500.00', '1,000.00']);
    expect(sell.querySelector('span')!.className).toContain('text-info');
    expect(buy.querySelector('span')!.className).toContain('text-savings');
  });

  it('profit column: a dash for buys, the realised profit for a sell', () => {
    mount(traded());
    const [sell, mid, buy] = bodyRows();
    // 2400 for 4 units = 600 avg; selling 1 unit for 700 -> +100
    expect(rowCells(buy)[6]).toBe('–');
    expect(rowCells(mid)[6]).toBe('–');
    expect(rowCells(sell)[6]).toBe('+100.00');
  });

  it('a profitable sell is signed and green; a losing sell is not red', () => {
    mount(mkAsset('a', { trades: [trade('t1', '2026-01-01', 'buy', 1, 100), trade('t2', '2026-02-01', 'sell', 1, 150), trade('t3', '2026-03-01', 'buy', 1, 100), trade('t4', '2026-04-01', 'sell', 1, 60)] }));
    const rows = bodyRows(); // newest first
    expect(rowCells(rows[0])[6]).toBe('−40.00');
    expect(rows[0].querySelectorAll('td')[6].classList.contains('text-ink-soft')).toBe(true);
    expect(rowCells(rows[2])[6]).toBe('+50.00');
    expect(rows[2].querySelectorAll('td')[6].classList.contains('text-income')).toBe(true);
  });

  it('notes: the text with a tooltip, a dash when empty', () => {
    mount(traded());
    const [sell, mid, buy] = bodyRows();
    expect(rowCells(sell)[7]).toBe('ขายบางส่วน');
    expect(sell.querySelectorAll('td')[7].getAttribute('title')).toBe('ขายบางส่วน');
    expect(rowCells(mid)[7]).toBe('DCA');
    expect(rowCells(buy)[7]).toBe('–');
  });

  it('follows a changed trade list for the same asset', () => {
    mount(traded());
    const more = { ...traded(), trades: [...traded().trades, trade('t9', '2026-04-01', 'buy', 1, 50, 'ใหม่')] };
    act(() => root!.render(<AssetDetail asset={more} unit="หุ้น" onSetPrice={setPrice as never} />));
    const rows = bodyRows();
    expect(rows).toHaveLength(4);
    expect(rowCells(rows[0])[7]).toBe('ใหม่');
    expect(container!.textContent).toContain('ประวัติซื้อขาย (4)');
    expect(rowCells(rows[0])[5]).toBe('4'); // balance after the new buy: 2 + 2 - 1 + 1
  });

  it('column header shows the unit', () => {
    mount(traded(), 'บาททอง');
    expect([...container!.querySelectorAll('th')].map(t => t.textContent)).toContain('ราคา/บาททอง');
  });
});

describe('AssetDetail manual price', () => {
  it('placeholder is an example when there is no price, else the current price', () => {
    mount(mkAsset('a', { price: null }));
    expect(priceInput().placeholder).toBe('เช่น 1,250.50');
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { price: 2500 }));
    expect(priceInput().placeholder).toBe('2,500.00');
  });

  it('label names the unit and is wired to the input', () => {
    mount(mkAsset('a1'), 'บาททอง');
    const label = container!.querySelector<HTMLLabelElement>('label[for="price-a1"]')!;
    expect(label.textContent).toContain('บาทต่อบาททอง');
    expect(priceInput().id).toBe('price-a1');
  });

  it('saves the typed number (commas allowed) and clears the box on success', async () => {
    mount(mkAsset('a1'));
    type(priceInput(), '1,250.50');
    click(saveBtn());
    await flush();
    expect(setPrice).toHaveBeenCalledWith('a1', 1250.5);
    expect(priceInput().value).toBe('');
    expect(errBox()).toBeNull();
  });

  it('Enter saves as well', async () => {
    mount(mkAsset('a1'));
    type(priceInput(), '99');
    key(priceInput(), 'Enter');
    await flush();
    expect(setPrice).toHaveBeenCalledWith('a1', 99);
  });

  it('other keys do not save', async () => {
    mount(mkAsset('a1'));
    type(priceInput(), '99');
    key(priceInput(), 'a');
    key(priceInput(), 'Escape');
    await flush();
    expect(setPrice).not.toHaveBeenCalled();
  });

  it.each([[''], ['abc'], ['0'], ['-5'], ['  ']])('rejects "%s" inline and does not call the API', async (v) => {
    mount(mkAsset('a1'));
    type(priceInput(), v);
    click(saveBtn());
    await flush();
    expect(setPrice).not.toHaveBeenCalled();
    expect(errBox()!.textContent).toContain('กรอกราคาเป็นตัวเลขที่มากกว่า 0');
    expect(priceInput().getAttribute('aria-invalid')).toBe('true');
    expect(priceInput().getAttribute('aria-describedby')).toBe('price-err-a1');
    expect(priceInput().className).toContain('tint-danger');
  });

  it('accepts a tiny positive price', async () => {
    mount(mkAsset('a1'));
    type(priceInput(), '0.0001');
    click(saveBtn());
    await flush();
    expect(setPrice).toHaveBeenCalledWith('a1', 0.0001);
  });

  it('typing again clears the error', async () => {
    mount(mkAsset('a1'));
    click(saveBtn());
    await flush();
    expect(errBox()).not.toBeNull();
    type(priceInput(), '5');
    expect(errBox()).toBeNull();
    expect(priceInput().hasAttribute('aria-invalid')).toBe(false);
    expect(priceInput().hasAttribute('aria-describedby')).toBe(false);
    expect(priceInput().className).not.toContain('tint-danger');
  });

  it('a failed save keeps what was typed and says so next to the field', async () => {
    setPrice = vi.fn(async () => false);
    mount(mkAsset('a1'));
    type(priceInput(), '77');
    click(saveBtn());
    await flush();
    expect(priceInput().value).toBe('77');
    expect(errBox()!.textContent).toContain('บันทึกราคาไม่สำเร็จ');
  });

  it('a later success clears an earlier failure message', async () => {
    setPrice = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount(mkAsset('a1'));
    type(priceInput(), '77');
    click(saveBtn());
    await flush();
    expect(errBox()).not.toBeNull();
    click(saveBtn());
    await flush();
    expect(errBox()).toBeNull();
    expect(priceInput().value).toBe('');
  });

  it('submits for the right asset after the asset prop changes', async () => {
    mount(mkAsset('a1'));
    act(() => root!.render(<AssetDetail asset={mkAsset('a2')} unit="หุ้น" onSetPrice={setPrice as never} />));
    type(q('input#price-a2'), '10');
    click(saveBtn());
    await flush();
    expect(setPrice).toHaveBeenCalledWith('a2', 10);
  });

  it('a number typed before the asset changed is saved for the new asset, not the old one', async () => {
    mount(mkAsset('a1'));
    type(q('input#price-a1'), '10');
    act(() => root!.render(<AssetDetail asset={mkAsset('a2')} unit="หุ้น" onSetPrice={setPrice as never} />));
    click(saveBtn());
    await flush();
    expect(setPrice).toHaveBeenCalledWith('a2', 10);
  });

  it('uses the latest save function when the parent hands over a new one', async () => {
    mount(mkAsset('a1'));
    type(priceInput(), '10');
    const next = vi.fn(async () => true);
    act(() => root!.render(<AssetDetail asset={mkAsset('a1')} unit="หุ้น" onSetPrice={next as never} />));
    click(saveBtn());
    await flush();
    expect(next).toHaveBeenCalledWith('a1', 10);
    expect(setPrice).not.toHaveBeenCalled();
  });
});

describe('AssetDetail price source note', () => {
  it('auto price: names the source', () => {
    mount(mkAsset('a', { autoPrice: true, priceSource: 'Yahoo Finance' }));
    expect(container!.textContent).toContain('ดึงอัตโนมัติจาก Yahoo Finance');
  });

  it('auto price without a recorded source falls back to a generic one', () => {
    mount(mkAsset('a', { autoPrice: true, priceSource: null }));
    expect(container!.textContent).toContain('ดึงอัตโนมัติจาก แหล่งข้อมูลออนไลน์');
  });

  it('manual-only kinds say so', () => {
    mount(mkAsset('a', { autoPrice: false, priceSource: 'manual' }));
    expect(container!.textContent).toContain('ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ');
    expect(container!.textContent).not.toContain('ดึงอัตโนมัติจาก');
  });

  it('shows how old the price is: muted when fresh, amber when over a day', () => {
    mount(mkAsset('a', { priceAt: hoursAgo(2) }));
    const fresh = [...container!.querySelectorAll('p')].find(p => p.textContent!.startsWith('ข้อมูล ณ'))!;
    expect(fresh.classList.contains('text-ink-muted')).toBe(true);
    act(() => root!.unmount()); container!.remove();
    mount(mkAsset('b', { priceAt: hoursAgo(50) }));
    const old = [...container!.querySelectorAll('p')].find(p => p.textContent!.startsWith('ข้อมูล ณ'))!;
    expect(old.classList.contains('text-warn')).toBe(true);
  });

  it('no timestamp, no age line', () => {
    mount(mkAsset('a', { priceAt: null }));
    expect([...container!.querySelectorAll('p')].some(p => p.textContent!.startsWith('ข้อมูล ณ'))).toBe(false);
  });
});
