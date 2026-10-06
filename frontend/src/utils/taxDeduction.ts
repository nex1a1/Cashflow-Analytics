// แท็บภาษี: ลดหย่อนจาก Ledger (ผู้ใช้ผูกหมวดกับประเภทลดหย่อนเอง) + ตัวเลขจาก 50 ทวิ ปีละครั้ง → ประมาณภาษีทั้งปีและยอดขอคืน/จ่ายเพิ่ม
// เงินทั้งหมดเป็นสตางค์. อัตรา/เพดานเป็นของปีภาษี 2025–2026 ตามที่รู้ (เงินได้ 40(1) เงินเดือนเท่านั้น) — กฎหมายเปลี่ยนได้ทุกปี UI จึงเตือนให้ตรวจก่อนยื่น
import { matchCyclePreset, stripCycle, isCyclePeriod } from './payCycle';

export const TAX_PROFILE_SETTING_KEY = 'tax_profile';

export type DeductionTypeId = 'rmf' | 'thai_esg' | 'pension_ins' | 'life_ins' | 'health_ins' | 'parent_health_ins' | 'donation';

export interface DeductionType {
  id: DeductionTypeId;
  label: string;
  /** สัดส่วนของเงินได้ทั้งปี (ต้องรู้เงินได้ก่อนหักจาก 50 ทวิ) */
  pct?: number;
  /** เพดานเป็นบาท */
  max?: number;
  note?: string;
}

const B = 100; // บาท → สตางค์

export const DEDUCTION_TYPES: readonly DeductionType[] = [
  { id: 'rmf', label: 'RMF', pct: 0.3, max: 500_000 },
  { id: 'thai_esg', label: 'Thai ESG', pct: 0.3, max: 300_000 },
  { id: 'pension_ins', label: 'ประกันบำนาญ', pct: 0.15, max: 200_000 },
  { id: 'life_ins', label: 'ประกันชีวิต', max: 100_000 },
  { id: 'health_ins', label: 'ประกันสุขภาพ', max: 25_000 },
  { id: 'parent_health_ins', label: 'ประกันสุขภาพพ่อแม่', max: 15_000 },
  { id: 'donation', label: 'บริจาค', note: 'ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายและลดหย่อน' },
];

/** เพดานร่วม: เกินเมื่อไรตัดจากประเภทท้ายรายการก่อน. withPvd = PVD/กบข. จาก 50 ทวิ กินเพดานกลุ่มนี้ก่อน */
export const COMBINED_CAPS: readonly { label: string; ids: DeductionTypeId[]; max: number; withPvd?: boolean }[] = [
  { label: 'ประกันชีวิต + สุขภาพ', ids: ['health_ins', 'life_ins'], max: 100_000 },
  { label: 'กลุ่มเกษียณ (PVD/กบข. + RMF + ประกันบำนาญ)', ids: ['rmf', 'pension_ins'], max: 500_000, withPvd: true },
];

/** ค่าใช้จ่ายเงินเดือน 50% ไม่เกิน 100,000 · ลดหย่อนส่วนตัว 60,000 */
export const EXPENSE_RATE = 0.5;
export const EXPENSE_MAX = 100_000;
export const PERSONAL_ALLOWANCE = 60_000;
export const PVD_RATE = 0.15;
export const DONATION_RATE = 0.1;
/** ขั้นบันไดภาษีเงินได้บุคคลธรรมดา: [เพดานบนของขั้น (บาท), อัตรา] */
export const TAX_BRACKETS: readonly (readonly [number, number])[] = [
  [150_000, 0], [300_000, 0.05], [500_000, 0.1], [750_000, 0.15],
  [1_000_000, 0.2], [2_000_000, 0.25], [5_000_000, 0.3], [Infinity, 0.35],
];

