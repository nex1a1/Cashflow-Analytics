import { describe, it, expect } from 'vitest';
import { buildInvestedSeries, buildAllocation } from '../portfolioCharts';
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
});
