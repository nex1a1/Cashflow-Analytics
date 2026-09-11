// src/views/Dashboard/components/MainChart.tsx
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Layers, TrendingUp, BarChart, Network,
  Filter, ChevronDown, Search, Activity,
  LayoutGrid, Shuffle, Check, X
} from 'lucide-react';

import { useDashboardContext } from '../context/DashboardContext';
import { useSankeyEngine } from '../hooks/useSankeyEngine';
import { useChartDataEngine } from '../hooks/useChartDataEngine';
import { useChartOptions } from '../hooks/useChartOptions';
import { Category } from '@/types';
import CategoryGlyph from '@/components/shared/CategoryGlyph';

// ==========================================
// TYPE INTERFACES
// ==========================================

interface ChartGroupBySwitcherProps {
  chartGroupBy: string;
  setChartGroupBy: (v: string) => void;
}

interface ViewTypeSwitcherProps {
  chartViewType: string;
  setChartViewType: (v: string) => void;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
}

interface SankeyControlsProps {
  sankeyMode: string;
  setSankeyMode: (v: string) => void;
  sankeySortMode: string;
  setSankeySortMode: (v: string) => void;
  showSkeleton?: boolean;
}

interface MainChartHeaderProps {
  chartViewType: string;
  setChartViewType: (v: string) => void;
  chartGroupBy: string;
  setChartGroupBy: (v: string) => void;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterPeriod: string;
  mainChartType?: string;
}

interface MainChartCategorySelectorProps {
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

interface MainChartFilterMenuProps {
  showCatMenu: boolean;
  setShowCatMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterMenuRef: React.RefObject<HTMLDivElement>;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
}

interface BreakdownLegendItemProps {
  category: Category;
  isActive: boolean;
  onToggle: (catName: string) => void;
}

interface BreakdownLegendProps {
  categories: Category[];
  categoriesWithData: Set<string>;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
}

export interface LegendDataset {
  label?: string;
  type?: string;
  borderColor?: string;
  backgroundColor?: string;
  data?: number[];
  [key: string]: any;
}

interface StandardLegendItemProps {
  dataset: LegendDataset;
  isHidden: boolean;
  onToggle: (label: string) => void;
}

interface StandardLegendProps {
  legendDatasets: LegendDataset[];
  hiddenDatasets: string[];
  setHiddenDatasets: React.Dispatch<React.SetStateAction<string[]>>;
}

interface MainChartLegendProps {
  legendDatasets: LegendDataset[];
  hiddenDatasets: string[];
  setHiddenDatasets: React.Dispatch<React.SetStateAction<string[]>>;
  isBreakdown: boolean;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
}

interface ToolbarToggleSwitchProps {
  isActive: boolean;
  activeColor?: string;
}

interface ToolbarViewModesProps {
  showSkeleton?: boolean;
  isBreakdown: boolean;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  isLogScale: boolean;
  setIsLogScale: (v: boolean | ((prev: boolean) => boolean)) => void;
}

interface ToolbarAllocationSelectorProps {
  showSkeleton?: boolean;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: (v: boolean) => void;
  hideWantExpenses: boolean;
  setHideWantExpenses: (v: boolean) => void;
}

interface ToolbarLineStyleSelectorProps {
  showSkeleton?: boolean;
  isSmoothLine: boolean;
  setIsSmoothLine: (v: boolean) => void;
}

interface MainChartToolbarProps {
  chartViewType: string;
  showSkeleton?: boolean;
  isBreakdown: boolean;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  isLogScale: boolean;
  setIsLogScale: (v: boolean | ((prev: boolean) => boolean)) => void;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: (v: boolean) => void;
  hideWantExpenses: boolean;
  setHideWantExpenses: (v: boolean) => void;
  isSmoothLine: boolean;
  setIsSmoothLine: (v: boolean) => void;
  sankeyMode: string;
  setSankeyMode: (v: string) => void;
  sankeySortMode: string;
  setSankeySortMode: (v: string) => void;
  showCatMenu: boolean;
  setShowCatMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterMenuRef: React.RefObject<HTMLDivElement>;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
}

// ==========================================
// TITLE & CONTRAST HELPERS
// ==========================================

function getMainChartTitle(chartViewType: string, mainChartType?: string): string {
  if (chartViewType === 'sankey') {
    return 'โครงสร้างกระแสเงินสด (Sankey Flow)';
  }
  if (mainChartType === 'combo') {
    return 'วิเคราะห์กระแสเงินสด';
  }
  if (mainChartType === 'bar') {
    return 'เทรนด์เปรียบเทียบ';
  }
  return 'รายจ่ายรายวัน';
}

const getContrastTextColor = (hexColor: string | null | undefined): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '#ffffff';
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 145 ? '#0f172a' : '#ffffff';
};

