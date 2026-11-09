// src/views/Dashboard/components/SummaryCards/SummaryVitals.tsx
import { memo } from 'react';
import { Activity } from 'lucide-react';
import { calculatePeriodDelta, formatBaht } from '@/utils/formatters';
import { Shimmer, SectionHeader, BUDGET_RULES, PILL, LEVEL_PILL, NEUTRAL_PILL } from './helpers';
import { SummaryAnalytics } from './types';

interface SummaryVitalsProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

type Delta = ReturnType<typeof calculatePeriodDelta>;

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
        <span className={`text-[11px] tabular-nums truncate ${footClass}`}>{foot}</span>
      )}
      {!showSkeleton && (
        <span className={`${PILL} cursor-default ${delta.cls}`} title={delta.tooltipText}>
          {delta.text}
        </span>
      )}
    </div>
  </div>
);

export const SummaryVitals = memo(({ analytics, showSkeleton }: SummaryVitalsProps) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate, totalSavings,
    datesInPeriod, elapsedDays, prevTotals, periodLabel
  } = analytics;

  const days = Math.max(1, elapsedDays ?? datesInPeriod?.length ?? 1);
  const hasIncome = totalIncome > 0;
  // Spent + left = 100% of income, so both read from the same rounded figure.
  const spentPct = 100 - savingsRate;
  const isDeficit = netCashflow < 0;
  // Investing (SAVE) is not an expense: it sits inside what is left, so the net cell says how much of it was invested.

  const surplusLevel = isDeficit ? 'over' : savingsRate < BUDGET_RULES.surplus.min ? 'warn' : 'ok';

  const hasPriorData = Boolean(prevTotals && prevTotals.txCount > 0);
  const curPeriodLabel = periodLabel || 'PoP';

  const incomeDelta  = calculatePeriodDelta({ current: totalIncome,  prev: prevTotals?.income ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'income' });
  const expenseDelta = calculatePeriodDelta({ current: totalExpense, prev: prevTotals?.expense ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'expense' });
  const netDelta     = calculatePeriodDelta({ current: netCashflow,  prev: prevTotals ? (prevTotals.income - prevTotals.expense) : 0, hasPriorData, periodLabel: curPeriodLabel, type: 'net' });

  return (
    <div className="flex flex-col h-full">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก" />
      <div className="flex flex-col gap-px bg-line flex-1">
        <VitalCell
          label="รายรับรวม"
          valueClass="text-income"
          value={totalIncome}
          foot={`เฉลี่ย ${formatBaht(totalIncome / days)} / วัน`}
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
          foot={`เฉลี่ย ${formatBaht(totalExpense / days)} / วัน`}
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
          foot={isDeficit ? 'ขาดดุล' : totalSavings > 0 ? `ในนั้นลงทุน ${formatBaht(totalSavings)}` : 'ยังไม่มีเงินลงทุน'}
          footClass={isDeficit ? 'text-danger font-semibold' : 'text-ink-muted'}
          delta={netDelta}
          showSkeleton={showSkeleton}
        />
      </div>
    </div>
  );
});

SummaryVitals.displayName = 'SummaryVitals';
