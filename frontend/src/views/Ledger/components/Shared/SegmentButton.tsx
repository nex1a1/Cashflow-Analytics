import React from 'react';

export type SegmentButtonColorScheme = 'rose' | 'sky' | 'emerald' | 'amber' | 'indigo' | 'red' | 'blue';

interface SegmentButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  colorScheme?: SegmentButtonColorScheme;
}

const SegmentButton: React.FC<SegmentButtonProps> = ({ label, active, onClick, colorScheme = 'blue' }) => {
  const getColors = () => {
    if (!active) {
      return 'bg-surface border-line text-ink-body hover:text-slate-300 hover:bg-surface-elevated/30';
    }

    switch (colorScheme) {
      case 'emerald':
        return 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400 font-black';
      case 'rose':
        return 'bg-expense/5 border-expense/40 text-expense font-black';
      case 'indigo':
        return 'bg-savings/10 border-savings/40 text-savings font-black';
      case 'amber':
        return 'bg-amber-950/20 border-amber-500/40 text-amber-400 font-black';
      case 'sky':
        return 'bg-sky-950/20 border-sky-500/40 text-sky-400 font-black';
      case 'red':
        return 'bg-accent/20 border-accent/50 text-accent font-black';
      case 'blue':
      default:
        return 'bg-surface-elevated border-line-strong text-white font-black';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border first:rounded-none last:rounded-none -ml-[1px] first:ml-0 transition-colors font-mono cursor-pointer ${getColors()}`}
    >
      {label}
    </button>
  );
};

export default SegmentButton;
