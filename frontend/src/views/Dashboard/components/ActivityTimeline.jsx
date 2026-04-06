// src/views/Dashboard/components/ActivityTimeline.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CalendarClock } from 'lucide-react';

export default function ActivityTimeline({ analytics, dayTypeConfig, dayTypes, isDarkMode }) {
  const dm = isDarkMode;
  const datesInPeriod = analytics.datesInPeriod || [];
  
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;
  const muted = `text-xs font-bold ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  if (Object.keys(analytics.dayTypeCounts || {}).length === 0) return null;

  return (
    <div className={`${card} p-4`}>
      <div className={`flex items-center justify-between ${divider} gap-4 flex-wrap`}>
        <h3 className={cardHd}>
          <CalendarClock className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          ไทม์ไลน์กิจกรรม
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          {dayTypeConfig.map(dt => {
            const count = analytics.dayTypeCounts[dt.id] || 0;
            return (
              <div key={dt.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: dt.color }} />
                <span className={muted}>{dt.label} <span className="opacity-75">({count})</span></span>
              </div>
            );
          })}
          <div className={`ml-1 pl-3 border-l ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            <span className={muted}>รวม {datesInPeriod.length} วัน</span>
          </div>
        </div>
      </div>
      
      <div className={`border rounded-sm ${dm ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        {datesInPeriod.length === 0 ? (
          <div className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูล</div>
        ) : (
          <div className="overflow-x-auto pb-3 pt-10 px-3 flex justify-center" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex w-max gap-x-[3px] mx-auto">
              {/* แกน Y: วันในสัปดาห์ */}
              <div className="flex flex-col gap-[3px] shrink-0 sticky left-0 z-20 pr-2 border-r"
                style={{ backgroundColor: dm ? '#1e293b' : '#f8fafc', borderColor: dm ? '#334155' : '#e2e8f0' }}>
                <div className="h-4" />
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, i) => (
                  <div key={day} className={`h-3.5 flex items-center justify-end text-[9px] font-bold ${i === 0 || i === 6 ? (dm ? 'text-red-400' : 'text-red-500') : (dm ? 'text-slate-500' : 'text-slate-400')}`}>{day}</div>
                ))}
              </div>
              
              {/* แกน X: สัปดาห์และจุดสี */}
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
                      const def = (dow === 0 || dow === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
                      const tc = dayTypeConfig.find(t => t.id === (dayTypes[ds] || def)) || dayTypeConfig[0];
                      const disp = `${['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][dow]} ${+d} ${mo[+m - 1]} ${y.slice(2)}`;
                      const today = +d === new Date().getDate() && +m - 1 === new Date().getMonth() && +y === new Date().getFullYear();
                      
                      return (
                        <div key={ds} className="relative group">
                          <div
                            className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all duration-150 ${today ? 'ring-2 ring-slate-800 dark:ring-slate-300 scale-125 z-10 relative' : 'hover:scale-125 hover:z-10 relative opacity-90 hover:opacity-100'}`}
                            style={{ backgroundColor: tc?.color || '#cbd5e1' }}
                          />
                          {/* CSS Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col items-center">
                            <div className="bg-slate-800 text-white text-center rounded-sm py-1 px-2 text-[11px] font-medium shadow-xl w-max min-w-[90px]">
                              <div className="text-slate-400 font-normal text-[10px]">{disp}</div>
                              <div className="font-bold mt-0.5" style={{ color: tc?.color || '#cbd5e1' }}>{tc?.label || ''}</div>
                            </div>
                            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-800" />
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