/** ตัวเลขจาก 50 ทวิ ของปีหนึ่ง (สตางค์) */
export interface TaxYearForm {
  /** เงินได้ทั้งปีก่อนหัก */
  income?: number;
  /** ภาษีหัก ณ ที่จ่าย */
  withheld?: number;
  /** เงินสมทบประกันสังคม */
  sso?: number;
  /** เงินสะสม PVD / กบข. */
  pvd?: number;
  /** ลดหย่อนอื่นที่ไม่ผ่าน Ledger (คู่สมรส บุตร ดอกเบี้ยบ้าน Easy E-Receipt ฯลฯ) — ผู้ใช้รวมยอดเอง */
  other?: number;
  /** ผลที่ยื่นจริง (จากแบบ ภ.ง.ด.90/91 ที่ยื่นแล้ว) — เก็บเป็นประวัติ เทียบกับที่แอปประมาณ */
  filed?: TaxFiled;
}
export type TaxMoneyField = 'income' | 'withheld' | 'sso' | 'pvd' | 'other';
export const FORM_FIELDS: readonly TaxMoneyField[] = ['income', 'withheld', 'sso', 'pvd', 'other'];

export interface TaxFiled {
  /** วันที่ยื่น YYYY-MM-DD */
  date?: string;
  /** เงินได้สุทธิ (ข้อ 11 ของแบบ) */
  netIncome?: number;
  /** ภาษีที่ต้องเสียทั้งปี (ข้อ 12) */
  tax?: number;
  /** ชำระเพิ่ม */
  paid?: number;
  /** ได้คืน */
  refund?: number;
}
export type TaxFiledMoneyField = 'netIncome' | 'tax' | 'paid' | 'refund';
export const FILED_FIELDS: readonly TaxFiledMoneyField[] = ['netIncome', 'tax', 'paid', 'refund'];

export interface TaxProfile {
  /** categoryId → ประเภทลดหย่อน */
  mapping: Record<string, DeductionTypeId>;
  /** ปี → ตัวเลขจาก 50 ทวิ */
  years: Record<string, TaxYearForm>;
}

const TYPE_IDS = new Set<string>(DEDUCTION_TYPES.map(t => t.id));
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export const parseTaxProfile = (raw: unknown): TaxProfile => {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TaxProfile, unknown>>;
  const mapping: TaxProfile['mapping'] = {};
  const years: TaxProfile['years'] = {};
  if (obj.mapping && typeof obj.mapping === 'object') {
    for (const [cat, type] of Object.entries(obj.mapping)) if (typeof type === 'string' && TYPE_IDS.has(type)) mapping[cat] = type as DeductionTypeId;
  }
  if (obj.years && typeof obj.years === 'object') {
    for (const [y, form] of Object.entries(obj.years)) {
      if (!/^\d{4}$/.test(y) || !form || typeof form !== 'object') continue;
      const clean: TaxYearForm = {};
      for (const f of FORM_FIELDS) {
        const v = (form as Record<string, unknown>)[f];
        if (isAmount(v)) clean[f] = Math.round(v);
      }
      const filedRaw = (form as Record<string, unknown>).filed;
      if (filedRaw && typeof filedRaw === 'object') {
        const raw = filedRaw as Record<string, unknown>;
        const filed: TaxFiled = {};
        if (typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)) filed.date = raw.date;
        for (const f of FILED_FIELDS) if (isAmount(raw[f])) filed[f] = Math.round(raw[f] as number);
        if (Object.keys(filed).length) clean.filed = filed;
      }
      years[y] = clean;
    }
  }
  return { mapping, years };
};

/** ปีภาษีของ period: ปีปฏิทิน "2026" หรือปีแบบรอบ "cycle:2026-01_2026-12" — อย่างอื่น null (แท็บปิด) */
export const taxYearOf = (period: string): string | null => {
  if (/^\d{4}$/.test(period)) return period;
  if (!isCyclePeriod(period)) return null;
  const preset = matchCyclePreset(stripCycle(period));
  return preset?.id === 'Y' ? preset.year : null;
};

export interface TaxRow {
  id: string;
  date: string;
  category_id?: string | null;
  description?: string | null;
  amount: number | string; // บาท, ขาย = ลบ
}

