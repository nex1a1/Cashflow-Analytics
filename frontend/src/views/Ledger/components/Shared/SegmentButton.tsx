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
      return 'bg-[#121212] border-[#303030] text-[#888888] hover:text-[#cbd5e1] hover:bg-[#303030]/30';
    }

    switch (colorScheme) {
      case 'emerald':
        return 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400 font-black shadow-[0_0_8px_rgba(16,185,129,0.06)]';
      case 'rose':
        return 'bg-rose-950/20 border-rose-500/40 text-rose-400 font-black shadow-[0_0_8px_rgba(239,68,68,0.06)]';
      case 'indigo':
        return 'bg-indigo-950/20 border-indigo-500/40 text-indigo-400 font-black shadow-[0_0_8px_rgba(99,102,241,0.06)]';
      case 'amber':
        return 'bg-amber-950/20 border-amber-500/40 text-amber-400 font-black shadow-[0_0_8px_rgba(245,158,11,0.06)]';
      case 'sky':
        return 'bg-sky-950/20 border-sky-500/40 text-sky-400 font-black shadow-[0_0_8px_rgba(56,189,248,0.06)]';
      case 'red':
        return 'bg-[#da291c]/20 border-[#da291c]/50 text-[#da291c] font-black shadow-[0_0_8px_rgba(218,41,28,0.08)]';
      case 'blue':
      default:
        return 'bg-[#303030] border-[#505050] text-white font-black';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap border first:rounded-none last:rounded-none -ml-[1px] first:ml-0 transition-colors font-mono cursor-pointer ${getColors()}`}
    >
      {label}
    </button>
  );
};

export default SegmentButton;
