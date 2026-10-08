import { describe, it, expect } from 'vitest';
import { buildInvestedSeries, buildAllocation, buildAllocationByKind, withLivePoint } from '../portfolioCharts';
import type { Portfolio, PortfolioAsset } from '@/types';

const trade = (date: string, side: 'buy' | 'sell', amount: number) => ({ id: date + side + amount, date, side, units: 1, amount, pricePerUnit: amount, description: '' });
const asset = (id: string, over: Partial<PortfolioAsset>): PortfolioAsset => ({
  id, name: id, kind: 'us_stock', symbol: null, unitLabel: null, autoPrice: true, units: 1, cost: 100, avgCostPerUnit: 100,
  price: null, priceAt: null, priceSource: null, marketValue: null, unrealized: null, unrealizedPct: null, realized: 0, oversold: false, trades: [], ...over,
});

describe('portfolioCharts', () => {
  it('เงินลงทุนสุทธิสะสม: รวมวันเดียวกัน เรียงตามวัน ขายหักออก', () => {
    const s = buildInvestedSeries([
      asset('a', { trades: [trade('2026-09-10', 'buy', 500), trade('2026-09-01', 'buy', 1000)] }),
      asset('b', { trades: [trade('2026-09-10', 'buy', 200), trade('2026-09-20', 'sell', 300)] }),
    ]);
    expect(s).toEqual([
      { date: '2026-09-01', invested: 1000 },
      { date: '2026-09-10', invested: 1700 },
      { date: '2026-09-20', invested: 1400 },
    ]);
  });

  it('สัดส่วนพอร์ต: ใช้มูลค่าตลาด ไม่มีราคาใช้ต้นทุน ตัดสินทรัพย์ที่ขายหมดแล้ว เรียงมากไปน้อย', () => {
    const p = { assets: [
      asset('x', { marketValue: 300 }),
      asset('y', { marketValue: null, cost: 100 }),
      asset('gone', { units: 0, marketValue: 999 }),
    ] } as Portfolio;
    const a = buildAllocation(p);
    expect(a.map(i => i.id)).toEqual(['x', 'y']);
    expect(a[0].pct).toBeCloseTo(75);
    expect(a[1].priced).toBe(false);
  });

  it('สัดส่วนตามประเภท: รวมสินทรัพย์ชนิดเดียวกัน ป้ายเป็นชื่อประเภท priced = ทุกตัวมีราคา', () => {
    const p = { assets: [
      asset('g1', { kind: 'gold_bar', marketValue: 300 }),
      asset('g2', { kind: 'gold_bar', marketValue: null, cost: 100 }),
      asset('s', { kind: 'us_stock', marketValue: 600 }),
      asset('gone', { kind: 'crypto', units: 0, marketValue: 999 }),
    ] } as Portfolio;
    const k = buildAllocationByKind(p);
    expect(k.map(i => [i.id, i.name, i.value])).toEqual([['us_stock', 'หุ้นสหรัฐ', 600], ['gold_bar', 'ทองคำแท่ง', 400]]);
    expect(k[0].pct).toBeCloseTo(60);
    expect([k[0].priced, k[1].priced]).toEqual([true, false]);
  });

  it('สัดส่วน: มูลค่ารวมเป็นศูนย์ ได้ 0% ไม่ใช่ NaN (ทั้งรายตัวและรายประเภท)', () => {
    const p = { assets: [asset('z', { marketValue: 0, cost: 0 })] } as Portfolio;
    expect(buildAllocation(p)[0].pct).toBe(0);
    expect(buildAllocationByKind(p)[0].pct).toBe(0);
  });

  it('ประวัติมูลค่า: มีแค่ต้นทุน (ไม่มีมูลค่า) ก็ยังมีจุดของวันนี้ · มีประวัติเก่าก็ไม่ว่างแม้ตัวเลขสดเป็นศูนย์', () => {
    expect(withLivePoint([], { marketValue: 0, cost: 50 }, '2026-09-30')).toEqual([{ date: '2026-09-30', marketValue: 0, cost: 50 }]);
    expect(withLivePoint([{ date: '2026-09-29', marketValue: 10, cost: 9 }], { marketValue: 0, cost: 0 }, '2026-09-30')).toEqual([
      { date: '2026-09-29', marketValue: 10, cost: 9 },
      { date: '2026-09-30', marketValue: 0, cost: 0 },
    ]);
  });

  it('ประวัติมูลค่า: จุดของวันนี้มาจากตัวเลขสด แทนที่ของที่จดไว้วันเดียวกัน · ว่างทั้งหมด = []', () => {
    const h = [{ date: '2026-09-29', marketValue: 100, cost: 90 }, { date: '2026-09-30', marketValue: 110, cost: 90 }];
    expect(withLivePoint(h, { marketValue: 120, cost: 95 }, '2026-09-30')).toEqual([
      { date: '2026-09-29', marketValue: 100, cost: 90 },
      { date: '2026-09-30', marketValue: 120, cost: 95 },
    ]);
    expect(withLivePoint([], { marketValue: 0, cost: 0 }, '2026-09-30')).toEqual([]);
  });
});
