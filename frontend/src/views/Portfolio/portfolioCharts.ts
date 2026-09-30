import { Portfolio, PortfolioAsset } from '@/types';
import type { ThemeToken } from '@/constants/theme';

/** สีประจำสินทรัพย์ (ใช้ร่วมกันทั้งวงกลมสัดส่วนและตาราง) — เลี่ยงเขียว/แดงที่สงวนไว้ให้กำไร/ขาดทุน */
const ASSET_TOKENS: ThemeToken[] = ['info', 'gold', 'purple', 'warn', 'alloc-need', 'ink-soft'];

export const assetColorMap = (assets: PortfolioAsset[]): Record<string, ThemeToken> =>
  Object.fromEntries(assets.map((a, i) => [a.id, ASSET_TOKENS[i % ASSET_TOKENS.length]]));

export interface InvestedPoint {
  date: string; // YYYY-MM-DD
  invested: number; // เงินลงทุนสุทธิสะสม (ซื้อ − ขาย) หน่วยบาท
}

/** เงินลงทุนสุทธิสะสมตามวันที่ซื้อขาย (วันที่เดียวกันรวมเป็นจุดเดียว) */
export function buildInvestedSeries(assets: PortfolioAsset[]): InvestedPoint[] {
  const byDate = new Map<string, number>();
  for (const a of assets) {
    for (const t of a.trades) byDate.set(t.date, (byDate.get(t.date) ?? 0) + (t.side === 'sell' ? -t.amount : t.amount));
  }
  let running = 0;
  return [...byDate.keys()].sort().map(date => {
    running += byDate.get(date)!;
    return { date, invested: running };
  });
}

export interface AllocationItem {
  id: string;
  name: string;
  value: number;
  pct: number; // 0-100
  priced: boolean; // false = ยังไม่มีราคา ใช้ต้นทุนแทน
}

/** สัดส่วนพอร์ตตามมูลค่าตลาด (ถ้าไม่มีราคาใช้ต้นทุน) เฉพาะสินทรัพย์ที่ยังถืออยู่ เรียงมากไปน้อย */
export function buildAllocation(portfolio: Portfolio): AllocationItem[] {
  const held = portfolio.assets
    .filter(a => a.units > 0)
    .map(a => ({ id: a.id, name: a.name, value: a.marketValue ?? a.cost, priced: a.marketValue != null }));
  const total = held.reduce((s, a) => s + a.value, 0);
  return held
    .map(a => ({ ...a, pct: total > 0 ? (a.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}
