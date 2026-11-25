// src/views/Dashboard/components/SummaryCards/SummaryVitals.tsx
import { memo } from 'react';
import { Activity } from 'lucide-react';
import { calculatePeriodDelta, formatBaht, formatBahtShort, THAI_MONTHS_SHORT } from '@/utils/formatters';
import { Shimmer, SectionHeader, BUDGET_RULES, PILL, LEVEL_PILL, NEUTRAL_PILL } from './helpers';
import { SummaryAnalytics } from './types';

interface SummaryVitalsProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

type Delta = ReturnType<typeof calculatePeriodDelta>;

const monthShort = (ym: string) => THAI_MONTHS_SHORT[Number(ym.slice(5, 7)) - 1];

/** "มิ.ย.–พ.ย." for a run of months, otherwise each month listed. */
const monthsLabel = (months: string[]) => {
  if (months.length === 0) return '';
  const toIdx = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
  const contiguous = months.every((m, i) => i === 0 || toIdx(m) === toIdx(months[i - 1]) + 1);
  return contiguous && months.length > 1
    ? `${monthShort(months[0])}–${monthShort(months[months.length - 1])}`
    : months.map(monthShort).join(', ');
};

/** Foot line: the per-day average, plus what was entered ahead for months that have not started. */
const withPlan = (base: string, planned: number) => (
  planned !== 0 ? (
    <>
      <span className="block truncate">{base}</span>
      <span className="block truncate" title="ลงล่วงหน้าในเดือนที่ยังไม่ถึง ไม่นับในยอดนี้">+ แผน {formatBahtShort(planned)}</span>
    </>
  ) : base
);

interface VitalCellProps {
  label: string;
  /** `bg-*` of a left edge bar, only for a problem (a bar, not a border: the global border lock greys every border). */
  edgeClass?: string;
  valueClass: string;
  value: number;
  pill?: React.ReactNode;
  foot: React.ReactNode;
  footClass?: string;
  delta: Delta;
  showSkeleton?: boolean;
}

