// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import InvestFields, { InvestFieldsProps } from '../InvestFields';
import { click, type, key, q } from '@/test-utils/dom';
import type { PortfolioAsset } from '@/types';

const h = vi.hoisted(() => ({ ctx: { portfolio: null as unknown } }));
vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => h.ctx }));

const asset = (over: Partial<PortfolioAsset>): PortfolioAsset => ({
  id: 'a', name: 'x', kind: 'us_stock', symbol: null, unitLabel: null, autoPrice: false, units: 0, cost: 0, avgCostPerUnit: null,
  price: null, priceAt: null, priceSource: null, marketValue: null, unrealized: null, unrealizedPct: null, realized: 0, oversold: false, trades: [],
  ...over,
});
const GOLD = asset({ id: 'g1', name: 'ทองแท่ง', kind: 'gold_bar', unitLabel: 'บาททอง', price: 40000 });
const STOCK = asset({ id: 's1', name: 'AAPL', kind: 'us_stock', unitLabel: 'หุ้น', price: 200 });
const FUND = asset({ id: 'f1', name: 'กองทุน X', kind: 'fund', unitLabel: null, price: null });
const GRAMS = 15.244; // grams per baht of gold, as the app defines it

let root: Root;
let host: HTMLDivElement;
let props: InvestFieldsProps;
let setUnitsFromOutside: (v: string) => void;
const calls = () => ({
  asset: props.onAssetChange as ReturnType<typeof vi.fn>,
  side: props.onSideChange as ReturnType<typeof vi.fn>,
  units: props.onUnitsChange as ReturnType<typeof vi.fn>,
});

/** A form: it keeps what the field reports (as react-hook-form does) and hands it back; a changed `units` prop is an outside change. */
function Form({ init }: { init: InvestFieldsProps }) {
  const [units, setUnits] = useState(init.units);
  setUnitsFromOutside = setUnits;
  useEffect(() => { setUnits(init.units); }, [init.units]);
  // a stable callback, as a real form passes: a new one every render would re-run the editor's effects and hide stale dependencies
  const report = useRef(init.onUnitsChange);
  report.current = init.onUnitsChange;
  const onUnitsChange = useCallback((v: string) => { report.current(v); setUnits(v); }, []);
  return <InvestFields {...init} units={units} onUnitsChange={onUnitsChange} />;
}

