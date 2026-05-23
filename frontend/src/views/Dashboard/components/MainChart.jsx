// src/views/Dashboard/components/MainChart.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Chart } from 'react-chartjs-2';
import { 
  Layers, TrendingUp, BarChart, Network, 
  Filter, ChevronDown, Settings, Search,
  Zap, EyeOff, Activity, X, Lock
} from 'lucide-react';

import { useDashboardContext } from '../context/DashboardContext';
import { useSankeyEngine } from '../hooks/useSankeyEngine';
import { useChartDataEngine } from '../hooks/useChartDataEngine';
import { useChartOptions } from '../hooks/useChartOptions';

/**
 * INTERNAL COMPONENT: MainChartHeader
 */
const MainChartHeader = ({
  chartViewType, setChartViewType,
  chartGroupBy, setChartGroupBy,
  sankeySortMode, setSankeySortMode,
  setIsBreakdown, filterPeriod, dm,
  mainChartType, mainChartData, showTrendLines
}) => {
  const cardHd = `font-bold text-sm flex items-center gap-2 ${'text-slate-200'}`;

  return (
    <div className={`flex items-center justify-between gap-3 border-b mb-3 pb-3 ${'border-slate-700'} flex-wrap relative z-20`}>
      <h3 className={cardHd}>
        {chartViewType === 'sankey' ? (
          <Network className={`w-4 h-4 ${'text-emerald-400'}`} />
        ) : (
          <TrendingUp className={`w-4 h-4 ${'text-blue-400'}`} />
        )}
        {chartViewType === 'sankey' ? 'โครงสร้างกระแสเงินสด (Sankey Flow)' : 
         mainChartType === 'combo' && mainChartData?.datasets?.some(ds => ds.label?.includes('เฉลี่ยสะสม')) && showTrendLines
          ? 'เทรนด์รายจ่ายรายวัน (MTD Average)'
          : mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสด'
          : mainChartType === 'bar' ? 'เทรนด์เปรียบเทียบ' : 'รายจ่ายรายวัน'}
      </h3>

      <div className="flex items-center gap-2 flex-wrap">

        {chartViewType !== 'sankey' && !filterPeriod.match(/^\d{4}-\d{2}$/) && (
          <div className={`flex p-0.5 rounded-sm border shadow-sm ${'bg-slate-950 border-slate-850'}`}>
            <button onClick={() => setChartGroupBy('monthly')} className={`px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartGroupBy === 'monthly' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}>รายเดือน</button>
            <button onClick={() => setChartGroupBy('daily')} className={`px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartGroupBy === 'daily' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}>รายวัน</button>
          </div>
        )}

        <div className={`flex p-0.5 rounded-sm border shadow-sm ${'bg-slate-950 border-slate-850'}`}>
          <button
            onClick={() => { setChartViewType('line'); setIsBreakdown(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartViewType === 'line' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> เส้น
          </button>
          <button
            onClick={() => setChartViewType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartViewType === 'bar' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}
          >
            <BarChart className="w-3.5 h-3.5" /> แท่ง
          </button>
          <button
            onClick={() => { setChartViewType('sankey'); setIsBreakdown(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartViewType === 'sankey' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}
          >
            <Network className="w-3.5 h-3.5" /> Sankey
          </button>
        </div>

        {chartViewType === 'sankey' && (
          <div className={`flex p-0.5 rounded-sm border shadow-sm ${'bg-slate-950 border-slate-850'}`}>
            <button 
              onClick={() => setSankeySortMode('value')} 
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${sankeySortMode === 'value' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}
            >
              เรียงตามยอดเงิน
            </button>
            <button 
              onClick={() => setSankeySortMode('index')} 
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${sankeySortMode === 'index' ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}
            >
              เรียงตามลำดับ (Settings)
            </button>
          </div>
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
  setIsBreakdown: PropTypes.func.isRequired,
  filterPeriod: PropTypes.string.isRequired,
  dm: PropTypes.bool.isRequired,
  mainChartType: PropTypes.string,
  mainChartData: PropTypes.object,
  showTrendLines: PropTypes.bool.isRequired
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
        className={`px-3 py-1.5 border rounded-sm shadow-sm text-[11px] font-bold outline-none flex items-center gap-1.5 transition-all ${
          showCatMenu 
            ? ('bg-blue-600 border-blue-500 text-white shadow-md') 
            : ('bg-slate-950 border-slate-850 text-slate-200 hover:bg-slate-900')
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        ตัวกรองแสดงผล {Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL') ? (
          <span className={`px-1.5 rounded-full text-[9px] ${'bg-slate-900 text-blue-400 border border-slate-850'}`}>
            {dashboardCategory.length}
          </span>
        ) : ''}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCatMenu ? 'rotate-180' : ''}`} />
      </button>

      {showCatMenu && (
        <div className={`absolute right-0 top-full mt-2 w-[340px] max-w-[90vw] rounded-sm shadow-2xl border z-45 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
          'bg-slate-900 border-slate-800 shadow-slate-950/60'
        }`}>
          {/* Header */}
          <div className={`px-4 py-2.5 border-b flex items-center gap-1.5 ${'border-slate-800 bg-slate-950/65 text-slate-200'}`}>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">เลือกหมวดหมู่ย่อย</span>
          </div>

          {/* Body */}
          <div className="p-4">
            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
              {(() => {
                const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
                const toggleCategory = (catName) => {
                  if (catName === 'ALL') { setDashboardCategory(['ALL']); }
                  else {
                    let newCats = activeCats.filter(c => c !== 'ALL');
                    if (newCats.includes(catName)) newCats = newCats.filter(c => c !== catName);
                    else newCats.push(catName);
                    if (newCats.length === 0) newCats = ['ALL'];
                    setDashboardCategory(newCats);
                  }
                };
                const selectAllVariable = () => {
                  const variableCats = categories.filter(c => c.type === 'expense' && !c.isFixed && categoriesWithData.has(c.name)).map(c => c.name);
                  setDashboardCategory(variableCats.length > 0 ? variableCats : ['ALL']);
                };

                const filteredCategories = categories.filter(c => 
                  c.type === 'expense' && 
                  categoriesWithData.has(c.name) &&
                  (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.icon && c.icon.includes(searchQuery)))
                );

                return (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setDashboardCategory(['ALL'])} 
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[11px] font-bold transition-all border ${
                          activeCats.includes('ALL') && activeCats.length === 1 
                            ? ('bg-blue-600/20 border-blue-500 text-blue-400') 
                            : ('bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-900')
                        }`}
                      >
                        📊 ทั้งหมด (รวม)
                      </button>
                      <button 
                        onClick={selectAllVariable} 
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[11px] font-bold transition-all border ${
                          'bg-amber-900/20 border-amber-700/50 text-amber-400 hover:bg-amber-900/40'
                        }`}
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
                        className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-sm border outline-none font-medium transition-all ${
                          'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500'
                        }`}
                      />
                      <Search className={`absolute left-2.5 top-2.5 w-3.5 h-3.5 ${'text-slate-500'}`} />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className={`absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650`}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map(c => {
                          const isActive = activeCats.includes(c.name);
                          return (
                            <button 
                              key={c.id} 
                              onClick={() => toggleCategory(c.name)} 
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-[10px] font-bold transition-all border shadow-sm hover:scale-[1.02]" 
                              style={{ 
                                backgroundColor: isActive ? c.color : ('#090d16'), 
                                borderColor: isActive ? c.color : ('#1e293b'), 
                                color: isActive ? '#ffffff' : ('#cbd5e1') 
                              }}
                            >
                              <span className="opacity-90">{c.icon}</span> 
                              {c.name}
                            </button>
                          );
                        })
                      ) : (
                        <div className={`text-[11px] italic py-6 text-center w-full ${'text-slate-500'}`}>
                          ไม่พบหมวดหมู่ที่ต้องการ
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
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

/**
 * INTERNAL COMPONENT: MainChartLegend
 */
const MainChartLegend = ({ legendDatasets, hiddenDatasets, setHiddenDatasets, dm }) => {
  if (legendDatasets.length === 0) return null;

  const toggleDataset = (label) => {
    setHiddenDatasets(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t ${'border-slate-700'}`}>
      {legendDatasets.map((ds, i) => {
        const isHidden = hiddenDatasets.includes(ds.label);
        return (
          <button
            key={i}
            onClick={() => toggleDataset(ds.label)}
            className={`flex items-center gap-1.5 transition-all duration-200 hover:opacity-80 active:scale-95 border border-transparent rounded-sm px-1.5 py-0.5 ${
              isHidden ? 'opacity-35 line-through' : 'opacity-100'
            }`}
            title="คลิกเพื่อเปิด/ซ่อนชุดข้อมูลนี้"
          >
            <span
              className="inline-block rounded-sm shrink-0"
              style={{
                width: ds.type === 'line' ? 16 : 10,
                height: ds.type === 'line' ? 3 : 10,
                backgroundColor: ds.type === 'line'
                  ? (ds.borderColor || ds.backgroundColor)
                  : (ds.backgroundColor || ds.borderColor),
              }}
            />
            <span className={`text-[10px] font-medium leading-none ${'text-slate-400'}`}>
              {ds.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

MainChartLegend.propTypes = {
  legendDatasets: PropTypes.array.isRequired,
  hiddenDatasets: PropTypes.array.isRequired,
  setHiddenDatasets: PropTypes.func.isRequired,
  dm: PropTypes.bool.isRequired
};

/**
 * MainChart - The central analytical engine for visual cashflow tracking.
 */
export default function MainChart() {
  const { 
    analytics, categories, filterPeriod, 
    hideFixedExpenses, setHideFixedExpenses,
    dashboardCategory, setDashboardCategory,
    chartGroupBy, setChartGroupBy,
    dm,
    showSkeleton
  } = useDashboardContext();
  
  // UI State
  const [chartViewType, setChartViewType] = useState('bar'); 
  const [sankeySortMode, setSankeySortMode] = useState('value');
  const [isBreakdown, setIsBreakdown] = useState(false);
  const [showTrendLines, setShowTrendLines] = useState(false);
  const [isSmoothLine, setIsSmoothLine] = useState(true);
  const [isCumulative, setIsCumulative] = useState(false);
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
  const sankeyData = useSankeyEngine({ chartViewType, sankeySortMode });
  const { displayChartData, legendDatasets, categoriesWithData } = useChartDataEngine({
    chartViewType, isBreakdown, showTrendLines, isSmoothLine, isCumulative, sankeyData, hiddenDatasets
  });
  const options = useChartOptions({ chartViewType, isBreakdown, isLogScale });

  const card = `rounded-sm border shadow-sm transition-colors h-full flex flex-col ${'bg-slate-900 border-slate-800'}`;
  const breakdownLabel = isBreakdown ? (chartViewType === 'line' ? 'แยกเส้น ✓' : 'ซ้อนแท่ง ✓') : 'แจกแจง';

  return (
    <div className={`${card} p-5 min-h-0`}>
      <MainChartHeader 
        chartViewType={chartViewType} setChartViewType={setChartViewType}
        chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy}
        sankeySortMode={sankeySortMode} setSankeySortMode={setSankeySortMode}
        setIsBreakdown={setIsBreakdown} filterPeriod={filterPeriod} dm={dm}
        mainChartType={analytics.mainChartType} mainChartData={analytics.mainChartData}
        showTrendLines={showTrendLines}
      />

      <div className="flex items-center justify-between gap-3 mb-3 relative z-10 flex-wrap w-full">
        {chartViewType !== 'sankey' ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5 shrink-0 select-none ${
              'text-slate-650'
            }`}>
              <Activity className="w-3 h-3 text-blue-500 animate-pulse" /> MODES
            </span>

            {/* Divider */}
            <span className={`w-px h-4 shrink-0 ${'bg-slate-800'}`} />
            
            <div className={`flex items-center gap-1 p-1 rounded-sm transition-all duration-300 ${
              'bg-slate-950 border border-slate-850 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
            }`}>

              {/* 1. Breakdown Mode */}
              <button
                disabled={showSkeleton}
                onClick={() => setIsBreakdown(prev => !prev)}
                title="แจกแจงแยกตามหมวดหมู่ค่าใช้จ่าย"
                className={`group px-2.5 py-1 rounded-sm border text-[11px] font-bold tracking-wide transition-all duration-300 select-none flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isBreakdown
                    ? ('bg-blue-600/20 border-blue-500/80 text-blue-300 shadow-sm')
                    : ('bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40')
                }`}
              >
                <Layers className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                  isBreakdown ? ('text-blue-400') : ''
                }`} />
                <span>แจกแจง</span>
                
                {/* Visual Hairline Divider */}
                <span className={`w-px h-3 shrink-0 transition-colors duration-300 ${
                  isBreakdown
                    ? ('bg-blue-500/30')
                    : ('bg-slate-700/60')
                }`} />

                {/* Tactical Micro-Switch */}
                <div className={`relative w-7 h-4 rounded-sm transition-all duration-300 shrink-0 ${
                  isBreakdown 
                    ? 'bg-blue-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]' 
                    : ('bg-slate-800 border border-slate-700')
                }`}>
                  <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-sm transition-all duration-300 ease-out ${
                    isBreakdown 
                      ? 'bg-white translate-x-3.5 shadow-md' 
                      : ('bg-slate-500')
                  }`} />
                </div>
              </button>

              {/* 2. Cumulative Mode */}
              <button
                disabled={showSkeleton}
                onClick={() => {
                  const nextVal = !isCumulative;
                  setIsCumulative(nextVal);
                  if (nextVal) setShowTrendLines(false);
                }}
                title="ดูความเร็วการใช้จ่ายเป็นกราฟยอดสะสมเทียบกับเป้าหมาย"
                className={`group px-2.5 py-1 rounded-sm border text-[11px] font-bold tracking-wide transition-all duration-300 select-none flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isCumulative
                    ? ('bg-violet-600/20 border-violet-500/80 text-violet-300 shadow-sm')
                    : ('bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40')
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                  isCumulative ? ('text-violet-400') : ''
                }`} />
                <span>กราฟสะสม</span>
                
                {/* Visual Hairline Divider */}
                <span className={`w-px h-3 shrink-0 transition-colors duration-300 ${
                  isCumulative
                    ? ('bg-violet-500/30')
                    : ('bg-slate-700/60')
                }`} />

                {/* Tactical Micro-Switch */}
                <div className={`relative w-7 h-4 rounded-sm transition-all duration-300 shrink-0 ${
                  isCumulative 
                    ? 'bg-violet-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]' 
                    : ('bg-slate-800 border border-slate-700')
                }`}>
                  <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-sm transition-all duration-300 ease-out ${
                    isCumulative 
                      ? 'bg-white translate-x-3.5 shadow-md' 
                      : ('bg-slate-500')
                  }`} />
                </div>
              </button>

              {/* 3. Trend Lines Mode */}
              <button
                disabled={showSkeleton || isCumulative}
                onClick={() => { if (!isCumulative) setShowTrendLines(prev => !prev); }}
                title={isCumulative ? "ไม่สามารถใช้เส้นเทรนด์ร่วมกับกราฟสะสมได้" : "ดูแนวโน้มค่าเฉลี่ยสะสมรายวัน (MTD Average)"}
                className={`group px-2.5 py-1 rounded-sm border text-[11px] font-bold tracking-wide transition-all duration-300 select-none flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isCumulative
                    ? ('bg-slate-900/30 border-transparent text-slate-700 cursor-not-allowed')
                    : showTrendLines
                      ? ('bg-amber-600/20 border-amber-500/80 text-amber-300 shadow-sm')
                      : ('bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40')
                }`}
              >
                {isCumulative ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <Zap className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                    showTrendLines ? ('text-amber-400') : ''
                  }`} />
                )}
                <span>เส้นเทรนด์</span>
                
                {/* Visual Hairline Divider */}
                <span className={`w-px h-3 shrink-0 transition-colors duration-300 ${
                  showTrendLines && !isCumulative
                    ? ('bg-amber-500/30')
                    : ('bg-slate-700/60')
                }`} />

                {/* Tactical Micro-Switch */}
                <div className={`relative w-7 h-4 rounded-sm transition-all duration-300 shrink-0 ${
                  showTrendLines && !isCumulative
                    ? 'bg-amber-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]' 
                    : ('bg-slate-800 border border-slate-700')
                }`}>
                  <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-sm transition-all duration-300 ease-out ${
                    showTrendLines && !isCumulative
                      ? 'bg-white translate-x-3.5 shadow-md' 
                      : ('bg-slate-500')
                  }`} />
                </div>
              </button>

              {/* 4. Logarithmic Scale Mode */}
              <button
                disabled={showSkeleton}
                onClick={() => setIsLogScale(prev => !prev)}
                title="ปรับสเกลแกน Y แบบ Logarithmic เพื่อเปรียบเทียบสัดส่วน"
                className={`group px-2.5 py-1 rounded-sm border text-[11px] font-bold tracking-wide transition-all duration-300 select-none flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLogScale
                    ? ('bg-emerald-600/20 border-emerald-500/80 text-emerald-300 shadow-sm')
                    : ('bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40')
                }`}
              >
                <BarChart className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                  isLogScale ? ('text-emerald-400') : ''
                }`} />
                <span>สเกล Log</span>
                
                {/* Visual Hairline Divider */}
                <span className={`w-px h-3 shrink-0 transition-colors duration-300 ${
                  isLogScale
                    ? ('bg-emerald-500/30')
                    : ('bg-slate-700/60')
                }`} />

                {/* Tactical Micro-Switch */}
                <div className={`relative w-7 h-4 rounded-sm transition-all duration-300 shrink-0 ${
                  isLogScale 
                    ? 'bg-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]' 
                    : ('bg-slate-800 border border-slate-700')
                }`}>
                  <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-sm transition-all duration-300 ease-out ${
                    isLogScale 
                      ? 'bg-white translate-x-3.5 shadow-md' 
                      : ('bg-slate-500')
                  }`} />
                </div>
              </button>

              {/* 5. Hide NEED Mode */}
              <button
                disabled={showSkeleton}
                onClick={() => setHideFixedExpenses(prev => !prev)}
                title="ซ่อนค่าใช้จ่ายคงที่ที่จำเป็น (Fixed Expenses) เพื่อวิเคราะห์ค่าใช้จ่ายผันแปร"
                className={`group px-2.5 py-1 rounded-sm border text-[11px] font-bold tracking-wide transition-all duration-300 select-none flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  hideFixedExpenses
                    ? ('bg-rose-600/20 border-rose-500/80 text-rose-300 shadow-sm')
                    : ('bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40')
                }`}
              >
                <EyeOff className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                  hideFixedExpenses ? ('text-rose-400') : ''
                }`} />
                <span>ซ่อน NEED</span>
                
                {/* Visual Hairline Divider */}
                <span className={`w-px h-3 shrink-0 transition-colors duration-300 ${
                  hideFixedExpenses
                    ? ('bg-rose-500/30')
                    : ('bg-slate-700/60')
                }`} />

                {/* Tactical Micro-Switch */}
                <div className={`relative w-7 h-4 rounded-sm transition-all duration-300 shrink-0 ${
                  hideFixedExpenses 
                    ? 'bg-rose-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]' 
                    : ('bg-slate-800 border border-slate-700')
                }`}>
                  <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-sm transition-all duration-300 ease-out ${
                    hideFixedExpenses 
                      ? 'bg-white translate-x-3.5 shadow-md' 
                      : ('bg-slate-500')
                  }`} />
                </div>
              </button>

            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Right controls */}
        {chartViewType !== 'sankey' && (
          <div className="flex items-center gap-2 flex-wrap">
            {chartViewType === 'line' && (
              <div className={`flex p-0.5 rounded-sm border shadow-sm ${'bg-slate-950 border-slate-850'}`}>
                <button disabled={showSkeleton} onClick={() => setIsSmoothLine(false)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${!isSmoothLine ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 10 14 15 21 6" /></svg>
                  เส้นตรง
                </button>
                <button disabled={showSkeleton} onClick={() => setIsSmoothLine(true)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${isSmoothLine ? ('bg-slate-800 text-blue-400 shadow-sm') : ('text-slate-400 hover:text-slate-200 hover:bg-slate-900/50')}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17c3-6 4-7 6-7s4 5 6 5 4-8 6-9" /></svg>
                  เส้นโค้ง
                </button>
              </div>
            )}

            <MainChartFilterMenu 
              dm={dm} showCatMenu={showCatMenu} setShowCatMenu={setShowCatMenu} filterMenuRef={filterMenuRef}
              dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
              categories={categories} categoriesWithData={categoriesWithData}
            />
          </div>
        )}
      </div>

      <div className="relative w-full flex-1 min-h-[350px]">
        {showSkeleton ? (
          <div className={`absolute inset-0 rounded-sm animate-pulse ${'bg-slate-900/40'}`} />
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
        dm={dm} 
      />
    </div>
  );
}
