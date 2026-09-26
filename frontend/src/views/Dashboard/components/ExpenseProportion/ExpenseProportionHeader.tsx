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
  evolutionEligible: boolean;
  evolutionLabel: string;
}

function buildModes(evolutionLabel: string): Array<{ id: DisplayMode; label: string }> {
  return [
    { id: 'category', label: 'รายหมวดหมู่' },
    { id: 'allocation', label: 'สัดส่วน 50/30/20' },
    { id: 'evolution', label: evolutionLabel || 'แนวโน้ม 3 เดือน' },
  ];
}

function ModeSwitcher({ displayMode, onChangeMode, evolutionEligible, evolutionLabel }: ModeSwitcherProps) {
  const modes = buildModes(evolutionLabel);
  return (
    <div className="ml-4 flex items-center gap-[1px] p-[2px] rounded-none border bg-canvas border-line/60">
      {modes.map(m => {
        const isDisabled = m.id === 'evolution' && !evolutionEligible;
        const isActive = displayMode === m.id && !isDisabled;
        const tooltip = isDisabled ? 'ต้องเลือกช่วงเวลามากกว่า 1 เดือน (อย่างน้อย 3 เดือน) เพื่อดูแนวโน้ม' : undefined;
        return (
          <div key={m.id} className="relative group/modebtn flex items-center">
            <button
              disabled={isDisabled}
              onClick={() => !isDisabled && onChangeMode(m.id)}
              aria-pressed={isActive}
              aria-disabled={isDisabled}
              className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-tighter rounded-none transition-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed text-neutral-600 bg-transparent hover:bg-transparent hover:text-neutral-600'
                  : isActive
                  ? 'bg-accent text-on-accent'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
            {isDisabled && tooltip && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/modebtn:opacity-100 pointer-events-none transition-opacity z-50 invisible group-hover/modebtn:visible whitespace-nowrap">
                <div className="rounded-none py-1 px-2.5 text-[11px] font-medium shadow-2xl bg-surface text-neutral-300 border border-line-strong flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span>{tooltip}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
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
    <div className="ml-2 flex items-center gap-[1px] p-[2px] rounded-none border bg-canvas border-line/60">
      <button
        onClick={() => onToggleSort('amount')}
        title={amountTitle}
        aria-label={amountTitle}
        className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-1 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
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
        className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-1 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
          isOrder ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-slate-200'
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
      className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-accent/10 border border-accent/40 rounded-none text-[11px] font-black text-accent uppercase tracking-wider"
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
  evolutionEligible,
  evolutionLabel,
}: ExpenseProportionHeaderProps) {
  const countLabel = isAllocationMode ? 'ส่วน' : displayMode === 'evolution' ? 'เดือน' : 'หมวดหมู่';
  const countText = showSkeleton ? '...' : `${itemCount} ${countLabel}`;

  return (
    <div className="px-4 py-2 border-b flex items-center justify-between bg-surface/80 border-line">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-[3px] h-3 bg-accent shrink-0" />
        <PieChart className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-200">
          สัดส่วนรายจ่าย (Proportions)
        </span>

        <ModeSwitcher
          displayMode={displayMode}
          onChangeMode={onChangeMode}
          evolutionEligible={evolutionEligible}
          evolutionLabel={evolutionLabel}
        />

        {displayMode === 'category' && (
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
      <span className="text-[11px] font-black px-1.5 rounded-full bg-accent/10 text-accent">
        {countText}
      </span>
    </div>
  );
}

export default ExpenseProportionHeader;
