// src/views/Dashboard/components/KeyMetrics.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Flame, UtensilsCrossed, Home } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

export default function KeyMetrics({ analytics, isDarkMode }) {
  const dm = isDarkMode;
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className={`${card} p-4 flex flex-col gap-3 min-w-0`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
        ตัวชี้วัดสำคัญ
      </p>
      
      {/* เผาผลาญ/วัน */}
      <div className={`relative overflow-hidden flex flex-col justify-center gap-2 px-3.5 py-3 rounded-xl border transition-all flex-1 ${dm ? 'bg-gradient-to-br from-amber-900/40 to-slate-900/80 border-amber-800/50' : 'bg-gradient-to-br from-amber-50/80 to-white border-amber-200 shadow-sm'}`}>
         <Flame className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-amber-500 opacity-10' : 'text-amber-500 opacity-[0.06]'}`} />
         <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2.5 min-w-0">
               <div className={`p-1.5 rounded-lg shrink-0 ${dm ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}><Flame className="w-4 h-4" /></div>
               <span className={`text-[11px] font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>เผาผลาญ/วัน</span>
            </div>
            <span className={`text-base font-black truncate shrink-0 ${dm ? 'text-amber-400' : 'text-amber-600'}`}>{formatMoney(analytics.dailyAvg)}</span>
         </div>
      </div>

      {/* ค่ากิน/วัน */}
      <div className={`relative overflow-hidden flex flex-col justify-center gap-2 px-3.5 py-3 rounded-xl border transition-all flex-1 ${dm ? 'bg-gradient-to-br from-orange-900/40 to-slate-900/80 border-orange-800/50' : 'bg-gradient-to-br from-orange-50/80 to-white border-orange-200 shadow-sm'}`}>
         <UtensilsCrossed className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-orange-500 opacity-10' : 'text-orange-500 opacity-[0.06]'}`} />
         <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2.5 min-w-0">
               <div className={`p-1.5 rounded-lg shrink-0 ${dm ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}><UtensilsCrossed className="w-4 h-4" /></div>
               <div className="flex flex-col min-w-0">
                 <span className={`text-[11px] font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>ค่ากิน/วัน</span>
                 <span className={`text-[9px] font-semibold whitespace-nowrap ${dm ? 'text-orange-400/80' : 'text-orange-500'}`}>สัดส่วน {analytics.foodPercentage}%</span>
               </div>
            </div>
            <span className={`text-base font-black truncate shrink-0 ${dm ? 'text-orange-400' : 'text-orange-600'}`}>{formatMoney(analytics.foodDailyAvg)}</span>
         </div>
         <div className={`w-full h-1.5 rounded-full overflow-hidden mt-0.5 relative z-10 ${dm ? 'bg-slate-800' : 'bg-orange-100'}`}>
           <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${analytics.foodPercentage}%` }} />
         </div>
      </div>

      {/* ค่าที่พัก */}
      <div className={`relative overflow-hidden flex flex-col justify-center gap-2 px-3.5 py-3 rounded-xl border transition-all flex-1 ${dm ? 'bg-gradient-to-br from-blue-900/40 to-slate-900/80 border-blue-800/50' : 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200 shadow-sm'}`}>
         <Home className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-blue-500 opacity-10' : 'text-blue-500 opacity-[0.06]'}`} />
         <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2.5 min-w-0">
               <div className={`p-1.5 rounded-lg shrink-0 ${dm ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Home className="w-4 h-4" /></div>
               <div className="flex flex-col min-w-0">
                 <span className={`text-[11px] font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>ค่าที่พัก</span>
                 <span className={`text-[9px] font-semibold whitespace-nowrap ${dm ? 'text-blue-400/80' : 'text-blue-500'}`}>สัดส่วน {analytics.rentPercentage}%</span>
               </div>
            </div>
            <span className={`text-base font-black truncate shrink-0 ${dm ? 'text-blue-400' : 'text-blue-600'}`}>{formatMoney(analytics.rentTotal)}</span>
         </div>
         <div className={`w-full h-1.5 rounded-full overflow-hidden mt-0.5 relative z-10 ${dm ? 'bg-slate-800' : 'bg-blue-100'}`}>
           <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${analytics.rentPercentage}%` }} />
         </div>
      </div>
    </div>
  );
}

KeyMetrics.propTypes = {
  analytics: PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};