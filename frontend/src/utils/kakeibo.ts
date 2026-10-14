import { BUDGET_RULES } from '@/views/Dashboard/components/SummaryCards/helpers';
import { cycleRange, isCyclePeriod, isSingleUnitPeriod, stripCycle } from './payCycle';
import { recurringKey } from './recurring';

export interface KakeiboRow { date: string; amount: number; group_type?: string; allocation_type?: string | null; category?: string; category_id?: string; description?: string }

/** Fix Cost: ทั้งหมวด (categoryIds) หรือเฉพาะรายการ หมวด + ชื่อรายการ (itemKeys = recurringKey เช่น ค่าไฟบ้านที่แพร่ ในหมวดครอบครัว) */
export interface FixedRule { categoryIds: ReadonlySet<string>; itemKeys: ReadonlySet<string> }
export const NO_FIXED: FixedRule = { categoryIds: new Set(), itemKeys: new Set() };

/** 'category' = ทั้งหมวดเป็น Fix Cost, 'item' = เฉพาะรายการนี้, null = ไม่ใช่.
 *  เฉพาะแถว NEED — Fix Cost คือ NEED ที่จ่ายประจำ; แถว WANT ในหมวดเดียวกันยังเป็น WANT */
export const fixedMatch = (r: KakeiboRow, rule: FixedRule): 'category' | 'item' | null =>
  r.group_type !== 'expense' || r.allocation_type !== 'need' || !r.category_id ? null
    : rule.categoryIds.has(r.category_id) ? 'category'
      : rule.itemKeys.has(recurringKey(r.category_id, r.description)) ? 'item'
        : null;

export interface WeekItem { categoryId: string; name: string; spent: number }
export interface KakeiboWeek { start: string; end: string; /** รายจ่ายผันแปร (ไม่รวมค่าใช้จ่ายคงที่) */ spent: number; /** รายจ่ายของสัปดาห์แยกตามหมวด มากไปน้อย */ items: WeekItem[] }

export interface KakeiboSummary {
  start: string;
  end: string;
  /** satang ทั้งหมด */
  income: number;
  /** เป้าเงินเหลือ = income × BUDGET_RULES.surplus.min % */
  goal: number;
  need: number;
  want: number;
  /** ลงทุน/ออมสุทธิ (ซื้อ − ขาย) — อยู่ในเงินเหลือ ไม่ใช่รายจ่าย */
  invested: number;
  expense: number;
  /** ค่าใช้จ่ายคงที่ (ตาม FixedRule) — Kakeibo หักออกก่อน แล้วแบ่งที่เหลือเป็นงบรายสัปดาห์ */
  fixed: number;
  /** income − expense */
  left: number;
  /** ใช้ได้อีกเท่าไรก่อนเงินเหลือต่ำกว่าเป้า (ติดลบ = เลยเป้าแล้ว) */
  spendable: number;
  weeks: KakeiboWeek[];
}

const DAY = 86_400_000;
const toUtc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** วันแรก–วันสุดท้ายของเดือน/รอบเดียว ('2026-10' หรือ 'cycle:2026-10'); ช่วงอื่น = null */
export const unitRange = (period: string): { start: string; end: string } | null => {
  if (!isSingleUnitPeriod(period)) return null;
  const key = stripCycle(period);
  if (isCyclePeriod(period)) return cycleRange(key);
  const last = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7), 0)).getUTCDate();
  return { start: `${key}-01`, end: `${key}-${String(last).padStart(2, '0')}` };
};

