import { memo } from 'react';
import { Target } from 'lucide-react';
import { BUDGET_RULES } from '@/views/Dashboard/components/SummaryCards/helpers';
import { formatBaht, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { goalResult, type GoalVerdict, type KakeiboSummary } from '@/utils/kakeibo';

const baht = (satang: number) => formatBaht(satang / 100);
const day = (iso: string) => `${Number(iso.slice(8))} ${THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;

// แดงเฉพาะขาดดุล; ต่ำกว่าเป้าแต่ยังเหลือเป็นส้ม (เหมือนหน้าภาพรวม)
const VERDICT: Record<GoalVerdict, { label: string; sign: string; tone: string }> = {
  met: { label: 'ถึงเป้า', sign: 'เกินเป้า', tone: 'text-income' },
  short: { label: 'ต่ำกว่าเป้า', sign: 'ขาดอีก', tone: 'text-warn' },
  deficit: { label: 'ขาดดุล', sign: 'ขาด', tone: 'text-danger' },
};

interface Props {
  periodLabel: string;
  summary: KakeiboSummary;
  /** เฉพาะรายการที่เกิดขึ้นแล้วถึงวันนี้ */
  actual: KakeiboSummary;
  incomeSources: number;
}

/** หัวกระดาษ: คำตอบก่อน (ถึงเป้าไหม) แล้วค่อยตัวเลขที่ประกอบคำตอบ — คำตัดสินอ่านจากยอดตามแผน (รวมรายการลงล่วงหน้า) */
const KakeiboHeader = memo(function KakeiboHeader({ periodLabel, summary: s, actual, incomeSources }: Props) {
  const plannedExpense = s.expense - actual.expense;
  const hasPlan = plannedExpense !== 0 || s.income !== actual.income;
  const result = goalResult(s.income, s.left, s.goal);
  const pct = s.income > 0 ? Math.round((s.left / s.income) * 100) : 0;
  const verdict = result ? VERDICT[result.verdict] : null;

  return (
    <section aria-label="Kakeibo" className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-px bg-line border border-line">
      <div className="flex flex-col gap-1 px-4 py-3 bg-surface">
        <h2 className="flex items-baseline gap-2 text-base font-black text-ink-display">
          {periodLabel}
          <span className="text-[11px] font-normal text-ink-body">{day(s.start)} – {day(s.end)}</span>
        </h2>
        <p data-goal-result={result?.verdict ?? 'none'} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className={`text-2xl font-black ${verdict?.tone ?? 'text-ink-muted'}`}>{verdict?.label ?? 'ยังไม่มีรายรับ'}</span>
          {result && verdict && (
            <span className="text-[13px] font-bold text-ink-body">
              {verdict.sign} <span className="font-mono tabular-nums text-ink-display">{baht(result.diff)}</span>
            </span>
          )}
        </p>
        <span className="text-[11px] text-ink-body">
          {s.income > 0
            ? <>{hasPlan ? 'ตามแผน' : 'ตอนนี้'}เหลือ <span className="font-mono tabular-nums text-ink-display">{baht(s.left)} ({pct}%)</span> จากเป้า <span className="font-mono tabular-nums">{baht(s.goal)}</span></>
            : <>รายจ่าย <span className="font-mono tabular-nums text-ink-display">{baht(s.expense)}</span></>}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-3 bg-surface">
        <span className="text-[11px] font-bold text-ink-muted">รายรับ</span>
        <span className="text-xl font-black font-mono tabular-nums text-income">{baht(s.income)}</span>
        <span className="text-[11px] text-ink-body">{incomeSources} แหล่ง</span>
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-3 bg-surface">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink-muted"><Target className="w-3 h-3 text-savings" aria-hidden />เป้าเงินเหลือ {BUDGET_RULES.surplus.min}%</span>
        <span className="text-xl font-black font-mono tabular-nums text-ink-display">{baht(s.goal)}</span>
        <span className="text-[11px] text-ink-body">ของรายรับ</span>
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-3 bg-surface">
        <span className="text-[11px] font-bold text-ink-muted">ใช้ไปถึงวันนี้</span>
        <span className="text-xl font-black font-mono tabular-nums text-ink-display">{baht(actual.expense)}</span>
        <span className="text-[11px] text-ink-body">{hasPlan ? `ที่เหลือเป็นแผนล่วงหน้า ${baht(plannedExpense)}` : 'ไม่มีรายการล่วงหน้า'}</span>
      </div>
    </section>
  );
});

export default KakeiboHeader;
