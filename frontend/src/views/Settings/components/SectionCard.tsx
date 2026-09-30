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
    header: 'bg-surface border-line',
    title: 'text-income',
    glow: 'border-t-2 border-t-income',
    btn: 'bg-income/15 hover:bg-income/25 text-income border border-income/35'
  },
  brand: {
    header: 'bg-surface border-line',
    title: 'text-accent-ink',
    glow: 'border-t-2 border-t-accent-ink',
    btn: 'bg-accent/15 hover:bg-accent/25 text-accent-ink border border-accent/35'
  },
  purple: {
    header: 'bg-surface border-line',
    title: 'text-savings',
    glow: 'border-t-2 border-t-savings',
    btn: 'bg-savings/15 hover:bg-savings/25 text-savings border border-savings/35'
  },
  orange: {
    header: 'bg-surface border-line',
    title: 'text-expense',
    glow: 'border-t-2 border-t-expense',
    btn: 'bg-expense/15 hover:bg-expense/25 text-expense border border-expense/35'
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
    <div className={`overflow-hidden rounded-none border bg-surface border-line ${a.glow}`}>
      <div className={`px-3.5 py-2 flex items-center justify-between gap-3 border-b border-line/60 ${a.header}`}>
        <h2 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 ${a.title}`}>
          {icon}
          {title}
          {badge != null && (
            <span className="text-[11px] font-bold px-2 py-0.5 ml-1.5 rounded-pill tabular-nums bg-canvas text-ink-body border border-line">
              {badge}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {subAction && (
            <button
              type="button"
              onClick={subAction.onClick}
              className="text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 border rounded-pill border-line text-ink-body hover:bg-surface-hover hover:text-ink-display bg-canvas cursor-pointer transition-colors"
            >
              {subAction.icon} {subAction.label}
            </button>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 rounded-sm cursor-pointer transition-colors ${a.btn}`}
            >
              <PlusCircle className="w-4 h-4" /> {action.label}
            </button>
          )}
        </div>
      </div>
      <div className="w-full text-ink-body">
        {children}
      </div>
    </div>
  );
});

export default SectionCard;
