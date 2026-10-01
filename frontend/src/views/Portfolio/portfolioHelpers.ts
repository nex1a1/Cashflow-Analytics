import { AssetKind, PortfolioAsset, PortfolioTrade } from '@/types';

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  gold_bar: 'ทองคำแท่ง',
  gold_ornament: 'ทองรูปพรรณ',
  us_stock: 'หุ้นสหรัฐ',
  th_stock: 'หุ้นไทย',
  crypto: 'คริปโต',
  fund: 'กองทุน',
  other: 'อื่นๆ',
};

export const ASSET_KIND_OPTIONS = (Object.keys(ASSET_KIND_LABELS) as AssetKind[]).map(k => ({ value: k, label: ASSET_KIND_LABELS[k] }));

const UNIT_LABELS: Record<AssetKind, string> = {
  gold_bar: 'บาททอง',
  gold_ornament: 'บาททอง',
  us_stock: 'หุ้น',
  th_stock: 'หุ้น',
  crypto: 'เหรียญ',
  fund: 'หน่วย',
  other: 'หน่วย',
};

export const defaultUnitLabel = (kind: AssetKind): string => UNIT_LABELS[kind];

/** ข้อความช่วยกรอกสัญลักษณ์ของแต่ละประเภท; '' = ไม่ต้องกรอก */
export const symbolHint = (kind: AssetKind): string => {
  switch (kind) {
    case 'us_stock': return 'เช่น AAPL';
    case 'th_stock': return 'เช่น PTT';
    case 'crypto': return 'CoinGecko id เช่น bitcoin';
    default: return '';
  }
};

/** ซื้อ/ขาย → ยอดมีเครื่องหมาย (ขาย = ลบ) ตามที่ API และผลรวมทุกหน้าใช้ */
export const signedTradeAmount = (side: 'buy' | 'sell', amount: number): number =>
  side === 'sell' ? -Math.abs(amount) : Math.abs(amount);

export const tradeSideOf = (signedAmount: number): 'buy' | 'sell' => (signedAmount < 0 ? 'sell' : 'buy');

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface PriceAge {
  label: string; // "ข้อมูล ณ 30 ก.ย. 69 16:26"
  stale: boolean; // เก่ากว่า 24 ชม. → UI เน้นเตือน
}

export function describePriceAge(priceAt: string | null, now: number = Date.now()): PriceAge | null {
  if (!priceAt) return null;
  const t = Date.parse(priceAt);
  if (Number.isNaN(t)) return null;
  const label = 'ข้อมูล ณ ' + new Date(t).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  return { label, stale: now - t > STALE_AFTER_MS };
}

/** จำนวนหน่วย: เศษส่วนได้สูงสุด 6 ตำแหน่ง ตัดศูนย์ท้าย */
export const formatUnits = (units: number): string =>
  units.toLocaleString('th-TH', { maximumFractionDigits: 6 });

/** 1 บาททอง = 15.244 กรัม (ทองคำแท่ง/รูปพรรณ ราคาและหน่วยในระบบเป็นบาททอง) */
export const GRAMS_PER_BAHT_GOLD = 15.244;

export const isGoldKind = (kind: AssetKind): boolean => kind === 'gold_bar' || kind === 'gold_ornament';

/** จำนวนที่กรอก (กรัม หรือหน่วยของสินทรัพย์) → หน่วยที่เก็บในระบบ (ทอง = บาททอง) */
export const toBaseUnits = (n: number, gram: boolean): number => (gram ? n / GRAMS_PER_BAHT_GOLD : n);
export const fromBaseUnits = (n: number, gram: boolean): number => (gram ? n * GRAMS_PER_BAHT_GOLD : n);
/** ราคาต่อหน่วยระบบ (บาท/บาททอง) → ราคาต่อกรัม */
export const pricePerDisplayUnit = (basePrice: number, gram: boolean): number => (gram ? basePrice / GRAMS_PER_BAHT_GOLD : basePrice);

