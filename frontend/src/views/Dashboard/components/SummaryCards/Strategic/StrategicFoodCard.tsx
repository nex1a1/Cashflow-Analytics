import { memo } from 'react';
import { UtensilsCrossed, TrendingDown, Briefcase, Trophy } from 'lucide-react';
import { formatBaht } from '@/utils/formatters';
import {
  Shimmer, getFoodStatus, BUDGET_RULES, LevelBadge, ruleEdge, CARD_TONES, RuleHero, RuleFooter,
  StatCell, EmptyCell, PILL,
} from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';

interface FoodCardProps {
  foodDailyAvg: number;
  foodTotal: number;
  foodPercentage: number | string;
  foodPctOfIncome: number | string;
  foodWorkdayAvg: number;
  foodHolidayAvg: number;
  maxFoodDayAmount: number;
  showSkeleton?: boolean;
}

const tone = CARD_TONES.food;

export const StrategicFoodCard = memo(({
  foodDailyAvg,
  foodTotal,
  foodPercentage,
  foodPctOfIncome,
  foodWorkdayAvg,
  foodHolidayAvg,
  maxFoodDayAmount,
  showSkeleton
}: FoodCardProps) => {
  const { max } = BUDGET_RULES.food;
  const pctOfExpense = Number.parseFloat(String(foodPercentage)) || 0;
  const pctOfIncome  = Number.parseFloat(String(foodPctOfIncome)) || 0;
  const status = getFoodStatus(pctOfExpense);

  return (
    <StrategicCardShell
      icon={UtensilsCrossed}
      edgeClass={ruleEdge(status.level)}
      label="ค่าอาหาร"
      badge={!showSkeleton && <LevelBadge level={status.level} />}
      thresholdRow={!showSkeleton && <RuleFooter max={max} base="ของรายจ่าย" />}
      showOverlay={!showSkeleton}
      overlayTitle="เจาะลึกค่าอาหาร"
      overlayBadge={<span className={`${PILL} ${status.cls}`}>{status.label}</span>}
      overlayBody={(
        <div className="grid grid-cols-2 gap-px bg-line mt-1.5 flex-1">
          {foodTotal === 0 ? (
            <EmptyCell text="ไม่มีข้อมูลค่าอาหารในช่วงนี้" />
          ) : (
            <>
              <StatCell icon={<UtensilsCrossed size={13} className={`shrink-0 ${tone.text}`} />} label="เฉลี่ยต่อวัน" value={formatBaht(foodDailyAvg)} />
              <StatCell icon={<TrendingDown size={13} className={`shrink-0 ${tone.text}`} />} label="เทียบรายรับ" value={`${pctOfIncome.toFixed(1)}%`} sub="ของรายรับ" />
              <StatCell icon={<Briefcase size={13} className="shrink-0 text-ink-muted" />} label="วันทำงาน / วันหยุด"
                value={<>{formatBaht(foodWorkdayAvg)} <span className="text-ink-muted font-normal">/</span> {formatBaht(foodHolidayAvg)}</>} />
              <StatCell icon={<Trophy size={13} className="shrink-0 text-warn" />} label="วันที่จ่ายมากสุด" value={formatBaht(maxFoodDayAmount)} valueClassName="text-warn" />
            </>
          )}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <RuleHero pct={pctOfExpense} base="ของรายจ่าย" amount={foodTotal} max={max} level={status.level} tone={tone}>
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted tabular-nums leading-none">
            <span>เฉลี่ย <span className="text-ink-soft font-semibold">{formatBaht(foodDailyAvg)}</span>/วัน</span>
            <span>ทำงาน {formatBaht(foodWorkdayAvg)} · หยุด {formatBaht(foodHolidayAvg)}</span>
          </div>
        </RuleHero>
      )}
    </StrategicCardShell>
  );
});

StrategicFoodCard.displayName = 'StrategicFoodCard';
