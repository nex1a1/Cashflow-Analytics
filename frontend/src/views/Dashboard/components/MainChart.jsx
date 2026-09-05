// src/views/Dashboard/components/MainChart.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Chart } from 'react-chartjs-2';
import { 
  Layers, TrendingUp, BarChart, Network, 
  Filter, ChevronDown, Search, Activity
} from 'lucide-react';

import { useDashboardContext } from '../context/DashboardContext';
import { useSankeyEngine } from '../hooks/useSankeyEngine';
import { useChartDataEngine } from '../hooks/useChartDataEngine';
import { useChartOptions } from '../hooks/useChartOptions';

/**
 * INTERNAL COMPONENT: MainChartHeader
 */
function getMainChartTitle(chartViewType, mainChartType, mainChartData, showTrendLines) {
  if (chartViewType === 'sankey') {
    return 'โครงสร้างกระแสเงินสด (Sankey Flow)';
  }
  const isMtd = mainChartType === 'combo' && mainChartData?.datasets?.some(ds => ds.label?.includes('เฉลี่ยสะสม')) && showTrendLines;
  if (isMtd) {
    return 'เทรนด์รายจ่ายรายวัน (MTD Average)';
  }
  if (mainChartType === 'combo') {
    return 'วิเคราะห์กระแสเงินสด';
  }
  if (mainChartType === 'bar') {
    return 'เทรนด์เปรียบเทียบ';
  }
  return 'รายจ่ายรายวัน';
}

function ChartGroupBySwitcher({ chartGroupBy, setChartGroupBy }) {
  return (
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
  );
}

function ViewTypeSwitcher({ chartViewType, setChartViewType, setIsBreakdown }) {
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
              if (v.id !== 'bar') setIsBreakdown(false);
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
}

function SankeyControls({ sankeyMode, setSankeyMode, sankeySortMode, setSankeySortMode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]/60">
        <button 
          onClick={() => setSankeyMode(sankeyMode === 'allocation' ? 'standard' : 'allocation')} 
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-none transition-all ${
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
          onClick={() => setSankeySortMode('value')} 
          className={`px-3 py-1.5 text-[10px] font-bold rounded-none transition-all ${
            sankeySortMode === 'value' ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
          }`}
        >
          เรียงตามยอดเงิน
        </button>
        <button 
          onClick={() => setSankeySortMode('index')} 
          className={`px-3 py-1.5 text-[10px] font-bold rounded-none transition-all ${
            sankeySortMode === 'index' ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
          }`}
        >
          เรียงตามลำดับ (Settings)
        </button>
      </div>
    </div>
  );
}

/**
 * INTERNAL COMPONENT: MainChartHeader
 */
const MainChartHeader = ({
  chartViewType, setChartViewType,
  chartGroupBy, setChartGroupBy,
  sankeySortMode, setSankeySortMode,
  sankeyMode, setSankeyMode,
  setIsBreakdown, filterPeriod,
  mainChartType, mainChartData, showTrendLines
}) => {
  const isSingleMonth = /^\d{4}-\d{2}$/.exec(filterPeriod);
  const showGroupBy = chartViewType !== 'sankey' && !isSingleMonth;
  const title = getMainChartTitle(chartViewType, mainChartType, mainChartData, showTrendLines);

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

        {chartViewType === 'sankey' && (
          <SankeyControls 
            sankeyMode={sankeyMode} 
            setSankeyMode={setSankeyMode} 
            sankeySortMode={sankeySortMode} 
            setSankeySortMode={setSankeySortMode} 
          />
        )}
      </div>
    </div>
  );
};

MainChartHeader.propTypes = {
  chartViewType: PropTypes.string.isRequired,
  setChartViewType: PropTypes.func.isRequired,
  chartGroupBy: PropTypes.string.isRequired,
  setChartGroupBy: PropTypes.func.isRequired,
  sankeySortMode: PropTypes.string.isRequired,
  setSankeySortMode: PropTypes.func.isRequired,
  sankeyMode: PropTypes.string,
  setSankeyMode: PropTypes.func,
  setIsBreakdown: PropTypes.func.isRequired,
  filterPeriod: PropTypes.string.isRequired,
  mainChartType: PropTypes.string,
  mainChartData: PropTypes.object,
  showTrendLines: PropTypes.bool.isRequired
};

