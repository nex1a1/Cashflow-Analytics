import { PlusCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const ACCENT = {
  emerald: {
    header:  { light: 'bg-emerald-50 border-emerald-100',         dark: 'bg-emerald-950/50 border-emerald-900/40' },
    title:   { light: 'text-emerald-800',                         dark: 'text-emerald-400' },
    btn:     { light: 'bg-emerald-600 hover:bg-emerald-700 text-white', dark: 'bg-emerald-700/80 hover:bg-emerald-600 text-white' },
  },
  blue: {
    header:  { light: 'bg-blue-50 border-blue-100',               dark: 'bg-blue-950/50 border-blue-900/40' },
    title:   { light: 'text-[#00509E]',                           dark: 'text-blue-400' },
    btn:     { light: 'bg-blue-600 hover:bg-blue-700 text-white', dark: 'bg-blue-700/80 hover:bg-blue-600 text-white' },
  },
  purple: {
    header:  { light: 'bg-purple-50 border-purple-100',           dark: 'bg-purple-950/50 border-purple-900/40' },
    title:   { light: 'text-purple-800',                          dark: 'text-purple-400' },
    btn:     { light: 'bg-purple-600 hover:bg-purple-700 text-white', dark: 'bg-purple-700/80 hover:bg-purple-600 text-white' },
  },
  orange: {
    header:  { light: 'bg-orange-50 border-orange-100',           dark: 'bg-orange-950/50 border-orange-900/40' },
    title:   { light: 'text-orange-800',                          dark: 'text-orange-400' },
    btn:     { light: 'bg-orange-500 hover:bg-orange-600 text-white', dark: 'bg-orange-600/80 hover:bg-orange-500 text-white' },
  },
};

export default function SectionCard({ accentColor, icon, title, badge, action, children, subAction }) {
  const { isDarkMode: dm } = useTheme();
  const a = ACCENT[accentColor] || ACCENT.blue;
  const mode = dm ? 'dark' : 'light';

  return (
    <div className={`border overflow-hidden shadow-sm ${dm ? 'bg-slate-900 border-slate-700/70' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${a.header[mode]}`}>
        <h2 className={`text-[13px] font-bold flex items-center gap-1.5 ${a.title[mode]}`}>
          {icon}
          {title}
          {badge != null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 ml-1 ${dm ? 'bg-slate-700/80 text-slate-400' : 'bg-white/80 text-slate-500 border border-slate-200'}`}>
              {badge}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {subAction && (
            <button type="button" onClick={subAction.onClick}
              className={`text-[11px] font-bold px-2 py-1 flex items-center gap-1 transition-all active:scale-95 border ${
                dm ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}>
              {subAction.icon} {subAction.label}
            </button>
          )}
          {action && (
            <button type="button" onClick={action.onClick}
              className={`text-[11px] font-bold px-2 py-1 flex items-center gap-1 transition-all active:scale-95 ${a.btn[mode]}`}>
              <PlusCircle className="w-3 h-3" /> {action.label}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
