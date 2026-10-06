// รายการประจำ (ค่าหอ ค่าไฟ Netflix เงินเดือน) เดาจากประวัติเอง — ไม่มีตาราง ไม่มีการตั้งค่า นอกจากรายการที่ผู้ใช้กดซ่อน
// หน่วย = เดือนปฏิทิน หรือรอบเงินเดือน 25–24 ตามโหมดที่เลือกอยู่ (key รอบ = เดือนที่เงินเดือนเข้า)
import { toCycleKey, cycleRange, shiftMonth } from './payCycle';

export const RECURRING_HIDDEN_SETTING_KEY = 'recurring_hidden';
/** ย้อนดูกี่หน่วย และต้องเจออย่างน้อยกี่หน่วย ถึงนับว่า "ประจำ" */
export const RECURRING_LOOKBACK = 3;
export const RECURRING_MIN_HITS = 2;

export interface RecurringRow {
  id: string;
  date: string; // YYYY-MM-DD
  category_id?: string | null;
  description?: string | null;
  amount: number | string; // บาท; ขาย (ลบ) ไม่นับ
  allocation_type?: string | null;
  asset_id?: string | null;
}

export interface RecurringItem {
  key: string;
  categoryId: string;
  description: string;
  amount: number; // ยอดครั้งล่าสุด
  /** ยอดไม่เท่ากันทุกครั้ง (เช่นค่าไฟ) — ต้องแก้ยอดก่อนบันทึก */
  variable: boolean;
  allocation_type: string | null;
  /** วันที่ในหน่วยเป้าหมาย ตรงกับตำแหน่งเดิมในหน่วยก่อน (เช่น วันที่ 25 ทุกเดือน) */
  suggestedDate: string;
  /** ลงไปแล้วในหน่วยเป้าหมาย (วันที่) หรือ null = ยังขาด */
  recordedOn: string | null;
}

export const recurringKey = (categoryId: string, description?: string | null) =>
  `${categoryId}|${(description ?? '').trim().toLowerCase()}`;

export const unitKeyOf = (iso: string, cycle: boolean) => (cycle ? toCycleKey(iso) : iso.slice(0, 7));

const daysInMonth = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
const monthIndex = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));

export const unitRange = (key: string, cycle: boolean) =>
  cycle ? cycleRange(key) : { start: `${key}-01`, end: `${key}-${String(daysInMonth(key)).padStart(2, '0')}` };

/** ช่วงที่ต้องโหลดประวัติ: ตั้งแต่ต้นหน่วยที่ย้อนไป RECURRING_LOOKBACK จนจบหน่วยเป้าหมาย */
export const recurringWindow = (targetIso: string, cycle: boolean) => {
  const target = unitKeyOf(targetIso, cycle);
  return { start: unitRange(shiftMonth(target, -RECURRING_LOOKBACK), cycle).start, end: unitRange(target, cycle).end };
};

/** วันเดียวกันของหน่วยเป้าหมาย: เดือนที่ห่างจาก key ของหน่วยเท่าเดิม (รอบ: วัน 25–31 = เดือนแรก, 1–24 = เดือนถัดไป) */
const sameSpotIn = (targetKey: string, from: string, cycle: boolean) => {
  const offset = monthIndex(from.slice(0, 7)) - monthIndex(unitKeyOf(from, cycle));
  const month = shiftMonth(targetKey, offset);
  const day = Math.min(Number(from.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
};

/**
 * รายการประจำของหน่วยที่ targetIso อยู่: คู่ (หมวด, คำอธิบาย) ที่เจอใน >= RECURRING_MIN_HITS จาก RECURRING_LOOKBACK หน่วยก่อนหน้า
 * และไม่เกินหน่วยละครั้ง (ข้าวที่ซื้อทุกวันไม่ใช่บิล). แถวผูกสินทรัพย์ไม่นับ เพราะจำนวนหน่วยเปลี่ยนทุกครั้ง.
 * ยังขาดขึ้นก่อน แล้วเรียงตามวันที่.
 */
export function findRecurring(rows: RecurringRow[], targetIso: string, cycle: boolean, hidden: ReadonlySet<string> = new Set()): RecurringItem[] {
  const target = unitKeyOf(targetIso, cycle);
  const lookback = new Set(Array.from({ length: RECURRING_LOOKBACK }, (_, i) => shiftMonth(target, -(i + 1))));

  const byKey = new Map<string, Map<string, RecurringRow[]>>();
  const seen = new Set<string>();
  for (const r of rows) {
    const amount = Number(r.amount);
    if (seen.has(r.id) || !r.category_id || r.asset_id || !(amount > 0)) continue;
    seen.add(r.id);
    const unit = unitKeyOf(r.date, cycle);
    if (unit !== target && !lookback.has(unit)) continue;
    const key = recurringKey(r.category_id, r.description);
    const units = byKey.get(key) ?? new Map<string, RecurringRow[]>();
    units.set(unit, [...(units.get(unit) ?? []), r]);
    byKey.set(key, units);
  }

  const items: RecurringItem[] = [];
  byKey.forEach((units, key) => {
    if (hidden.has(key)) return;
    const past = [...units].filter(([u]) => u !== target).map(([, rs]) => rs);
    if (past.length < RECURRING_MIN_HITS || past.some(rs => rs.length > 1)) return;

    const pastRows = past.flat().sort((a, b) => a.date.localeCompare(b.date));
    const latest = pastRows[pastRows.length - 1];
    items.push({
      key,
      categoryId: latest.category_id as string,
      description: (latest.description ?? '').trim(),
      amount: Number(latest.amount),
      variable: new Set(pastRows.map(r => Number(r.amount))).size > 1,
      allocation_type: latest.allocation_type ?? null,
      suggestedDate: sameSpotIn(target, latest.date, cycle),
      recordedOn: units.get(target)?.[0]?.date ?? null,
    });
  });

  return items.sort((a, b) => Number(!!a.recordedOn) - Number(!!b.recordedOn) || a.suggestedDate.localeCompare(b.suggestedDate));
}

export const parseHiddenKeys = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string') : [];