const getContrastTextColor = (hexColor) => {
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

/**
 * INTERNAL COMPONENT: MainChartFilterMenu
 */
const MainChartCategorySelector = ({
  dashboardCategory, setDashboardCategory, categories, categoriesWithData,
  searchQuery, setSearchQuery
}) => {
  const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
  const allExpenseCatNames = categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name)).map(c => c.name);

  const toggleCategory = (catName) => {
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
  };

  const selectAllVariable = () => {
    const variableCats = categories.filter(c => c.type === 'expense' && c.allocation_type !== 'need' && categoriesWithData.has(c.name)).map(c => c.name);
    setDashboardCategory(variableCats.length > 0 ? variableCats : ['ALL']);
  };

  const filteredCategories = categories.filter(c => 
    c.type === 'expense' && 
    categoriesWithData.has(c.name) &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.icon?.includes(searchQuery))
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => setDashboardCategory(['ALL'])} 
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-none text-[11px] font-bold transition-all border ${
            activeCats.includes('ALL') || activeCats.length === allExpenseCatNames.length
              ? 'bg-[#da291c]/20 border-[#da291c] text-[#da291c]' 
              : 'bg-[#181818]/50 border-[#303030] text-slate-300 hover:bg-[#303030]'
          }`}
        >
          📊 ทั้งหมด (รวม)
        </button>
        <button 
          onClick={selectAllVariable} 
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-none text-[11px] font-bold transition-all border bg-amber-950/20 border-amber-500/30 text-amber-400 hover:bg-amber-950/40"
        >
          🔄 ผันแปรทั้งหมด
        </button>
      </div>

      {/* Search Bar inside categories tab */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาหมวดหมู่ด่วน..."
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-sm border outline-none font-medium transition-all bg-[#181818] border-[#303030] text-slate-200 focus:border-[#da291c]"
        />
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-1">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(c => {
            const isActive = activeCats.includes('ALL') || activeCats.includes(c.name) || activeCats.includes(c.id);
            const textColor = isActive ? getContrastTextColor(c.color) : '#94a3b8';
            return (
              <button 
                key={c.id} 
                onClick={() => toggleCategory(c.name)} 
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-none text-[10px] font-bold transition-all border shadow-sm ${
                  !isActive ? 'opacity-40 line-through bg-[#181818] border-[#303030]' : ''
                }`} 
                style={{ 
                  backgroundColor: isActive ? c.color : '#181818', 
                  borderColor: isActive ? c.color : '#303030', 
                  color: textColor 
                }}
              >
                <span className="opacity-90">{c.icon}</span> 
                {c.name}
              </button>
            );
          })
        ) : (
          <div className="text-[11px] italic py-6 text-center w-full text-slate-500">
            ไม่พบหมวดหมู่ที่ต้องการ
          </div>
        )}
      </div>
    </>
  );
};

/**
 * INTERNAL COMPONENT: MainChartFilterMenu
 */