const render = (over: Partial<InvestFieldsProps> = {}) => {
  props = { ...props, ...over };
  act(() => root.render(<Form init={props} />));
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn(); // the dropdown list scrolls its active row into view; jsdom has no layout
  h.ctx = { portfolio: { assets: [GOLD, STOCK, FUND] } };
  props = {
    assetId: '', side: 'buy', units: '', amount: undefined,
    onAssetChange: vi.fn(), onSideChange: vi.fn(), onUnitsChange: vi.fn(), onEnter: undefined, unitsError: undefined, idPrefix: 'inv',
  };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

const unitsInput = () => q<HTMLInputElement>('#inv-units')!;
const priceInput = () => q<HTMLInputElement>('#inv-price')!;
const label = (id: string) => q(`label[for="${id}"]`)!.textContent;
const note = () => host.textContent!;
const unitToggle = () => [...document.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="หน่วยของทอง"] button')];
const sideButtons = () => [...document.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="ซื้อหรือขาย"] button')];
const lastUnits = () => calls().units.mock.calls.at(-1)?.[0];

describe('InvestFields — the asset and the side', () => {
  it('lists "ออมทั่วไป" first, then the assets, and reports the one picked', () => {
    render();
    click(q('button[aria-label="สินทรัพย์"]'));
    const opts = [...document.querySelectorAll('[role="option"]')];
    expect(opts.map(o => o.textContent)).toEqual(['ออมทั่วไป (ไม่ผูกสินทรัพย์)', 'ทองแท่ง', 'AAPL', 'กองทุน X']);
    click(opts[2]);
    expect(calls().asset).toHaveBeenCalledWith('s1');
    click(q('button[aria-label="สินทรัพย์"]'));
    click(document.querySelectorAll('[role="option"]')[0]);
    expect(calls().asset).toHaveBeenLastCalledWith('');
  });

  it('shows the current asset on the dropdown', () => {
    render({ assetId: 's1' });
    expect(q('button[aria-label="สินทรัพย์"]')!.textContent).toBe('AAPL');
    render({ assetId: '' });
    expect(q('button[aria-label="สินทรัพย์"]')!.textContent).toBe('ออมทั่วไป (ไม่ผูกสินทรัพย์)');
  });

  it('works before the portfolio has loaded (only the general option)', () => {
    h.ctx = { portfolio: null };
    render();
    click(q('button[aria-label="สินทรัพย์"]'));
    expect([...document.querySelectorAll('[role="option"]')].map(o => o.textContent)).toEqual(['ออมทั่วไป (ไม่ผูกสินทรัพย์)']);
  });

  it('buy / sell: pressed state follows the side, a click reports the other', () => {
    render({ side: 'buy' });
    expect(sideButtons().map(b => b.textContent)).toEqual(['ซื้อ', 'ขาย']);
    expect(sideButtons().map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    click(sideButtons()[1]);
    expect(calls().side).toHaveBeenCalledWith('sell');
    click(sideButtons()[0]);
    expect(calls().side).toHaveBeenLastCalledWith('buy');
    render({ side: 'sell' });
    expect(sideButtons().map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });

  it('sell is blue and buy is the savings green when lit', () => {
    render({ side: 'sell' });
    expect(sideButtons()[1].classList.contains('text-info')).toBe(true);
    render({ side: 'buy' });
    expect(sideButtons()[0].classList.contains('text-savings')).toBe(true);
  });

  it('a sale explains what it does to the savings total; a purchase does not', () => {
    render({ side: 'sell' });
    expect(note()).toContain('ขาย = เงินกลับเข้ามา');
    render({ side: 'buy' });
    expect(note()).not.toContain('ขาย = เงินกลับเข้ามา');
  });

  it('with no asset (or an unknown one) there are no unit fields', () => {
    render({ assetId: '' });
    expect(unitsInput()).toBeNull();
    render({ assetId: 'gone' });
    expect(unitsInput()).toBeNull();
  });
});

describe('InvestFields — a stock-like asset', () => {
  it('labels both fields with the asset\'s own unit, and the side', () => {
    render({ assetId: 's1', side: 'buy' });
    expect(label('inv-units')).toBe('จำนวนหุ้นที่ได้มา');
    expect(label('inv-price')).toBe('ราคาต่อหุ้น (฿)');
    render({ side: 'sell' });
    expect(label('inv-units')).toBe('จำนวนหุ้นที่ขายไป');
  });

  it('falls back to "หน่วย" when the asset has no unit name', () => {
    render({ assetId: 'f1' });
    expect(label('inv-units')).toBe('จำนวนหน่วยที่ได้มา');
    expect(label('inv-price')).toBe('ราคาต่อหน่วย (฿)');
  });

  it('has no gold unit switch', () => {
    render({ assetId: 's1' });
    expect(unitToggle()).toHaveLength(0);
  });

  it('typing units reports them as typed; letters and extra symbols are dropped', () => {
    render({ assetId: 's1' });
    type(unitsInput(), '2.5');
    expect(lastUnits()).toBe('2.5');
    type(unitsInput(), 'a1b.5c-');
    expect(unitsInput().value).toBe('1.5');
    expect(lastUnits()).toBe('1.5');
  });

  it('clearing the units reports an empty value', () => {
    render({ assetId: 's1', units: '3' });
    type(unitsInput(), '');
    expect(lastUnits()).toBe('');
  });

  it('shows the units it was given', () => {
    render({ assetId: 's1', units: '2.5' });
    expect(unitsInput().value).toBe('2.5');
  });

  it('shows the price per unit once the amount and units are both there', () => {
    render({ assetId: 's1', units: '2.5', amount: 500 });
    expect(priceInput().value).toBe('200');
    render({ amount: 777.77 });
    expect(priceInput().value).toBe('311.11');
  });

  it('no price without an amount or without units', () => {
    render({ assetId: 's1', units: '2.5' });
    expect(priceInput().value).toBe('');
    render({ units: '', amount: 500 });
    expect(priceInput().value).toBe('');
    render({ units: '2.5', amount: 0 });
    expect(priceInput().value).toBe('');
  });

  it('compares with the market: above, below, and exactly equal', () => {
    render({ assetId: 's1', units: '2', amount: 500 }); // 250 vs 200 → +25%
    expect(note()).toContain('ตลาดล่าสุด ฿200.00 ต่อหุ้น · ที่กรอกสูงกว่า 25.0%');
    render({ units: '5', amount: 500 }); // 100 vs 200 → -50%
    expect(note()).toContain('ที่กรอกต่ำกว่า 50.0%');
    render({ units: '2.5', amount: 500 }); // 200 vs 200
    expect(note()).toContain('ที่กรอกสูงกว่า 0.0%');
  });

  it('...but not without a market price, or without a price per unit', () => {
    render({ assetId: 'f1', units: '2', amount: 500 });
    expect(note()).not.toContain('ตลาดล่าสุด');
    render({ assetId: 's1', units: '', amount: 500 });
    expect(note()).not.toContain('ตลาดล่าสุด');
  });

  it('warns when the price is more than 3× off the market (wrong unit or amount)', () => {
    render({ assetId: 's1', units: '2.5', amount: 5000 }); // 2000 vs 200
    expect(note()).toContain('ห่างจากตลาดมาก ตรวจหน่วยและจำนวนเงินอีกครั้ง');
    const line = [...document.querySelectorAll('p')].find(p => p.textContent!.includes('ตลาดล่าสุด'))!;
    expect(line.classList.contains('text-warn')).toBe(true);
    render({ units: '2.5', amount: 100 }); // 40 vs 200: more than 3× below
    expect(note()).toContain('ห่างจากตลาดมาก');
    render({ units: '2.5', amount: 1400 }); // 560 vs 200: under 3× → no warning
    expect(note()).not.toContain('ห่างจากตลาดมาก');
    expect([...document.querySelectorAll('p')].find(p => p.textContent!.includes('ตลาดล่าสุด'))!.classList.contains('text-warn')).toBe(false);
  });

  it('the line "ตลาดล่าสุด" is quiet when the price is reasonable', () => {
    render({ assetId: 's1', units: '2', amount: 500 });
    const line = [...document.querySelectorAll('p')].find(p => p.textContent!.includes('ตลาดล่าสุด'))!;
    expect(line.classList.contains('text-ink-muted')).toBe(true);
  });
});

describe('InvestFields — entering the price instead of the units', () => {
  it('typing a price works out the units from the amount, and reports them', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '100');
    expect(priceInput().value).toBe('100');
    expect(unitsInput().value).toBe('5');
    expect(lastUnits()).toBe('5');
  });

  it('...and follows the amount while the price stays', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '100');
    render({ amount: 1000 });
    expect(unitsInput().value).toBe('10');
    expect(lastUnits()).toBe('10');
  });

  it('the price field only takes digits and a dot', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '1x0,0');
    expect(priceInput().value).toBe('100');
  });

  it('without an amount it asks for one, and reports no units', () => {
    render({ assetId: 's1' });
    type(priceInput(), '100');
    expect(note()).toContain('กรอกจำนวนเงินด้วย ระบบจะคำนวณจำนวนหุ้นจากราคาที่กรอก');
    expect(lastUnits()).toBe('');
    render({ amount: 0 });
    expect(note()).toContain('กรอกจำนวนเงินด้วย');
    render({ amount: 500 });
    expect(note()).not.toContain('กรอกจำนวนเงินด้วย');
  });

  it('a zero or empty price gives no units', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '0');
    expect(lastUnits()).toBe('');
    type(priceInput(), '');
    expect(lastUnits()).toBe('');
  });

  it('typing units afterwards leaves price mode: the price field shows the one worked out', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '100');
    type(unitsInput(), '2');
    expect(priceInput().value).toBe('250');
    expect(lastUnits()).toBe('2');
    expect(note()).not.toContain('กรอกจำนวนเงินด้วย');
  });

  it('the amount is ignored while units are being typed (no price mode)', () => {
    render({ assetId: 's1', amount: 500 });
    type(unitsInput(), '2');
    render({ amount: 1000 });
    expect(unitsInput().value).toBe('2');
    expect(lastUnits()).toBe('2');
  });
});

