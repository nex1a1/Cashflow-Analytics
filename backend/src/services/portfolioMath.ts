/**
 * คำนวณสถานะพอร์ตจากรายการซื้อ/ขาย (ต้นทุนเฉลี่ยถ่วงน้ำหนัก) — ฟังก์ชันล้วน ไม่แตะ DB
 * เงินทั้งหมดเป็นสตางค์ ส่วนหน่วยเป็นทศนิยม (Dime ซื้อเศษส่วนได้)
 */
export interface Trade {
  date: string; // YYYY-MM-DD
  createdAt?: string;
  side: 'buy' | 'sell';
  units: number;
  amountSatang: number; // ค่าสัมบูรณ์ของเงินที่จ่าย/ได้รับ
}

export interface Position {
  units: number;
  costSatang: number; // ต้นทุนของหน่วยที่ยังถืออยู่
  realizedSatang: number; // กำไร/ขาดทุนจากส่วนที่ขายไปแล้ว
  /** ขายเกินจำนวนที่ถือ — ข้อมูลผิดปกติ ให้ UI เตือน */
  oversold: boolean;
}

export interface PriceQuote {
  price: number; // บาทต่อหน่วย
  at: string; // ISO
  source: string;
}

const EPS = 1e-9;

/**
 * เรียงตามวันที่แล้วตามลำดับที่บันทึก; ถ้าลำดับนั้นทำให้ขายเกินที่ถือ (เช่น บันทึกรายการขายก่อนรายการซื้อของวันเดียวกัน)
 * ให้ลองใหม่โดยให้ซื้อมาก่อนขายภายในวันเดียวกัน — ต้นทุนเฉลี่ยขึ้นกับลำดับ จึงไม่บังคับ "ซื้อก่อนขาย" ตั้งแต่แรก
 */
export function computePosition(trades: Trade[]): Position {
  const inEntryOrder = run(trades, false);
  return inEntryOrder.oversold ? run(trades, true) : inEntryOrder;
}

function run(trades: Trade[], buysFirstSameDay: boolean): Position {
  const ordered = [...trades].sort((a, b) =>
    a.date.localeCompare(b.date)
    || (buysFirstSameDay && a.side !== b.side ? (a.side === 'buy' ? -1 : 1) : 0)
    || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

  let units = 0;
  let cost = 0;
  let realized = 0;
  let oversold = false;

  for (const t of ordered) {
    if (t.side === 'buy') {
      units += t.units;
      cost += t.amountSatang;
      continue;
    }
    const sold = Math.min(t.units, units);
    if (t.units - units > EPS) oversold = true;
    const costRemoved = units > EPS ? cost * (sold / units) : 0;
    realized += t.amountSatang - costRemoved;
    units -= sold;
    cost -= costRemoved;
    if (units < EPS) { units = 0; cost = 0; }
  }

  return { units, costSatang: Math.round(cost), realizedSatang: Math.round(realized), oversold };
}

/** ราคาที่ใหม่กว่าชนะ — ราคากรอกเองที่ใหม่กว่าราคาที่ดึงมา จะทับ (และกลับกัน) */
export function pickQuote(cached: PriceQuote | null, manual: PriceQuote | null): PriceQuote | null {
  if (!cached) return manual;
  if (!manual) return cached;
  return manual.at >= cached.at ? manual : cached;
}

export function marketValueSatang(units: number, pricePerUnit: number | null): number | null {
  return pricePerUnit == null ? null : Math.round(units * pricePerUnit * 100);
}
