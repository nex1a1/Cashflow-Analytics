import React, { memo, useState } from 'react';
import { StrategicRentCard } from './StrategicRentCard';
import { StrategicSubscriptionCard } from './StrategicSubscriptionCard';
import { StrategicLifestyleCard } from './StrategicLifestyleCard';
import { StrategicFoodCard } from './StrategicFoodCard';
import { StrategicDailyExpenseCard } from './StrategicDailyExpenseCard';
import { StrategicVictoryCard } from './StrategicVictoryCard';
import { SummaryForecasting } from '../Forecasting/SummaryForecasting';
import { SummaryGhostPacer } from '../GhostPacer/SummaryGhostPacer';
import type { SummaryAnalytics } from '../types';

export const ANALYSIS_TABS = [
  { id: 'strategic', label: 'ภาพรวมกลยุทธ์' },
  { id: 'forecast', label: 'พยากรณ์สิ้นเดือน' },
  { id: 'ghost', label: 'เทียบเดือนที่แล้ว' },
] as const;

export type AnalysisTabId = typeof ANALYSIS_TABS[number]['id'];
export type AnalysisTab = typeof ANALYSIS_TABS[number];

export interface AnalysisTabItem {
  id: AnalysisTabId;
  label: string;
  disabled?: boolean;
  title?: string;
}

