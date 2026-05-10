import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  icon, 
  label, 
  value, 
  subValue, 
  trend, // { value: number, isGood: boolean }
  color, 
  variant = 'vitals' // 'vitals' | 'compact'
}) {
  const { isDarkMode: dm } = useTheme();

  // COMPACT VARIANT (Horizontal - Used in Heatmap/Pinned areas)
  if (variant === 'compact') {
    return (
      <div className={`group flex items-center gap-3 px-3 py-1.5 rounded-sm border transition-all duration-300 ${
        dm 
          ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/60' 
          : 'bg-white border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300'
      }`}>
        <div className={`p-1.5 rounded-sm ${color.bg} shrink-0 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex flex-1 items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              {label}
            </p>
            {subValue && (
              <p className={`text-[9px] font-bold opacity-60 truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                {subValue}
              </p>
            )}
          </div>
          <p className={`text-sm font-black tabular-nums tracking-tight ${color.text}`}>
            {value}
          </p>
        </div>
      </div>
    );
  }

  // VITALS VARIANT (Vertical - Used at the top of the Ledger/Dashboard)
  return (
    <div className={`relative overflow-hidden flex flex-col p-4 rounded-sm border transition-all duration-300 group ${
      dm 
        ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-600' 
        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
    }`}>
      {/* Background Icon Glow */}
      <div className={`absolute -right-2 -bottom-2 opacity-[0.03] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 ${color.text}`}>
        {React.cloneElement(icon, { size: 80 })}
      </div>

      <div className="relative z-10 flex items-start gap-3">
        <div className={`p-2.5 rounded-sm ${color.bg} transition-transform group-hover:scale-105`}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
            {label}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className={`text-xl 2xl:text-2xl font-black leading-none tabular-nums tracking-tight ${color.text}`}>
              {value}
            </p>
            {trend && (
              <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                trend.isGood 
                  ? (dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                  : (dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')
              }`}>
                {trend.isGood ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {trend.value}%
              </div>
            )}
          </div>
          {subValue && (
            <p className={`mt-2 text-[10px] font-bold tracking-wide opacity-50 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}