const VitalCell = ({ label, edgeClass, valueClass, value, pill, foot, footClass = 'text-ink-muted', delta, showSkeleton }: VitalCellProps) => (
  <div className="relative p-3 flex flex-col justify-between gap-1.5 min-h-[80px] flex-1 bg-canvas hover:bg-surface-hover">
    {edgeClass && <span aria-hidden="true" data-edge className={`absolute left-0 inset-y-0 w-0.5 ${edgeClass}`} />}
    <div className="flex justify-between items-center gap-2 min-w-0">
      <span className="text-[11px] font-semibold text-ink-muted truncate min-w-0">{label}</span>
      {!showSkeleton && pill}
    </div>

    {showSkeleton ? (
      <Shimmer className="h-8 w-28 my-1" />
    ) : (
      <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${valueClass}`}>
        {formatBaht(value)}
      </div>
    )}

    <div className="flex items-center justify-between gap-1.5">
      {showSkeleton ? (
        <Shimmer className="h-4 w-24" />
      ) : (
        <span className={`text-[11px] tabular-nums truncate min-w-0 ${footClass}`}>{foot}</span>
      )}
      {!showSkeleton && (
        <span className={`${PILL} shrink-0 cursor-default ${delta.cls}`} title={delta.tooltipText}>
          {delta.text}
        </span>
      )}
    </div>
  </div>
);

export const SummaryVitals = memo(({ analytics, showSkeleton }: SummaryVitalsProps) => {
  const { datesInPeriod, elapsedDays, prevTotals, periodLabel, vitals } = analytics;
  const totalIncome = vitals?.income ?? analytics.totalIncome;
  const totalExpense = vitals?.expense ?? analytics.totalExpense;
  const netCashflow = vitals?.net ?? analytics.netCashflow;
  const savingsRate = vitals?.savingsRate ?? analytics.savingsRate;
  const totalSavings = vitals?.savings ?? analytics.totalSavings;
  const planned = vitals?.planned ?? { income: 0, expense: 0, savings: 0 };

  const days = Math.max(1, elapsedDays ?? datesInPeriod?.length ?? 1);
  const hasIncome = totalIncome > 0;
  // Spent + left = 100% of income, so both read from the same rounded figure.
  const spentPct = 100 - savingsRate;
  const isDeficit = netCashflow < 0;
  // Investing (SAVE) is not an expense: it sits inside what is left, so the net cell says how much of it was invested.

  const surplusLevel = isDeficit ? 'over' : savingsRate < BUDGET_RULES.surplus.min ? 'warn' : 'ok';

  const hasPriorData = Boolean(prevTotals && prevTotals.txCount > 0);
  const curPeriodLabel = periodLabel || 'PoP';

  // Quarter / half / year compare only the months both periods have: the delta reads those sums, not the card value.
  const cmpIncome = prevTotals?.current?.income ?? totalIncome;
  const cmpExpense = prevTotals?.current?.expense ?? totalExpense;
  const scope = prevTotals?.months?.length
    ? ` · เทียบเฉพาะ${prevTotals.cycle ? 'รอบ' : 'เดือน'} ${monthsLabel(prevTotals.months)} ที่มีข้อมูลทั้งสองช่วง`
    : '';
  const scoped = (d: Delta): Delta => (scope && d.hasDelta ? { ...d, tooltipText: d.tooltipText + scope } : d);

  const incomeDelta  = scoped(calculatePeriodDelta({ current: cmpIncome,  prev: prevTotals?.income ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'income' }));
  const expenseDelta = scoped(calculatePeriodDelta({ current: cmpExpense, prev: prevTotals?.expense ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'expense' }));
  const netDelta     = scoped(calculatePeriodDelta({ current: cmpIncome - cmpExpense, prev: prevTotals ? (prevTotals.income - prevTotals.expense) : 0, hasPriorData, periodLabel: curPeriodLabel, type: 'net' }));

  return (
    <div className="flex flex-col h-full">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก" />
      <div className="flex flex-col gap-px bg-line flex-1">
        <VitalCell
          label="รายรับรวม"
          valueClass="text-income"
          value={totalIncome}
          foot={withPlan(`เฉลี่ย ${formatBaht(totalIncome / days)} / วัน`, planned.income)}
          delta={incomeDelta}
          showSkeleton={showSkeleton}
        />

        <VitalCell
          label="รายจ่ายรวม"
          valueClass="text-expense"
          value={totalExpense}
          pill={hasIncome ? (
            <span
              className={`${PILL} ${spentPct > 100 ? LEVEL_PILL.over : NEUTRAL_PILL}`}
              title="รายจ่าย % ของรายรับ · เป็นสีแดงเมื่อจ่ายเกินรายรับ"
            >
              ใช้ไป {spentPct.toFixed(1)}%
            </span>
          ) : (
            <span className={`${PILL} ${NEUTRAL_PILL}`} title="ช่วงนี้ไม่มีรายรับ จึงเทียบเป็น % ไม่ได้">ไม่มีรายรับให้เทียบ</span>
          )}
          foot={withPlan(`เฉลี่ย ${formatBaht(totalExpense / days)} / วัน`, planned.expense)}
          delta={expenseDelta}
          showSkeleton={showSkeleton}
        />

        <VitalCell
          label="เงินเหลือสุทธิ"
          edgeClass={isDeficit ? 'bg-danger' : undefined}
          valueClass={isDeficit ? 'text-danger' : 'text-income'}
          value={netCashflow}
          pill={hasIncome && (
            <span
              className={`${PILL} ${LEVEL_PILL[surplusLevel]}`}
              title={`เงินเหลือ % ของรายรับ · เกณฑ์ ≥ ${BUDGET_RULES.surplus.min}%`}
            >
              เหลือ {savingsRate.toFixed(1)}%{surplusLevel === 'warn' && ' · ต่ำกว่าเกณฑ์'}
            </span>
          )}
          foot={withPlan(isDeficit ? 'ขาดดุล' : totalSavings > 0 ? `ในนั้นลงทุน ${formatBaht(totalSavings)}` : 'ยังไม่มีเงินลงทุน', planned.income - planned.expense)}
          footClass={isDeficit ? 'text-danger font-semibold' : 'text-ink-muted'}
          delta={netDelta}
          showSkeleton={showSkeleton}
        />
      </div>
    </div>
  );
});

SummaryVitals.displayName = 'SummaryVitals';
