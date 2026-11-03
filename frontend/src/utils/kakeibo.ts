import { BUDGET_RULES } from '@/constants/budgetRules';
import { formatBaht } from './formatters';
import { CYCLE_PREFIX, cycleRange, isCyclePeriod, isSingleUnitPeriod, monthKeyOf, shiftMonth, stripCycle } from './payCycle';
import { isDateInFilter } from './dateHelpers';
import { recurringKey } from './recurring';
import type { Category } from '@/types';

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

/** id กลุ่มของหมวด (ฟิลด์ใหม่ cashflowGroup หรือฟิลด์เก่า cashflow_group_id) — '' = ไม่มีกลุ่ม */
export const groupIdOf = (c?: Category): string => c?.cashflowGroup ?? c?.cashflow_group_id ?? '';

/** คำในชื่อกลุ่มที่บอกว่าเป็นที่พัก — ใช้ทั้ง Kakeibo (Fix Cost อัตโนมัติ) และการ์ดที่พักใน Dashboard */
export const RENT_KEYWORDS = ['หอ', 'ที่พัก', 'rent', 'เช่า'];
/** กลุ่มที่พัก (ทั้งกลุ่มเป็น Fix Cost อัตโนมัติ) — จับจากชื่อกลุ่ม */
export const findRentGroupId = (groups: readonly { id: string; name: string }[]): string | undefined =>
  groups.find((g) => RENT_KEYWORDS.some((k) => (g.name || '').toLowerCase().includes(k)))?.id;

/** เป้าเงินเหลือ (satang) = รายรับ × BUDGET_RULES.surplus.min % */
export const surplusGoal = (income: number): number => Math.round((income * BUDGET_RULES.surplus.min) / 100);

export type GoalVerdict = 'met' | 'short' | 'deficit';
export interface GoalResult { verdict: GoalVerdict; /** เงินเหลือ ÷ รายรับ, ปัดเป็น % */ pct: number; /** satang เหนือเป้า (met) หรือต่ำกว่าเป้า (short); deficit = ยอดขาด */ diff: number }

/** ผลเทียบเป้าเงินเหลือ: ถึงเป้า / ต่ำกว่าเป้าแต่ยังเหลือ / ขาดดุล; ไม่มีรายรับ = null (ไม่มีอะไรให้เทียบ) */
export function goalResult(income: number, left: number, goal: number): GoalResult | null {
  if (income <= 0) return null;
  const pct = Math.round((left / income) * 100);
  if (left < 0) return { verdict: 'deficit', pct, diff: -left };
  // เทียบ % ปัด 1 ทศนิยม เหมือนเกรดหน้าภาพรวม (analyticsAggregation) ไม่งั้นขาดไม่กี่สตางค์ก็ "ต่ำกว่าเป้า"
  const pct1 = (x: number) => Number.parseFloat(((x / income) * 100).toFixed(1));
  return left >= goal || pct1(left) >= pct1(goal)
    ? { verdict: 'met', pct, diff: Math.max(0, left - goal) }
    : { verdict: 'short', pct, diff: goal - left };
}

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
  const goal = surplusGoal(income);
  const left = income - expense;
  return { ...range, income, goal, need, want, invested, expense, fixed: fixedSum, left, spendable: left - goal, weeks };
}

export type PlanSection = 'income' | 'fixed' | 'need' | 'want' | 'invest';
export interface PlanLine {
  key: string;
  name: string;
  /** ยอดรวมของช่วงนี้ (รวมรายการลงล่วงหน้า) */
  actual: number;
  /** ส่วนของ actual ที่ลงล่วงหน้า (วันที่หลัง today) — มีเมื่อส่ง today เข้า planLines */
  planned?: number;
  /** วันแรกที่ยังไม่ถึงของส่วนที่ลงล่วงหน้า (เช่น ค่าเช่าที่ลงไว้วันที่ 31) */
  plannedDate?: string;
  /** Fix Cost รายการเดี่ยว: ชื่อรายการ (name ยังเป็นชื่อหมวด) */
  detail?: string;
}

const sectionOf = (r: KakeiboRow, fixed: FixedRule): PlanSection | null =>
  r.group_type === 'income' ? 'income'
    : r.group_type === 'savings' ? 'invest'
      : r.group_type === 'expense'
        ? (fixedMatch(r, fixed) ? 'fixed' : r.allocation_type === 'need' ? 'need' : 'want')
        : null;

/** ตารางแบบ budget planner: ยอดต่อหมวดในเดือน/รอบนี้ แยก รายรับ / ค่าใช้จ่ายคงที่ / NEED / WANT / ลงทุน
 *  (Fix Cost ไปกล่องคงที่ — รายการเดี่ยวมี detail = ชื่อรายการ; ที่เหลือแยกตาม allocation ของแต่ละแถว), มากไปน้อย */