/** ตัดเลขทศนิยมยาวๆ เป็นข้อความสำหรับช่องกรอก (ไม่มีศูนย์ท้าย) */
export const trimNum = (n: number, dp: number): string => (Number.isFinite(n) && n > 0 ? String(+n.toFixed(dp)) : '');

export type PriceCheck = 'ok' | 'far';
/** ราคาที่กรอก/คำนวณห่างจากราคาตลาดเกิน 3 เท่า → มักกรอกหน่วยผิด (กรัมกับบาททอง, บาทกับดอลลาร์) */
export const checkPriceSanity = (perUnit: number, market: number | null): PriceCheck =>
  market && market > 0 && (perUnit > market * 3 || perUnit < market / 3) ? 'far' : 'ok';

/** ถือมานานเท่าไร: "20 วัน" · "11 เดือน" · "1 ปี 2 เดือน" (นับเดือนเต็ม) */
export function describeHolding(fromIso: string, toIso: string): string {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  if (months < 1) {
    const days = Math.max(0, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000));
    return `${days} วัน`;
  }
  const y = Math.floor(months / 12);
  months %= 12;
  return `${y ? `${y} ปี` : ''}${y && months ? ' ' : ''}${months ? `${months} เดือน` : ''}`;
}

export interface TradeRow extends PortfolioTrade {
  /** จำนวนหน่วยที่ถือหลังรายการนี้ */
  balance: number;
  /** กำไร/ขาดทุนของรายการขายนี้ (ต้นทุนเฉลี่ย ณ ตอนนั้น); ซื้อ = null */
  realized: number | null;
}

export interface TradeSummary {
  rows: TradeRow[]; // เรียงตามเวลา (เก่า → ใหม่)
  buyCount: number;
  sellCount: number;
  boughtAmount: number;
  soldAmount: number;
  boughtUnits: number;
  soldUnits: number;
}

/** เติมยอดคงเหลือ + กำไรต่อรายการขาย และรวมยอดซื้อ/ขาย — ต้นทุนเฉลี่ยถ่วงน้ำหนักแบบเดียวกับ portfolioMath */
export function summarizeTrades(trades: PortfolioTrade[]): TradeSummary {
  // ponytail: ไม่ทำ fallback "ซื้อก่อนขายในวันเดียวกัน" แบบฝั่ง backend — เรียงตามลำดับที่ได้มา (ยอดรวมของสินทรัพย์ยังมาจาก backend)
  const ordered = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const s: TradeSummary = { rows: [], buyCount: 0, sellCount: 0, boughtAmount: 0, soldAmount: 0, boughtUnits: 0, soldUnits: 0 };
  let units = 0;
  let cost = 0;
  for (const t of ordered) {
    let realized: number | null = null;
    if (t.side === 'buy') {
      units += t.units; cost += t.amount;
      s.buyCount++; s.boughtAmount += t.amount; s.boughtUnits += t.units;
    } else {
      const sold = Math.min(t.units, units);
      const removed = units > 1e-9 ? cost * (sold / units) : 0;
      realized = t.amount - removed;
      units -= sold; cost -= removed;
      if (units < 1e-9) { units = 0; cost = 0; }
      s.sellCount++; s.soldAmount += t.amount; s.soldUnits += t.units;
    }
    s.rows.push({ ...t, balance: units, realized });
  }
  return s;
}

/** วันนี้ตามเวลาเครื่อง รูปแบบ YYYY-MM-DD */
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** กำไร = เขียว · ขาดทุน = เทาอ่อนไม่ใช่แดง: ราคาตลาดขึ้นลงเป็นเรื่องปกติ ไม่ใช่ปัญหาที่ต้องรีบทำอะไร (แดงสงวนไว้ให้ปัญหาจริง) */
export const plColor = (n: number | null | undefined): string =>
  (n == null || n === 0 ? 'text-ink-display' : n > 0 ? 'text-income' : 'text-ink-soft');

const daysBetween = (fromIso: string, toIso: string): number => {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
};

export interface CashFlow { date: string; amount: number } // ลบ = เงินออกจากกระเป๋า (ซื้อ) · บวก = เงินกลับเข้า (ขาย/มูลค่าปัจจุบัน)

