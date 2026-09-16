// src/views/Dashboard/components/MainChart/index.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';

import { useDashboardContext } from '../../context/DashboardContext';
import { useSankeyEngine } from '../../hooks/useSankeyEngine';
import { useChartDataEngine } from '../../hooks/useChartDataEngine';
import { useChartOptions } from '../../hooks/useChartOptions';
import { MainChartHeader } from './MainChartHeader';
import { MainChartToolbar } from './MainChartToolbar';
import { MainChartLegend } from './MainChartLegend';

export default function MainChart() {
  const {
    analytics, categories, filterPeriod,
    hideFixedExpenses, setHideFixedExpenses,
    hideWantExpenses, setHideWantExpenses,
    dashboardCategory, setDashboardCategory,
    chartGroupBy, setChartGroupBy,
    showSkeleton
  } = useDashboardContext();

  // UI State
  const [chartViewType, setChartViewType] = useState('bar');
  const [sankeySortMode, setSankeySortMode] = useState('value');
  const [sankeyMode, setSankeyMode] = useState('standard');
  const [isBreakdown, setIsBreakdown] = useState(false);
  const [isSmoothLine, setIsSmoothLine] = useState(false);
  const [isLogScale, setIsLogScale] = useState(false);
  const [showCatMenu, setShowCatMenu] = useState(false);

  // Interactive Legend state
  const [hiddenDatasets, setHiddenDatasets] = useState<string[]>([]);

  // Reset interactive legend when main query inputs change to avoid state ghost paths
  useEffect(() => {
    setHiddenDatasets([]);
  }, [chartViewType, isBreakdown, dashboardCategory, filterPeriod]);

  // Filter Menu Click-Outside Logic
  const filterMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showCatMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setShowCatMenu(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCatMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showCatMenu]);

  // The Logic Engines
  const sankeyData = useSankeyEngine({ chartViewType, sankeySortMode, sankeyMode });
  const { displayChartData, legendDatasets, categoriesWithData } = useChartDataEngine({
    chartViewType, isBreakdown, isSmoothLine, sankeyData, chartGroupMode: chartGroupBy, hiddenDatasets
  });
  const options = useChartOptions({ chartViewType, isBreakdown, isLogScale });

  const card = 'rounded-none border shadow-sm transition-colors h-full flex flex-col bg-[#181818] border-[#303030]';

  return (
    <div className={`${card} min-h-0`}>
      <MainChartHeader
        chartViewType={chartViewType}
        setChartViewType={setChartViewType}
        chartGroupBy={chartGroupBy}
        setChartGroupBy={setChartGroupBy}
        setIsBreakdown={setIsBreakdown}
        filterPeriod={filterPeriod}
        mainChartType={analytics.mainChartType}
        isBreakdown={isBreakdown}
      />

      <div className="p-4 flex flex-col flex-1 min-h-0 gap-3">
        <MainChartToolbar
          chartViewType={chartViewType}
          mainChartType={analytics.mainChartType}
          showSkeleton={showSkeleton}
          isBreakdown={isBreakdown}
          setIsBreakdown={setIsBreakdown}
          isLogScale={isLogScale}
          setIsLogScale={setIsLogScale}
          hideFixedExpenses={hideFixedExpenses}
          setHideFixedExpenses={setHideFixedExpenses}
          hideWantExpenses={hideWantExpenses}
          setHideWantExpenses={setHideWantExpenses}
          isSmoothLine={isSmoothLine}
          setIsSmoothLine={setIsSmoothLine}
          sankeyMode={sankeyMode}
          setSankeyMode={setSankeyMode}
          sankeySortMode={sankeySortMode}
          setSankeySortMode={setSankeySortMode}
          showCatMenu={showCatMenu}
          setShowCatMenu={setShowCatMenu}
          filterMenuRef={filterMenuRef}
          dashboardCategory={dashboardCategory}
          setDashboardCategory={setDashboardCategory}
          categories={categories}
          categoriesWithData={categoriesWithData}
        />

        <div className="relative w-full flex-1 min-h-[350px]">
          {showSkeleton ? (
            <div className="absolute inset-0 rounded-none animate-pulse bg-[#303030]/40" />
          ) : (
            <div className="absolute inset-0">
              <Chart type={chartViewType === 'sankey' ? 'sankey' : 'bar' as any} data={displayChartData as any} options={options} />
            </div>
          )}
        </div>

        <MainChartLegend
          legendDatasets={legendDatasets}
          hiddenDatasets={hiddenDatasets}
          setHiddenDatasets={setHiddenDatasets}
          isBreakdown={isBreakdown}
          dashboardCategory={dashboardCategory}
          setDashboardCategory={setDashboardCategory}
          categories={categories}
          categoriesWithData={categoriesWithData}
        />
      </div>
    </div>
  );
}

export * from './types';
