// src/views/Dashboard/components/MainChart.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Chart } from 'react-chartjs-2';
import { TrendingUp, BarChart, Layers, Filter, ChevronDown } from 'lucide-react';
import {
  getComboChartOptions,
  getBarChartOptions,
  getLineChartOptions,
} from '../../../utils/chartOptions';

export default function MainChart({
  analytics, categories, filterPeriod,
  hideFixedExpenses, setHideFixedExpenses,
  dashboardCategory, setDashboardCategory,
  chartGroupBy, setChartGroupBy,
  isDarkMode
}) {
  const dm = isDarkMode;
  
  const [chartViewType, setChartViewType] = useState('bar'); 
  const [showTrendLines, setShowTrendLines] = useState(false);
  const [isSmoothLine, setIsSmoothLine] = useState(true);
  const [showCatMenu, setShowCatMenu] = useState(false); 

  const filterMenuRef = useRef(null);
  useEffect(() => {
    if (!showCatMenu) return;
    const handler = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setShowCatMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCatMenu]);

  const displayChartData = useMemo(() => {
    if (!analytics.mainChartData) return null;
    
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
    const xLabels = analytics.mainChartData.labels;

    if (chartViewType === 'stacked') {
      const datasets = [];
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      let catsToRender = activeCats;
      
      if (activeCats.includes('ALL')) {
        catsToRender = categories.filter(c => c.type === 'expense' && (!hideFixedExpenses || !c.isFixed)).map(c => c.name);
      }

      catsToRender.forEach(catName => {
        const catObj = categories.find(c => c.name === catName) || {};
        const catColor = catObj.color || '#64748B';
        
        // 🚀 แก้บั๊ก: รองรับกรณี undefined อย่างปลอดภัย
        datasets.push({
          type: 'bar',
          label: catName,
          data: showMonthly
            ? (analytics.sortedMonthsKeys || []).map(m => analytics.monthlyCatMap?.[catName]?.[m] || 0)
            : (analytics.datesInPeriod || []).map(d => analytics.dailyCatMap?.[catName]?.[d] || 0),
          backgroundColor: catColor,
          borderColor: dm ? '#1e293b' : '#ffffff',
          borderWidth: 1,
          borderRadius: 0,
        });
      });

      if (showTrendLines && !showMonthly) {
        const mtdDataset = analytics.mainChartData.datasets.find(ds => ds.label && ds.label.includes('เฉลี่ยสะสม'));
        const avgDataset = analytics.mainChartData.datasets.find(ds => ds.label && ds.label.includes('เฉลี่ยทั้งเดือน'));
        if (mtdDataset) datasets.push({...mtdDataset, type: 'line', tension: isSmoothLine ? 0.4 : 0, borderWidth: 4});
        if (avgDataset) datasets.push({...avgDataset, type: 'line', borderWidth: 2});
      }

      return { labels: xLabels, datasets };
    }

    let filteredDatasets = [...analytics.mainChartData.datasets];
    if (analytics.mainChartType === 'combo' && !showTrendLines) {
      filteredDatasets = filteredDatasets.filter(ds => ds.type !== 'line' || ds.label === 'Cashflow');
    }

    const processedDatasets = filteredDatasets.map(ds => {
      const isTrendLine = ds.label && (ds.label.includes('เฉลี่ยสะสม') || ds.label.includes('เฉลี่ยทั้งเดือน') || ds.label === 'Cashflow');
      if (isTrendLine) {
        return { 
          ...ds, type: 'line', tension: isSmoothLine ? 0.4 : 0,
          borderWidth: ds.label.includes('เฉลี่ยทั้งเดือน') ? 2 : 4,
        };
      }

      const newType = chartViewType === 'line' ? 'line' : 'bar';
      let bgColor = ds.backgroundColor;
      let borderColor = ds.borderColor || ds.backgroundColor;

      if (chartViewType === 'bar') {
        if (ds.borderColor && !ds.backgroundColor?.includes('0.6')) bgColor = ds.borderColor;
        else if (ds.backgroundColor?.includes('rgba')) bgColor = borderColor; 
      }

      let bWidth = 0;
      if (chartViewType === 'line') {
         bWidth = (Array.isArray(dashboardCategory) && dashboardCategory.length > 1 && !dashboardCategory.includes('ALL')) ? 3 : 4; 
      }

      return { 
        ...ds, type: newType, tension: isSmoothLine ? 0.4 : 0,
        backgroundColor: chartViewType === 'line' ? ds.backgroundColor : bgColor,
        borderColor: borderColor, borderWidth: bWidth, borderRadius: 4,
        pointRadius: chartViewType === 'line' ? 4 : 0,
        pointBackgroundColor: borderColor,
        pointBorderWidth: 2, pointBorderColor: dm ? '#1e293b' : '#ffffff',
      };
    });

    return { ...analytics.mainChartData, datasets: processedDatasets };
  }, [analytics, filterPeriod, chartGroupBy, chartViewType, showTrendLines, isSmoothLine, dashboardCategory, categories, hideFixedExpenses, dm]);

  const card = `rounded-sm border shadow-sm transition-colors h-full flex flex-col ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  return (
    <div className={`${card} p-5 min-h-0`}>
      <div className={`flex items-center justify-between gap-3 ${divider} flex-wrap relative z-20`}>
        <h3 className={cardHd}>
          <TrendingUp className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          {analytics.mainChartType === 'combo' && analytics.mainChartData?.datasets?.some(ds => ds.label && ds.label.includes('เฉลี่ยสะสม')) && showTrendLines
            ? 'เทรนด์รายจ่ายรายวัน (MTD Average)'
            : analytics.mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสด' 
            : analytics.mainChartType === 'bar' ? 'เทรนด์เปรียบเทียบ' : 'รายจ่ายรายวัน'}
        </h3>
        
        <div className="flex items-center gap-2 flex-wrap">
          {!filterPeriod.match(/^\d{4}-\d{2}$/) && (
            <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <button onClick={() => setChartGroupBy('monthly')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartGroupBy === 'monthly' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายเดือน</button>
              <button onClick={() => setChartGroupBy('daily')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartGroupBy === 'daily' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายวัน</button>
            </div>
          )}

          <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button onClick={() => setChartViewType('line')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartViewType === 'line' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
              <TrendingUp className="w-3.5 h-3.5" /> เส้น
            </button>
            <button onClick={() => setChartViewType('bar')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartViewType === 'bar' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
              <BarChart className="w-3.5 h-3.5" /> แท่ง
            </button>
            <button onClick={() => setChartViewType('stacked')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartViewType === 'stacked' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
              <Layers className="w-3.5 h-3.5" /> แจกแจง
            </button>
          </div>

          {chartViewType === 'line' && (
            <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <button onClick={() => setIsSmoothLine(false)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${!isSmoothLine ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-opacity ${!isSmoothLine ? 'opacity-100' : 'opacity-60'}`}><polyline points="3 17 9 10 14 15 21 6" /></svg>
                เส้นตรง
              </button>
              <button onClick={() => setIsSmoothLine(true)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${isSmoothLine ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-opacity ${isSmoothLine ? 'opacity-100' : 'opacity-60'}`}><path d="M3 17c3-6 4-7 6-7s4 5 6 5 4-8 6-9" /></svg>
                เส้นโค้ง
              </button>
            </div>
          )}

          <div className="relative" ref={filterMenuRef}>
            <button
              onClick={() => setShowCatMenu(!showCatMenu)}
              className={`px-3 py-1.5 border rounded-md shadow-sm text-[11px] font-bold outline-none flex items-center gap-1.5 transition-all ${showCatMenu ? (dm ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#00509E] border-[#00509E] text-white') : (dm ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}`}
            >
              <Filter className="w-3.5 h-3.5" />
              ตัวกรองแสดงผล {Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL') ? <span className={`px-1.5 rounded-full text-[9px] ${dm ? 'bg-slate-900 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>{dashboardCategory.length}</span> : ''}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCatMenu ? 'rotate-180' : ''}`} />
            </button>

            {showCatMenu && (
              <div className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[340px] max-w-[90vw] rounded-xl shadow-2xl border z-40 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 ${dm ? 'bg-slate-800 border-slate-700 shadow-slate-900/50' : 'bg-white border-slate-200 shadow-slate-300/50'}`}>
                <div className={`p-4 border-b flex flex-col gap-4 rounded-t-xl ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex flex-col pr-3">
                      <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-amber-400' : 'text-slate-800 group-hover:text-amber-600'}`}>แสดงเส้นเทรนด์ (MTD Average)</span>
                      <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ดูแนวโน้มค่าเฉลี่ยสะสมเทียบกับต้นเดือน</span>
                    </div>
                    <div className="relative flex items-center shrink-0">
                      <input type="checkbox" className="sr-only" checked={showTrendLines} onChange={() => setShowTrendLines(!showTrendLines)} />
                      <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${showTrendLines ? 'bg-amber-500' : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                      <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${showTrendLines ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex flex-col pr-3">
                      <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-[#00509E]'}`}>ซ่อนรายจ่ายคงที่ (Fixed)</span>
                      <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ตัดภาระคงที่ออกจากกราฟ</span>
                    </div>
                    <div className="relative flex items-center shrink-0">
                      <input type="checkbox" className="sr-only" checked={hideFixedExpenses} onChange={() => setHideFixedExpenses(!hideFixedExpenses)} />
                      <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${hideFixedExpenses ? (dm ? 'bg-blue-500' : 'bg-[#00509E]') : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                      <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${hideFixedExpenses ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                </div>
                
                <div className={`p-4 flex flex-col gap-3 rounded-b-xl ${dm ? 'bg-slate-800' : 'bg-white'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>เปรียบเทียบหมวดหมู่ที่ใช้งาน (Multi-line)</span>
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

                    // 🚀 ฟังก์ชันดึงเฉพาะหมวดผันแปร "ที่มีข้อมูลในเดือนนี้"
                    const selectAllVariable = () => {
                      const variableCats = analytics.sortedCats
                        .map(sc => categories.find(c => c.name === sc.name))
                        .filter(c => c && !c.isFixed)
                        .map(c => c.name);
                      setDashboardCategory(variableCats.length > 0 ? variableCats : ['ALL']);
                    };

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setDashboardCategory(['ALL'])} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold transition-all border ${activeCats.includes('ALL') && activeCats.length === 1 ? (dm ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-200 text-[#00509E]') : (dm ? 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                            📊 เส้นรวมทั้งหมด
                          </button>
                          <button onClick={selectAllVariable} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold transition-all border ${dm ? 'bg-amber-900/20 border-amber-700/50 text-amber-400 hover:bg-amber-900/40' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                            🔄 เทียบหมวดผันแปร
                          </button>
                        </div>
                        
                        {/* 🚀 ซ่อนหมวดหมู่ที่ไม่มีข้อมูลออกไปจากเมนูตัวกรอง */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {analytics.sortedCats.length === 0 ? (
                            <span className={`text-[10px] w-full text-center py-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ไม่มีรายการใช้จ่ายให้เปรียบเทียบในเดือนนี้</span>
                          ) : (
                            analytics.sortedCats.map(sc => {
                              const c = categories.find(cat => cat.name === sc.name);
                              if (!c) return null;
                              const isActive = activeCats.includes(c.name);
                              return (
                                <button key={c.id} onClick={() => toggleCategory(c.name)} className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all border`} style={{ backgroundColor: isActive ? c.color : (dm ? '#0f172a' : '#ffffff'), borderColor: isActive ? c.color : (dm ? '#334155' : '#e2e8f0'), color: isActive ? '#ffffff' : (dm ? '#cbd5e1' : '#475569') }}>
                                  <span className="opacity-90">{c.icon}</span> {c.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative w-full flex-1 min-h-[350px]">
        <div className="absolute inset-0">
          {(() => {
            const hasMultipleLines = displayChartData?.datasets?.length > 1;
            let optionsToUse;

            if (chartViewType === 'stacked') {
               const baseOptions = getBarChartOptions(dm, true);
               optionsToUse = {
                 ...baseOptions,
                 scales: {
                   ...baseOptions.scales,
                   x: { ...baseOptions.scales?.x, stacked: true },
                   y: { ...baseOptions.scales?.y, stacked: true }
                 },
                 plugins: {
                   ...baseOptions.plugins,
                   tooltip: { ...baseOptions.plugins?.tooltip, mode: 'index', intersect: false }
                 }
               };
            } else if (analytics.mainChartType === 'combo' && chartViewType === 'bar') {
               optionsToUse = { ...getComboChartOptions(dm) };
            } else if (chartViewType === 'line') {
               optionsToUse = { ...getLineChartOptions(dm, hasMultipleLines) };
            } else {
               optionsToUse = { ...getBarChartOptions(dm, hasMultipleLines) };
            }

            const renderChartType = (analytics.mainChartType === 'combo' && chartViewType === 'bar') ? 'bar' 
                                  : chartViewType === 'line' ? 'line' : 'bar';
            
            return <Chart type={renderChartType} data={displayChartData} options={{...optionsToUse, maintainAspectRatio: false}} />;
          })()}
        </div>
      </div>
    </div>
  );
}

MainChart.propTypes = {
  analytics: PropTypes.object.isRequired,
  categories: PropTypes.array.isRequired,
  filterPeriod: PropTypes.string.isRequired,
  hideFixedExpenses: PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  setDashboardCategory: PropTypes.func.isRequired,
  chartGroupBy: PropTypes.string.isRequired,
  setChartGroupBy: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};