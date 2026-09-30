import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseThaiGold, parseYahoo, parseCoinGecko, fetchPrice } from '../services/priceProviders';

describe('priceProviders parsers', () => {
  const gold = { status: 'success', response: { price: { gold: { buy: '65,021.24', sell: '67,350.00' }, gold_bar: { buy: '66,350.00', sell: '66,550.00' } } } };

  it('ทองแท่ง/รูปพรรณ ใช้ราคารับซื้อ และตัดเครื่องหมายจุลภาค', () => {
    expect(parseThaiGold(gold, 'gold_bar')).toBe(66350);
    expect(parseThaiGold(gold, 'gold_ornament')).toBe(65021.24);
  });

  it('อ่านราคาและสกุลเงินจาก Yahoo', () => {
    const y = { chart: { result: [{ meta: { symbol: 'AAPL', currency: 'USD', regularMarketPrice: 329.4 } }] } };
    expect(parseYahoo(y)).toEqual({ price: 329.4, currency: 'USD' });
  });

  it('อ่านราคาบาทจาก CoinGecko', () => {
    expect(parseCoinGecko({ bitcoin: { thb: 2813092 } }, 'bitcoin')).toBe(2813092);
  });

  it('response ผิดรูปแบบ = throw (ผู้เรียกจะใช้ราคาแคช)', () => {
    expect(() => parseThaiGold({}, 'gold_bar')).toThrow();
    expect(() => parseYahoo({ chart: { result: null } })).toThrow();
    expect(() => parseCoinGecko({}, 'bitcoin')).toThrow();
  });
});

describe('fetchPrice เมื่อออฟไลน์', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('เน็ตหลุด → error ภาษาไทย ไม่ใช่ "fetch failed"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(fetchPrice('gold_bar', null)).rejects.toThrow('เชื่อมต่ออินเทอร์เน็ตไม่ได้');
  });

  it('แหล่งราคาตอบช้าจน timeout → บอกว่าตอบช้า', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' })));
    await expect(fetchPrice('us_stock', 'AAPL')).rejects.toThrow('แหล่งราคาตอบช้าเกินไป');
  });
});