const MainChartFilterMenu = ({
  dm, showCatMenu, setShowCatMenu, filterMenuRef,
  dashboardCategory, setDashboardCategory,
  categories, categoriesWithData
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when menu closes
  useEffect(() => {
    if (!showCatMenu) {
      setSearchQuery('');
    }
  }, [showCatMenu]);

  return (
    <div className="relative" ref={filterMenuRef}>
      <button
        onClick={() => setShowCatMenu(!showCatMenu)}
        className={`px-3 py-1.5 border rounded-none shadow-sm text-[11px] font-bold outline-none flex items-center gap-1.5 transition-all ${
          showCatMenu 
            ? ('bg-[#da291c] border-[#da291c] text-white shadow-md') 
            : ('bg-[#181818] border-[#303030] text-slate-200 hover:bg-[#303030]')
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        ตัวกรองแสดงผล {Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL') ? (
          <span className={`px-1.5 rounded-full text-[9px] ${'bg-[#303030] text-[#da291c] border border-[#303030]'}`}>
            {dashboardCategory.length}
          </span>
        ) : ''}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCatMenu ? 'rotate-180' : ''}`} />
      </button>

      {showCatMenu && (
        <div className={`absolute right-0 top-full mt-2 w-[520px] max-w-[90vw] rounded-none shadow-2xl border z-45 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
          'bg-[#181818] border-[#303030] shadow-black/60'
        }`}>
          {/* Header */}
          <div className={`px-4 py-2.5 border-b flex items-center gap-1.5 ${'border-[#303030] bg-[#181818]/65 text-slate-200'}`}>
            <Layers className="w-3.5 h-3.5 text-[#da291c]" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">เลือกหมวดหมู่ย่อย</span>
          </div>

          {/* Body */}
          <div className="p-4">
            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
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
        </div>
      )}
    </div>
  );
};

MainChartFilterMenu.propTypes = {
  dm: PropTypes.bool.isRequired,
  showCatMenu: PropTypes.bool.isRequired,
  setShowCatMenu: PropTypes.func.isRequired,
  filterMenuRef: PropTypes.object.isRequired,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  setDashboardCategory: PropTypes.func.isRequired,
  categories: PropTypes.array.isRequired,
  categoriesWithData: PropTypes.object.isRequired
};

function updateActiveCategories(catName, activeCats, allCatNames) {
  const base = activeCats.includes('ALL') ? [...allCatNames] : [...activeCats];
  const next = base.includes(catName) ? base.filter(c => c !== catName) : [...base, catName];
  return (next.length === 0 || next.length === allCatNames.length) ? ['ALL'] : next;
}

const BreakdownLegendItem = ({ category, isActive, onToggle }) => {
  const isHidden = !isActive;
  return (
    <button
      onClick={() => onToggle(category.name)}
      className={`flex items-center gap-1.5 border border-transparent rounded-none px-1.5 py-0.5 transition-opacity duration-100 hover:opacity-80 ${
        isHidden ? 'opacity-35 line-through' : 'opacity-100'
      }`}
      title="คลิกเพื่อเปิด/ซ่อนหมวดหมู่นี้"
    >
      <span
        className="inline-block rounded-none shrink-0 w-2.5 h-2.5"
        style={{ backgroundColor: category.color || '#64748B' }}
      />
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {category.icon && <span className="mr-1 opacity-90">{category.icon}</span>}
        {category.name}
      </span>
    </button>
  );
};

BreakdownLegendItem.propTypes = {
  category: PropTypes.object.isRequired,
  isActive: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

const BreakdownLegend = ({ categories, categoriesWithData, dashboardCategory, setDashboardCategory }) => {
  const catsWithDataList = categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name));
  if (catsWithDataList.length === 0) return null;

  const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
  const allCatNames = catsWithDataList.map(c => c.name);

  const handleToggle = (catName) => {
    setDashboardCategory(updateActiveCategories(catName, activeCats, allCatNames));
  };

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
};

BreakdownLegend.propTypes = {
  categories: PropTypes.array.isRequired,
  categoriesWithData: PropTypes.object.isRequired,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  setDashboardCategory: PropTypes.func.isRequired
};

function getDatasetIndicatorStyle(ds) {
  const isLine = ds.type === 'line';
  return {
    width: isLine ? 16 : 10,
    height: isLine ? 3 : 10,
    backgroundColor: isLine
      ? (ds.borderColor || ds.backgroundColor)
      : (ds.backgroundColor || ds.borderColor),
  };
}

const StandardLegendItem = ({ dataset, isHidden, onToggle }) => (
  <button
    onClick={() => onToggle(dataset.label)}
    className={`flex items-center gap-1.5 border border-transparent rounded-none px-1.5 py-0.5 transition-opacity duration-100 hover:opacity-80 ${
      isHidden ? 'opacity-35 line-through' : 'opacity-100'
    }`}
    title="คลิกเพื่อเปิด/ซ่อนชุดข้อมูลนี้"
  >
    <span
      className="inline-block rounded-none shrink-0"
      style={getDatasetIndicatorStyle(dataset)}
    />
    <span className="text-[10px] font-medium leading-none text-slate-400">
      {dataset.label}
    </span>
  </button>
);

