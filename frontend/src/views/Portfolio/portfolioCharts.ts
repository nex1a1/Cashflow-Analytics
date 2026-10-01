import { Portfolio, PortfolioAsset, PortfolioSnapshot } from '@/types';
import type { ThemeToken } from '@/constants/theme';
import { ASSET_KIND_LABELS } from './portfolioHelpers';

/** สีประจำสินทรัพย์ (ใช้ร่วมกันทั้งวงกลมสัดส่วนและตาราง) — เลี่ยงเขียว/แดงที่สงวนไว้ให้กำไร/ขาดทุน */
const ASSET_TOKENS: ThemeToken[] = ['info', 'gold', 'purple', 'warn', 'alloc-need', 'ink-soft'];

export const assetColorMap = (assets: { id: string }[]): Record<string, ThemeToken> =>
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

/** สัดส่วนพอร์ตรวมตามประเภทสินทรัพย์ (ทอง/หุ้น/คริปโต…) — id = ชนิดสินทรัพย์ */
export function buildAllocationByKind(portfolio: Portfolio): AllocationItem[] {
  const kindOf = new Map(portfolio.assets.map(a => [a.id, a.kind]));
  const byKind = new Map<string, { value: number; priced: boolean }>();
  for (const a of buildAllocation(portfolio)) {
    const kind = kindOf.get(a.id)!;
    const cur = byKind.get(kind) ?? { value: 0, priced: true };
    byKind.set(kind, { value: cur.value + a.value, priced: cur.priced && a.priced });
  }
  const total = [...byKind.values()].reduce((s, k) => s + k.value, 0);
  return [...byKind.entries()]
    .map(([kind, k]) => ({ id: kind, name: ASSET_KIND_LABELS[kind as keyof typeof ASSET_KIND_LABELS], value: k.value, priced: k.priced, pct: total > 0 ? (k.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * ประวัติมูลค่าที่จดไว้ + จุดของวันนี้จากตัวเลขสดตอนนี้ (ซื้อขาย/กรอกราคาแล้วกราฟปลายทางตรงทันที ไม่ต้องรอจดรอบถัดไป)
 * ไม่มีประวัติและพอร์ตว่าง → [] (กราฟแสดงข้อความแทน)
 */
export function withLivePoint(history: PortfolioSnapshot[], totals: { marketValue: number; cost: number }, today: string): PortfolioSnapshot[] {
  const past = history.filter(h => h.date !== today);
  if (past.length === 0 && totals.marketValue === 0 && totals.cost === 0) return [];
  return [...past, { date: today, marketValue: totals.marketValue, cost: totals.cost }];
}