export interface DeductionLine {
  type: DeductionType;
  /** จ่ายสุทธิทั้งปี (ซื้อ − ขาย, ไม่ต่ำกว่า 0) */
  paid: number;
  /** เพดานที่ใช้ (null = ไม่มีเพดานที่คิดได้) */
  cap: number | null;
  /** มีเพดาน % แต่ยังไม่ได้กรอกเงินได้ → ใช้เพดานบาทไปก่อน */
  pctUnknown: boolean;
  deductible: number;
  rows: TaxRow[];
}

export interface DeductionSummary {
  lines: DeductionLine[];
  /** PVD/กบข. ที่หักได้ (จาก 50 ทวิ) */
  pvd: number;
  /** ลดหย่อนจาก Ledger รวม (ไม่รวม PVD) */
  total: number;
  /** จ่ายแล้วแต่นับลดหย่อนไม่ได้เพราะเกินเพดาน */
  overCap: number;
  /** เพดานร่วมที่ตัดยอดไป */
  trimmed: { label: string; amount: number }[];
}

/** ฐานของเพดานบริจาค 10%: เงินได้หลังหักค่าใช้จ่ายและลดหย่อนทุกอย่าง (ยกเว้นบริจาค) */
const donationBase = (form: TaxYearForm, nonDonation: number, pvd: number): number => {
  const income = form.income ?? 0;
  return Math.max(0, income - expenseDeduction(income) - PERSONAL_ALLOWANCE * B - (form.sso ?? 0) - pvd - (form.other ?? 0) - nonDonation);
};
const expenseDeduction = (income: number) => Math.min(Math.round(income * EXPENSE_RATE), EXPENSE_MAX * B);

/**
 * รวมยอดลดหย่อนของปี year (1 ม.ค. – 31 ธ.ค.) จากแถวที่หมวดถูกผูกไว้ — แสดงเฉพาะประเภทที่มีหมวดผูกอยู่.
 * form (ถ้ามี) ให้เงินได้สำหรับเพดาน % / บริจาค และ PVD ที่กินเพดานกลุ่มเกษียณ
 */