describe('InvestFields — gold (grams in, baht-weight out)', () => {
  it('starts in grams, with the switch showing which is on', () => {
    render({ assetId: 'g1' });
    expect(label('inv-units')).toBe('จำนวนกรัมที่ได้มา');
    expect(label('inv-price')).toBe('ราคาต่อกรัม (฿)');
    expect(unitToggle().map(b => b.textContent)).toEqual(['กรัม', 'บาททอง']);
    expect(unitToggle().map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(unitsInput().placeholder).toBe('เช่น 0.2393');
    expect(priceInput().placeholder).toBe('กรอกราคา → คำนวณจำนวนกรัมให้');
  });

  it('grams typed are reported as baht-weight, which is what the system stores', () => {
    render({ assetId: 'g1' });
    type(unitsInput(), String(GRAMS));
    expect(lastUnits()).toBe('1');
    type(unitsInput(), '7.622');
    expect(lastUnits()).toBe('0.5');
  });

  it('shows the baht-weight equivalent under the grams', () => {
    render({ assetId: 'g1' });
    type(unitsInput(), String(GRAMS));
    expect(note()).toContain(`= 1 บาททอง (1 บาททอง = ${GRAMS} กรัม)`);
  });

  it('no equivalent line without units, or in baht-weight mode', () => {
    render({ assetId: 'g1' });
    expect(note()).not.toContain('= ');
    type(unitsInput(), '5');
    click(unitToggle()[1]);
    expect(note()).not.toContain('1 บาททอง =');
  });

  it('a saved baht-weight amount is shown in grams', () => {
    render({ assetId: 'g1', units: '2' });
    expect(unitsInput().value).toBe(String(+(2 * GRAMS).toFixed(6)));
  });

  it('switching to baht-weight converts what is typed, and the labels follow', () => {
    render({ assetId: 'g1' });
    type(unitsInput(), String(GRAMS * 2));
    click(unitToggle()[1]);
    expect(unitsInput().value).toBe('2');
    expect(label('inv-units')).toBe('จำนวนบาททองที่ได้มา');
    expect(label('inv-price')).toBe('ราคาต่อบาททอง (฿)');
    expect(unitToggle().map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    expect(unitsInput().placeholder).toBe('เช่น 0.0234');
    expect(lastUnits()).toBe('2'); // the stored value is the same either way
  });

  it('switching back converts again, and clicking the mode already on changes nothing', () => {
    render({ assetId: 'g1' });
    type(unitsInput(), String(GRAMS));
    click(unitToggle()[1]);
    click(unitToggle()[1]);
    expect(unitsInput().value).toBe('1');
    click(unitToggle()[0]);
    expect(unitsInput().value).toBe(String(GRAMS));
    expect(lastUnits()).toBe('1');
  });

  it('typing baht-weight is reported as it is', () => {
    render({ assetId: 'g1' });
    click(unitToggle()[1]);
    type(unitsInput(), '0.5');
    expect(lastUnits()).toBe('0.5');
  });

  it('price mode in grams: units come from amount ÷ price per gram', () => {
    render({ assetId: 'g1', amount: 15244 });
    type(priceInput(), '1000'); // 15.244 g
    expect(unitsInput().value).toBe(String(GRAMS));
    expect(lastUnits()).toBe('1');
  });

  it('switching unit in price mode converts the price (per gram ↔ per baht-weight) and keeps the units', () => {
    render({ assetId: 'g1', amount: 15244 });
    type(priceInput(), '1000'); // per gram
    click(unitToggle()[1]);
    expect(priceInput().value).toBe('15244');
    expect(unitsInput().value).toBe('1');
    expect(lastUnits()).toBe('1');
    click(unitToggle()[0]);
    expect(priceInput().value).toBe('1000');
    expect(lastUnits()).toBe('1');
  });

  it('compares per gram with the market per gram', () => {
    render({ assetId: 'g1', units: '1', amount: 40000 }); // 15.244 g for 40,000 → 2,624.0 per gram = market
    expect(note()).toContain('ต่อกรัม · ที่กรอกสูงกว่า 0.0%');
    expect(note()).toContain(`ตลาดล่าสุด ฿${(40000 / GRAMS).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ต่อกรัม`);
  });

  it('...and per baht-weight in that mode', () => {
    render({ assetId: 'g1', units: '1', amount: 40000 });
    click(unitToggle()[1]);
    expect(note()).toContain('ตลาดล่าสุด ฿40,000.00 ต่อบาททอง');
  });

  it('a gram price mistaken for a baht-weight price is flagged', () => {
    render({ assetId: 'g1', units: '1', amount: 2624 }); // 2,624 per gram typed as the price of a whole baht-weight
    click(unitToggle()[1]); // per baht-weight: 2,624 vs 40,000 → far below
    expect(note()).toContain('ห่างจากตลาดมาก');
  });
});

describe('InvestFields — fine print', () => {
  it('units are reported with up to 8 decimals', () => {
    render({ assetId: 'g1' });
    type(unitsInput(), '1'); // one gram = 0.06559958… baht-weight
    expect(lastUnits()).toBe('0.06559958');
  });

  it('a price typed with a trailing dot stays as typed (it is not rewritten from the units)', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '100.');
    expect(priceInput().value).toBe('100.');
  });

  it('a price converted between grams and baht-weight keeps 4 decimals', () => {
    render({ assetId: 'g1', amount: 1000 });
    type(priceInput(), '33.33');
    click(unitToggle()[1]);
    expect(priceInput().value).toBe('508.0825'); // 33.33 × 15.244 = 508.08252
  });

  it('the pressed unit button is the lit one', () => {
    render({ assetId: 'g1' });
    expect(unitToggle()[0].classList.contains('bg-surface-elevated')).toBe(true);
    expect(unitToggle()[1].classList.contains('bg-surface-elevated')).toBe(false);
    click(unitToggle()[1]);
    expect(unitToggle()[1].classList.contains('bg-surface-elevated')).toBe(true);
    expect(unitToggle()[0].classList.contains('bg-surface-elevated')).toBe(false);
  });

  it('a negative amount counts as no amount', () => {
    render({ assetId: 's1', amount: -5 });
    type(priceInput(), '100');
    expect(note()).toContain('กรอกจำนวนเงินด้วย');
    expect(lastUnits()).toBe('');
  });

  it('the asset list follows the portfolio when it loads after the form is shown', () => {
    h.ctx = { portfolio: null };
    render();
    h.ctx = { portfolio: { assets: [GOLD, STOCK] } };
    render({ side: 'sell' }); // any re-render picks up the loaded portfolio
    click(q('button[aria-label="สินทรัพย์"]'));
    expect([...document.querySelectorAll('[role="option"]')].map(o => o.textContent)).toEqual(['ออมทั่วไป (ไม่ผูกสินทรัพย์)', 'ทองแท่ง', 'AAPL']);
  });
});

