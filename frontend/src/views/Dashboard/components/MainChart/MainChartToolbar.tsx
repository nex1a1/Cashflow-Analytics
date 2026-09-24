import React, { memo } from 'react';
import { Activity } from 'lucide-react';
import { useDashboardContext } from '../../context/DashboardContext';
import { stripCycle } from '@/utils/payCycle';
import { SankeyControls } from './MainChartHeader';
import { ToolbarViewModes, ToolbarLineStyleSelector } from './MainChartToolbarControls';
import { MainChartFilterMenu } from './MainChartCategoryFilter';
import { MainChartToolbarProps } from './types';

export const MainChartToolbar = memo(({
  chartViewType, mainChartType, showSkeleton, isBreakdown, setIsBreakdown,
  isLogScale, setIsLogScale,
  hideFixedExpenses, setHideFixedExpenses,
  hideWantExpenses, setHideWantExpenses,
  isSmoothLine, setIsSmoothLine,
  sankeyMode, setSankeyMode,
  sankeySortMode, setSankeySortMode,
  showCatMenu, setShowCatMenu, filterMenuRef,
  dashboardCategory, setDashboardCategory,
  categories, categoriesWithData
}: MainChartToolbarProps) => {
  const { filterPeriod } = useDashboardContext();
  const isAll = stripCycle(filterPeriod) === 'ALL';

  // The line-style toggle matters wherever a Cashflow line is actually drawn — that's the
  // 'line' view, and the true multi-series combo chart even while its bars render as 'bar'.
  const showLineStyleSelector = chartViewType === 'line' || mainChartType === 'combo';
  if (chartViewType === 'multiples') {
    return (
      <div className="flex items-center gap-2.5 relative z-10 flex-wrap w-full text-[10px] select-none">
        <span className="uppercase tracking-widest font-black flex items-center gap-1.5 shrink-0 text-slate-500">
          <Activity className="w-3 h-3 text-[#da291c]" /> CATEGORY TRENDS
        </span>
        <span className="w-px h-4 shrink-0 bg-[#303030]" />
        <span className="text-slate-400">
          {isAll
            ? 'ตัวเลขหลัก = เฉลี่ยต่องวด · ล่าสุด = ยอดงวดล่าสุดจริง · % = เทียบค่าเฉลี่ยรวม · เส้นประ = ยังไม่จบงวด'
            : 'ตัวเลขหลัก = เฉลี่ยต่องวด · ล่าสุด = ยอดงวดล่าสุดจริง · % = เทียบงวดก่อนหน้า (MoM) · เส้นประ = ยังไม่จบงวด'}
        </span>
      </div>
    );
  }

  // Balanced layout: If in Sankey view, render dedicated Sankey controls in the toolbar
  if (chartViewType === 'sankey') {
    return (
      <div className="flex items-center justify-between gap-3 relative z-10 flex-wrap w-full">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5 shrink-0 select-none text-slate-500">
            <Activity className="w-3 h-3 text-[#da291c] animate-pulse" /> SANKEY FLOW
          </span>

          <span className="w-px h-4 shrink-0 bg-[#303030]" />

          <SankeyControls
            sankeyMode={sankeyMode}
            setSankeyMode={setSankeyMode}
            sankeySortMode={sankeySortMode}
            setSankeySortMode={setSankeySortMode}
            showSkeleton={showSkeleton}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 relative z-10 flex-wrap w-full">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5 shrink-0 select-none text-slate-500">
          <Activity className="w-3 h-3 text-[#da291c] animate-pulse" /> MODES
        </span>

        <span className="w-px h-4 shrink-0 bg-[#303030]" />

        <ToolbarViewModes
          showSkeleton={showSkeleton}
          isBreakdown={isBreakdown}
          setIsBreakdown={setIsBreakdown}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap ml-auto">
        {showLineStyleSelector && (
          <ToolbarLineStyleSelector
            showSkeleton={showSkeleton}
            isSmoothLine={isSmoothLine}
            setIsSmoothLine={setIsSmoothLine}
          />
        )}

        <MainChartFilterMenu
          showSkeleton={showSkeleton}
          showCatMenu={showCatMenu} setShowCatMenu={setShowCatMenu} filterMenuRef={filterMenuRef}
          dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
          categories={categories} categoriesWithData={categoriesWithData}
          isLogScale={isLogScale} setIsLogScale={setIsLogScale}
          hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses}
          hideWantExpenses={hideWantExpenses} setHideWantExpenses={setHideWantExpenses}
        />
      </div>
    </div>
  );
});
MainChartToolbar.displayName = 'MainChartToolbar';
