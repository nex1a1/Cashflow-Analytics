import { AssetKind, PortfolioTrade } from '@/types';

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
