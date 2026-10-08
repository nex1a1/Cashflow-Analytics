// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AssetForm from '../AssetForm';
import { click, type, q } from '@/test-utils/dom';
import { mkAsset, trade } from './fixtures';
import type { PortfolioAsset } from '@/types';

const h = vi.hoisted(() => ({
  saveAsset: vi.fn(),
  deleteAsset: vi.fn(),
  setManualPrice: vi.fn(),
  previewPrice: vi.fn(),
}));
vi.mock('@/context/PortfolioContext', () => ({
  usePortfolio: () => ({ saveAsset: h.saveAsset, deleteAsset: h.deleteAsset, setManualPrice: h.setManualPrice }),
}));
vi.mock('@/services/api', () => ({ portfolioService: { previewPrice: h.previewPrice } }));

const onSaved = vi.fn();
const onDeleted = vi.fn();
const onCancel = vi.fn();

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (asset: PortfolioAsset | null = null) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<AssetForm asset={asset} onSaved={onSaved} onDeleted={onDeleted} onCancel={onCancel} />));
};
/** Fake clock: advance it and let the promises it releases settle. */
const tick = async (ms = 0) => { await act(async () => { vi.advanceTimersByTime(ms); }); };

const kindBtn = (label: string) => [...container!.querySelectorAll<HTMLButtonElement>('fieldset button')].find(b => b.textContent!.includes(label))!;
const pressed = () => [...container!.querySelectorAll('fieldset button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.querySelector('span')!.textContent);
const symbol = () => q<HTMLInputElement>('#asset-symbol');
const nameInput = () => q<HTMLInputElement>('#asset-name')!;
const unitInput = () => q<HTMLInputElement>('#asset-unit')!;
const priceInput = () => q<HTMLInputElement>('#asset-price');
const submitBtn = () => container!.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const preview = () => container!.querySelector('[aria-live="polite"]')!.textContent ?? '';
const submit = async () => { click(submitBtn()); await tick(); };
const deleteBtn = () => [...container!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'ลบสินทรัพย์' || b.textContent === 'กดอีกครั้งเพื่อยืนยัน')!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  h.saveAsset.mockReset().mockResolvedValue('new-id');
  h.deleteAsset.mockReset().mockResolvedValue(true);
  h.setManualPrice.mockReset().mockResolvedValue(true);
  h.previewPrice.mockReset().mockResolvedValue({ ok: true, price: 123.45, source: 'Yahoo Finance' });
  onSaved.mockClear(); onDeleted.mockClear(); onCancel.mockClear();
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('AssetForm defaults for a new asset', () => {
  it('starts as a US stock with the stock unit, a symbol box and no auto-fetched price yet', () => {
    mount();
    expect(pressed()).toEqual(['หุ้นสหรัฐ']);
    expect(unitInput().value).toBe('หุ้น');
    expect(symbol()).not.toBeNull();
    expect(symbol()!.value).toBe('');
    expect(symbol()!.placeholder).toBe('เช่น AAPL');
    expect(submitBtn().textContent).toBe('เพิ่มสินทรัพย์');
    expect(container!.textContent).toContain('ยกเลิก');
    expect(container!.textContent).toContain('เพิ่มสินทรัพย์แล้ว ไปบันทึกซื้อที่หน้า');
  });

  it('the name suggests itself: the kind label first, then the symbol as it is typed', () => {
    mount();
    expect(nameInput().value).toBe('หุ้นสหรัฐ');
    type(symbol(), 'aapl');
    expect(nameInput().value).toBe('AAPL');
  });

  it('lists all seven kinds, each saying whether its price is automatic', () => {
    mount();
    const btns = [...container!.querySelectorAll('fieldset button')];
    expect(btns.map(b => b.querySelector('span')!.textContent)).toEqual(['ทองคำแท่ง', 'ทองรูปพรรณ', 'หุ้นสหรัฐ', 'หุ้นไทย', 'คริปโต', 'กองทุน', 'อื่นๆ']);
    const modes = btns.map(b => b.querySelectorAll('span')[1].textContent);
    expect(modes).toEqual(['ราคาอัตโนมัติ', 'ราคาอัตโนมัติ', 'ราคาอัตโนมัติ', 'ราคาอัตโนมัติ', 'ราคาอัตโนมัติ', 'กรอกราคาเอง', 'กรอกราคาเอง']);
  });

  it('shows the blurb of the selected kind', () => {
    mount();
    expect(container!.textContent).toContain('หุ้นและ ETF สหรัฐ');
    click(kindBtn('กองทุน'));
    expect(container!.textContent).toContain('กองทุนรวม ไม่มีแหล่งราคาฟรี');
  });
});

describe('AssetForm picking a kind', () => {
  it('a default unit follows the kind (หุ้น -> บาททอง), a custom unit stays', () => {
    mount();
    click(kindBtn('ทองคำแท่ง'));
    expect(unitInput().value).toBe('บาททอง');
    type(unitInput(), 'กรัมทอง');
    click(kindBtn('คริปโต'));
    expect(unitInput().value).toBe('กรัมทอง');
  });

  it('an emptied unit gets the new default', () => {
    mount();
    type(unitInput(), '');
    click(kindBtn('คริปโต'));
    expect(unitInput().value).toBe('เหรียญ');
  });

  it('switching kind drops the symbol (it belongs to the old kind) and clears errors', async () => {
    mount();
    type(symbol(), 'AAPL');
    click(kindBtn('คริปโต'));
    expect(symbol()!.value).toBe('');
    // raise a symbol error, then switch: error goes away
    await submit();
    expect(container!.textContent).toContain('ระบุสัญลักษณ์');
    click(kindBtn('หุ้นไทย'));
    expect(container!.textContent).not.toContain('ระบุสัญลักษณ์ ไม่งั้น');
  });

  it('clicking the already selected kind changes nothing (symbol kept)', () => {
    mount();
    type(symbol(), 'AAPL');
    click(kindBtn('หุ้นสหรัฐ'));
    expect(symbol()!.value).toBe('AAPL');
  });

  it('only kinds that need a symbol show the symbol field', () => {
    mount();
    for (const [label, needs] of [['ทองคำแท่ง', false], ['ทองรูปพรรณ', false], ['หุ้นไทย', true], ['คริปโต', true], ['กองทุน', false], ['อื่นๆ', false], ['หุ้นสหรัฐ', true]] as const) {
      click(kindBtn(label));
      expect(symbol() !== null, label).toBe(needs);
    }
  });

  it('crypto labels the field with CoinGecko id, stocks with สัญลักษณ์', () => {
    mount();
    expect(q('label[for="asset-symbol"]')!.textContent).toBe('สัญลักษณ์');
    click(kindBtn('คริปโต'));
    expect(q('label[for="asset-symbol"]')!.textContent).toBe('CoinGecko id');
    expect(symbol()!.placeholder).toBe('เช่น bitcoin');
  });

  it('the unit hint mentions grams only for gold', () => {
    mount();
    expect(container!.textContent).toContain('ใช้แสดงจำนวนที่ถือ');
    click(kindBtn('ทองรูปพรรณ'));
    expect(container!.textContent).toContain('กรอกเป็นกรัมได้ตอนบันทึกซื้อ');
  });
});

describe('AssetForm symbol handling', () => {
  it('US and Thai stocks are upper-cased with spaces removed', () => {
    mount();
    type(symbol(), ' aa pl ');
    expect(symbol()!.value).toBe('AAPL');
    click(kindBtn('หุ้นไทย'));
    type(symbol(), 'ptt');
    expect(symbol()!.value).toBe('PTT');
  });

  it('crypto ids are lower-cased', () => {
    mount();
    click(kindBtn('คริปโต'));
    type(symbol(), 'BitCoin');
    expect(symbol()!.value).toBe('bitcoin');
  });

  it('example chips fill the symbol and the picked one is highlighted', () => {
    mount();
    const chips = [...container!.querySelectorAll<HTMLButtonElement>('[aria-label="สัญลักษณ์ตัวอย่าง"] button')];
    expect(chips.map(c => c.textContent)).toEqual(['AAPL', 'MSFT', 'NVDA', 'VOO', 'XOM', 'KO']);
    click(chips[2]);
    expect(symbol()!.value).toBe('NVDA');
    const after = [...container!.querySelectorAll<HTMLButtonElement>('[aria-label="สัญลักษณ์ตัวอย่าง"] button')];
    expect(after[2].className).toContain('border-accent/60');
    expect(after[0].className).not.toContain('border-accent/60');
  });
});

describe('AssetForm name', () => {
  it('once the user types a name it stops following the symbol', () => {
    mount();
    type(nameInput(), 'Dime - AAPL');
    type(symbol(), 'MSFT');
    expect(nameInput().value).toBe('Dime - AAPL');
  });

  it('a kind change keeps a typed name but updates an automatic one', () => {
    mount();
    click(kindBtn('คริปโต'));
    expect(nameInput().value).toBe('คริปโต');
    type(nameInput(), 'BTC ออม');
    click(kindBtn('กองทุน'));
    expect(nameInput().value).toBe('BTC ออม');
  });
});

describe('AssetForm validation', () => {
  it('stocks and crypto need a symbol: error shown, nothing saved', async () => {
    mount();
    await submit();
    expect(h.saveAsset).not.toHaveBeenCalled();
    expect(symbol()!.getAttribute('aria-invalid')).toBe('true');
    expect(symbol()!.getAttribute('aria-describedby')).toBe('asset-symbol-err');
    expect(q('#asset-symbol-err')!.textContent).toContain('ระบุสัญลักษณ์');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('a blank name is refused', async () => {
    mount();
    click(kindBtn('กองทุน'));
    type(nameInput(), '   ');
    await submit();
    expect(h.saveAsset).not.toHaveBeenCalled();
    expect(nameInput().getAttribute('aria-invalid')).toBe('true');
    expect(q('#asset-name-err')!.textContent).toBe('ต้องมีชื่อสินทรัพย์');
  });

  it('both errors can show together, and typing clears only its own', async () => {
    mount();
    type(nameInput(), '');
    await submit();
    expect(q('#asset-name-err')).not.toBeNull();
    expect(q('#asset-symbol-err')).not.toBeNull();
    type(symbol(), 'AAPL');
    expect(q('#asset-symbol-err')).toBeNull();
    expect(q('#asset-name-err')).not.toBeNull();
    type(nameInput(), 'x');
    expect(q('#asset-name-err')).toBeNull();
    expect(nameInput().hasAttribute('aria-describedby')).toBe(false);
  });

  it('a fund needs no symbol', async () => {
    mount();
    click(kindBtn('กองทุน'));
    await submit();
    expect(h.saveAsset).toHaveBeenCalledTimes(1);
  });
});

describe('AssetForm saving a new asset', () => {
  it('sends the trimmed name, kind, symbol and unit', async () => {
    mount();
    type(symbol(), 'AAPL');
    type(nameInput(), '  Dime AAPL ');
    type(unitInput(), ' หุ้น ');
    await submit();
    expect(h.saveAsset).toHaveBeenCalledWith({ id: undefined, name: 'Dime AAPL', kind: 'us_stock', symbol: 'AAPL', unit_label: 'หุ้น' });
    expect(onSaved).toHaveBeenCalledWith('Dime AAPL', true);
  });

  it('kinds without a symbol send null; a blank unit is null too', async () => {
    mount();
    click(kindBtn('ทองคำแท่ง'));
    type(unitInput(), '   ');
    await submit();
    expect(h.saveAsset).toHaveBeenCalledWith({ id: undefined, name: 'ทองคำแท่ง', kind: 'gold_bar', symbol: null, unit_label: null });
  });

  it('the automatic name is what gets saved when the user never typed one', async () => {
    mount();
    type(symbol(), 'MSFT');
    await submit();
    expect(h.saveAsset.mock.calls[0][0].name).toBe('MSFT');
  });

  it('a failed save (no id back) keeps the form open and does not report success', async () => {
    h.saveAsset.mockResolvedValue(undefined);
    mount();
    type(symbol(), 'AAPL');
    await submit();
    expect(onSaved).not.toHaveBeenCalled();
    expect(symbol()!.value).toBe('AAPL');
    expect(submitBtn().disabled).toBe(false);
  });

  it('submitting never reloads the page (the browser default is cancelled)', () => {
    mount();
    const ev = new Event('submit', { bubbles: true, cancelable: true });
    act(() => { q<HTMLFormElement>('form')!.dispatchEvent(ev); });
    expect(ev.defaultPrevented).toBe(true);
  });

  it('the name error is tied to the name field for screen readers', async () => {
    mount();
    click(kindBtn('กองทุน'));
    type(nameInput(), '');
    await submit();
    expect(nameInput().getAttribute('aria-describedby')).toBe('asset-name-err');
  });

  it('the button is disabled while the save is in flight, then released', async () => {
    let finish!: (id: string) => void;
    h.saveAsset.mockReturnValue(new Promise<string>(r => { finish = r; }));
    mount();
    type(symbol(), 'AAPL');
    click(submitBtn());
    await tick();
    expect(submitBtn().disabled).toBe(true);
    await act(async () => { finish('id-1'); });
    expect(submitBtn().disabled).toBe(false);
    expect(onSaved).toHaveBeenCalledWith('AAPL', true);
  });

  it('Enter in a field submits the form', async () => {
    mount();
    click(kindBtn('กองทุน'));
    act(() => { q<HTMLFormElement>('form')!.requestSubmit(); });
    await tick();
    expect(h.saveAsset).toHaveBeenCalledTimes(1);
  });
});

describe('AssetForm optional starting price (manual kinds only)', () => {
  it('shown for new funds and other, hidden for auto-priced kinds and when editing', () => {
    mount();
    expect(priceInput()).toBeNull();
    click(kindBtn('กองทุน'));
    expect(priceInput()).not.toBeNull();
    expect(container!.textContent).toContain('ไม่บังคับ');
    click(kindBtn('อื่นๆ'));
    expect(priceInput()).not.toBeNull();
    click(kindBtn('คริปโต'));
    expect(priceInput()).toBeNull();
  });

  it('is labelled with the unit', () => {
    mount();
    click(kindBtn('กองทุน'));
    expect(q('label[for="asset-price"]')!.textContent).toContain('ราคาปัจจุบันต่อหน่วย');
    type(unitInput(), 'ยูนิต');
    expect(q('label[for="asset-price"]')!.textContent).toContain('ราคาปัจจุบันต่อยูนิต');
    type(unitInput(), '');
    expect(q('label[for="asset-price"]')!.textContent).toContain('ราคาปัจจุบันต่อหน่วย');
  });

  it('only digits and dots are kept while typing', () => {
    mount();
    click(kindBtn('กองทุน'));
    type(priceInput(), '1a2,3.4฿');
    expect(priceInput()!.value).toBe('123.4');
  });

  it('a second decimal point is dropped, so a typo never turns into an unusable price', async () => {
    mount();
    click(kindBtn('กองทุน'));
    type(priceInput(), '12.4.5');
    expect(priceInput()!.value).toBe('12.45');
    type(priceInput(), '1..5');
    expect(priceInput()!.value).toBe('1.5');
    type(priceInput(), '12.');
    expect(priceInput()!.value).toBe('12.');
    await submit();
    expect(h.setManualPrice).toHaveBeenCalledWith('new-id', 12);
  });

  it('a price typed for a fund is set on the new asset after it is created', async () => {
    mount();
    click(kindBtn('กองทุน'));
    type(priceInput(), '12.4567');
    await submit();
    expect(h.setManualPrice).toHaveBeenCalledWith('new-id', 12.4567);
  });

  it('left empty or zero, no price is set', async () => {
    mount();
    click(kindBtn('กองทุน'));
    await submit();
    expect(h.setManualPrice).not.toHaveBeenCalled();
    type(priceInput(), '0');
    await submit();
    expect(h.setManualPrice).not.toHaveBeenCalled();
  });

  it('is not sent if saving the asset failed', async () => {
    h.saveAsset.mockResolvedValue(undefined);
    mount();
    click(kindBtn('กองทุน'));
    type(priceInput(), '10');
    await submit();
    expect(h.setManualPrice).not.toHaveBeenCalled();
  });

  it('a price typed for a fund is forgotten if the user then switches to an auto-priced kind', async () => {
    mount();
    click(kindBtn('กองทุน'));
    type(priceInput(), '12');
    click(kindBtn('คริปโต'));
    type(symbol(), 'bitcoin');
    await submit();
    expect(h.saveAsset).toHaveBeenCalledTimes(1);
    expect(h.setManualPrice).not.toHaveBeenCalled();
  });

  it('the form waits for the price to be stored before it reports success', async () => {
    let storePrice!: (ok: boolean) => void;
    h.setManualPrice.mockReturnValue(new Promise<boolean>(r => { storePrice = r; }));
    mount();
    click(kindBtn('อื่นๆ'));
    type(priceInput(), '5');
    click(submitBtn());
    await tick();
    expect(onSaved).not.toHaveBeenCalled();
    expect(submitBtn().disabled).toBe(true);
    await act(async () => { storePrice(true); });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('the price is set before the form reports it was saved', async () => {
    const order: string[] = [];
    h.setManualPrice.mockImplementation(async () => { order.push('price'); return true; });
    onSaved.mockImplementation(() => { order.push('saved'); });
    mount();
    click(kindBtn('อื่นๆ'));
    type(priceInput(), '5');
    await submit();
    expect(order).toEqual(['price', 'saved']);
    onSaved.mockReset();
  });
});

describe('AssetForm editing an existing asset', () => {
  const held = () => mkAsset('a1', { name: 'ออมทอง', kind: 'gold_bar', symbol: null, unitLabel: 'บาททอง', units: 1.5, cost: 90000, trades: [trade('t1', '2026-01-01', 'buy', 1.5, 90000)] });
  const fresh = () => mkAsset('a2', { name: 'Dime AAPL', kind: 'us_stock', symbol: 'AAPL', unitLabel: 'หุ้น', units: 0, cost: 0, trades: [] });

  it('opens filled in, with edit wording and no starting-price box', () => {
    mount(held());
    expect(pressed()).toEqual(['ทองคำแท่ง']);
    expect(nameInput().value).toBe('ออมทอง');
    expect(unitInput().value).toBe('บาททอง');
    expect(submitBtn().textContent).toBe('บันทึกการแก้ไข');
    expect(container!.textContent).toContain('ปิด');
    expect(container!.textContent).not.toContain('ยกเลิก');
    expect(container!.textContent).not.toContain('เพิ่มสินทรัพย์แล้ว ไปบันทึกซื้อ');
    expect(priceInput()).toBeNull();
  });

  it('the stored name is kept even when the symbol changes (name counts as typed)', () => {
    mount(fresh());
    type(symbol(), 'MSFT');
    expect(nameInput().value).toBe('Dime AAPL');
  });

  it('a manual-priced asset being edited has no starting-price box (that is for new assets)', () => {
    mount(mkAsset('f1', { name: 'กองทุน A', kind: 'fund', unitLabel: 'หน่วย', units: 0, trades: [] }));
    expect(priceInput()).toBeNull();
    expect(container!.textContent).not.toContain('ไม่บังคับ');
  });

  it('shows what is held, total cost and number of trades; dashes when nothing is held', () => {
    mount(held());
    const cells = [...container!.querySelectorAll('dd')].map(d => d.textContent);
    expect(cells).toEqual(['1.5 บาททอง', '฿90,000.00', '1 รายการ']);
    act(() => root!.unmount()); container!.remove();
    mount(fresh());
    expect([...container!.querySelectorAll('dd')].map(d => d.textContent)).toEqual(['–', '–', '0 รายการ']);
  });

  it('the holding line falls back to หน่วย when the asset has no unit label', () => {
    mount(mkAsset('a1', { units: 2, cost: 10, unitLabel: null, symbol: 'X', trades: [] }));
    expect([...container!.querySelectorAll('dd')][0].textContent).toBe('2 หน่วย');
  });

  it('saves with the asset id and reports it as an edit', async () => {
    mount(held());
    type(nameInput(), 'ทองเก็บ');
    await submit();
    expect(h.saveAsset).toHaveBeenCalledWith({ id: 'a1', name: 'ทองเก็บ', kind: 'gold_bar', symbol: null, unit_label: 'บาททอง' });
    expect(onSaved).toHaveBeenCalledWith('ทองเก็บ', false);
    expect(h.setManualPrice).not.toHaveBeenCalled();
  });

  it('warns that prices will be refetched when the kind of an asset with trades changes', () => {
    mount(held());
    expect(container!.textContent).not.toContain('เปลี่ยนประเภทแล้วราคาที่ดึงไว้จะถูกล้าง');
    click(kindBtn('กองทุน'));
    expect(container!.textContent).toContain('เปลี่ยนประเภทแล้วราคาที่ดึงไว้จะถูกล้างและดึงใหม่');
    click(kindBtn('ทองคำแท่ง'));
    expect(container!.textContent).not.toContain('เปลี่ยนประเภทแล้วราคาที่ดึงไว้จะถูกล้าง');
  });

  it('no warning for an asset with no trades', () => {
    mount(fresh());
    click(kindBtn('คริปโต'));
    expect(container!.textContent).not.toContain('เปลี่ยนประเภทแล้วราคาที่ดึงไว้จะถูกล้าง');
  });

  it('close button calls onCancel', () => {
    mount(held());
    click([...container!.querySelectorAll('button')].find(b => b.textContent === 'ปิด'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('AssetForm cancel on a new asset', () => {
  it('ยกเลิก calls onCancel without saving', () => {
    mount();
    click([...container!.querySelectorAll('button')].find(b => b.textContent === 'ยกเลิก'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(h.saveAsset).not.toHaveBeenCalled();
  });

  it('has no delete button', () => {
    mount();
    expect(container!.textContent).not.toContain('ลบสินทรัพย์');
  });
});

describe('AssetForm deleting', () => {
  const unused = () => mkAsset('a2', { name: 'Dime', kind: 'us_stock', symbol: 'AAPL', units: 0, trades: [] });

  it('needs two clicks; the second deletes and reports it', async () => {
    mount(unused());
    click(deleteBtn());
    expect(h.deleteAsset).not.toHaveBeenCalled();
    expect(deleteBtn().textContent).toBe('กดอีกครั้งเพื่อยืนยัน');
    click(deleteBtn());
    await tick();
    expect(h.deleteAsset).toHaveBeenCalledWith('a2');
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('a refused delete (API said no) does not report success', async () => {
    h.deleteAsset.mockResolvedValue(false);
    mount(unused());
    click(deleteBtn());
    click(deleteBtn());
    await tick();
    expect(h.deleteAsset).toHaveBeenCalledTimes(1);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('is disabled with the reason when the asset has trades', () => {
    mount(mkAsset('a1', { name: 'X', units: 1, trades: [trade('t1', '2026-01-01', 'buy', 1, 10), trade('t2', '2026-01-02', 'buy', 1, 10)] }));
    const b = deleteBtn();
    expect(b.disabled).toBe(true);
    expect(b.title).toBe('ลบไม่ได้ มี 2 รายการซื้อขายอยู่');
    click(b);
    expect(h.deleteAsset).not.toHaveBeenCalled();
  });

  it('names the asset for screen readers', () => {
    mount(unused());
    expect(deleteBtn().getAttribute('aria-label')).toBe('ลบสินทรัพย์: Dime');
  });
});

describe('AssetForm live price preview', () => {
  it('stocks: asks to type a symbol first and does not call the API', async () => {
    mount();
    expect(preview()).toContain('พิมพ์สัญลักษณ์ ระบบจะลองดึงราคาล่าสุดมาให้ดูทันที');
    await tick(5000);
    expect(h.previewPrice).not.toHaveBeenCalled();
  });

  it('waits 600 ms after typing, shows a spinner text meanwhile, then the price and source', async () => {
    mount();
    type(symbol(), 'AAPL');
    expect(preview()).toContain('กำลังดึงราคา AAPL…');
    await tick(599);
    expect(h.previewPrice).not.toHaveBeenCalled();
    await tick(1);
    expect(h.previewPrice).toHaveBeenCalledWith('us_stock', 'AAPL');
    expect(preview()).toContain('฿123.45');
    expect(preview()).toContain('ต่อหุ้น');
    expect(preview()).toContain('แหล่งข้อมูล: Yahoo Finance');
    expect(preview()).not.toContain('ต่อกรัม');
  });

  it('typing again restarts the wait and only the last symbol is fetched', async () => {
    mount();
    type(symbol(), 'A');
    await tick(400);
    type(symbol(), 'AA');
    await tick(400);
    expect(h.previewPrice).not.toHaveBeenCalled();
    await tick(200);
    expect(h.previewPrice).toHaveBeenCalledTimes(1);
    expect(h.previewPrice).toHaveBeenCalledWith('us_stock', 'AA');
  });

  it('gold needs no symbol: it fetches straight away with null, and shows the per-gram price', async () => {
    mount();
    click(kindBtn('ทองคำแท่ง'));
    expect(preview()).toContain('กำลังดึงราคา…');
    await tick(600);
    expect(h.previewPrice).toHaveBeenCalledWith('gold_bar', null);
    expect(preview()).toContain('฿123.45');
    expect(preview()).toContain('ต่อบาททอง');
    expect(preview()).toContain('≈ ฿8.10 ต่อกรัม');
  });

  it('kinds without a source explain that the price is typed by hand and never call the API', async () => {
    mount();
    click(kindBtn('กองทุน'));
    expect(preview()).toContain('ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ');
    await tick(2000);
    expect(h.previewPrice).not.toHaveBeenCalled();
  });

  it('an unknown symbol shows the reason and a hint, as a status', async () => {
    h.previewPrice.mockResolvedValue({ ok: false, error: 'ไม่พบสัญลักษณ์นี้' });
    mount();
    type(symbol(), 'ZZZZ');
    await tick(600);
    expect(preview()).toContain('ดึงราคาไม่ได้: ไม่พบสัญลักษณ์นี้');
    expect(preview()).toContain('ตรวจตัวสะกดสัญลักษณ์');
    expect(container!.querySelector('[role="status"].bg-warn\\/5')).not.toBeNull();
  });

  it('a successful preview is also announced as a status', async () => {
    mount();
    type(symbol(), 'AAPL');
    await tick(600);
    expect(container!.querySelector('[role="status"].bg-income\\/5')).not.toBeNull();
  });

  it('a network failure reads as cannot-reach-server', async () => {
    h.previewPrice.mockRejectedValue(new Error('boom'));
    mount();
    type(symbol(), 'AAPL');
    await tick(600);
    expect(preview()).toContain('ดึงราคาไม่ได้: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  });

  it('an answer that arrives after the symbol changed is ignored', async () => {
    let first!: (v: unknown) => void;
    h.previewPrice.mockReturnValueOnce(new Promise(r => { first = r; }));
    mount();
    type(symbol(), 'AAPL');
    await tick(600); // request for AAPL in flight
    h.previewPrice.mockResolvedValueOnce({ ok: true, price: 7, source: 'second' });
    type(symbol(), 'MSFT');
    await tick(600);
    expect(preview()).toContain('฿7.00');
    await act(async () => { first({ ok: true, price: 999, source: 'stale' }); });
    expect(preview()).toContain('฿7.00');
    expect(preview()).not.toContain('999');
  });

  it('a stale failure is ignored too', async () => {
    let first!: (e: unknown) => void;
    h.previewPrice.mockReturnValueOnce(new Promise((_, rej) => { first = rej; }));
    mount();
    type(symbol(), 'AAPL');
    await tick(600);
    h.previewPrice.mockResolvedValueOnce({ ok: true, price: 7, source: 'second' });
    type(symbol(), 'MSFT');
    await tick(600);
    await act(async () => { first(new Error('late')); });
    expect(preview()).toContain('฿7.00');
    expect(preview()).not.toContain('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  });

  it('switching to a manual kind while a request is in flight drops its result', async () => {
    let first!: (v: unknown) => void;
    h.previewPrice.mockReturnValueOnce(new Promise(r => { first = r; }));
    mount();
    type(symbol(), 'AAPL');
    await tick(600);
    click(kindBtn('กองทุน'));
    await act(async () => { first({ ok: true, price: 999, source: 'stale' }); });
    expect(preview()).toContain('ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ');
    expect(preview()).not.toContain('999');
  });

  it('clearing the symbol (by switching kind) drops the old price instead of leaving it on screen', async () => {
    mount();
    type(symbol(), 'AAPL');
    await tick(600);
    expect(preview()).toContain('฿123.45');
    click(kindBtn('หุ้นไทย'));
    expect(preview()).toContain('พิมพ์สัญลักษณ์');
    expect(preview()).not.toContain('฿123.45');
  });

  it('unmounting before the wait ends never calls the API', async () => {
    mount();
    type(symbol(), 'AAPL');
    act(() => root!.unmount());
    root = null;
    await tick(2000);
    expect(h.previewPrice).not.toHaveBeenCalled();
  });

  it('the unit in the preview follows the unit field (หน่วย when blank)', async () => {
    mount();
    click(kindBtn('คริปโต'));
    type(symbol(), 'bitcoin');
    type(unitInput(), '');
    await tick(600);
    expect(preview()).toContain('ต่อหน่วย');
  });
});
