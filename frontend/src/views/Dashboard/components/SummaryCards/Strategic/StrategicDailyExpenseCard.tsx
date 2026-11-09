import { memo } from 'react';
import { TrendingDown, Briefcase, Palmtree } from 'lucide-react';
import { formatBaht } from '@/utils/formatters';
import { Shimmer } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';

interface DailyExpenseCardProps {
  /** All expense per day, rent included. */
  dailyAvg: number;
  /** Expense per day without the rent group: the headline. */
  livingDailyAvg: number;
  /** Rent-free like the headline. */
  dailyWorkdayAvg: number;
  dailyHolidayAvg: number;
  /** The period has rent rows, so the rent-inclusive figure differs and gets its own line. */
  hasRent: boolean;
  elapsedDays: number;
  showSkeleton?: boolean;
}

/**
 * How spending moves through the week. Rent is a fixed lump that says nothing about the days,
 * so the headline and the work / day-off split leave it out; the rent-inclusive figure stays as a quiet line.
 * The total and the NEED / WANT split live elsewhere (Vitals, verdict row).
 */
export const StrategicDailyExpenseCard = memo(({
  dailyAvg,
  livingDailyAvg,
  dailyWorkdayAvg,
  dailyHolidayAvg,
  hasRent,
  elapsedDays,
  showSkeleton
}: DailyExpenseCardProps) => {
  const diff = dailyHolidayAvg - dailyWorkdayAvg;
  const heavier = Math.abs(diff) < 0.005 ? null : diff > 0 ? 'วันหยุด' : 'วันทำงาน';

  return (
    <StrategicCardShell
      icon={TrendingDown}
      label="รายจ่ายเฉลี่ย/วัน"
      thresholdRow={!showSkeleton && (
        <div className="flex flex-col gap-1.5 text-[11px] text-ink-muted leading-none">
          <div className="flex items-center justify-between">
            <span>{heavier ? `${heavier}จ่ายมากกว่า` : 'สองแบบใกล้กัน'}</span>
            {heavier && <span className="text-ink-soft font-semibold tabular-nums">{formatBaht(Math.abs(diff))}/วัน</span>}
          </div>
          {hasRent && (
            <div className="flex items-center justify-between">
              <span>รวมค่าที่พักแล้ว</span>
              <span className="tabular-nums">{formatBaht(dailyAvg)}/วัน</span>
            </div>
          )}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none text-ink-display">
              {formatBaht(hasRent ? livingDailyAvg : dailyAvg)}
            </div>
            <div className="text-[11px] text-ink-muted tabular-nums text-right">
              เฉลี่ยจาก {elapsedDays} วัน{hasRent && <><br />ไม่รวมค่าที่พัก</>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line">
            <div className="bg-canvas py-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
              <Briefcase size={13} className="shrink-0" /> ทำงาน
              <span className="ml-auto pr-2 text-ink-soft font-semibold tabular-nums">{formatBaht(dailyWorkdayAvg)}</span>
            </div>
            <div className="bg-canvas py-1 pl-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
              <Palmtree size={13} className="shrink-0" /> หยุด
              <span className="ml-auto text-ink-soft font-semibold tabular-nums">{formatBaht(dailyHolidayAvg)}</span>
            </div>
          </div>
        </div>
      )}
    </StrategicCardShell>
  );
});

StrategicDailyExpenseCard.displayName = 'StrategicDailyExpenseCard';
