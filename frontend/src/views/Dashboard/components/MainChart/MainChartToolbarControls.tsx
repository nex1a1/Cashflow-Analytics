// src/views/Dashboard/components/MainChart/MainChartToolbarControls.tsx
import React, { memo } from 'react';
import { Layers } from 'lucide-react';
import {
  ToolbarToggleSwitchProps,
  ToolbarViewModesProps,
  ToolbarAllocationSelectorProps,
  ToolbarLineStyleSelectorProps,
} from './types';

// ==========================================
// SUBCOMPONENTS: TOOLBAR CONTROLS (leaf atoms)
// ==========================================

export const ToolbarToggleSwitch = memo(({ isActive, activeColor = 'bg-[#da291c]' }: ToolbarToggleSwitchProps) => (
  <div className={`relative w-7 h-4 rounded-none shrink-0 ${
    isActive ? `${activeColor} shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]` : 'bg-[#181818] border border-[#303030]'
  }`}>
    <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-none ease-out transition-transform ${
      isActive ? 'bg-white translate-x-3.5 shadow-md' : 'bg-[#303030]'
    }`} />
  </div>
));
ToolbarToggleSwitch.displayName = 'ToolbarToggleSwitch';

export const ToolbarViewModes = memo(({
  showSkeleton,
  isBreakdown,
  setIsBreakdown
}: ToolbarViewModesProps) => (
  <div className="flex gap-[1px] bg-[#303030]/60 p-[1px] rounded-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] bg-neutral-900 shrink-0">
    <button
      disabled={showSkeleton}
      onClick={() => setIsBreakdown(prev => !prev)}
      title="แจกแจงแยกตามหมวดหมู่ค่าใช้จ่าย"
      className={`group px-3 py-1.5 rounded-none text-[11px] font-bold tracking-wide select-none flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
        isBreakdown
          ? 'bg-[#da291c]/25 text-[#da291c] shadow-sm'
          : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <Layers className={`w-3.5 h-3.5 ${isBreakdown ? 'text-[#da291c]' : 'text-slate-400'}`} />
      <span>แจกแจง</span>
      <ToolbarToggleSwitch isActive={isBreakdown} activeColor="bg-[#da291c]" />
    </button>
  </div>
));
ToolbarViewModes.displayName = 'ToolbarViewModes';

export const ToolbarAllocationSelector = memo(({
  showSkeleton,
  hideFixedExpenses, setHideFixedExpenses,
  hideWantExpenses, setHideWantExpenses
}: ToolbarAllocationSelectorProps) => {
  const isAll = !hideFixedExpenses && !hideWantExpenses;
  const isWantOnly = hideFixedExpenses && !hideWantExpenses;
  const isNeedOnly = !hideFixedExpenses && hideWantExpenses;

  return (
    <div className="flex p-[1px] bg-[#303030]/60 gap-[1px] bg-neutral-900 rounded-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] shrink-0">
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(false); setHideWantExpenses(false); }}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isAll ? 'bg-[#303030] text-white shadow-sm' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="แสดงค่าใช้จ่ายทั้งหมด (NEED + WANT)"
      >
        ทั้งหมด
      </button>
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(true); setHideWantExpenses(false); }}
        style={isWantOnly ? { ['--tint-border-color' as any]: 'rgba(245, 158, 11, 0.3)' } : undefined}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isWantOnly ? 'bg-amber-950/40 text-amber-400 shadow-sm border tint-border' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="ดูเฉพาะค่าใช้จ่ายผันแปร / ไลฟ์สไตล์ (WANT)"
      >
        เฉพาะ WANT
      </button>
      <button
        disabled={showSkeleton}
        onClick={() => { setHideFixedExpenses(false); setHideWantExpenses(true); }}
        style={isNeedOnly ? { ['--tint-border-color' as any]: 'rgba(212, 212, 212, 0.3)' } : undefined}
        className={`px-3 py-1.5 text-[11px] font-bold transition-all ${
          isNeedOnly ? 'bg-neutral-700/40 text-white shadow-sm border tint-border' : 'bg-[#181818] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
        }`}
        title="ดูเฉพาะค่าใช้จ่ายคงที่ / จำเป็น (NEED)"
      >
        เฉพาะ NEED
      </button>
    </div>
  );
});
ToolbarAllocationSelector.displayName = 'ToolbarAllocationSelector';

export const ToolbarLineStyleSelector = memo(({ showSkeleton, isSmoothLine, setIsSmoothLine }: ToolbarLineStyleSelectorProps) => (
  <div className="flex p-0.5 rounded-none border shadow-sm bg-[#181818] border-[#303030]">
    <button
      disabled={showSkeleton}
      onClick={() => setIsSmoothLine(false)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${
        !isSmoothLine ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 10 14 15 21 6" /></svg>
      เส้นตรง
    </button>
    <button
      disabled={showSkeleton}
      onClick={() => setIsSmoothLine(true)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-all ${
        isSmoothLine ? 'bg-[#303030] text-[#da291c] shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17c3-6 4-7 6-7s4 5 6 5 4-8 6-9" /></svg>
      เส้นโค้ง
    </button>
  </div>
));
ToolbarLineStyleSelector.displayName = 'ToolbarLineStyleSelector';
