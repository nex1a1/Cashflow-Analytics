// src/views/Dashboard/components/MainChart/MainChartHeader.tsx
import React, { memo } from 'react';
import { Layers, TrendingUp, BarChart, Network } from 'lucide-react';
import { getMainChartTitle } from './helpers';
import {
  ChartGroupBySwitcherProps,
  ViewTypeSwitcherProps,
  SankeyControlsProps,
  MainChartHeaderProps,
} from './types';

// ==========================================
// SUBCOMPONENTS: HEADER & SWITCHERS
// ==========================================

export const ChartGroupBySwitcher = memo(({ chartGroupBy, setChartGroupBy }: ChartGroupBySwitcherProps) => (
  <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]/60">
    <button
      onClick={() => setChartGroupBy('monthly')}
      className={`px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${chartGroupBy === 'monthly' ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'}`}
    >
      รายเดือน
    </button>
    <button
      onClick={() => setChartGroupBy('daily')}
      className={`px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${chartGroupBy === 'daily' ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'}`}
    >
      รายวัน
    </button>
  </div>
));
ChartGroupBySwitcher.displayName = 'ChartGroupBySwitcher';

export const ViewTypeSwitcher = memo(({ chartViewType, setChartViewType, setIsBreakdown }: ViewTypeSwitcherProps) => {
  const views = [
    { id: 'line', label: 'เส้น', icon: TrendingUp },
    { id: 'bar', label: 'แท่ง', icon: BarChart },
    { id: 'sankey', label: 'Sankey', icon: Network },
  ];

  return (
    <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]/60">
      {views.map(v => {
        const Icon = v.icon;
        const isActive = chartViewType === v.id;
        return (
          <button
            key={v.id}
            onClick={() => {
              setChartViewType(v.id);
              if (v.id === 'sankey') setIsBreakdown(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${
              isActive ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {v.label}
          </button>
        );
      })}
    </div>
  );
});
ViewTypeSwitcher.displayName = 'ViewTypeSwitcher';

export const SankeyControls = memo(({ sankeyMode, setSankeyMode, sankeySortMode, setSankeySortMode, showSkeleton }: SankeyControlsProps) => (
  <div className="flex items-center gap-2 flex-wrap">
    <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]/60">
      <button
        disabled={showSkeleton}
        onClick={() => setSankeyMode(sankeyMode === 'allocation' ? 'standard' : 'allocation')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-none transition-all disabled:opacity-40 ${
          sankeyMode === 'allocation' ? 'bg-[#da291c] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="โหมดจัดสรร: แยกแสดงตาม Need (จำเป็น) / Want (อยากได้) / Save (เงินออม)"
      >
        <Layers className="w-3 h-3" />
        {sankeyMode === 'allocation' ? 'ตามการจัดสรร (Need/Want/Save)' : 'แสดง Need/Want/Save'}
      </button>
    </div>

    <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]/60">
      <button
        disabled={showSkeleton}
        onClick={() => setSankeySortMode('value')}
        className={`px-3 py-1.5 text-[10px] font-bold rounded-none transition-all disabled:opacity-40 ${
          sankeySortMode === 'value' ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
      >
        เรียงตามยอดเงิน
      </button>
      <button
        disabled={showSkeleton}
        onClick={() => setSankeySortMode('index')}
        className={`px-3 py-1.5 text-[10px] font-bold rounded-none transition-all disabled:opacity-40 ${
          sankeySortMode === 'index' ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
      >
        เรียงตามลำดับ (Settings)
      </button>
    </div>
  </div>
));
SankeyControls.displayName = 'SankeyControls';

export const MainChartHeader = memo(({
  chartViewType, setChartViewType,
  chartGroupBy, setChartGroupBy,
  setIsBreakdown, filterPeriod,
  mainChartType, isBreakdown
}: MainChartHeaderProps) => {
  const isSingleMonth = /^\d{4}-\d{2}$/.exec(filterPeriod);
  const showGroupBy = chartViewType !== 'sankey' && !isSingleMonth;
  const title = getMainChartTitle(chartViewType, mainChartType, isBreakdown);

  return (
    <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d] flex-wrap relative z-20 w-full gap-3">
      <div className="flex items-center gap-2">
        <div className="w-[3px] h-3 bg-[#da291c] shrink-0" />
        {chartViewType === 'sankey' ? (
          <Network className="w-3.5 h-3.5 text-neutral-400" />
        ) : (
          <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showGroupBy && (
          <ChartGroupBySwitcher chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy} />
        )}

        <ViewTypeSwitcher
          chartViewType={chartViewType}
          setChartViewType={setChartViewType}
          setIsBreakdown={setIsBreakdown}
        />
      </div>
    </div>
  );
});
MainChartHeader.displayName = 'MainChartHeader';
