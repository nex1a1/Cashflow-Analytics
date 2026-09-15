import React, { memo, useState } from 'react';
import { StrategicRentCard } from './StrategicRentCard';
import { StrategicSubscriptionCard } from './StrategicSubscriptionCard';
import { StrategicLifestyleCard } from './StrategicLifestyleCard';
import { StrategicFoodCard } from './StrategicFoodCard';
import { StrategicDailyExpenseCard } from './StrategicDailyExpenseCard';
import { StrategicVictoryCard } from './StrategicVictoryCard';
import { SummaryForecasting } from '../Forecasting/SummaryForecasting';
import type { SummaryAnalytics } from '../types';

export const ANALYSIS_TABS = [
  { id: 'strategic', label: 'ภาพรวมกลยุทธ์' },
  { id: 'forecast', label: 'พยากรณ์สิ้นเดือน' },
] as const;

export type AnalysisTabId = typeof ANALYSIS_TABS[number]['id'];
export type AnalysisTab = typeof ANALYSIS_TABS[number];

const AnalysisTabHeader = ({
  activeTab,
  tabs,
  onChange
}: {
  activeTab: AnalysisTabId;
  tabs: readonly AnalysisTab[];
  onChange: (id: AnalysisTabId) => void;
}) => (
  <div className="flex items-center justify-between px-2 border-b border-[#2d2d2d] bg-[#121212]/80">
    <div className="flex items-center gap-0.5">
      <div className="w-[3px] h-3 bg-[#da291c] shrink-0 mr-1.5" />
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={activeTab === tab.id}
          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 -mb-px transition-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white ${
            activeTab === tab.id
              ? 'text-neutral-100 border-b-[#da291c]'
              : 'text-neutral-500 border-b-transparent hover:text-neutral-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
    {activeTab === 'strategic' ? (
      <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-neutral-500 tracking-wider pr-2">
        ภาระคงที่ • พฤติกรรมใช้จ่าย • จังหวะรายวัน
      </span>
    ) : (
      <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-neutral-500 tracking-wider pr-2">
        PROJECTION &amp; SAFE ZONE
      </span>
    )}
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

  const visibleTabs = showForecasting ? ANALYSIS_TABS : ANALYSIS_TABS.filter(t => t.id !== 'forecast');
  const effectiveTab: AnalysisTabId = activeTab === 'forecast' && !showForecasting ? 'strategic' : activeTab;

  return (
    <div className="flex flex-col h-full">
      <AnalysisTabHeader activeTab={effectiveTab} tabs={visibleTabs} onChange={setActiveTab} />

      {effectiveTab === 'strategic' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#2d2d2d] flex-1">
          {/* Row 1: Fixed Burdens & Wants (3 cards) */}
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

          {/* Row 2: Daily Velocity & Cashflow (3 cards) */}
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
      )}

      {effectiveTab === 'forecast' && showForecasting && (
        <div className="flex-1">
          <SummaryForecasting analytics={analytics} showSkeleton={showSkeleton} />
        </div>
      )}
    </div>
  );
});

SummaryStrategic.displayName = 'SummaryStrategic';