// ==========================================
// SUBCOMPONENTS: HEADER & SWITCHERS
// ==========================================

const ChartGroupBySwitcher = memo(({ chartGroupBy, setChartGroupBy }: ChartGroupBySwitcherProps) => (
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

const ViewTypeSwitcher = memo(({ chartViewType, setChartViewType, setIsBreakdown }: ViewTypeSwitcherProps) => {
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

const SankeyControls = memo(({ sankeyMode, setSankeyMode, sankeySortMode, setSankeySortMode, showSkeleton }: SankeyControlsProps) => (
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

const MainChartHeader = memo(({
  chartViewType, setChartViewType,
  chartGroupBy, setChartGroupBy,
  setIsBreakdown, filterPeriod,
  mainChartType
}: MainChartHeaderProps) => {
  const isSingleMonth = /^\d{4}-\d{2}$/.exec(filterPeriod);
  const showGroupBy = chartViewType !== 'sankey' && !isSingleMonth;
  const title = getMainChartTitle(chartViewType, mainChartType);

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

// ==========================================
// SUBCOMPONENTS: CATEGORY SELECTOR & FILTER
// ==========================================

const MainChartCategorySelector = memo(({
  dashboardCategory, setDashboardCategory, categories, categoriesWithData,
  searchQuery, setSearchQuery
}: MainChartCategorySelectorProps) => {
  const activeCats = useMemo(() =>
    Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory],
    [dashboardCategory]
  );

  const allExpenseCatNames = useMemo(() =>
    categories
      .filter(c => c.type === 'expense' && categoriesWithData.has(c.name))
      .map(c => c.name),
    [categories, categoriesWithData]
  );

  const variableCatNames = useMemo(() =>
    categories
      .filter(c => c.type === 'expense' && c.allocation_type !== 'need' && categoriesWithData.has(c.name))
      .map(c => c.name),
    [categories, categoriesWithData]
  );

  const isAllActive = activeCats.includes('ALL') || activeCats.length === allExpenseCatNames.length;
  const isVariableActive = !isAllActive && variableCatNames.length > 0 &&
    activeCats.length === variableCatNames.length &&
    variableCatNames.every(n => activeCats.includes(n));

  const toggleCategory = useCallback((catName: string) => {
    if (catName === 'ALL') {
      setDashboardCategory(['ALL']);
      return;
    }
    let currentActive = activeCats.includes('ALL') ? [...allExpenseCatNames] : [...activeCats];
    if (currentActive.includes(catName)) {
      currentActive = currentActive.filter(c => c !== catName);
    } else {
      currentActive.push(catName);
    }
    if (currentActive.length === 0 || currentActive.length === allExpenseCatNames.length) {
      setDashboardCategory(['ALL']);
    } else {
      setDashboardCategory(currentActive);
    }
  }, [activeCats, allExpenseCatNames, setDashboardCategory]);

  const selectAllVariable = useCallback(() => {
    setDashboardCategory(variableCatNames.length > 0 ? variableCatNames : ['ALL']);
  }, [variableCatNames, setDashboardCategory]);

  const filteredCategories = useMemo(() =>
    categories.filter(c =>
      c.type === 'expense' &&
      categoriesWithData.has(c.name) &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.icon && c.icon.includes(searchQuery)))
    ),
    [categories, categoriesWithData, searchQuery]
  );

  const selectedCount = isAllActive ? allExpenseCatNames.length : activeCats.length;

  return (
    <>
      {/* Quick Presets */}
      <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]/60">
        <button
          onClick={() => setDashboardCategory(['ALL'])}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors ${
            isAllActive ? 'bg-[#303030] text-[#da291c]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> ทั้งหมด (รวม)
        </button>
        <button
          onClick={selectAllVariable}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors ${
            isVariableActive ? 'bg-[#303030] text-[#da291c]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" /> เฉพาะผันแปร
        </button>
      </div>

      {/* Search Bar inside categories tab */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาหมวดหมู่..."
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-sm border outline-none font-medium transition-colors bg-[#121212] border-[#303030] text-slate-200 focus:border-slate-400 placeholder-slate-600"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Checklist */}
      <div className="grid grid-cols-2 gap-1 mt-0.5 max-h-[320px] overflow-y-auto pr-1 select-none">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(c => {
            const isActive = isAllActive || activeCats.includes(c.name) || activeCats.includes(c.id);
            const tickColor = getContrastTextColor(c.color);
            return (
              <button
                key={c.id}
                onClick={() => toggleCategory(c.name)}
                style={{
                  backgroundColor: isActive ? `${c.color || '#64748b'}1a` : 'transparent',
                  // border-color is globally hardened to a hairline gray (darkMode.css); an
                  // inset box-shadow is the only way to still ring the chip in its category color.
                  boxShadow: isActive ? `inset 0 0 0 1px ${c.color || '#64748b'}66` : 'none',
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-none border border-[#2d2d2d] text-[11px] font-semibold text-left transition-colors ${
                  isActive ? 'text-slate-100' : 'text-slate-500 hover:border-[#484848] hover:text-slate-300'
                }`}
              >
                <span
                  className="w-3 h-3 shrink-0 flex items-center justify-center rounded-none"
                  style={{ backgroundColor: isActive ? (c.color || '#64748b') : 'transparent' }}
                >
                  {isActive && <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: tickColor }} />}
                </span>
                <span className="truncate">
                  {c.icon && <CategoryGlyph icon={c.icon} color={c.color} size={12} className="mr-1 opacity-90 inline" />}
                  {c.name}
                </span>
              </button>
            );
          })
        ) : (
          <div className="col-span-2 text-[11px] italic py-6 text-center text-slate-500">
            ไม่พบหมวดหมู่ที่ต้องการ
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-2.5 mt-0.5 border-t border-[#303030]/60">
        <span className="text-[10px] font-semibold text-slate-500">
          เลือก <span className="text-slate-200">{selectedCount}</span> จาก {allExpenseCatNames.length} หมวดหมู่
        </span>
        {!isAllActive && (
          <button
            onClick={() => setDashboardCategory(['ALL'])}
            className="text-[10px] font-bold uppercase tracking-wide text-[#da291c] hover:text-white"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </>
  );
});
MainChartCategorySelector.displayName = 'MainChartCategorySelector';

const MainChartFilterMenu = memo(({
  showCatMenu, setShowCatMenu, filterMenuRef,
  dashboardCategory, setDashboardCategory,
  categories, categoriesWithData
}: MainChartFilterMenuProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when menu closes
  useEffect(() => {
    if (!showCatMenu) {
      setSearchQuery('');
    }
  }, [showCatMenu]);

  const isFiltered = Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL');

  return (
    <div className="relative" ref={filterMenuRef}>
      <button
        onClick={() => setShowCatMenu(prev => !prev)}
        style={isFiltered ? { boxShadow: 'inset 0 0 0 1px rgba(218,41,28,0.5)' } : undefined}
        className={`px-3 py-1.5 border border-[#303030] rounded-none text-[11px] font-bold outline-none flex items-center gap-1.5 transition-colors ${
          isFiltered
            ? 'bg-[#181818] text-[#da291c]'
            : showCatMenu
              ? 'bg-[#303030] text-slate-100'
              : 'bg-[#181818] text-slate-200 hover:bg-[#303030]/50'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        ตัวกรองแสดงผล
        {isFiltered && (
          <span className="px-1.5 rounded-full text-[9px] font-black bg-[#da291c]/20 text-[#da291c] border border-[#da291c]/40">
            {dashboardCategory.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCatMenu ? 'rotate-180' : ''}`} />
      </button>

      {showCatMenu && (
        <div className="absolute right-0 top-full mt-2 w-[460px] max-w-[90vw] rounded-none shadow-2xl border z-[45] flex flex-col overflow-hidden bg-[#181818] border-[#303030]">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between border-[#303030] text-slate-200">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#da291c]" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">เลือกหมวดหมู่ย่อย</span>
            </div>
            <button
              onClick={() => setShowCatMenu(false)}
              className="text-slate-500 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 flex flex-col gap-3">
            <MainChartCategorySelector
              dashboardCategory={dashboardCategory}
              setDashboardCategory={setDashboardCategory}
              categories={categories}
              categoriesWithData={categoriesWithData}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
        </div>
      )}
    </div>
  );
});
MainChartFilterMenu.displayName = 'MainChartFilterMenu';

// ==========================================
// SUBCOMPONENTS: LEGENDS
// ==========================================

function updateActiveCategories(catName: string, activeCats: string[], allCatNames: string[]): string[] {
  const base = activeCats.includes('ALL') ? [...allCatNames] : [...activeCats];
  const next = base.includes(catName) ? base.filter(c => c !== catName) : [...base, catName];
  return (next.length === 0 || next.length === allCatNames.length) ? ['ALL'] : next;
}

const BreakdownLegendItem = memo(({ category, isActive, onToggle }: BreakdownLegendItemProps) => {
  const isHidden = !isActive;
  return (
    <button
      onClick={() => onToggle(category.name)}
      className={`flex items-center gap-1.5 border border-transparent rounded-none px-1.5 py-0.5 transition-opacity duration-100 hover:opacity-80 select-none cursor-pointer ${
        isHidden ? 'opacity-35 line-through' : 'opacity-100'
      }`}
      title="คลิกเพื่อเปิด/ซ่อนหมวดหมู่นี้"
    >
      <span
        className="inline-block rounded-none shrink-0 w-2.5 h-2.5"
        style={{ backgroundColor: category.color || '#64748B' }}
      />
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {category.icon && <CategoryGlyph icon={category.icon} color={category.color} size={10} className="mr-1 opacity-90 inline" />}
        {category.name}
      </span>
    </button>
  );
});
BreakdownLegendItem.displayName = 'BreakdownLegendItem';

const BreakdownLegend = memo(({ categories, categoriesWithData, dashboardCategory, setDashboardCategory }: BreakdownLegendProps) => {
  const catsWithDataList = useMemo(() =>
    categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name)),
    [categories, categoriesWithData]
  );
  const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
  const allCatNames = useMemo(() => catsWithDataList.map(c => c.name), [catsWithDataList]);

  const handleToggle = useCallback((catName: string) => {
    setDashboardCategory(updateActiveCategories(catName, activeCats, allCatNames));
  }, [activeCats, allCatNames, setDashboardCategory]);

  if (catsWithDataList.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t border-[#303030]/60">
      {catsWithDataList.map(c => {
        const isActive = activeCats.includes('ALL') || activeCats.includes(c.name) || activeCats.includes(c.id);
        return (
          <BreakdownLegendItem
            key={c.id}
            category={c}
            isActive={isActive}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
});
BreakdownLegend.displayName = 'BreakdownLegend';

function getDatasetIndicatorStyle(ds: LegendDataset) {
  const isLine = ds.type === 'line';
  return {
    width: isLine ? 16 : 10,
    height: isLine ? 3 : 10,
    backgroundColor: isLine
      ? (ds.borderColor || ds.backgroundColor || '#64748B')
      : (ds.backgroundColor || ds.borderColor || '#64748B'),
  };
}

const StandardLegendItem = memo(({ dataset, isHidden, onToggle }: StandardLegendItemProps) => {
  const label = dataset.label || '';
  return (
    <button
      onClick={() => onToggle(label)}
      className={`flex items-center gap-1.5 border border-transparent rounded-none px-1.5 py-0.5 transition-opacity duration-100 hover:opacity-80 select-none cursor-pointer ${
        isHidden ? 'opacity-35 line-through' : 'opacity-100'
      }`}
      title="คลิกเพื่อเปิด/ซ่อนชุดข้อมูลนี้"
    >
      <span
        className="inline-block rounded-none shrink-0"
        style={getDatasetIndicatorStyle(dataset)}
      />
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {label}
      </span>
    </button>
  );
});
StandardLegendItem.displayName = 'StandardLegendItem';

const StandardLegend = memo(({ legendDatasets, hiddenDatasets, setHiddenDatasets }: StandardLegendProps) => {
  const toggleDataset = useCallback((label: string) => {
    setHiddenDatasets(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  }, [setHiddenDatasets]);

  if (legendDatasets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t border-[#303030]/60">
      {legendDatasets.map((ds, i) => (
        <StandardLegendItem
          key={ds.label || i}
          dataset={ds}
          isHidden={Boolean(ds.label && hiddenDatasets.includes(ds.label))}
          onToggle={toggleDataset}
        />
      ))}
    </div>
  );
});
StandardLegend.displayName = 'StandardLegend';

const MainChartLegend = memo(({ 
  legendDatasets, 
  hiddenDatasets, 
  setHiddenDatasets, 
  isBreakdown,
  dashboardCategory,
  setDashboardCategory,
  categories,
  categoriesWithData
}: MainChartLegendProps) => {
  if (isBreakdown) {
    return (
      <BreakdownLegend
        categories={categories}
        categoriesWithData={categoriesWithData}
        dashboardCategory={dashboardCategory}
        setDashboardCategory={setDashboardCategory}
      />
    );
  }

  return (
    <StandardLegend
      legendDatasets={legendDatasets}
      hiddenDatasets={hiddenDatasets}
      setHiddenDatasets={setHiddenDatasets}
    />
  );
});
MainChartLegend.displayName = 'MainChartLegend';

// ==========================================
// SUBCOMPONENTS: TOOLBAR CONTROLS
// ==========================================

const ToolbarToggleSwitch = memo(({ isActive, activeColor = 'bg-[#da291c]' }: ToolbarToggleSwitchProps) => (
  <div className={`relative w-7 h-4 rounded-none shrink-0 ${
    isActive ? `${activeColor} shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]` : 'bg-[#181818] border border-[#303030]'
  }`}>
    <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-none ease-out transition-transform ${
      isActive ? 'bg-white translate-x-3.5 shadow-md' : 'bg-[#303030]'
    }`} />
  </div>
));
ToolbarToggleSwitch.displayName = 'ToolbarToggleSwitch';

const ToolbarViewModes = memo(({ 
  showSkeleton, 
  isBreakdown, 
  setIsBreakdown, 
  isLogScale, 
  setIsLogScale
}: ToolbarViewModesProps) => (
  <div className="flex gap-[1px] bg-[#303030]/60 p-[1px] rounded-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] bg-neutral-900 shrink-0">
    <button
      disabled={showSkeleton}
      onClick={() => setIsBreakdown(prev => !prev)}
      title="แจกแจงแยกตามหมวดหมู่ค่าใช้จ่าย"
      className={`group px-3 py-1.5 rounded-none text-[11px] font-bold tracking-wide select-none flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
        isBreakdown
          ? 'bg-[#da291c]/25 text-[#da291c] shadow-sm'
          : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <Layers className={`w-3.5 h-3.5 ${isBreakdown ? 'text-[#da291c]' : 'text-slate-400'}`} />
      <span>แจกแจง</span>
      <ToolbarToggleSwitch isActive={isBreakdown} activeColor="bg-[#da291c]" />
    </button>

    <button
      disabled={showSkeleton}
      onClick={() => setIsLogScale(prev => !prev)}
      title="ปรับสเกลแกน Y แบบ Logarithmic เพื่อเปรียบเทียบหมวดหมู่อย่างชัดเจน"
      className={`group px-3 py-1.5 rounded-none text-[11px] font-bold tracking-wide select-none flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
        isLogScale
          ? 'bg-emerald-600/20 text-emerald-300 shadow-sm'
          : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <BarChart className={`w-3.5 h-3.5 ${isLogScale ? 'text-emerald-400' : 'text-slate-400'}`} />
      <span>สเกล Log</span>
      <ToolbarToggleSwitch isActive={isLogScale} activeColor="bg-emerald-500" />
    </button>
  </div>
));
ToolbarViewModes.displayName = 'ToolbarViewModes';

const ToolbarAllocationSelector = memo(({
  showSkeleton,
  hideFixedExpenses, setHideFixedExpenses,
  hideWantExpenses, setHideWantExpenses
}: ToolbarAllocationSelectorProps) => {
  const isAll = !hideFixedExpenses && !hideWantExpenses;
  const isWantOnly = hideFixedExpenses && !hideWantExpenses;
  const isNeedOnly = !hideFixedExpenses && hideWantExpenses;

  return (
    <div className="flex p-[1px] bg-[#303030]/60 gap-[1px] bg-neutral-900 rounded-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] shrink-0">
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(false); setHideWantExpenses(false); }}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isAll ? 'bg-[#303030] text-white shadow-sm' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="แสดงค่าใช้จ่ายทั้งหมด (NEED + WANT)"
      >
        ทั้งหมด
      </button>
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(true); setHideWantExpenses(false); }}
        style={isWantOnly ? { ['--tint-border-color' as any]: 'rgba(245, 158, 11, 0.3)' } : undefined}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isWantOnly ? 'bg-amber-950/40 text-amber-400 shadow-sm border tint-border' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="ดูเฉพาะค่าใช้จ่ายผันแปร / ไลฟ์สไตล์ (WANT)"
      >
        เฉพาะ WANT
      </button>
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(false); setHideWantExpenses(true); }}
        style={isNeedOnly ? { ['--tint-border-color' as any]: 'rgba(59, 130, 246, 0.3)' } : undefined}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isNeedOnly ? 'bg-blue-950/40 text-blue-400 shadow-sm border tint-border' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="ดูเฉพาะค่าใช้จ่ายคงที่ / จำเป็น (NEED)"
      >
        เฉพาะ NEED
      </button>
    </div>
  );
});
ToolbarAllocationSelector.displayName = 'ToolbarAllocationSelector';

const ToolbarLineStyleSelector = memo(({ showSkeleton, isSmoothLine, setIsSmoothLine }: ToolbarLineStyleSelectorProps) => (
  <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]">
    <button
      disabled={showSkeleton}
      onClick={() => setIsSmoothLine(false)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${
        !isSmoothLine ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 10 14 15 21 6" /></svg>
      เส้นตรง
    </button>
    <button
      disabled={showSkeleton}
      onClick={() => setIsSmoothLine(true)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${
        isSmoothLine ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17c3-6 4-7 6-7s4 5 6 5 4-8 6-9" /></svg>
      เส้นโค้ง
    </button>
  </div>
));
ToolbarLineStyleSelector.displayName = 'ToolbarLineStyleSelector';

const MainChartToolbar = memo(({
  chartViewType, showSkeleton, isBreakdown, setIsBreakdown,
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
          isLogScale={isLogScale}
          setIsLogScale={setIsLogScale}
        />

        <span className="w-px h-4 shrink-0 bg-[#303030]" />

        <ToolbarAllocationSelector
          showSkeleton={showSkeleton}
          hideFixedExpenses={hideFixedExpenses}
          setHideFixedExpenses={setHideFixedExpenses}
          hideWantExpenses={hideWantExpenses}
          setHideWantExpenses={setHideWantExpenses}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap ml-auto">
        {chartViewType === 'line' && (
          <ToolbarLineStyleSelector
            showSkeleton={showSkeleton}
            isSmoothLine={isSmoothLine}
            setIsSmoothLine={setIsSmoothLine}
          />
        )}

        <MainChartFilterMenu 
          showCatMenu={showCatMenu} setShowCatMenu={setShowCatMenu} filterMenuRef={filterMenuRef}
          dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
          categories={categories} categoriesWithData={categoriesWithData}
        />
      </div>
    </div>
  );
});
MainChartToolbar.displayName = 'MainChartToolbar';

// ==========================================
// MAIN EXPORT COMPONENT
// ==========================================

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
  const [isSmoothLine, setIsSmoothLine] = useState(true);
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
      />

      <div className="p-4 flex flex-col flex-1 min-h-0 gap-3">
        <MainChartToolbar
          chartViewType={chartViewType}
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
