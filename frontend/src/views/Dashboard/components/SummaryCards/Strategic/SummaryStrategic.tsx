import React, { memo, useId, useRef, useState } from 'react';
import { StrategicRentCard } from './StrategicRentCard';
import { StrategicSubscriptionCard } from './StrategicSubscriptionCard';
import { StrategicLifestyleCard } from './StrategicLifestyleCard';
import { StrategicFoodCard } from './StrategicFoodCard';
import { StrategicDailyExpenseCard } from './StrategicDailyExpenseCard';
import { StrategicVictoryCard } from './StrategicVictoryCard';
import { SummaryForecasting } from '../Forecasting/SummaryForecasting';
import { SummaryGhostPacer } from '../GhostPacer/SummaryGhostPacer';
import { gradeBudget } from '../helpers';
import type { SummaryAnalytics } from '../types';

export const ANALYSIS_TABS = [
  { id: 'strategic', label: 'ภาพรวมการใช้จ่าย' },
  { id: 'forecast', label: 'พยากรณ์สิ้นเดือน' },
  { id: 'ghost', label: 'เทียบเดือนที่แล้ว' },
] as const;

export type AnalysisTabId = typeof ANALYSIS_TABS[number]['id'];
export type AnalysisTab = typeof ANALYSIS_TABS[number];

export interface AnalysisTabItem<T extends string = AnalysisTabId> {
  id: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

/** แถบสลับโหมดแบบเดียวกับ SummaryCards — ใช้ซ้ำได้กับ id อื่น (เช่นหน้าพอร์ต) */
export const AnalysisTabHeader = <T extends string = AnalysisTabId>({
  activeTab,
  tabs,
  onChange,
  aside,
  label = 'สลับมุมมอง',
  idBase
}: {
  activeTab: T;
  tabs: readonly AnalysisTabItem<T>[];
  onChange: (id: T) => void;
  aside?: React.ReactNode;
  label?: string;
  /** ส่งมาเมื่อผู้เรียกมี tabpanel เอง: panel ใช้ `${idBase}-panel-${id}` และ aria-labelledby `${idBase}-tab-${id}` */
  idBase?: string;
}) => {
  const uid = useId();
  const base = idBase ?? uid;
  const listRef = useRef<HTMLDivElement>(null);

  // Roving tabindex: Tab เข้าแท็บที่เลือกอยู่ แล้วใช้ ← → Home End เลื่อนโฟกัส (รวมแท็บที่ใช้ไม่ได้ เพื่ออ่านเหตุผลได้) Enter/Space เพื่อเลือก
  const tabStopId = tabs.some(t => t.id === activeTab && !t.disabled)
    ? activeTab
    : (tabs.find(t => !t.disabled) ?? tabs[0])?.id;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const els = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : (i + dir + els.length) % els.length;
    els[next].focus();
  };

  return (
    <div className="flex items-center justify-between px-2 border-b border-line bg-surface/80">
      <div ref={listRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex items-center gap-0.5">
        <div className="w-[3px] h-3 bg-accent shrink-0 mr-1.5" aria-hidden="true" />
        {tabs.map(tab => {
          const isDisabled = Boolean(tab.disabled);
          const isActive = activeTab === tab.id && !isDisabled;
          const reasonId = isDisabled && tab.title ? `${base}-reason-${tab.id}` : undefined;
          return (
            <div key={tab.id} className="relative group/tabbtn flex items-center">
              <button
                type="button"
                role="tab"
                id={`${base}-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={idBase && !isDisabled ? `${idBase}-panel-${tab.id}` : undefined}
                aria-disabled={isDisabled}
                aria-describedby={reasonId}
                tabIndex={tab.id === tabStopId ? 0 : -1}
                onClick={() => !isDisabled && onChange(tab.id)}
                className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 -mb-px transition-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed text-neutral-600 border-b-transparent hover:text-neutral-600'
                    : isActive
                    ? 'text-neutral-100 border-b-accent-ink'
                    : 'text-neutral-500 border-b-transparent hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
              {reasonId && (
                <div id={reasonId} role="tooltip" className="absolute top-full left-0 mt-1.5 opacity-0 group-hover/tabbtn:opacity-100 group-focus-within/tabbtn:opacity-100 pointer-events-none transition-opacity z-50 invisible group-hover/tabbtn:visible group-focus-within/tabbtn:visible whitespace-nowrap">
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
};

interface SummaryStrategicProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

export const SummaryStrategic = memo(({ analytics, showSkeleton }: SummaryStrategicProps) => {
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('strategic');
  const tabsId = useId();
  const panelProps = (id: AnalysisTabId) => ({
    role: 'tabpanel' as const,
    id: `${tabsId}-panel-${id}`,
    'aria-labelledby': `${tabsId}-tab-${id}`,
    'aria-hidden': effectiveTab !== id,
  });

  const {
    totalIncome, totalSavings, netCashflow, savingsRate, showForecasting,
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

  // The dashboard's only grade — thresholds come from BUDGET_RULES, the same ones the cards colour by.
  const { breaches, grade } = gradeBudget({
    rentPct: rentPercentageNum,
    subscriptionPct: Number.parseFloat(String(totalIncome > 0 ? subscriptionPctOfIncome : subscriptionPercentage)) || 0,
    hasIncome: totalIncome > 0,
    lifestylePct: lifestyleRatio,
    foodPctOfExpense: Number.parseFloat(String(foodPercentage)) || 0,
    surplusPct: savingsRate,
    netCashflow,
  });
  const gradePill = !showSkeleton && (
    <span className="flex items-center gap-2 pr-2 text-[11px] text-ink-muted">
      {breaches.length > 0 && <span className="hidden md:inline">เกินเกณฑ์ [ {breaches.join(' · ')} ]</span>}
      <span
        className={`px-2 py-0.5 rounded-pill border font-black ${grade.cls}`}
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
      label: 'ภาพรวมการใช้จ่าย',
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
      title: !isSingleMonthView ? 'ต้องเลือกมุมมองรายเดือนเท่านั้น (เพื่อเทียบกับเดือนก่อนแบบวันต่อวัน)' : undefined,
    },
  ];
  const isTabAvailable = tabItems.some(t => t.id === activeTab && !t.disabled);
  const effectiveTab: AnalysisTabId = isTabAvailable ? activeTab : 'strategic';

  return (
    <div className="flex flex-col h-full">
      <AnalysisTabHeader activeTab={effectiveTab} tabs={tabItems} onChange={setActiveTab} aside={effectiveTab === 'strategic' && gradePill} idBase={tabsId} label="มุมมองสรุปรายจ่าย" />

      {/* All tabs' bodies mount concurrently, stacked in the same CSS grid cell
          ([grid-area:1/1]) like ExpenseProportionGrid, so the container maintains
          an identical 502px height across all 3 modes with zero layout shift on switch. */}
      <div className="flex-1 grid">
        <div
          className={`[grid-area:1/1] flex flex-col ${effectiveTab === 'strategic' ? '' : 'invisible pointer-events-none'}`}
          {...panelProps('strategic')}
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
            {...panelProps('forecast')}
          >
            <SummaryForecasting analytics={analytics} showSkeleton={showSkeleton} />
          </div>
        )}
        {isSingleMonthView && (
          <div
            className={`[grid-area:1/1] ${effectiveTab === 'ghost' ? '' : 'invisible pointer-events-none'}`}
            {...panelProps('ghost')}
          >
            <SummaryGhostPacer analytics={analytics} showSkeleton={showSkeleton} />
          </div>
        )}
      </div>
    </div>
  );
});

SummaryStrategic.displayName = 'SummaryStrategic';