describe('InvestFields — following the form', () => {
  it('a reset from outside empties the fields', () => {
    render({ assetId: 's1', units: '2.5', amount: 500 });
    expect(unitsInput().value).toBe('2.5');
    render({ units: '', amount: undefined });
    expect(unitsInput().value).toBe('');
    expect(priceInput().value).toBe('');
  });

  it('...even out of price mode (a form reset clears the amount and the units in one go)', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '100');
    expect(unitsInput().value).toBe('5');
    act(() => { setUnitsFromOutside(''); root.render(<Form init={{ ...props, amount: undefined }} />); });
    expect(unitsInput().value).toBe('');
    expect(priceInput().value).toBe('');
    expect(note()).not.toContain('กรอกจำนวนเงินด้วย');
  });

  it('a record loaded from outside fills the units (gold in grams)', () => {
    render({ assetId: 'g1', units: '' });
    render({ units: '3' });
    expect(unitsInput().value).toBe(String(+(3 * GRAMS).toFixed(6)));
  });

  it('what the form is handed back is not mistaken for an outside change', () => {
    render({ assetId: 's1' });
    type(unitsInput(), '1.50'); // the form stores "1.5" (what we reported) and hands it back
    expect(lastUnits()).toBe('1.5');
    expect(unitsInput().value).toBe('1.50'); // not rewritten under the cursor
  });

  it('a different asset starts a fresh editor', () => {
    render({ assetId: 's1', amount: 500 });
    type(priceInput(), '100');
    act(() => { setUnitsFromOutside(''); root.render(<Form init={{ ...props, assetId: 'f1' }} />); });
    expect(priceInput().value).toBe('');
    expect(label('inv-units')).toBe('จำนวนหน่วยที่ได้มา');
  });

  it('switching to gold starts in grams', () => {
    render({ assetId: 's1', units: '' });
    render({ assetId: 'g1' });
    expect(label('inv-units')).toBe('จำนวนกรัมที่ได้มา');
  });
});