/**
 * XIRR: อัตราต่อปี r ที่ทำให้ Σ amount / (1 + r)^(วัน/365) = 0 — แบ่งครึ่งหาคำตอบ (เสถียรกว่า Newton)
 * ไม่มีทั้งเงินออกและเงินเข้า หรือไม่เจอคำตอบ → null
 */
export function xirr(flows: CashFlow[]): number | null {
  if (!flows.some(f => f.amount < 0) || !flows.some(f => f.amount > 0)) return null;
  const t0 = flows.reduce((m, f) => (f.date < m ? f.date : m), flows[0].date);
  const npv = (r: number) => flows.reduce((sum, f) => sum + f.amount / (1 + r) ** (daysBetween(t0, f.date) / 365), 0);
  let lo = -0.9999;
  let hi = 1000;
  if (npv(lo) * npv(hi) > 0) return null;
  const loSign = Math.sign(npv(lo));
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(npv(mid)) === loSign) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface AnnualReturn {
  /** อัตราต่อปี (0.12 = 12%) · null = ไม่พอจะคำนวณ */
  rate: number | null;
  /** วันที่ผ่านไปตั้งแต่ซื้อครั้งแรก */
  days: number;
}

/** น้อยกว่านี้ การแปลงเป็น "ต่อปี" ขยายความผันผวนระยะสั้นจนตัวเลขไม่มีความหมาย */
export const MIN_ANNUAL_DAYS = 365;

/**
 * ผลตอบแทนต่อปีของทั้งพอร์ต (ถ่วงน้ำหนักตามเงินและเวลาที่ลง): ซื้อ = เงินออก, ขาย = เงินเข้า, ที่ยังถืออยู่ = ขายที่มูลค่าตลาดวันนี้
 * นับเฉพาะสินทรัพย์ที่ขายหมดแล้วหรือมีราคา (ตัวที่ถืออยู่แต่ไม่มีราคาไม่รู้มูลค่า) — แสดงเมื่อถือมาครบ MIN_ANNUAL_DAYS
 */
export function portfolioAnnualReturn(assets: PortfolioAsset[], today: string): AnnualReturn {
  const flows: CashFlow[] = [];
  for (const a of assets) {
    const held = a.units > 0;
    if (held && a.marketValue == null) continue;
    for (const t of a.trades) flows.push({ date: t.date, amount: t.side === 'buy' ? -t.amount : t.amount });
    if (held) flows.push({ date: today, amount: a.marketValue as number });
  }
  if (flows.length === 0) return { rate: null, days: 0 };
  const first = flows.reduce((m, f) => (f.date < m ? f.date : m), flows[0].date);
  const days = Math.max(0, daysBetween(first, today));
  return { rate: days >= MIN_ANNUAL_DAYS ? xirr(flows) : null, days };
}

export type AssetSortKey = 'name' | 'weight' | 'value' | 'unrealized' | 'realized';
export interface AssetSort { key: AssetSortKey; dir: 'asc' | 'desc' }

/** เรียงตารางสินทรัพย์ — ค่าว่าง (ไม่มีราคา/ไม่ได้ถืออยู่) อยู่ท้ายเสมอไม่ว่าเรียงทางไหน เสมอกันเรียงตามชื่อ */
export function sortAssets(assets: PortfolioAsset[], { key, dir }: AssetSort, weights: Record<string, number>): PortfolioAsset[] {
  const pick = (a: PortfolioAsset): number | string | null => {
    switch (key) {
      case 'name': return a.name;
      case 'weight': return weights[a.id] ?? null;
      case 'value': return a.marketValue;
      case 'unrealized': return a.unrealized;
      case 'realized': return a.realized;
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...assets].sort((a, b) => {
    const x = pick(a);
    const y = pick(b);
    if (x == null || y == null) return x == null && y == null ? a.name.localeCompare(b.name, 'th') : x == null ? 1 : -1;
    const c = typeof x === 'string' ? x.localeCompare(y as string, 'th') : x - (y as number);
    return c !== 0 ? c * sign : a.name.localeCompare(b.name, 'th');
  });
}