export function computeDeductions(rows: TaxRow[], mapping: TaxProfile['mapping'], year: string, form: TaxYearForm = {}): DeductionSummary {
  const income = form.income || null;
  const pvd = Math.min(form.pvd ?? 0, income ? Math.round(income * PVD_RATE) : Infinity, 500_000 * B);

  const mappedTypes = new Set(Object.values(mapping));
  const byType = new Map<DeductionTypeId, TaxRow[]>();
  for (const r of rows) {
    const type = r.category_id ? mapping[r.category_id] : undefined;
    if (!type || r.date.slice(0, 4) !== year) continue;
    byType.set(type, [...(byType.get(type) ?? []), r]);
  }

  const lines: DeductionLine[] = DEDUCTION_TYPES.filter(t => mappedTypes.has(t.id)).map(type => {
    const typeRows = (byType.get(type.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const paid = Math.max(0, typeRows.reduce((s, r) => s + Math.round(Number(r.amount) * 100), 0));
    const pctCap = type.pct && income ? Math.round(income * type.pct) : null;
    const maxCap = type.max != null ? type.max * B : null;
    const cap = pctCap != null && maxCap != null ? Math.min(pctCap, maxCap) : (pctCap ?? maxCap);
    return { type, paid, cap, pctUnknown: !!type.pct && !income, deductible: cap == null ? paid : Math.min(paid, cap), rows: typeRows };
  });

  const trimmed: DeductionSummary['trimmed'] = [];
  for (const group of COMBINED_CAPS) {
    const members = group.ids.flatMap(id => lines.filter(l => l.type.id === id));
    let over = members.reduce((s, l) => s + l.deductible, 0) + (group.withPvd ? pvd : 0) - group.max * B;
    if (over <= 0 || members.length === 0) continue;
    over = Math.min(over, members.reduce((s, l) => s + l.deductible, 0)); // PVD itself is never trimmed here
    trimmed.push({ label: group.label, amount: over });
    for (const l of [...members].reverse()) {
      const cut = Math.min(over, l.deductible);
      l.deductible -= cut;
      over -= cut;
    }
  }

  // บริจาค: 10% ของเงินได้หลังหักทุกอย่างอื่น — คิดได้เมื่อรู้เงินได้เท่านั้น
  const donation = lines.find(l => l.type.id === 'donation');
  if (donation && income) {
    const nonDonation = lines.reduce((s, l) => s + (l === donation ? 0 : l.deductible), 0);
    donation.cap = Math.round(donationBase(form, nonDonation, pvd) * DONATION_RATE);
    donation.deductible = Math.min(donation.paid, donation.cap);
  }

  const total = lines.reduce((s, l) => s + l.deductible, 0);
  return { lines, pvd, total, overCap: lines.reduce((s, l) => s + l.paid, 0) - total, trimmed };
}

export interface TaxStep { label: string; amount: number }
export interface TaxBracketUse { from: number; to: number; rate: number; taxed: number; tax: number }
export interface TaxEstimate {
  /** เงินได้ แล้วตามด้วยรายการหัก (ติดลบ) */
  steps: TaxStep[];
  netIncome: number;
  brackets: TaxBracketUse[];
  tax: number;
  withheld: number;
  /** > 0 ต้องจ่ายเพิ่ม, < 0 ได้คืน */
  balance: number;
  /** อัตราขั้นสูงสุดที่โดน — ใช้บอกว่าลดหย่อนเพิ่ม 1 บาทประหยัดภาษีกี่สตางค์ */
  marginalRate: number;
}

/** ภาษีขั้นบันไดของเงินได้สุทธิ (สตางค์) */
export function progressiveTax(netIncome: number): { tax: number; brackets: TaxBracketUse[]; marginalRate: number } {
  const brackets: TaxBracketUse[] = [];
  let from = 0;
  let marginalRate = 0;
  for (const [upper, rate] of TAX_BRACKETS) {
    const to = upper * B;
    const taxed = Math.max(0, Math.min(netIncome, to) - from);
    if (taxed > 0) {
      brackets.push({ from, to, rate, taxed, tax: Math.round(taxed * rate) });
      marginalRate = rate;
    }
    if (netIncome <= to) break;
    from = to;
  }
  return { tax: brackets.reduce((s, b) => s + b.tax, 0), brackets, marginalRate };
}

/** ประมาณภาษีเงินเดือนทั้งปี (วิธีที่ 1 ขั้นบันได) — ต้องมีเงินได้จาก 50 ทวิ ไม่งั้น null */
export function estimateTax(form: TaxYearForm, summary: DeductionSummary): TaxEstimate | null {
  const income = form.income ?? 0;
  if (!income) return null;
  const steps: TaxStep[] = [
    { label: 'เงินได้ทั้งปี (50 ทวิ)', amount: income },
    { label: `หักค่าใช้จ่าย 50% ไม่เกิน ${EXPENSE_MAX.toLocaleString('th-TH')}`, amount: -expenseDeduction(income) },
    { label: 'ลดหย่อนส่วนตัว', amount: -PERSONAL_ALLOWANCE * B },
  ];
  if (form.sso) steps.push({ label: 'ประกันสังคม', amount: -form.sso });
  if (summary.pvd) steps.push({ label: 'PVD / กบข.', amount: -summary.pvd });
  if (summary.total) steps.push({ label: 'ลดหย่อนจาก Ledger', amount: -summary.total });
  if (form.other) steps.push({ label: 'ลดหย่อนอื่นที่กรอกเอง', amount: -form.other });

  const netIncome = Math.max(0, steps.reduce((s, x) => s + x.amount, 0));
  const { tax, brackets, marginalRate } = progressiveTax(netIncome);
  const withheld = form.withheld ?? 0;
  return { steps, netIncome, brackets, tax, withheld, balance: tax - withheld, marginalRate };
}
