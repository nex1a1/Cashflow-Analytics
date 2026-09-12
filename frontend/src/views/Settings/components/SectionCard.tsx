import React, { memo, ReactNode } from 'react';
import { PlusCircle } from 'lucide-react';

interface AccentStyle {
  header: string;
  title: string;
  glow: string;
  btn: string;
}

const ACCENT: Record<string, AccentStyle> = {
  emerald: {
    header: 'bg-[#121212] border-emerald-950/40',
    title: 'text-emerald-400',
    glow: 'border-t-2 border-t-emerald-500/90',
    btn: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35'
  },
  brand: {
    header: 'bg-[#121212] border-[#da291c]/20',
    title: 'text-[#da291c]',
    glow: 'border-t-2 border-t-[#da291c]',
    btn: 'bg-[#da291c]/15 hover:bg-[#da291c]/25 text-[#da291c] border border-[#da291c]/35'
  },
  purple: {
    header: 'bg-[#121212] border-purple-950/40',
    title: 'text-purple-400',
    glow: 'border-t-2 border-t-purple-500/90',
    btn: 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/35'
  },
  orange: {
    header: 'bg-[#121212] border-orange-950/40',
    title: 'text-orange-400',
    glow: 'border-t-2 border-t-orange-500/90',
    btn: 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/35'
  },
  sky: {
    header: 'bg-[#121212] border-sky-950/40',
    title: 'text-sky-400',
    glow: 'border-t-2 border-t-sky-500/90',
    btn: 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/35'
  }
};

export interface SectionCardProps {
  accentColor?: string;
  icon?: ReactNode;
  title: string;
  badge?: number | string | null;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
  subAction?: {
    icon?: ReactNode;
    label: string;
    onClick: () => void;
  };
}

const SectionCard = memo(function SectionCard({
  accentColor = 'brand',
  icon,
  title,
  badge,
  action,
  children,
  subAction
}: SectionCardProps) {
  const a = ACCENT[accentColor] || ACCENT.brand;

  return (
    <div className={`overflow-hidden rounded-none border bg-[#1c1c1c] border-[#303030] ${a.glow}`}>
      <div className={`px-3.5 py-2 flex items-center justify-between gap-3 border-b border-[#303030]/60 ${a.header}`}>
        <h2 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 ${a.title}`}>
          {icon}
          {title}
          {badge != null && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 ml-1 rounded-none tabular-nums bg-[#121212] text-[#a0a0a0] border border-[#383838]">
              {badge}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {subAction && (
            <button
              type="button"
              onClick={subAction.onClick}
              className="text-[10px] font-bold px-2 py-1 flex items-center gap-1 border rounded-none border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030] hover:text-white bg-[#121212]"
            >
              {subAction.icon} {subAction.label}
            </button>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`text-[10px] font-bold px-2 py-1 flex items-center gap-1 rounded-none ${a.btn}`}
            >
              <PlusCircle className="w-4 h-4" /> {action.label}
            </button>
          )}
        </div>
      </div>
      <div className="w-full text-[#cbd5e1]">
        {children}
      </div>
    </div>
  );
});

export default SectionCard;
