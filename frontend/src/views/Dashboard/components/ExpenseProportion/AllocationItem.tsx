import React from 'react';
import { EyeOff, Waves } from 'lucide-react';
import { formatMoney, formatBaht } from '../../../../utils/formatters';
import { AllocationGroupItemData, AllocationItemProps } from './types';
import CategoryGlyph from '../../../../components/shared/CategoryGlyph';
import { readable } from '@/constants/theme';

/**
 * Verdict of one part against its target. NEED / WANT are ceilings (spending
 * less is good), the third part is a floor (money left over should reach it).
 */
export function allocationVerdict(amount: number, percentage: number, target: number, base: number, isSavings: boolean) {
  const targetAmount = base * (target / 100);
  const diff = isSavings ? amount - targetAmount : targetAmount - amount;
  const points = Math.abs(percentage - target).toFixed(1);
  if (diff >= 0) {
    return {
      tone: 'good' as const,
      text: isSavings ? `+${formatBaht(diff)} เกินเป้า` : `+${formatBaht(diff)} ในโควตา`,
      points: null,
      targetAmount,
    };
  }
  return {
    tone: isSavings ? ('short' as const) : ('over' as const),
    text: isSavings ? `ขาดอีก ${formatBaht(-diff)}` : `−${formatBaht(-diff)} เกินโควตา`,
    points: isSavings ? `ขาด ${points}%` : `เกิน +${points}%`,
    targetAmount,
  };
}

const VERDICT_CLS = {
  good: 'bg-emerald-500/15 text-emerald-300',
  over: 'bg-danger/20 text-red-300',
  short: 'bg-amber-500/20 text-amber-300',
};

interface GroupRowProps {
  group: AllocationGroupItemData;
  partAmount: number;
  maxAmount: number;
  fallbackColor: string;
  isExcluded: boolean;
  onToggle?: (groupId: string) => void;
}

/** One group inside a part: the same ranked-row look as the category list, clickable for the what-if. */
function GroupRow({ group, partAmount, maxAmount, fallbackColor, isExcluded, onToggle }: GroupRowProps) {
  const color = group.color || fallbackColor;
  const share = partAmount > 0 && !isExcluded ? Math.round((group.amount / partAmount) * 100) : 0;
  const washPct = maxAmount > 0 && !isExcluded ? (group.amount / maxAmount) * 100 : 0;
  return (
    <button
      type="button"
      onClick={() => onToggle?.(group.id)}
      title={isExcluded ? 'คลิกเพื่อเปิดหมวดหมู่นี้กลับมา' : 'คลิกเพื่อทดลองปิดหมวดหมู่นี้'}
      className="relative w-full flex items-center gap-2 min-h-8 px-2.5 min-w-0 text-left bg-surface hover:bg-surface-hover cursor-pointer select-none outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink group/row"
    >
      <span className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 bg-white/4 group-hover/row:bg-white/8" style={{ width: `${washPct}%` }} />
        {washPct > 0 && <span className="absolute inset-y-0 w-[2px]" style={{ left: `calc(${washPct}% - 2px)`, backgroundColor: color }} />}
      </span>
      <CategoryGlyph icon={group.icon} color={isExcluded ? undefined : color} size={14} className={`relative shrink-0 ${isExcluded ? 'opacity-40' : ''}`} />
      <span className={`relative flex-1 min-w-0 truncate text-[12px] font-bold ${isExcluded ? 'line-through text-ink-muted' : 'text-ink-soft group-hover/row:text-ink-display'}`}>
        {group.name}
      </span>
      <span className={`relative shrink-0 text-[11px] font-bold tabular-nums ${isExcluded ? 'line-through text-ink-muted' : 'text-ink-body'}`}>
        {formatMoney(group.amount)}
      </span>
      <span className="relative shrink-0 w-10 text-right text-[12px] font-black tabular-nums text-ink-soft">
        {isExcluded ? <EyeOff className="w-3.5 h-3.5 text-ink-muted inline" aria-label="ยกเว้นจากการคำนวณ" /> : `${share}%`}
      </span>
    </button>
  );
}

/**
 * One part of 50/30/20 (NEED / WANT / SAVE): a header that answers "am I inside the
 * target?" and the groups that make the part up. The bars live in the strip above.
 */
