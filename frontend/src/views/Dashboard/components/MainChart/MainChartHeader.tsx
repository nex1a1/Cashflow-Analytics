// src/views/Dashboard/components/MainChart/MainChartHeader.tsx
import React, { memo, useId } from 'react';
import { Layers, TrendingUp, BarChart, Network, LayoutGrid } from 'lucide-react';
import { isSingleUnitPeriod } from '@/utils/payCycle';
import { getMainChartTitle, getAvailableChartViews } from './helpers';
import { PanelTitle, SEG_GROUP, segBtn, DISABLED_OPTION, DisabledHint } from '../panelParts';
import {
  ChartGroupBySwitcherProps,
  ViewTypeSwitcherProps,
  SankeyControlsProps,
  MainChartHeaderProps,
} from './types';

const VIEW_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  line: TrendingUp,
  bar: BarChart,
  sankey: Network,
  multiples: LayoutGrid,
};

const GROUP_BY = [['monthly', 'รายเดือน'], ['daily', 'รายวัน']] as const;
const SANKEY_SORT = [['value', 'เรียงตามยอดเงิน'], ['index', 'เรียงตามลำดับในหน้าตั้งค่า']] as const;

export const ChartGroupBySwitcher = memo(({ chartGroupBy, setChartGroupBy }: ChartGroupBySwitcherProps) => (
  <div className={SEG_GROUP}>
    {GROUP_BY.map(([id, label]) => (
      <button key={id} onClick={() => setChartGroupBy(id)} className={segBtn(chartGroupBy === id)}>{label}</button>
    ))}
  </div>
));
ChartGroupBySwitcher.displayName = 'ChartGroupBySwitcher';

export const ViewTypeSwitcher = memo(({ chartViewType, setChartViewType, setIsBreakdown, isSingleMonth }: ViewTypeSwitcherProps) => {
  const views = getAvailableChartViews(Boolean(isSingleMonth));
  const reasonIdBase = useId();

  return (
    <div role="group" aria-label="ชนิดกราฟ" className={`items-center ${SEG_GROUP}`}>
      {views.map(v => {
        const Icon = VIEW_ICONS[v.id] || BarChart;
        const isDisabled = Boolean(v.disabled);
        const reasonId = isDisabled && v.title ? `${reasonIdBase}-${v.id}` : undefined;
        return (
          <div key={v.id} className="relative group/hint flex items-center">
            <button
              type="button"
              onClick={() => {
                if (isDisabled) return;
                setChartViewType(v.id);
                if (v.id === 'sankey' || v.id === 'multiples') setIsBreakdown(false);
              }}
              aria-pressed={chartViewType === v.id && !isDisabled}
              aria-disabled={isDisabled}
              aria-describedby={reasonId}
              className={`flex items-center gap-1.5 ${isDisabled ? `px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${DISABLED_OPTION}` : segBtn(chartViewType === v.id)}`}
            >
              <Icon className="w-3.5 h-3.5" /> {v.label}
            </button>
            {reasonId && <DisabledHint id={reasonId} text={v.title!} align="right" />}
          </div>
        );
      })}
    </div>
  );
});
ViewTypeSwitcher.displayName = 'ViewTypeSwitcher';

export const SankeyControls = memo(({ sankeyMode, setSankeyMode, sankeySortMode, setSankeySortMode, showSkeleton }: SankeyControlsProps) => (
  <div className="flex items-center gap-2 flex-wrap">
    <div className={SEG_GROUP}>
      <button
        disabled={showSkeleton}
        onClick={() => setSankeyMode(sankeyMode === 'allocation' ? 'standard' : 'allocation')}
        className={`flex items-center gap-1.5 disabled:opacity-40 ${segBtn(sankeyMode === 'allocation', 'bg-accent text-on-accent shadow-xs')}`}
        title="โหมดจัดสรร: แยกแสดงตาม Need (จำเป็น) / Want (ตามใจ) / Save (เงินออม)"
      >
        <Layers className="w-3 h-3" />
        {sankeyMode === 'allocation' ? 'ตามการจัดสรร' : 'แสดง Need/Want/Save'}
      </button>
    </div>

    <div className={SEG_GROUP}>
      {SANKEY_SORT.map(([id, label]) => (
        <button key={id} disabled={showSkeleton} onClick={() => setSankeySortMode(id)} className={`disabled:opacity-40 ${segBtn(sankeySortMode === id)}`}>
          {label}
        </button>
      ))}
    </div>
  </div>
));
SankeyControls.displayName = 'SankeyControls';

export const MainChartHeader = memo(({
  chartViewType, setChartViewType,
  chartGroupBy, setChartGroupBy,
  setIsBreakdown, filterPeriod,
  mainChartType, isBreakdown, dailyDisabled
}: MainChartHeaderProps) => {
  const isSingleMonth = isSingleUnitPeriod(filterPeriod);
  const showGroupBy = chartViewType !== 'sankey' && chartViewType !== 'multiples' && !isSingleMonth && !dailyDisabled; // a period too long for daily has nothing to switch between
  const title = getMainChartTitle(chartViewType, mainChartType, isBreakdown);
  const TitleIcon = chartViewType === 'sankey' ? Network : chartViewType === 'multiples' ? LayoutGrid : TrendingUp;

  return (
    <div className="px-4 py-2 border-b flex items-center justify-between bg-surface/80 border-line flex-wrap relative z-20 w-full gap-3">
      <div className="flex items-center gap-2">
        <PanelTitle icon={TitleIcon} title={title} titleKey={title} titleClassName="m-in" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showGroupBy && <ChartGroupBySwitcher chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy} />}
        <ViewTypeSwitcher chartViewType={chartViewType} setChartViewType={setChartViewType} setIsBreakdown={setIsBreakdown} isSingleMonth={isSingleMonth} />
      </div>
    </div>
  );
});
MainChartHeader.displayName = 'MainChartHeader';
