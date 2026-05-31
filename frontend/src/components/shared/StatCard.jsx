import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  subValueJSX,
  topRightBadge,
  trend, // { value: number, isGood: boolean }
  color, 
  variant = 'vitals' // 'vitals' | 'compact'
}) {
  const dm = true;

  // COMPACT VARIANT (Horizontal - Used in Heatmap/Pinned areas)
  if (variant === 'compact') {
    return (
      <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-none border transition-all duration-300 ${
        'bg-[#181818]/60 hover:bg-[#303030]/80 border-[#303030]/60 hover:border-[#da291c]/50'
      }`} style={{ borderColor: color.border || undefined }}>
        <div className={`p-1.5 rounded-sm ${color.bg} shrink-0 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-black uppercase tracking-widest truncate ${color.text} filter brightness-90`}>
              {label}
            </p>
            {subValue && (
              <p className={`text-[8px] font-black truncate leading-tight opacity-70 ${color.text} filter brightness-75`}>
                {subValue}
              </p>
            )}
          </div>
          <p className={`text-sm font-black tabular-nums tracking-tight shrink-0 ${color.text}`}>
            {value}
          </p>
        </div>
      </div>
    );
  }

  // VITALS VARIANT (Vertical - Used at the top of the Ledger/Dashboard)
  return (
    <div className={`relative overflow-hidden flex flex-col px-4 py-2.5 rounded-none border transition-all duration-300 group ${
      'bg-[#181818] border-[#303030]/80 hover:border-[#da291c]/50 hover:bg-[#1c1c1c] shadow-md'
    }`}>
      {/* Background Icon Glow */}
      <div className={`absolute -right-2 -bottom-2 opacity-[0.03] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 ${color.text}`}>
        {React.cloneElement(icon, { size: 80 })}
      </div>

      <div className="relative z-10 flex items-start gap-2">
        <div className={`p-2 rounded-sm ${color.bg} transition-transform group-hover:scale-105 shrink-0`}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <p className={`text-[10px] font-black uppercase tracking-wider leading-none mb-1 truncate ${color.text} filter brightness-90`}>
            {label}
          </p>
          <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
            <div className={`text-lg xl:text-xl 2xl:text-2xl font-black leading-none tabular-nums tracking-tight truncate max-w-full ${color.text}`}>
              {value}
            </div>
            {trend && (
              <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full mt-0.5 shrink-0 ${
                trend.isGood 
                  ? ('bg-emerald-500/10 text-emerald-400')
                  : ('bg-rose-500/10 text-rose-400')
              }`}>
                {trend.isGood ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {trend.value}%
              </div>
            )}
          </div>
          {subValueJSX}
          {subValue && (
            <p className={`mt-1 text-[9px] font-black tracking-wide truncate ${color.text} filter brightness-75 opacity-60`}>
              {subValue}
            </p>
          )}
        </div>
      </div>

      {topRightBadge && (
        <div className="absolute top-2 right-2.5">
          {topRightBadge}
        </div>
      )}
    </div>
  );
}