describe('InvestFields — Enter, errors, ids', () => {
  it('Enter in either field runs onEnter and is swallowed; other keys are left alone', () => {
    const onEnter = vi.fn();
    render({ assetId: 's1', onEnter });
    key(unitsInput(), 'Enter');
    key(priceInput(), 'Enter');
    expect(onEnter).toHaveBeenCalledTimes(2);
    key(unitsInput(), 'a');
    expect(onEnter).toHaveBeenCalledTimes(2);
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => { unitsInput().dispatchEvent(e); });
    expect(e.defaultPrevented).toBe(true);
  });

  it('Enter without onEnter does nothing (and is not swallowed)', () => {
    render({ assetId: 's1' });
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => { unitsInput().dispatchEvent(e); });
    expect(e.defaultPrevented).toBe(false);
  });

  it('shows the units error next to the field, linked for screen readers', () => {
    render({ assetId: 's1', unitsError: 'ใส่จำนวนหุ้น' });
    expect(unitsInput().getAttribute('aria-invalid')).toBe('true');
    expect(unitsInput().getAttribute('aria-describedby')).toBe('inv-units-err');
    expect(q('#inv-units-err')!.textContent).toBe('ใส่จำนวนหุ้น');
    render({ unitsError: undefined });
    expect(unitsInput().getAttribute('aria-invalid')).toBe('false');
    expect(unitsInput().hasAttribute('aria-describedby')).toBe(false);
    expect(q('#inv-units-err')).toBeNull();
  });

  it('ids come from the prefix, so two forms on a page do not clash', () => {
    render({ assetId: 's1', idPrefix: 'daily' });
    expect(q('#daily-units')).not.toBeNull();
    expect(q('#daily-price')).not.toBeNull();
    expect(q('label[for="daily-units"]')).not.toBeNull();
  });

  it('both fields are decimal text inputs', () => {
    render({ assetId: 's1' });
    for (const i of [unitsInput(), priceInput()]) { expect(i.type).toBe('text'); expect(i.inputMode).toBe('decimal'); }
  });
});