export function planLines(rows: KakeiboRow[], period: string, fixed: FixedRule = NO_FIXED, today?: string): Record<PlanSection, PlanLine[]> | null {
  const range = unitRange(period);
  if (!range) return null;
  const map = new Map<string, PlanLine & { section: PlanSection }>();
  for (const r of rows) {
    const section = sectionOf(r, fixed);
    if (!section || r.date < range.start || r.date > range.end) continue;
    const item = fixedMatch(r, fixed) === 'item';
    const key = `${section}:${r.category_id ?? r.category ?? ''}${item ? `|${(r.description ?? '').trim().toLowerCase()}` : ''}`;
    const line = map.get(key) ?? { key, name: r.category ?? '', actual: 0, section, ...(item && { detail: (r.description ?? '').trim() }) };
    const satang = Math.round(r.amount * 100);
    line.actual += satang;
    if (today) line.planned = (line.planned ?? 0) + (r.date > today ? satang : 0);
    if (today && r.date > today && (!line.plannedDate || r.date < line.plannedDate)) line.plannedDate = r.date;
    map.set(key, line);
  }
  const out: Record<PlanSection, PlanLine[]> = { income: [], fixed: [], need: [], want: [], invest: [] };
  for (const { section, ...line } of map.values()) out[section].push(line);
  for (const list of Object.values(out)) list.sort((a, b) => b.actual - a.actual);
  return out;
}

/** ยอดต่อ key ของ planLines (ใช้เทียบกับเดือน/รอบก่อน) — null = ช่วงนั้นไม่มีรายการเลย ไม่งั้นทุกแถวจะกลายเป็น "ใหม่" */
export function lineTotals(lines: Record<PlanSection, PlanLine[]> | null): Map<string, number> | null {
  if (!lines) return null;
  const out = new Map(Object.values(lines).flat().map((l) => [l.key, l.actual]));
  return out.size ? out : null;
}

export interface OverBudget { name: string; /** satang ที่เกินงบ */ over: number; /** % ที่เกิน (ปัดแล้ว) */ pct: number }

/** satang ขั้นต่ำที่นับว่าเปลี่ยนจากเดือนก่อนพอจะเอ่ยถึง */
const HINT_MIN_CHANGE = 10_000;

/** ข้อสังเกตจากตัวเลขสำหรับการ์ดทบทวน: งบซองที่เกิน, WANT รวมเทียบช่วงก่อน, หมวดที่เพิ่ม/ลดมากที่สุด
 *  (NEED + WANT ของหมวดเดียวกันรวมกัน, ไม่นับ Fix Cost เพราะจ่ายเท่าเดิมทุกเดือน) */
export function reflectionHints(lines: Record<PlanSection, PlanLine[]>, prev: Map<string, number> | null, over: OverBudget[], unit: string): string[] {
  const baht = (satang: number) => formatBaht(satang / 100);
  const hints = [...over].sort((a, b) => b.over - a.over).map((o) => `${o.name} เกินงบ ${baht(o.over)} (${o.pct}%)`);
  if (!prev) return hints;
  const sumOf = (section: PlanSection, totals: Map<string, number>) =>
    [...totals].reduce((n, [key, v]) => n + (key.startsWith(`${section}:`) ? v : 0), 0);
  const wantDiff = sumOf('want', lineTotals(lines) ?? new Map()) - sumOf('want', prev);
  if (Math.abs(wantDiff) >= HINT_MIN_CHANGE) hints.push(`WANT รวม${wantDiff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${baht(Math.abs(wantDiff))} จาก${unit}ก่อน`);
  // หมวด → [ยอดนี้, ยอดก่อน, มีในช่วงก่อนไหม]
  const byCat = new Map<string, { name: string; now: number; before: number; seen: boolean }>();
  const catOf = (key: string) => key.slice(key.indexOf(':') + 1);
  for (const l of [...lines.need, ...lines.want]) {
    const c = byCat.get(catOf(l.key)) ?? { name: l.name || 'ไม่ระบุหมวด', now: 0, before: 0, seen: false };
    c.now += l.actual;
    byCat.set(catOf(l.key), c);
  }
  for (const [key, v] of prev) {
    if (!key.startsWith('need:') && !key.startsWith('want:')) continue;
    const c = byCat.get(catOf(key));
    if (c) { c.before += v; c.seen = true; } // หมวดที่หายไปเดือนนี้ไม่ต้องเอ่ย
  }
  const cats = [...byCat.values()].map((c) => ({ ...c, diff: c.now - c.before }));
  const up = cats.filter((c) => c.diff >= HINT_MIN_CHANGE).sort((a, b) => b.diff - a.diff)[0];
  const down = cats.filter((c) => c.diff <= -HINT_MIN_CHANGE).sort((a, b) => a.diff - b.diff)[0];
  if (up) hints.push(up.seen ? `${up.name} เพิ่มขึ้นมากที่สุด ${baht(up.diff)} จาก${unit}ก่อน` : `${up.name} ${baht(up.now)} (${unit}ก่อนไม่มี)`);
  if (down) hints.push(`${down.name} ลดลงมากที่สุด ${baht(-down.diff)} จาก${unit}ก่อน`);
  return hints;
}

