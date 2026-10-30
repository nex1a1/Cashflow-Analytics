// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionHeader.tsx
import {
  PieChart,
  ArrowDownWideNarrow,
  ListOrdered,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { formatBaht } from '../../../../utils/formatters';
import { PlanKey } from '@/components/shared/PlanKey';
import { PanelTitle, DISABLED_OPTION, DisabledHint } from '../panelParts';
import { DisplayMode, ExpenseProportionHeaderProps, SortMode } from './types';

interface ModeSwitcherProps {
  displayMode: DisplayMode;
  onChangeMode: (mode: DisplayMode) => void;
  evolutionEligible: boolean;
  evolutionLabel: string;
}

function ModeSwitcher({ displayMode, onChangeMode, evolutionEligible, evolutionLabel }: ModeSwitcherProps) {
  const modes: Array<{ id: DisplayMode; label: string }> = [
    { id: 'category', label: 'รายหมวดหมู่' },
    { id: 'allocation', label: 'สัดส่วน 50/30/20' },
    { id: 'evolution', label: evolutionLabel || 'แนวโน้ม 3 เดือน' },
  ];
  return (
    <div className="ml-4 flex items-center gap-px p-[2px] rounded-none border bg-canvas border-line/60">
      {modes.map(m => {
        const isDisabled = m.id === 'evolution' && !evolutionEligible;
        const isActive = displayMode === m.id && !isDisabled;
        return (
          <div key={m.id} className="relative group/hint flex items-center">
            <button
              disabled={isDisabled}
              onClick={() => !isDisabled && onChangeMode(m.id)}
              aria-pressed={isActive}
              aria-disabled={isDisabled}
              className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-tighter rounded-none transition-none outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                isDisabled ? DISABLED_OPTION : isActive ? 'bg-accent text-on-accent' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
            {isDisabled && <DisabledHint text="ต้องเลือกช่วงเวลามากกว่า 1 เดือน (อย่างน้อย 3 เดือน) เพื่อดูแนวโน้ม" align="center" />}
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

// Each sort button: which way is "flipped" (icon rotated) and the label/arrow for both directions
const SORTS = [
  { type: 'amount', Icon: ArrowDownWideNarrow, label: 'ยอด', name: 'เรียงตามยอดเงิน', flipped: 'amount-asc', first: 'amount-desc', activeCls: 'bg-amber-500/20 text-amber-400' },
  { type: 'order', Icon: ListOrdered, label: 'ลำดับ', name: 'เรียงตามลำดับหมวดหมู่', flipped: 'order-desc', first: 'order-asc', activeCls: 'bg-accent/20 text-accent-ink' },
] as const;

function SortSwitcher({ sortMode, onToggleSort }: SortSwitcherProps) {
  return (
    <div className="ml-2 flex items-center gap-px p-[2px] rounded-none border bg-canvas border-line/60">
      {SORTS.map(({ type, Icon, label, name, flipped, first, activeCls }) => {
        const active = sortMode.startsWith(type);
        // amount starts big → small, order starts small → big
        const firstText = type === 'amount' ? 'มากไปน้อย' : 'น้อยไปมาก';
        const otherText = type === 'amount' ? 'น้อยไปมาก' : 'มากไปน้อย';
        const title = active ? `${name}: ${sortMode === first ? firstText : otherText} (คลิกเพื่อสลับ)` : name;
        return (
          <button
            key={type}
            onClick={() => onToggleSort(type)}
            title={title}
            aria-label={title}
            className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-1 text-[11px] font-bold outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink ${
              active ? activeCls : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-100 ${sortMode === flipped ? 'rotate-180' : ''}`} />
            <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
            {active && <span className="text-[11px] font-black">{sortMode.endsWith('asc') ? '↑' : '↓'}</span>}
          </button>
        );
      })}
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
    <div className="ml-2 flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-pill text-[11px]">
      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
      <span className="font-black text-amber-300 uppercase tracking-wider">
        จำลองลด {excludedCount} หมวด (−{formatBaht(totalReduced)})
      </span>
      <button
        onClick={onReset}
        className="ml-1 px-1.5 py-0.5 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 font-bold rounded-none flex items-center gap-1 transition-none outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
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
      className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-accent/10 border border-accent/40 rounded-pill text-[11px] font-black text-accent-ink uppercase tracking-wider"
      title="เดือนนี้ไม่มีรายรับ สัดส่วนจึงคิดจากยอดรายจ่ายแทน"
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>ไม่มีรายรับ</span>
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
  hasPlan,
  total,
  planTotal = 0,
}: ExpenseProportionHeaderProps) {
  const countLabel = isAllocationMode ? 'ส่วน' : displayMode === 'evolution' ? 'เดือน' : 'หมวดหมู่';
  const countText = showSkeleton ? '...' : `${itemCount} ${countLabel}`;

  return (
    <div className="px-4 py-2 border-b flex items-center justify-between bg-surface/80 border-line">
      <div className="flex items-center gap-2 flex-wrap">
        <PanelTitle icon={PieChart} title="สัดส่วนรายจ่าย" />

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
      <div className="flex items-center gap-3">
        {total !== undefined && !showSkeleton && (
          <span className="flex items-baseline gap-1.5 text-[11px] tabular-nums whitespace-nowrap">
            <span className="font-bold text-ink-muted">{isAllocationMode ? 'รายรับ' : 'รวม'}</span>
            <span className="text-[12px] font-black text-ink-display">{formatBaht(total)}</span>
            {planTotal > 0 && (
              <span className="font-bold text-ink-muted" title="ส่วนที่ลงล่วงหน้า ยังไม่ถึงวันที่">
                · แผน {formatBaht(planTotal)}
              </span>
            )}
          </span>
        )}
        {hasPlan && !showSkeleton && <PlanKey className="m-fade-in" />}
        <span className="text-[11px] font-black px-1.5 rounded-pill bg-accent/10 text-accent-ink">
          {countText}
        </span>
      </div>
    </div>
  );
}
