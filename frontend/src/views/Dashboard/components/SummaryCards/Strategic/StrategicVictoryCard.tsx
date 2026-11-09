import React, { memo } from 'react';
import { Award, ArrowDownToLine, Lock, Target, PiggyBank } from 'lucide-react';
import { formatBaht } from '@/utils/formatters';
import { Shimmer } from '../helpers';

interface VictoryCardProps {
  dailyLeft: number;
  elapsedDays: number;
  dailyIncome: number;
  dailyNeed: number;
  dailyWant: number;
  dailySavings: number;
  showSkeleton?: boolean;
}

const Term = ({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: string; cls: string }) => (
  <div className="bg-canvas p-3 flex flex-col justify-center text-left min-w-0">
    <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1.5 leading-tight">{icon}{label}</span>
    <span className={`text-[15px] font-bold tabular-nums leading-tight mt-1 ${cls}`}>{value}</span>
  </div>
);

/**
 * The bottom line per day, written as the sum it is: income − NEED − WANT = left.
 * Investing (SAVE) is not subtracted: it is part of what is left, so it is shown inside the result.
 */
export const StrategicVictoryCard = memo(({
  dailyLeft,
  elapsedDays,
  dailyIncome,
  dailyNeed,
  dailyWant,
  dailySavings,
  showSkeleton
}: VictoryCardProps) => {
  const isPositive = dailyLeft >= 0;

  return (
    <div className="relative flex flex-col md:flex-row items-stretch bg-surface border-t border-line shrink-0">
      {!isPositive && <span aria-hidden="true" data-edge className="absolute inset-x-0 top-0 h-0.5 bg-danger" />}
      <div className="flex flex-col justify-center gap-1.5 p-4 md:min-w-[260px] md:border-r border-line">
        <div className="flex items-center gap-2">
          <Award size={15} className={`shrink-0 ${isPositive ? 'text-income' : 'text-danger'}`} />
          <span className="text-[11px] font-semibold text-ink-muted">เงินเหลือเฉลี่ยต่อวัน</span>
        </div>

        {showSkeleton ? (
          <Shimmer className="h-10 w-40 my-1" />
        ) : (
          <div className={`text-3xl xl:text-4xl font-black tabular-nums tracking-tight leading-none ${isPositive ? 'text-income' : 'text-danger'}`}>
            {formatBaht(dailyLeft)}
          </div>
        )}

        {!showSkeleton && (
          <div className="text-[11px] text-ink-muted leading-tight">
            {isPositive ? 'เหลือสุทธิ/วัน' : 'ติดลบสุทธิ/วัน'} · เฉลี่ยจาก {elapsedDays} วัน
            {dailySavings > 0 && (
              <span className="flex items-center gap-1 mt-1 text-savings">
                <PiggyBank size={12} className="shrink-0" /> ในนั้นลงทุน {formatBaht(dailySavings)}/วัน
              </span>
            )}
          </div>
        )}
      </div>

      {!showSkeleton && (
        <div className="flex-1 grid grid-cols-3 gap-px bg-line" aria-label="ที่มาของเงินเหลือต่อวัน">
          <Term icon={<ArrowDownToLine size={13} className="shrink-0 text-income" />} label="รับ/วัน" value={formatBaht(dailyIncome)} cls="text-income" />
          <Term icon={<Lock size={13} className="shrink-0" />} label="หัก จำเป็น/วัน" value={formatBaht(-dailyNeed)} cls="text-ink-display" />
          <Term icon={<Target size={13} className="shrink-0" />} label="หัก ตามใจ/วัน" value={formatBaht(-dailyWant)} cls="text-ink-display" />
        </div>
      )}
    </div>
  );
});

StrategicVictoryCard.displayName = 'StrategicVictoryCard';
