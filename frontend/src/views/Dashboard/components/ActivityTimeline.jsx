// src/views/Dashboard/components/ActivityTimeline.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { CalendarClock, Flame, CalendarDays, Info } from 'lucide-react';

export default function ActivityTimeline({ analytics, dayTypeConfig, dayTypes, isDarkMode }) {
  const dm = isDarkMode;
  const datesInPeriod = analytics.datesInPeriod || [];
  
  const [viewMode, setViewMode] = useState('dayType');
  const dailyExpenses = analytics.dailyAllMap || {};

  const globalMaxThreshold = analytics.globalMaxThreshold || 100;

  const getExpenseLevel = (amount) => {
    if (!amount || amount === 0) return 0;
    const ratio = amount / globalMaxThreshold;
    if (ratio <= (1/6)) return 1;
    if (ratio <= (2/6)) return 2;
    if (ratio <= (3/6)) return 3;
    if (ratio <= (4/6)) return 4;
    if (ratio <= (5/6)) return 5;
    return 6;
  };

  const getHeatmapColor = (level) => {
    if (level === 0) return dm ? '#1e293b' : '#f1f5f9'; 
    const shades = dm 
      ? ['#312e81', '#4338ca', '#7e22ce', '#c2410c', '#ea580c', '#f97316'] 
      : ['#e0e7ff', '#c7d2fe', '#e9d5ff', '#fed7aa', '#fdba74', '#fb923c'];
    return shades[level - 1] || shades[0];
  };

  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;
  const muted = `text-xs font-bold ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  if (Object.keys(analytics.dayTypeCounts || {}).length === 0) return null;

  return (
    <div className={`${card} p-4`}>
      <div className={`flex items-center justify-between ${divider} gap-4 flex-wrap relative z-20`}>

        <div className="flex items-center gap-4 flex-wrap">
          <h3 className={cardHd}>
            <CalendarClock className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
            ไทม์ไลน์กิจกรรม
          </h3>

          <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => setViewMode('dayType')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${viewMode === 'dayType' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> ประเภทวัน
            </button>
            <button 
              onClick={() => setViewMode('heatmap')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${viewMode === 'heatmap' ? (dm ? 'bg-slate-700 text-orange-400 shadow-sm' : 'bg-white text-orange-600 shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              <Flame className="w-3.5 h-3.5" /> ระดับการจ่าย
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {viewMode === 'dayType' ? (
            /* 🚀 LOGIC ใหม่: กรองเอาเฉพาะชนิดวันที่มีจำนวน > 0 มาแสดงผล */
            dayTypeConfig
              .filter(dt => (analytics.dayTypeCounts[dt.id] || 0) > 0)
              .map(dt => {
                const count = analytics.dayTypeCounts[dt.id];
                return (
                  <div key={dt.id} className="flex items-center gap-1.5 hidden sm:flex">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: dt.color }} />
                    <span className={muted}>{dt.label} <span className="opacity-75">({count})</span></span>
                  </div>
                );
              })
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative group/info cursor-help mr-1">
                <Info className={`w-3.5 h-3.5 ${dm ? 'text-slate-600' : 'text-slate-300'}`} />
                <div className="absolute bottom-full right-0 md:left-0 md:right-auto mb-2 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col items-center md:items-start">
                  <div className="bg-slate-900 text-white text-left rounded-sm py-2 px-3 text-[10px] font-medium shadow-2xl w-[250px] leading-relaxed">
                    <p className="font-bold mb-1 text-orange-400">ระดับสีคำนวณแบบมาตรฐาน (Global P90)</p>
                    <p className="text-slate-300">ระดับสีอ้างอิงจากเพดานการจ่ายเงินสูงสุดตลอดกาลของคุณ ({globalMaxThreshold.toLocaleString('th-TH')} บ.) เพื่อรักษาสเกลสีให้ตรงกันเสมอไม่ว่าจะดูเดือนไหน</p>
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-900 md:ml-2 mr-2 md:mr-0" />
                </div>
              </div>

              <span className={`text-[10px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>น้อย</span>
              {[0, 1, 2, 3, 4, 5, 6].map(level => (
                <div key={level} className="w-3 h-3 rounded-sm shrink-0 border" style={{ backgroundColor: getHeatmapColor(level), borderColor: level === 0 ? (dm ? '#334155' : '#e2e8f0') : 'transparent' }} />
              ))}
              <span className={`text-[10px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>มาก</span>
            </div>
          )}
        </div>

      </div>
      
      <div className={`border rounded-sm relative z-10 ${dm ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        {datesInPeriod.length === 0 ? (
          <div className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูล</div>
        ) : (
          <div className="overflow-x-auto pb-3 pt-10 px-3 flex justify-center" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex w-max gap-x-[3px] mx-auto">
              
              <div className="flex flex-col gap-[3px] shrink-0 sticky left-0 z-20 pr-2 border-r"
                style={{ backgroundColor: dm ? '#1e293b' : '#f8fafc', borderColor: dm ? '#334155' : '#e2e8f0' }}>
                <div className="h-4" />
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, i) => (
                  <div key={day} className={`h-3.5 flex items-center justify-end text-[9px] font-bold ${i === 0 || i === 6 ? (dm ? 'text-red-400' : 'text-red-500') : (dm ? 'text-slate-500' : 'text-slate-400')}`}>{day}</div>
                ))}
              </div>
              
              {(() => {
                const weeks = [];
                let cur = Array(7).fill(null);
                let monthLabel = null;
                const mo = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                
                datesInPeriod.forEach((ds, i) => {
                  const [d, m, y] = ds.split('/');
                  const dow = new Date(y, +m - 1, d).getDay();
                  if (d === '01' || i === 0) monthLabel = `${mo[+m - 1]} ${y.slice(2)}`;
                  cur[dow] = ds;
                  if (dow === 6 || i === datesInPeriod.length - 1) {
                    weeks.push({ days: [...cur], monthLabel });
                    cur = Array(7).fill(null);
                    monthLabel = null;
                  }
                });
                
                return weeks.map((wk, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                    <div className="h-4 relative flex items-end pb-1">
                      {wk.monthLabel && (
                        <div className="absolute left-0 bottom-0.5 flex items-end">
                          <div className={`w-[2px] h-3 mr-0.5 rounded-sm ${dm ? 'bg-slate-600' : 'bg-slate-300'}`} />
                          <span className={`text-[9px] font-bold leading-none ${dm ? 'text-slate-300' : 'text-slate-500'}`}>{wk.monthLabel}</span>
                        </div>
                      )}
                    </div>
                    {wk.days.map((ds, di) => {
                      if (!ds) return <div key={`e-${wi}-${di}`} className="w-3.5 h-3.5 bg-transparent" />;
                      
                      const [d, m, y] = ds.split('/');
                      const dow = new Date(y, +m - 1, d).getDay();
                      const today = +d === new Date().getDate() && +m - 1 === new Date().getMonth() && +y === new Date().getFullYear();
                      const disp = `${['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][dow]} ${+d} ${mo[+m - 1]} ${y.slice(2)}`;
                      
                      const def = (dow === 0 || dow === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
                      const tc = dayTypeConfig.find(t => t.id === (dayTypes[ds] || def)) || dayTypeConfig[0];
                      
                      const amount = dailyExpenses[ds] || 0;
                      const level = getExpenseLevel(amount);
                      const blockColor = viewMode === 'heatmap' ? getHeatmapColor(level) : (tc?.color || '#cbd5e1');

                      return (
                        <div key={ds} className="relative group">
                          <div
                            className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all duration-300 border ${today ? 'ring-2 ring-slate-800 dark:ring-slate-300 scale-125 z-10 relative' : 'hover:scale-125 hover:z-10 relative opacity-90 hover:opacity-100'}`}
                            style={{ 
                              backgroundColor: blockColor,
                              borderColor: (viewMode === 'heatmap' && level === 0) ? (dm ? '#334155' : '#e2e8e0') : 'transparent' 
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col items-center">
                            <div className="bg-slate-900 text-white text-center rounded-sm py-1.5 px-2.5 text-[11px] font-medium shadow-xl w-max min-w-[110px]">
                              <div className="text-slate-400 font-normal text-[10px] mb-0.5">{disp}</div>
                              {viewMode === 'dayType' ? (
                                <div className="font-bold" style={{ color: tc?.color || '#cbd5e1' }}>{tc?.label || ''}</div>
                              ) : (
                                <div className={`font-bold flex items-center justify-center gap-1 ${amount > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                                  {amount > 0 ? amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'ไม่มีรายจ่าย'}
                                </div>
                              )}
                            </div>
                            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-900" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ActivityTimeline.propTypes = {
  analytics: PropTypes.object.isRequired,
  dayTypeConfig: PropTypes.array.isRequired,
  dayTypes: PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};