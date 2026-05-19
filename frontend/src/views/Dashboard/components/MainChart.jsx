// src/views/Dashboard/components/MainChart.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Chart } from 'react-chartjs-2';
import { 
  Layers, TrendingUp, BarChart, Network, 
  Filter, ChevronDown 
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
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;

  return (
    <div className={`flex items-center justify-between gap-3 border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'} flex-wrap relative z-20`}>
      <h3 className={cardHd}>
        {chartViewType === 'sankey' ? (
          <Network className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
        ) : (
          <TrendingUp className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
        )}
        {chartViewType === 'sankey' ? 'โครงสร้างกระแสเงินสด (Sankey Flow)' : 
         mainChartType === 'combo' && mainChartData?.datasets?.some(ds => ds.label?.includes('เฉลี่ยสะสม')) && showTrendLines
          ? 'เทรนด์รายจ่ายรายวัน (MTD Average)'
          : mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสด'
          : mainChartType === 'bar' ? 'เทรนด์เปรียบเทียบ' : 'รายจ่ายรายวัน'}
      </h3>

      <div className="flex items-center gap-2 flex-wrap">

        {chartViewType !== 'sankey' && !filterPeriod.match(/^\d{4}-\d{2}$/) && (
          <div className={`flex p-0.5 rounded-sm border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button onClick={() => setChartGroupBy('monthly')} className={`px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartGroupBy === 'monthly' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายเดือน</button>
            <button onClick={() => setChartGroupBy('daily')} className={`px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartGroupBy === 'daily' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายวัน</button>
          </div>
        )}

        <div className={`flex p-0.5 rounded-sm border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => { setChartViewType('line'); setIsBreakdown(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartViewType === 'line' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> เส้น
          </button>
          <button
            onClick={() => setChartViewType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartViewType === 'bar' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <BarChart className="w-3.5 h-3.5" /> แท่ง
          </button>
          <button
            onClick={() => { setChartViewType('sankey'); setIsBreakdown(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${chartViewType === 'sankey' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <Network className="w-3.5 h-3.5" /> Sankey
          </button>
        </div>

        {chartViewType === 'sankey' && (
          <div className={`flex p-0.5 rounded-sm border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => setSankeySortMode('value')} 
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${sankeySortMode === 'value' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              เรียงตามยอดเงิน
            </button>
            <button 
              onClick={() => setSankeySortMode('index')} 
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${sankeySortMode === 'index' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              เรียงตามลำดับ (Settings)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * INTERNAL COMPONENT: MainChartFilterMenu
 */
const MainChartFilterMenu = ({
  dm, showCatMenu, setShowCatMenu, filterMenuRef,
  showTrendLines, setShowTrendLines,
  isCumulative, setIsCumulative,
  isLogScale, setIsLogScale,
  hideFixedExpenses, setHideFixedExpenses,
  dashboardCategory, setDashboardCategory,
  categories, categoriesWithData
}) => {
  return (
    <div className="relative" ref={filterMenuRef}>
      <button
        onClick={() => setShowCatMenu(!showCatMenu)}
        className={`px-3 py-1.5 border rounded-sm shadow-sm text-[11px] font-bold outline-none flex items-center gap-1.5 transition-all ${showCatMenu ? (dm ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#00509E] border-[#00509E] text-white') : (dm ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}`}
      >
        <Filter className="w-3.5 h-3.5" />
        ตัวกรองแสดงผล {Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL') ? <span className={`px-1.5 rounded-full text-[9px] ${dm ? 'bg-slate-900 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>{dashboardCategory.length}</span> : ''}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCatMenu ? 'rotate-180' : ''}`} />
      </button>

      {showCatMenu && (
        <div className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[340px] max-w-[90vw] rounded-sm shadow-2xl border z-40 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 ${dm ? 'bg-slate-800 border-slate-700 shadow-slate-900/50' : 'bg-slate-50 border-slate-200 shadow-slate-300/50'}`}>
          <div className={`p-4 border-b flex flex-col gap-4 rounded-t-sm ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col pr-3">
                <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-amber-400' : 'text-slate-800 group-hover:text-amber-600'}`}>แสดงเส้นเทรนด์ (MTD Average)</span>
                <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ดูแนวโน้มค่าเฉลี่ยสะสมเทียบกับต้นเดือน</span>
              </div>
              <div className="relative flex items-center shrink-0">
                <input type="checkbox" className="sr-only" checked={showTrendLines} onChange={() => setShowTrendLines(!showTrendLines)} disabled={isCumulative} />
                <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${showTrendLines ? 'bg-amber-500' : (dm ? 'bg-slate-600' : 'bg-slate-300')} ${isCumulative ? 'opacity-50' : ''}`} />
                <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${showTrendLines ? 'translate-x-4' : ''}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col pr-3">
                <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-purple-400' : 'text-slate-800 group-hover:text-purple-600'}`}>กราฟสะสม (Pacing Curve)</span>
                <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ดูความเร็วในการจ่ายแบบสะสมทีละวัน</span>
              </div>
              <div className="relative flex items-center shrink-0">
                <input type="checkbox" className="sr-only" checked={isCumulative} onChange={() => { setIsCumulative(!isCumulative); if(!isCumulative) setShowTrendLines(false); }} />
                <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${isCumulative ? (dm ? 'bg-purple-500' : 'bg-purple-600') : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${isCumulative ? 'translate-x-4' : ''}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col pr-3">
                <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-emerald-400' : 'text-slate-800 group-hover:text-emerald-600'}`}>สเกลลอการิทึม (Log Scale)</span>
                <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>เน้นดูสัดส่วนการเติบโต/ความแตกต่าง</span>
              </div>
              <div className="relative flex items-center shrink-0">
                <input type="checkbox" className="sr-only" checked={isLogScale} onChange={() => setIsLogScale(!isLogScale)} />
                <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${isLogScale ? 'bg-emerald-500' : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${isLogScale ? 'translate-x-4' : ''}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col pr-3">
                <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-[#00509E]'}`}>ซ่อนรายจ่ายจำเป็น (NEED)</span>
                <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ตัดภาระที่จำเป็นออกเพื่อดูไลฟ์สไตล์</span>
              </div>
              <div className="relative flex items-center shrink-0">
                <input type="checkbox" className="sr-only" checked={hideFixedExpenses} onChange={() => setHideFixedExpenses(!hideFixedExpenses)} />
                <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${hideFixedExpenses ? (dm ? 'bg-blue-500' : 'bg-[#00509E]') : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${hideFixedExpenses ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>

          <div className={`p-4 flex flex-col gap-3 rounded-b-sm ${dm ? 'bg-slate-800' : 'bg-white'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>เปรียบเทียบหมวดหมู่</span>
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

              return (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setDashboardCategory(['ALL'])} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[11px] font-bold transition-all border ${activeCats.includes('ALL') && activeCats.length === 1 ? (dm ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-200 text-[#00509E]') : (dm ? 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                      📊 ทั้งหมด (รวม)
                    </button>
                    <button onClick={selectAllVariable} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[11px] font-bold transition-all border ${dm ? 'bg-amber-900/20 border-amber-700/50 text-amber-400 hover:bg-amber-900/40' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                      🔄 เลือกผันแปรทั้งหมด
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name)).map(c => {
                      const isActive = activeCats.includes(c.name);
                      return (
                        <button key={c.id} onClick={() => toggleCategory(c.name)} className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-[10px] font-bold transition-all border`} style={{ backgroundColor: isActive ? c.color : (dm ? '#0f172a' : '#ffffff'), borderColor: isActive ? c.color : (dm ? '#334155' : '#e2e8f0'), color: isActive ? '#ffffff' : (dm ? '#cbd5e1' : '#475569') }}>
                          <span className="opacity-90">{c.icon}</span> {c.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * INTERNAL COMPONENT: MainChartLegend
 */
const MainChartLegend = ({ legendDatasets, dm }) => {
  if (legendDatasets.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
      {legendDatasets.map((ds, i) => (
        <div key={i} className="flex items-center gap-1.5">
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
          <span className={`text-[10px] font-medium leading-none ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{ds.label}</span>
        </div>
      ))}
    </div>
  );
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
    chartViewType, isBreakdown, showTrendLines, isSmoothLine, isCumulative, sankeyData
  });
  const options = useChartOptions({ chartViewType, isBreakdown, isLogScale });

  const card = `rounded-sm border shadow-sm transition-colors h-full flex flex-col ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`;
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

      <div className="flex items-center justify-end gap-2 mb-3 relative z-10 flex-wrap">
        {chartViewType !== 'sankey' && (
          <>
            {/* Status Badges Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {showTrendLines && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[9px] font-bold animate-in fade-in zoom-in duration-300 ${
                  dm ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                  TREND ON
                </div>
              )}
              {isCumulative && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[9px] font-bold animate-in fade-in zoom-in duration-300 ${
                  dm ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700'
                }`}>
                  <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                  PACING ON
                </div>
              )}
              {isLogScale && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[9px] font-bold animate-in fade-in zoom-in duration-300 ${
                  dm ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  LOGARITHM ON
                </div>
              )}
              {hideFixedExpenses && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[9px] font-bold animate-in fade-in zoom-in duration-300 ${
                  dm ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                  FIXED HIDDEN
                </div>
              )}
            </div>

            <button
              onClick={() => setIsBreakdown(prev => !prev)}
              disabled={showSkeleton}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm border shadow-sm transition-all ${
                isBreakdown
                  ? (dm ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#00509E] border-[#00509E] text-white')
                  : (dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> {breakdownLabel}
            </button>

            {chartViewType === 'line' && (
              <div className={`flex p-0.5 rounded-sm border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button disabled={showSkeleton} onClick={() => setIsSmoothLine(false)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${!isSmoothLine ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 10 14 15 21 6" /></svg>
                  เส้นตรง
                </button>
                <button disabled={showSkeleton} onClick={() => setIsSmoothLine(true)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all ${isSmoothLine ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17c3-6 4-7 6-7s4 5 6 5 4-8 6-9" /></svg>
                  เส้นโค้ง
                </button>
              </div>
            )}

            <MainChartFilterMenu 
              dm={dm} showCatMenu={showCatMenu} setShowCatMenu={setShowCatMenu} filterMenuRef={filterMenuRef}
              showTrendLines={showTrendLines} setShowTrendLines={setShowTrendLines}
              isCumulative={isCumulative} setIsCumulative={setIsCumulative}
              isLogScale={isLogScale} setIsLogScale={setIsLogScale}
              hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses}
              dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
              categories={categories} categoriesWithData={categoriesWithData}
            />
          </>
        )}
      </div>

      <div className="relative w-full flex-1 min-h-[350px]">
        {showSkeleton ? (
          <div className={`absolute inset-0 rounded-sm animate-pulse ${dm ? 'bg-slate-900/40' : 'bg-slate-50'}`} />
        ) : (
          <div className="absolute inset-0">
            <Chart type={chartViewType === 'sankey' ? 'sankey' : 'bar'} data={displayChartData} options={options} />
          </div>
        )}
      </div>

      <MainChartLegend legendDatasets={legendDatasets} dm={dm} />
    </div>
  );
}
