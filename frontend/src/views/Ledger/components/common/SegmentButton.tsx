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
      return 'bg-surface border-line text-ink-body hover:text-ink-display hover:bg-surface-elevated/30';
    }

    switch (colorScheme) {
      case 'emerald':
        return 'bg-income/10 border-income/40 text-income font-black';
      case 'rose':
        return 'bg-expense/5 border-expense/40 text-expense font-black';
      case 'indigo':
        return 'bg-savings/10 border-savings/40 text-savings font-black';
      case 'amber':
        return 'bg-warn/10 border-warn/40 text-warn font-black';
      case 'sky':
        return 'bg-info/10 border-info/40 text-info font-black';
      case 'red':
        return 'bg-accent/20 border-accent/50 text-accent-ink font-black';
      case 'blue':
      default:
        return 'bg-surface-elevated border-line-strong text-ink-display font-black';
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
