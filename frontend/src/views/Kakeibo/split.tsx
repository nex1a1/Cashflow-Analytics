// สัดส่วนรายรับ (NEED / WANT / เงินเหลือ) ที่หน้าเดือนเดียวและตารางหลายเดือนใช้ร่วมกัน
import { ALLOCATION_COLORS } from '@/constants/theme';
import { BUDGET_RULES } from '@/constants/budgetRules';
import { formatBaht, MINUS } from '@/utils/formatters';
import { goalResult, surplusGoal } from '@/utils/kakeibo';
import { stripes } from './Panel';

/** satang ของแถวสัดส่วน: เงินเหลือ = รายรับ − NEED − WANT (ลงทุนอยู่ในนี้) */
export interface SplitPoint { income: number; need: number; want: number; left: number }

const baht = (satang: number) => formatBaht(satang / 100);

// เงินเหลือ (ลงทุนอยู่ในนี้) ไม่ใช่ ลงทุน/ออม — เงินออมส่วนใหญ่อยู่นอกแอป ตัวเลขลงทุนในแอปจึงเป็น 0% แทบทุกรอบ
export const SPLIT = [
  { label: 'NEED', color: ALLOCATION_COLORS.need, of: (p: SplitPoint) => p.need },
  { label: 'WANT', color: ALLOCATION_COLORS.want, of: (p: SplitPoint) => p.want },
  { label: 'เงินเหลือ', color: ALLOCATION_COLORS.savings, of: (p: SplitPoint) => p.left },
] as const;

/** เงินเหลือ ÷ รายรับ เป็น % (ไม่มีรายรับ = null) */
export const pctLeft = (p: { income: number; left: number }) => (p.income > 0 ? Math.round((p.left / p.income) * 100) : null);
/** ติดลบใช้ MINUS เหมือนเงินติดลบ */
export const pctText = (pct: number | null) => (pct === null ? '—' : `${pct < 0 ? MINUS : ''}${Math.abs(pct)}%`);
/** สีของเงินเหลือ: ขาดดุล = แดง, ถึงเป้า = เขียว (ตัดสินด้วย goalResult ตัวเดียวกับหัวกระดาษ), นอกนั้นสีปกติ */
export const leftTone = (p: { income: number; left: number }) =>
  p.left < 0 ? 'text-danger' : goalResult(p.income, p.left, surplusGoal(p.income))?.verdict === 'met' ? 'text-income' : 'text-ink-display';

/** หลอดเดียว = รายรับของช่วงนั้น แบ่ง NEED / WANT / เงินเหลือ; ขีดขาว = เป้าเงินเหลือ; planned = ลายขีด (ช่วงที่ยังไม่ถึง) */
export function IncomeSplitBar({ point: p, track = 'bg-surface-elevated', planned = false }: { point: SplitPoint; track?: string; planned?: boolean }) {
  const scale = Math.max(p.income, p.need + p.want) || 1;
  return (
    <span
      className={`relative flex h-2.5 ${track}`}
      role="img"
      aria-label={`${planned ? 'ลงล่วงหน้า · ' : ''}NEED ${baht(p.need)} · WANT ${baht(p.want)} · เงินเหลือ ${baht(p.left)}`}
    >
      {SPLIT.map((x) => (
        <span key={x.label} style={{ width: `${(Math.max(0, x.of(p)) / scale) * 100}%`, ...(planned ? { backgroundImage: stripes(x.color, 80) } : { backgroundColor: x.color }) }} />
      ))}
      {p.income > 0 && <span aria-hidden className="absolute -inset-y-0.5 w-0.5 bg-ink-display" style={{ left: `${((p.income * (100 - BUDGET_RULES.surplus.min)) / 100 / scale) * 100}%` }} />}
    </span>
  );
}