/** สรุปแบบ Kakeibo ของเดือน/รอบเดียว: รายรับ, เป้าเงินเหลือ, NEED/WANT, ลงทุน, ค่าใช้จ่ายคงที่ และรายจ่ายผันแปรรายสัปดาห์ (อา.–ส. ตามปฏิทิน) */
export function summarizeKakeibo(rows: KakeiboRow[], period: string, fixed: FixedRule = NO_FIXED): KakeiboSummary | null {
  const range = unitRange(period);
  if (!range) return null;
  const s0 = toUtc(range.start);
  const days = (toUtc(range.end) - s0) / DAY + 1;
  // สัปดาห์ตามแถวของปฏิทิน (อา.–ส.): สัปดาห์แรก/สุดท้ายอาจสั้นกว่า 7 วัน
  const offset = new Date(s0).getUTCDay();
  const weekOf = (dayIndex: number) => Math.floor((dayIndex + offset) / 7);
  const weeks: KakeiboWeek[] = [];
  for (let d = 0; d < days; d++) {
    if (weekOf(d) === weeks.length) weeks.push({ start: toIso(s0 + d * DAY), end: '', spent: 0, items: [] });
    weeks[weeks.length - 1].end = toIso(s0 + d * DAY);
  }
  let income = 0, need = 0, want = 0, invested = 0, fixedSum = 0;
  for (const r of rows) {
    if (r.date < range.start || r.date > range.end) continue;
    const satang = Math.round(r.amount * 100);
    if (r.group_type === 'income') income += satang;
    else if (r.group_type === 'savings') invested += satang;
    else if (r.group_type === 'expense') {
      if (r.allocation_type === 'need') need += satang; else want += satang;
      if (fixedMatch(r, fixed)) { fixedSum += satang; continue; }
      const week = weeks[weekOf((toUtc(r.date) - s0) / DAY)];
      week.spent += satang;
      const id = r.category_id ?? r.category ?? '';
      const item = week.items.find((x) => x.categoryId === id);
      if (item) item.spent += satang; else week.items.push({ categoryId: id, name: r.category ?? '', spent: satang });
    }
  }
  for (const w of weeks) w.items.sort((a, b) => b.spent - a.spent);
  const expense = need + want;
  const goal = Math.round((income * BUDGET_RULES.surplus.min) / 100);
  const left = income - expense;
  return { ...range, income, goal, need, want, invested, expense, fixed: fixedSum, left, spendable: left - goal, weeks };
}

export type PlanSection = 'income' | 'fixed' | 'need' | 'want' | 'invest';
export interface PlanLine { key: string; name: string; actual: number; /** Fix Cost รายการเดี่ยว: ชื่อรายการ (name ยังเป็นชื่อหมวด) */ detail?: string }

const sectionOf = (r: KakeiboRow, fixed: FixedRule): PlanSection | null =>
  r.group_type === 'income' ? 'income'
    : r.group_type === 'savings' ? 'invest'
      : r.group_type === 'expense'
        ? (fixedMatch(r, fixed) ? 'fixed' : r.allocation_type === 'need' ? 'need' : 'want')
        : null;

/** ตารางแบบ budget planner: ยอดต่อหมวดในเดือน/รอบนี้ แยก รายรับ / ค่าใช้จ่ายคงที่ / NEED / WANT / ลงทุน
 *  (Fix Cost ไปกล่องคงที่ — รายการเดี่ยวมี detail = ชื่อรายการ; ที่เหลือแยกตาม allocation ของแต่ละแถว), มากไปน้อย */
export function planLines(rows: KakeiboRow[], period: string, fixed: FixedRule = NO_FIXED): Record<PlanSection, PlanLine[]> | null {
  const range = unitRange(period);
  if (!range) return null;
  const map = new Map<string, PlanLine & { section: PlanSection }>();
  for (const r of rows) {
    const section = sectionOf(r, fixed);
    if (!section || r.date < range.start || r.date > range.end) continue;
    const item = fixedMatch(r, fixed) === 'item';
    const key = `${section}:${r.category_id ?? r.category ?? ''}${item ? `|${(r.description ?? '').trim().toLowerCase()}` : ''}`;
    const line = map.get(key) ?? { key, name: r.category ?? '', actual: 0, section, ...(item && { detail: (r.description ?? '').trim() }) };
    line.actual += Math.round(r.amount * 100);
    map.set(key, line);
  }
  const out: Record<PlanSection, PlanLine[]> = { income: [], fixed: [], need: [], want: [], invest: [] };
  for (const { section, ...line } of map.values()) out[section].push(line);
  for (const list of Object.values(out)) list.sort((a, b) => b.actual - a.actual);
  return out;
}
