// src/utils/budgetEnvelope.ts
// งบหลวมต่อกลุ่มรายจ่าย — จำนวนเดียวใช้ทั้งแบบ "เดือนปฏิทิน" และ "รอบเงินเดือน 25–24"
// เก็บใน settings.group_budgets เป็น { [groupId]: สตางค์ }
// แถบแสดงเฉพาะตอนเลือกดูเดือนเดียว/รอบเดียว และนับแค่ "ใช้จริง" (วันที่ <= วันนี้);
// รายการล่วงหน้าเป็นแผน แสดงเป็นส่วนจางและไม่ทำให้สีเปลี่ยน
import { PAY_DAY_START, monthKeyOf, shiftMonth, stripCycle } from './payCycle';
import { parseDateStrToObj, resolvePeriodDateBounds } from './dateHelpers';

export const BUDGETS_SETTING_KEY = 'group_budgets';
/** เกินงบ = ส้ม ไม่ใช่แดง: เกินสิบกว่าบาทไม่ควรทำให้ตกใจ แดงเมื่อเกิน 120% */
export const BUDGET_OVER_AT = 1.2;
/** จำนวนเดือน/รอบก่อนหน้าที่เอามาเฉลี่ย — ตรงกับที่ getPeriodDateRange โหลดย้อนหลังไว้ให้ (fetchStartDate) */
export const AVG_UNITS = 3;

export type BudgetLevel = 'ok' | 'warn' | 'over';

export const budgetLevel = (spent: number, budget: number): BudgetLevel =>
  spent > budget * BUDGET_OVER_AT ? 'over' : spent > budget ? 'warn' : 'ok';

export interface EnvelopeRow {
  date: string; // YYYY-MM-DD
  satang: number;
  groupId: string;
}

export interface Envelope {
  groupId: string;
  budget: number;
  spent: number;
  planned: number;
  /** ค่าเฉลี่ยของเดือน/รอบก่อนหน้า (สูงสุด AVG_UNITS ไม่นับก่อนเริ่มระบบ) — null ถ้ายังไม่มีให้เทียบ */
  avg: number | null;
  avgUnits: number;
  level: BudgetLevel;
}

/** ค่าที่อ่านจาก settings อาจเพี้ยน: เก็บเฉพาะจำนวนสตางค์ที่มากกว่า 0 */
export const parseBudgets = (raw: unknown): Record<string, number> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[id] = Math.round(v);
  }
  return out;
};

/** ข้อความในช่องกรอก (บาท): '' = ลบงบ → null, ตัวเลขผิด → false, ไม่งั้นคืนจำนวนบาท */
export const parseBudgetInput = (text: string): number | null | false => {
  const s = text.replace(/[,\s฿]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : false;
};

/** period ต้องเป็นเดือนเดียว ("2026-10") หรือรอบเดียว ("cycle:2026-09") — ผู้เรียกเช็กด้วย isSingleUnitPeriod ก่อน */
export const computeEnvelopes = (rows: EnvelopeRow[], budgets: Record<string, number>, period: string, today: string): Envelope[] => {
  const cur = stripCycle(period);
  const firstKey = PAY_DAY_START.slice(0, 7);
  const prev = Array.from({ length: AVG_UNITS }, (_, i) => shiftMonth(cur, -(i + 1))).filter((k) => k >= firstKey);

  return Object.entries(budgets).map(([groupId, budget]) => {
    let spent = 0;
    let planned = 0;
    const prevTotal: Record<string, number> = {};
    for (const r of rows) {
      if (r.groupId !== groupId) continue;
      const key = monthKeyOf(r.date, period);
      if (key === cur) {
        if (r.date <= today) spent += r.satang;
        else planned += r.satang;
      } else if (prev.includes(key)) {
        prevTotal[key] = (prevTotal[key] ?? 0) + r.satang;
      }
    }
    const avg = prev.length ? Math.round(prev.reduce((s, k) => s + (prevTotal[k] ?? 0), 0) / prev.length) : null;
    return { groupId, budget, spent, planned, avg, avgUnits: prev.length, level: budgetLevel(spent, budget) };
  });
};

/** สัดส่วนของเดือน/รอบที่ผ่านไปแล้ว (นับวันนี้ด้วย) สำหรับเส้น "ควรใช้ถึงตรงนี้" — null ถ้าช่วงยังไม่เริ่มหรือจบไปแล้ว */
export const periodElapsed = (period: string, today: string): number | null => {
  const b = resolvePeriodDateBounds(period);
  if (!b) return null;
  const t = parseDateStrToObj(today);
  const DAY = 86_400_000;
  const total = Math.round((b.end.getTime() - b.start.getTime()) / DAY) + 1;
  const done = Math.round((t.getTime() - b.start.getTime()) / DAY) + 1;
  return done < 1 || done >= total ? null : done / total;
};
