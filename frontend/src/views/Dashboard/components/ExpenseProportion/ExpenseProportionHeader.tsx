// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionHeader.tsx
import React from 'react';
import {
  PieChart,
  ArrowDownWideNarrow,
  ListOrdered,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { formatMoney } from '../../../../utils/formatters';
import { DisplayMode, ExpenseProportionHeaderProps, SortMode } from './types';

interface ModeSwitcherProps {
  displayMode: DisplayMode;
  onChangeMode: (mode: DisplayMode) => void;
}

const MODES: Array<{ id: DisplayMode; label: string }> = [
  { id: 'category', label: 'รายหมวดหมู่' },
  { id: 'allocation', label: 'สัดส่วน 50/30/20' },
];

function ModeSwitcher({ displayMode, onChangeMode }: ModeSwitcherProps) {
  return (
    <div className="ml-4 flex items-center gap-[1px] p-[2px] rounded-none border bg-[#181818] border-[#303030]/60">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => onChangeMode(m.id)}
          aria-pressed={displayMode === m.id}
          className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-tighter rounded-none transition-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
            displayMode === m.id
              ? 'bg-[#da291c] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

interface SortSwitcherProps {
  sortMode: SortMode;
  onToggleSort: (targetType: 'amount' | 'order') => void;
}

function SortSwitcher({ sortMode, onToggleSort }: SortSwitcherProps) {
  const isAmount = sortMode.startsWith('amount');
  const isOrder = sortMode.startsWith('order');
  
  let amountTitle = 'เรียงตามยอดเงิน';
  if (isAmount) {
    amountTitle = sortMode === 'amount-desc'
      ? 'เรียงตามยอดเงิน: มากไปน้อย (คลิกเพื่อสลับ)'
      : 'เรียงตามยอดเงิน: น้อยไปมาก (คลิกเพื่อสลับ)';
  }

  let orderTitle = 'เรียงตามลำดับหมวดหมู่';
  if (isOrder) {
    orderTitle = sortMode === 'order-asc'
      ? 'เรียงตามลำดับหมวดหมู่: น้อยไปมาก (คลิกเพื่อสลับ)'
      : 'เรียงตามลำดับหมวดหมู่: มากไปน้อย (คลิกเพื่อสลับ)';
  }

  return (
    <div className="ml-2 flex items-center gap-[1px] p-[2px] rounded-none border bg-[#181818] border-[#303030]/60">
      <button
        onClick={() => onToggleSort('amount')}
        title={amountTitle}
        aria-label={amountTitle}
        className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-1 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#da291c] ${
          isAmount ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <ArrowDownWideNarrow className={`w-3.5 h-3.5 shrink-0 transition-transform duration-100 ${sortMode === 'amount-asc' ? 'rotate-180' : ''}`} />
        <span className="text-[11px] font-black uppercase tracking-wider">ยอด</span>
        {isAmount && <span className="text-[11px] font-black">{sortMode === 'amount-asc' ? '↑' : '↓'}</span>}
      </button>

      <button
        onClick={() => onToggleSort('order')}
        title={orderTitle}
        aria-label={orderTitle}
        className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-1 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#da291c] ${
          isOrder ? 'bg-[#da291c]/20 text-[#da291c]' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <ListOrdered className={`w-3.5 h-3.5 shrink-0 transition-transform duration-100 ${sortMode === 'order-desc' ? 'rotate-180' : ''}`} />
        <span className="text-[11px] font-black uppercase tracking-wider">ลำดับ</span>
        {isOrder && <span className="text-[11px] font-black">{sortMode === 'order-desc' ? '↓' : '↑'}</span>}
      </button>
    </div>
  );
}

interface SimulationBadgeProps {
  excludedCount: number;
  totalReduced: number;
  onReset: () => void;
}

function SimulationBadge({ excludedCount, totalReduced, onReset }: SimulationBadgeProps) {
  if (excludedCount === 0) return null;
  return (
    <div className="ml-2 flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-none text-[11px]">
      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
      <span className="font-black text-amber-300 uppercase tracking-wider">
        จำลองลด {excludedCount} หมวด (-฿{formatMoney(totalReduced)})
      </span>
      <button
        onClick={onReset}
        className="ml-1 px-1.5 py-0.5 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 font-bold rounded-none flex items-center gap-1 transition-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
        title="คืนค่าหมวดหมู่ทั้งหมด"
      >
        <RotateCcw className="w-2.5 h-2.5" />
        <span>คืนค่า</span>
      </button>
    </div>
  );
}

function NoIncomeWarning() {
  return (
    <span
      className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-[#da291c]/10 border border-[#da291c]/40 rounded-none text-[11px] font-black text-[#da291c] uppercase tracking-wider"
      title="ไม่มีรายได้บันทึกในเดือนนี้ — สัดส่วนคำนวณจากยอดรายจ่ายแทน"
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>ไม่มีรายได้บันทึก</span>
    </span>
  );
}

export function ExpenseProportionHeader({
  displayMode,
  onChangeMode,
  sortMode,
  onToggleSort,
  isAllocationMode,
  excludedGroupIds,
  totalReduced,
  onResetExclusions,
  showSkeleton,
  itemCount,
  hasNoIncomeData,
}: ExpenseProportionHeaderProps) {
  const countLabel = isAllocationMode ? 'ส่วน' : 'หมวดหมู่';
  const countText = showSkeleton ? '...' : `${itemCount} ${countLabel}`;

  return (
    <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d]">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-[3px] h-3 bg-[#da291c] shrink-0" />
        <PieChart className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-200">
          สัดส่วนรายจ่าย (Proportions)
        </span>

        <ModeSwitcher displayMode={displayMode} onChangeMode={onChangeMode} />

        {!isAllocationMode && (
          <SortSwitcher sortMode={sortMode} onToggleSort={onToggleSort} />
        )}

        {isAllocationMode && !showSkeleton && hasNoIncomeData && <NoIncomeWarning />}

        {isAllocationMode && (
          <SimulationBadge
            excludedCount={excludedGroupIds.length}
            totalReduced={totalReduced}
            onReset={onResetExclusions}
          />
        )}
      </div>
      <span className="text-[11px] font-black px-1.5 rounded-full bg-[#da291c]/10 text-[#da291c]">
        {countText}
      </span>
    </div>
  );
}

export default ExpenseProportionHeader;
