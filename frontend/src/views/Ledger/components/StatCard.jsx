import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

export default function StatCard({ icon, label, value, color }) {
  const { isDarkMode: dm } = useTheme();
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-sm border transition-colors ${
      dm ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'
    }`}>
      <div className={`p-2 rounded-sm ${color.bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wide leading-none mb-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
          {label}
        </p>
        <p className={`text-base font-black leading-none ${color.text}`}>{value}</p>
      </div>
    </div>
  );
}