export const AllocationItem = React.memo<AllocationItemProps>(({
  item,
  idx,
  isHovered,
  onHover,
  activeTotal = 0,
  excludedGroupIds = [],
  onToggleGroup,
}) => {
  const percentage = typeof item.percentage === 'number'
    ? item.percentage
    : Number.parseFloat(String(item.percentage)) || 0;
  const isSavings = item.id === 'savings';
  const verdict = allocationVerdict(item.amount, percentage, item.target, activeTotal, isSavings);
  const ink = readable(item.color);

  const groups = item.groups || [];
  const activeGroups = groups.filter(g => !excludedGroupIds.includes(g.id));
  const maxGroup = activeGroups.reduce((max, g) => Math.max(max, g.amount), 0);
  const plan = Math.min(item.planAmount || 0, item.amount);
  const surplus = isSavings ? item.amount - activeGroups.reduce((sum, g) => sum + g.amount, 0) : 0;

  return (
    <div
      onMouseEnter={() => onHover(idx)}
      onMouseLeave={() => onHover(-1)}
      onFocus={() => onHover(idx)}
      onBlur={() => onHover(-1)} // focus moving inside the part re-highlights it at once via onFocus
      role="group"
      aria-label={`${item.name}: ${item.percentage}% (เป้า ${item.target}%) — ${verdict.text}`}
      className={`relative flex flex-col min-w-0 h-full cursor-default ${isHovered ? 'bg-surface-hover' : 'bg-surface'}`}
    >
      {/* the part's colour as a 2px bar on top (a coloured border would lose to the border lock) */}
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: item.color }} aria-hidden="true" />

      <div className="flex flex-col gap-1.5 px-3 pt-3 pb-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0 text-[14px] font-black tracking-wide truncate" style={{ color: ink }}>
            <CategoryGlyph icon={item.icon} color={item.color} size={16} className="shrink-0" />
            <span className="truncate">{item.name}</span>
          </span>
          <span className="shrink-0 text-[22px] leading-none font-black tabular-nums tracking-tight" style={{ color: ink }}>
            {item.percentage}<span className="text-[13px]">%</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-[11px] font-bold tabular-nums">
          <span className="text-ink-body truncate">เป้า {item.target}% ({formatBaht(verdict.targetAmount)})</span>
          <span className="shrink-0 text-ink-soft">{formatBaht(item.amount)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 min-h-5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-[11px] font-black tabular-nums whitespace-nowrap ${VERDICT_CLS[verdict.tone]}`}>
            {verdict.text}
            {verdict.points && <span className="font-bold opacity-80">· {verdict.points}</span>}
          </span>
          {plan > 0 && (
            <span className="text-[11px] font-bold tabular-nums text-ink-muted whitespace-nowrap" title="ส่วนที่ลงล่วงหน้า ยังไม่ถึงวันที่">
              ในนี้แผน {formatBaht(plan)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-px bg-line border-t border-line">
        {groups.map(g => (
          <GroupRow
            key={g.id}
            group={g}
            partAmount={item.amount}
            maxAmount={maxGroup}
            fallbackColor={item.color}
            isExcluded={excludedGroupIds.includes(g.id)}
            onToggle={onToggleGroup}
          />
        ))}

        {isSavings && surplus > 10 && (
          <div className="flex items-center gap-2 min-h-8 px-2.5 bg-surface text-emerald-400">
            <Waves size={14} className="shrink-0" aria-hidden="true" />
            <span className="flex-1 text-[12px] font-bold">เหลือสุทธิ</span>
            <span className="text-[11px] font-bold tabular-nums">{formatMoney(surplus)}</span>
            <span className="w-10 text-right text-[12px] font-black tabular-nums">
              {item.amount > 0 ? Math.round((surplus / item.amount) * 100) : 0}%
            </span>
          </div>
        )}

        {groups.length === 0 && !isSavings && (
          <div className="flex items-center justify-center min-h-8 bg-surface">
            <span className="text-[11px] font-bold text-ink-muted">ไม่มีข้อมูล</span>
          </div>
        )}

        {/* fills the rest of the column so the hairline background never shows as a grey block */}
        <div className="flex-1 bg-surface" />
      </div>
    </div>
  );
});

AllocationItem.displayName = 'AllocationItem';
