import { PlusCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const ACCENT = {
  emerald: {
    header:  { light: 'bg-emerald-50/40 border-emerald-100/50',   dark: 'bg-slate-950/40 border-emerald-950/40' },
    title:   { light: 'text-emerald-800',                         dark: 'text-emerald-400' },
    glow:    { light: 'border-t-2 border-t-emerald-500/80',       dark: 'border-t-2 border-t-emerald-500/90 shadow-[0_1px_10px_-2px_rgba(16,185,129,0.15)]' },
    btn:     { light: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95', dark: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 active:scale-95 transition-all' },
  },
  blue: {
    header:  { light: 'bg-blue-50/40 border-blue-100/50',         dark: 'bg-slate-950/40 border-blue-950/40' },
    title:   { light: 'text-[#00509E]',                           dark: 'text-blue-400' },
    glow:    { light: 'border-t-2 border-t-blue-500/80',          dark: 'border-t-2 border-t-blue-500/90 shadow-[0_1px_10px_-2px_rgba(59,130,246,0.15)]' },
    btn:     { light: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95', dark: 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/35 active:scale-95 transition-all' },
  },
  purple: {
    header:  { light: 'bg-purple-50/40 border-purple-100/50',     dark: 'bg-slate-950/40 border-purple-950/40' },
    title:   { light: 'text-purple-800',                          dark: 'text-purple-400' },
    glow:    { light: 'border-t-2 border-t-purple-500/80',        dark: 'border-t-2 border-t-purple-500/90 shadow-[0_1px_10px_-2px_rgba(139,92,246,0.15)]' },
    btn:     { light: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm active:scale-95', dark: 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/35 active:scale-95 transition-all' },
  },
  orange: {
    header:  { light: 'bg-orange-50/40 border-orange-100/50',     dark: 'bg-slate-950/40 border-orange-950/40' },
    title:   { light: 'text-orange-850',                          dark: 'text-orange-400' },
    glow:    { light: 'border-t-2 border-t-orange-500/80',        dark: 'border-t-2 border-t-orange-500/90 shadow-[0_1px_10px_-2px_rgba(249,115,22,0.15)]' },
    btn:     { light: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm active:scale-95', dark: 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/35 active:scale-95 transition-all' },
  },
  sky: {
    header:  { light: 'bg-sky-50/40 border-sky-100/50',           dark: 'bg-slate-950/40 border-sky-950/40' },
    title:   { light: 'text-sky-850',                             dark: 'text-sky-400' },
    glow:    { light: 'border-t-2 border-t-sky-500/80',            dark: 'border-t-2 border-t-sky-500/90 shadow-[0_1px_10px_-2px_rgba(14,165,233,0.15)]' },
    btn:     { light: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm active:scale-95', dark: 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/35 active:scale-95 transition-all' },
  },
  red: {
    header:  { light: 'bg-red-50/45 border-red-100/50',           dark: 'bg-slate-950/40 border-red-950/40' },
    title:   { light: 'text-red-800',                             dark: 'text-red-400' },
    glow:    { light: 'border-t-2 border-t-red-500/80',            dark: 'border-t-2 border-t-red-500/90 shadow-[0_1px_10px_-2px_rgba(239,68,68,0.15)]' },
    btn:     { light: 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-95', dark: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/35 active:scale-95 transition-all' },
  }
};

export default function SectionCard({ accentColor, icon, title, badge, action, children, subAction }) {
  const { isDarkMode: dm } = useTheme();
  const a = ACCENT[accentColor] || ACCENT.blue;
  const mode = dm ? 'dark' : 'light';

  return (
    <div className={`overflow-hidden rounded-sm transition-all duration-300 border ${
      dm 
        ? 'bg-slate-900/60 border-slate-850/80 backdrop-blur-md shadow-md shadow-slate-950/10' 
        : 'bg-white border-slate-205 shadow-sm'
    } ${a.glow[mode]}`}>
      <div className={`px-3.5 py-2 flex items-center justify-between gap-3 border-b ${
        dm ? 'border-slate-850/50' : 'border-slate-100'
      } ${a.header[mode]}`}>
        <h2 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 ${a.title[mode]}`}>
          {icon}
          {title}
          {badge != null && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 ml-1 rounded-sm transition-colors ${
              dm ? 'bg-slate-950/80 text-slate-400 border border-slate-850/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {badge}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {subAction && (
            <button type="button" onClick={subAction.onClick}
              className={`text-[10px] font-bold px-2 py-1 flex items-center gap-1 transition-all active:scale-95 border rounded-sm ${
                dm ? 'border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white bg-slate-950/60' : 'border-slate-205 text-slate-500 hover:bg-slate-100'
              }`}>
              {subAction.icon} {subAction.label}
            </button>
          )}
          {action && (
            <button type="button" onClick={action.onClick}
              className={`text-[10px] font-bold px-2 py-1 flex items-center gap-1 transition-all rounded-sm ${a.btn[mode]}`}>
              <PlusCircle className="w-3 h-3" /> {action.label}
            </button>
          )}
        </div>
      </div>
      <div className={`w-full ${dm ? 'text-slate-200' : 'text-slate-800'}`}>
        {children}
      </div>
    </div>
  );
}