export interface TrendPoint { period: string; income: number; need: number; want: number; left: number }

/** NEED / WANT / เงินเหลือของช่วงนี้กับ count − 1 ช่วงก่อนหน้า (เก่าไปใหม่) — ข้ามช่วงที่ไม่มีทั้งรายรับและรายจ่าย (ก่อนเริ่มใช้แอป / นอกช่วงที่โหลด) */
export function unitTrend(rows: KakeiboRow[], period: string, count: number): TrendPoint[] {
  if (!isSingleUnitPeriod(period)) return [];
  const prefix = isCyclePeriod(period) ? CYCLE_PREFIX : '';
  const out: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const p = prefix + shiftMonth(stripCycle(period), -i);
    const s = summarizeKakeibo(rows, p)!;
    if (s.income || s.expense) out.push({ period: p, income: s.income, need: s.need, want: s.want, left: s.left });
  }
  return out;
}

export interface RangePoint extends TrendPoint { /** ลงทุน/ออมสุทธิ (ซื้อ − ขาย) — อยู่ในเงินเหลือ */ invested: number }

/** หลายเดือน/รอบ (ช่วง, ทั้งปี, ทั้งหมด): สรุปทีละเดือน/รอบที่มีรายการ เก่า → ใหม่ (รอบเดียวใช้ summarizeKakeibo) */
export function rangeTrend(rows: KakeiboRow[], period: string): RangePoint[] {
  const prefix = isCyclePeriod(period) ? CYCLE_PREFIX : '';
  const byUnit = new Map<string, RangePoint>();
  for (const r of rows) {
    if (!isDateInFilter(r.date, period)) continue;
    const key = prefix + monthKeyOf(r.date, period);
    let p = byUnit.get(key);
    if (!p) byUnit.set(key, p = { period: key, income: 0, need: 0, want: 0, left: 0, invested: 0 });
    const satang = Math.round(r.amount * 100);
    if (r.group_type === 'income') p.income += satang;
    else if (r.group_type === 'savings') p.invested += satang;
    else if (r.group_type === 'expense') { if (r.allocation_type === 'need') p.need += satang; else p.want += satang; }
  }
  const out = [...byUnit.values()].sort((a, b) => a.period.localeCompare(b.period));
  for (const p of out) p.left = p.income - p.need - p.want;
  return out;
}

/** รายจ่ายของแต่ละเดือน/รอบ แยกกลุ่มและหมวด (satang) — คอลัมน์ "แยกกลุ่ม" ของตารางหลายเดือน */
export interface UnitBreakdown { groups: Record<string, number>; categories: Record<string, number> }

/** key ของผลลัพธ์ = period ของแถว rangeTrend; groupOf(category_id) = id กลุ่ม ('' = ไม่ระบุ) */
export function rangeBreakdown(rows: KakeiboRow[], period: string, groupOf: (categoryId: string) => string): Map<string, UnitBreakdown> {
  const prefix = isCyclePeriod(period) ? CYCLE_PREFIX : '';
  const out = new Map<string, UnitBreakdown>();
  for (const r of rows) {
    if (r.group_type !== 'expense' || !isDateInFilter(r.date, period)) continue;
    const key = prefix + monthKeyOf(r.date, period);
    let b = out.get(key);
    if (!b) out.set(key, b = { groups: {}, categories: {} });
    const satang = Math.round(r.amount * 100);
    const cat = r.category_id ?? '';
    const group = cat ? groupOf(cat) : '';
    b.groups[group] = (b.groups[group] ?? 0) + satang;
    b.categories[cat] = (b.categories[cat] ?? 0) + satang;
  }
  return out;
}

/** ยุบแถวเล็กท้ายตาราง: แถวที่ต่ำกว่า below รวมเป็นแถวเดียว เมื่อมีอย่างน้อย min แถว (น้อยกว่านั้นยุบไปก็ไม่ช่วยให้สั้นลง) */
export function splitSmallLines(lines: PlanLine[], below: number, min = 3): { main: PlanLine[]; small: PlanLine[] } {
  const small = lines.filter((l) => l.actual < below);
  return small.length >= min ? { main: lines.filter((l) => l.actual >= below), small } : { main: lines, small: [] };
}