StandardLegendItem.propTypes = {
  dataset: PropTypes.object.isRequired,
  isHidden: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

const StandardLegend = ({ legendDatasets, hiddenDatasets, setHiddenDatasets }) => {
  if (legendDatasets.length === 0) return null;

  const toggleDataset = (label) => {
    setHiddenDatasets(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t border-[#303030]/60">
      {legendDatasets.map((ds, i) => (
        <StandardLegendItem
          key={ds.label || i}
          dataset={ds}
          isHidden={hiddenDatasets.includes(ds.label)}
          onToggle={toggleDataset}
        />
      ))}
    </div>
  );
};

StandardLegend.propTypes = {
  legendDatasets: PropTypes.array.isRequired,
  hiddenDatasets: PropTypes.array.isRequired,
  setHiddenDatasets: PropTypes.func.isRequired
};

/**
 * INTERNAL COMPONENT: MainChartLegend
 */
const MainChartLegend = ({ 
  legendDatasets, 
  hiddenDatasets, 
  setHiddenDatasets, 
  isBreakdown,
  dashboardCategory,
  setDashboardCategory,
  categories,
  categoriesWithData
}) => {
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
};

MainChartLegend.propTypes = {
  legendDatasets: PropTypes.array.isRequired,
  hiddenDatasets: PropTypes.array.isRequired,
  setHiddenDatasets: PropTypes.func.isRequired,
  isBreakdown: PropTypes.bool,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  setDashboardCategory: PropTypes.func,
  categories: PropTypes.array,
  categoriesWithData: PropTypes.object
};

const ToolbarToggleSwitch = ({ isActive, activeColor = 'bg-[#da291c]' }) => (
  <div className={`relative w-7 h-4 rounded-none shrink-0 ${
    isActive ? `${activeColor} shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]` : 'bg-[#181818] border border-[#303030]'
  }`}>
    <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-none ease-out ${
      isActive ? 'bg-white translate-x-3.5 shadow-md' : 'bg-[#303030]'
    }`} />
  </div>
);

ToolbarToggleSwitch.propTypes = {
  isActive: PropTypes.bool.isRequired,
  activeColor: PropTypes.string
};

const ToolbarViewModes = ({ showSkeleton, isBreakdown, setIsBreakdown, isLogScale, setIsLogScale }) => (
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
);

ToolbarViewModes.propTypes = {
  showSkeleton: PropTypes.bool,
  isBreakdown: PropTypes.bool.isRequired,
  setIsBreakdown: PropTypes.func.isRequired,
  isLogScale: PropTypes.bool.isRequired,
  setIsLogScale: PropTypes.func.isRequired
};

const ToolbarAllocationSelector = ({
  showSkeleton,
  hideFixedExpenses, setHideFixedExpenses,
  hideWantExpenses, setHideWantExpenses
}) => {
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
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isWantOnly ? 'bg-amber-950/40 text-amber-400 shadow-sm border border-amber-500/30' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="ดูเฉพาะค่าใช้จ่ายผันแปร / ไลฟ์สไตล์ (WANT)"
      >
        เฉพาะ WANT
      </button>
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(false); setHideWantExpenses(true); }}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isNeedOnly ? 'bg-blue-950/40 text-blue-400 shadow-sm border border-blue-500/30' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="ดูเฉพาะค่าใช้จ่ายคงที่ / จำเป็น (NEED)"
      >
        เฉพาะ NEED
      </button>
    </div>
  );
};

ToolbarAllocationSelector.propTypes = {
  showSkeleton: PropTypes.bool,
  hideFixedExpenses: PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  hideWantExpenses: PropTypes.bool.isRequired,
  setHideWantExpenses: PropTypes.func.isRequired
};

const ToolbarLineStyleSelector = ({ showSkeleton, isSmoothLine, setIsSmoothLine }) => (
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
);

ToolbarLineStyleSelector.propTypes = {
  showSkeleton: PropTypes.bool,
  isSmoothLine: PropTypes.bool.isRequired,
  setIsSmoothLine: PropTypes.func.isRequired
};

const MainChartToolbar = ({
  chartViewType, showSkeleton, isBreakdown, setIsBreakdown,
  isLogScale, setIsLogScale,
  hideFixedExpenses, setHideFixedExpenses,
  hideWantExpenses, setHideWantExpenses,
  isSmoothLine, setIsSmoothLine,
  dm, showCatMenu, setShowCatMenu, filterMenuRef,
  dashboardCategory, setDashboardCategory,
  categories, categoriesWithData
}) => {
  if (chartViewType === 'sankey') {
    return <div className="relative z-10 w-full" />;
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
          dm={dm} showCatMenu={showCatMenu} setShowCatMenu={setShowCatMenu} filterMenuRef={filterMenuRef}
          dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
          categories={categories} categoriesWithData={categoriesWithData}
        />
      </div>
    </div>
  );
};

MainChartToolbar.propTypes = {
  chartViewType: PropTypes.string.isRequired,
  showSkeleton: PropTypes.bool,
  isBreakdown: PropTypes.bool.isRequired,
  setIsBreakdown: PropTypes.func.isRequired,
  isLogScale: PropTypes.bool.isRequired,
  setIsLogScale: PropTypes.func.isRequired,
  hideFixedExpenses: PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  hideWantExpenses: PropTypes.bool.isRequired,
  setHideWantExpenses: PropTypes.func.isRequired,
  isSmoothLine: PropTypes.bool.isRequired,
  setIsSmoothLine: PropTypes.func.isRequired,
  dm: PropTypes.bool.isRequired,
  showCatMenu: PropTypes.bool.isRequired,
  setShowCatMenu: PropTypes.func.isRequired,
  filterMenuRef: PropTypes.object.isRequired,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  setDashboardCategory: PropTypes.func.isRequired,
  categories: PropTypes.array,
  categoriesWithData: PropTypes.object
};

export default function MainChart() {
  const { 
    analytics, categories, filterPeriod, 
    hideFixedExpenses, setHideFixedExpenses,
    hideWantExpenses, setHideWantExpenses,
    dashboardCategory, setDashboardCategory,
    chartGroupBy, setChartGroupBy,
    dm,
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
  const [hiddenDatasets, setHiddenDatasets] = useState([]);

  // Reset interactive legend when main query inputs change to avoid state ghost paths
  useEffect(() => {
    setHiddenDatasets([]);
  }, [chartViewType, isBreakdown, dashboardCategory, filterPeriod]);

  // Filter Menu Click-Outside Logic
  const filterMenuRef = useRef(null);
  useEffect(() => {
    if (!showCatMenu) return;
    const handler = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setShowCatMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCatMenu]);

  // The Logic Engines
  const sankeyData = useSankeyEngine({ chartViewType, sankeySortMode, sankeyMode });
  const { displayChartData, legendDatasets, categoriesWithData } = useChartDataEngine({
    chartViewType, isBreakdown, isSmoothLine, sankeyData, hiddenDatasets
  });
  const options = useChartOptions({ chartViewType, isBreakdown, isLogScale });

  const card = `rounded-none border shadow-sm transition-colors h-full flex flex-col ${'bg-[#181818] border-[#303030]'}`;

  return (
    <div className={`${card} min-h-0`}>
      <MainChartHeader 
        chartViewType={chartViewType} setChartViewType={setChartViewType}
        chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy}
        sankeySortMode={sankeySortMode} setSankeySortMode={setSankeySortMode}
        sankeyMode={sankeyMode} setSankeyMode={setSankeyMode}
        setIsBreakdown={setIsBreakdown} filterPeriod={filterPeriod} dm={dm}
        mainChartType={analytics.mainChartType} mainChartData={analytics.mainChartData}
        showTrendLines={false}
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
          dm={dm}
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
            <div className={`absolute inset-0 rounded-none animate-pulse ${'bg-[#303030]/40'}`} />
          ) : (
            <div className="absolute inset-0">
              <Chart type={chartViewType === 'sankey' ? 'sankey' : 'bar'} data={displayChartData} options={options} />
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
          dm={dm} 
        />
      </div>
    </div>
  );
}