const AnalysisTabHeader = ({
  activeTab,
  tabs,
  onChange,
  aside
}: {
  activeTab: AnalysisTabId;
  tabs: readonly AnalysisTabItem[];
  onChange: (id: AnalysisTabId) => void;
  aside?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-2 border-b border-line bg-surface/80">
    <div className="flex items-center gap-0.5">
      <div className="w-[3px] h-3 bg-accent shrink-0 mr-1.5" />
      {tabs.map(tab => {
        const isDisabled = Boolean(tab.disabled);
        const isActive = activeTab === tab.id && !isDisabled;
        return (
          <div key={tab.id} className="relative group/tabbtn flex items-center">
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(tab.id)}
              aria-disabled={isDisabled}
              aria-pressed={isActive}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 -mb-px transition-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed text-neutral-600 border-b-transparent hover:text-neutral-600'
                  : isActive
                  ? 'text-neutral-100 border-b-accent'
                  : 'text-neutral-500 border-b-transparent hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
            {isDisabled && tab.title && (
              <div className="absolute top-full left-0 mt-1.5 opacity-0 group-hover/tabbtn:opacity-100 pointer-events-none transition-opacity z-50 invisible group-hover/tabbtn:visible whitespace-nowrap">
                <div className="rounded-none py-1 px-2.5 text-[11px] font-medium shadow-2xl bg-surface text-neutral-300 border border-line-strong flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span>{tab.title}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    {aside}
  </div>
);

interface SummaryStrategicProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

export const SummaryStrategic = memo(({ analytics, showSkeleton }: SummaryStrategicProps) => {
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('strategic');

  const {
    totalIncome, totalSavings, netCashflow, showForecasting,
    dailyAvg, foodPercentage, foodTotal, foodDailyAvg, foodPctOfIncome,
    foodWorkdayAvg, foodHolidayAvg, dailyWorkdayAvg, dailyHolidayAvg, maxFoodDayAmount,
    variableTotal, fixedTotal, topWantCategories,
    rentPercentage, rentTotal, rentSub, datesInPeriod,
    subscriptionTotal, subscriptionPctOfIncome, subscriptionPercentage,
    subscriptionCount, topSubscriptionServices
  } = analytics;

  const periodDays  = Math.max(1, datesInPeriod?.length || 1);
  const totalExpense = fixedTotal + variableTotal;
  const dailyVictory  = netCashflow / periodDays;
  const dailyIncome   = totalIncome / periodDays;
  const dailyFixed    = fixedTotal / periodDays;
  const dailyVariable = variableTotal / periodDays;
  const dailySavings  = totalSavings / periodDays;

  const rentPercentageNum = Number.parseFloat(String(rentPercentage)) || 0;
  const lifestyleRatio    = totalIncome > 0 ? ((variableTotal / totalIncome) * 100) : 0;

  // One grade instead of six per-card pills: count the cards that break their own threshold
  // (same limits the cards colour themselves by). Deficit weighs double — it's the bottom line.
  const subPct = Number.parseFloat(String(totalIncome > 0 ? subscriptionPctOfIncome : subscriptionPercentage)) || 0;
  const breaches = [
    rentPercentageNum > 30 && 'ที่พัก',
    subPct > (totalIncome > 0 ? 10 : 15) && 'สมาชิกรายเดือน',
    lifestyleRatio > 35 && 'ฟุ่มเฟือย',
    (Number.parseFloat(String(foodPercentage)) || 0) > 25 && 'ค่าอาหาร',
    netCashflow < 0 && 'ขาดดุล',
  ].filter(Boolean) as string[];
  const score = breaches.length + (netCashflow < 0 ? 1 : 0);
  const grade =
    score === 0 ? { g: 'A', label: 'ดีเยี่ยม', cls: 'text-income border-income/30 bg-income/10' } :
    score === 1 ? { g: 'B', label: 'ดี',      cls: 'text-income border-income/30 bg-income/10' } :
    score === 2 ? { g: 'C', label: 'พอใช้',   cls: 'text-amber-400 border-amber-500/30 bg-amber-950/40' } :
                  { g: 'D', label: 'ต้องปรับ', cls: 'text-danger border-danger/40 bg-danger/10' };
  const gradePill = !showSkeleton && (
    <span className="flex items-center gap-2 pr-2 text-[11px] text-ink-muted">
      {breaches.length > 0 && <span className="hidden md:inline">เกินเกณฑ์: {breaches.join(' · ')}</span>}
      <span
        className={`px-2 py-0.5 border font-black ${grade.cls}`}
        title={breaches.length ? `เกินเกณฑ์ ${breaches.length} ด้าน` : 'ทุกด้านอยู่ในเกณฑ์'}
      >
        เกรด {grade.g} · {grade.label}
      </span>
    </span>
  );

  const isSingleMonthView = Boolean(analytics.isSingleMonthView);
  const tabItems: AnalysisTabItem[] = [
    {
      id: 'strategic',
      label: 'ภาพรวมกลยุทธ์',
      disabled: false,
    },
    {
      id: 'forecast',
      label: 'พยากรณ์สิ้นเดือน',
      disabled: !showForecasting,
      title: !showForecasting ? 'ต้องเลือกเดือนปัจจุบันเท่านั้น (เพื่อคำนวณวันคงเหลือในเดือน)' : undefined,
    },
    {
      id: 'ghost',
      label: 'เทียบเดือนที่แล้ว',
      disabled: !isSingleMonthView,
      title: !isSingleMonthView ? 'ต้องเลือกมุมมองรายเดือนเท่านั้น (เพื่อแข่งกับเดือนก่อนหน้าแบบวันต่อวัน)' : undefined,
    },
  ];
  const isTabAvailable = tabItems.some(t => t.id === activeTab && !t.disabled);
  const effectiveTab: AnalysisTabId = isTabAvailable ? activeTab : 'strategic';

  return (
    <div className="flex flex-col h-full">
      <AnalysisTabHeader activeTab={effectiveTab} tabs={tabItems} onChange={setActiveTab} aside={effectiveTab === 'strategic' && gradePill} />

      {/* All tabs' bodies mount concurrently, stacked in the same CSS grid cell
          ([grid-area:1/1]) like ExpenseProportionGrid, so the container maintains
          an identical 502px height across all 3 modes with zero layout shift on switch. */}
      <div className="flex-1 grid">
        <div
          className={`[grid-area:1/1] flex flex-col ${effectiveTab === 'strategic' ? '' : 'invisible pointer-events-none'}`}
          aria-hidden={effectiveTab !== 'strategic'}
        >
          {/* Row 1: Fixed Burdens & Wants (3 cards) */}
          <div className="px-3 py-1 bg-surface border-b border-line flex items-center gap-1.5 shrink-0">
            <span className="w-[3px] h-2.5 bg-neutral-600 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
              ภาระคงที่ • พฤติกรรมใช้จ่าย
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-fr gap-[1px] bg-surface-elevated flex-1">
            <StrategicRentCard
              rentPercentageNum={rentPercentageNum}
              rentTotal={rentTotal}
              rentSub={rentSub}
              showSkeleton={showSkeleton}
            />
            <StrategicSubscriptionCard
              subscriptionTotal={subscriptionTotal}
              subscriptionPctOfIncome={subscriptionPctOfIncome}
              subscriptionPercentage={subscriptionPercentage}
              subscriptionCount={subscriptionCount}
              topSubscriptionServices={topSubscriptionServices}
              totalIncome={totalIncome}
              showSkeleton={showSkeleton}
            />
            <StrategicLifestyleCard
              lifestyleRatio={lifestyleRatio}
              variableTotal={variableTotal}
              topWantCategories={topWantCategories}
              showSkeleton={showSkeleton}
            />
          </div>

          {/* Row 2: Daily Velocity (2 cards) */}
          <div className="px-3 py-1 bg-surface border-y border-line flex items-center gap-1.5 shrink-0">
            <span className="w-[3px] h-2.5 bg-neutral-600 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">
              จังหวะรายวัน
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 auto-rows-fr gap-[1px] bg-surface-elevated flex-1">
            <StrategicFoodCard
              foodDailyAvg={foodDailyAvg}
              foodTotal={foodTotal}
              foodPercentage={foodPercentage}
              foodPctOfIncome={foodPctOfIncome}
              foodWorkdayAvg={foodWorkdayAvg}
              foodHolidayAvg={foodHolidayAvg}
              maxFoodDayAmount={maxFoodDayAmount}
              showSkeleton={showSkeleton}
            />
            <StrategicDailyExpenseCard
              dailyAvg={dailyAvg}
              totalExpense={totalExpense}
              dailyWorkdayAvg={dailyWorkdayAvg}
              dailyHolidayAvg={dailyHolidayAvg}
              dailyFixed={dailyFixed}
              dailyVariable={dailyVariable}
              showSkeleton={showSkeleton}
            />
          </div>

          {/* Verdict: the bottom-line answer, given distinct full-width weight instead of co-equal card treatment */}
          <div className="shrink-0">
            <StrategicVictoryCard
              dailyVictory={dailyVictory}
              periodDays={periodDays}
              dailyIncome={dailyIncome}
              dailyFixed={dailyFixed}
              dailyVariable={dailyVariable}
              dailySavings={dailySavings}
              showSkeleton={showSkeleton}
            />
          </div>
        </div>

        {showForecasting && (
          <div
            className={`[grid-area:1/1] ${effectiveTab === 'forecast' ? '' : 'invisible pointer-events-none'}`}
            aria-hidden={effectiveTab !== 'forecast'}
          >
            <SummaryForecasting analytics={analytics} showSkeleton={showSkeleton} />
          </div>
        )}
        {isSingleMonthView && (
          <div
            className={`[grid-area:1/1] ${effectiveTab === 'ghost' ? '' : 'invisible pointer-events-none'}`}
            aria-hidden={effectiveTab !== 'ghost'}
          >
            <SummaryGhostPacer analytics={analytics} showSkeleton={showSkeleton} />
          </div>
        )}
      </div>
    </div>
  );
});

SummaryStrategic.displayName = 'SummaryStrategic';
