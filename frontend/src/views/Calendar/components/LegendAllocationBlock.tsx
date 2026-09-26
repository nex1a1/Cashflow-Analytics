import React from 'react';
import { List, Rows, Folders, Coins } from 'lucide-react';
import sharkWhite from '../../../assets/images/shark-white.svg';
import { formatAmount as formatValue } from '../../../utils/formatters';
import CategoryGlyph from '../../../components/shared/CategoryGlyph';

import { tc, readable, ALLOCATION_COLORS } from '@/constants/theme';
export interface LegendCategoryItem {
  id: string;
  name: string;
  color?: string | null;
  type?: string;
  order_index?: number;
  cashflowGroup?: string | null;
  cashflow_group_id?: string | null;
}

export interface LegendGroupItem {
  groupObj: {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
    color?: string | null;
    order_index?: number;
  };
  categories: LegendCategoryItem[];
  groupTotal: number;
}

export interface AllocCatItem {
  id?: string;
  name: string;
  groupName: string;
  amount: number;
  color: string;
  groupOrder?: number;
  catOrder?: number;
}

export interface AllocationTotals {
  need: number;
  want: number;
  savings: number;
  totalExpense: number;
  needPct: number;
  wantPct: number;
  savingsPct: number;
  needCats: AllocCatItem[];
  wantCats: AllocCatItem[];
  savingsCats: AllocCatItem[];
}

export interface LegendAllocationBlockProps {
  sortedGroups: LegendGroupItem[];
  catAmounts: Record<string, number>;
  excludedCategoryIds: Set<string>;
  toggleCategory: (catId: string) => void;
  legendLayoutMode: 'compact' | 'grouped';
  legendSortMode: 'structure' | 'amount';
  handleSetLayoutMode: (mode: 'compact' | 'grouped') => void;
  handleSetSortMode: (mode: 'structure' | 'amount') => void;
  allocationTotals: AllocationTotals;
  hexToRgb: (hex: string | null | undefined) => string;
}

interface CategoryLegendSectionProps {
  sortedGroups: LegendGroupItem[];
  catAmounts: Record<string, number>;
  excludedCategoryIds: Set<string>;
  toggleCategory: (catId: string) => void;
  legendLayoutMode: 'compact' | 'grouped';
  legendSortMode: 'structure' | 'amount';
  handleSetLayoutMode: (mode: 'compact' | 'grouped') => void;
  handleSetSortMode: (mode: 'structure' | 'amount') => void;
  hexToRgb: (hex: string | null | undefined) => string;
}

const LegendAllocationBlock = React.memo(function LegendAllocationBlock({
  sortedGroups,
  catAmounts,
  excludedCategoryIds,
  toggleCategory,
  legendLayoutMode,
  legendSortMode,
  handleSetLayoutMode,
  handleSetSortMode,
  allocationTotals,
  hexToRgb
}: LegendAllocationBlockProps): React.ReactElement {
  if (!sortedGroups || sortedGroups.length === 0) {
    return (
      <div className="bg-canvas rounded-md border border-neutral-800/90 p-4 text-center select-none">
        <p className="text-xs font-bold text-slate-500 font-mono tracking-wider uppercase">
          ไม่มีรายการธุรกรรมในเดือนนี้ (NO TRANSACTIONS IN THIS MONTH)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-canvas rounded-md border border-neutral-800/90 p-3.5 px-4">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
        {/* Left Side: Category Legend */}
        <CategoryLegendSection
          sortedGroups={sortedGroups}
          catAmounts={catAmounts}
          excludedCategoryIds={excludedCategoryIds}
          toggleCategory={toggleCategory}
          legendLayoutMode={legendLayoutMode}
          legendSortMode={legendSortMode}
          handleSetLayoutMode={handleSetLayoutMode}
          handleSetSortMode={handleSetSortMode}
          hexToRgb={hexToRgb}
        />

        {/* Right Side: Allocation Overview */}
        <AllocationOverviewSection
          allocationTotals={allocationTotals}
          legendLayoutMode={legendLayoutMode}
          hexToRgb={hexToRgb}
        />
      </div>
    </div>
  );
});

export default LegendAllocationBlock;

// ── Sub-sections (Internal to keep LegendAllocationBlock cohesive) ──

function CategoryLegendSection({
  sortedGroups,
  catAmounts,
  excludedCategoryIds,
  toggleCategory,
  legendLayoutMode,
  legendSortMode,
  handleSetLayoutMode,
  handleSetSortMode,
  hexToRgb
}: CategoryLegendSectionProps) {
  const hasExclusions = excludedCategoryIds.size > 0;

  return (
    <div className="flex-grow flex flex-col min-w-0">
      <div className="flex items-center gap-3 mb-3 flex-wrap sm:flex-nowrap">
        <span className="text-[13.5px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" /> หมวดหมู่ธุรกรรม (Categories)
        </span>
        
        {/* Layout Switcher */}
        <div className="flex items-center gap-1 shrink-0 border border-neutral-800 bg-neutral-900/90 p-0.5 rounded-sm" title="รูปแบบการแสดงผล">
          <button
            onClick={() => handleSetLayoutMode('compact')}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              legendLayoutMode === 'compact'
                ? 'bg-accent text-on-accent font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="แบบย่อ"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetLayoutMode('grouped')}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              legendLayoutMode === 'grouped'
                ? 'bg-accent text-on-accent font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="แยกกลุ่ม"
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sort Switcher */}
        <div className="flex items-center gap-1 shrink-0 border border-neutral-800 bg-neutral-900/90 p-0.5 rounded-sm" title="การจัดเรียง">
          <button
            onClick={() => handleSetSortMode('structure')}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              legendSortMode === 'structure'
                ? 'bg-accent text-on-accent font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="เรียงตามโครงสร้าง"
          >
            <Folders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetSortMode('amount')}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              legendSortMode === 'amount'
                ? 'bg-accent text-on-accent font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="เรียงตามยอดเงิน"
          >
            <Coins className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-[1px] bg-surface-elevated flex-1 min-w-[20px]" />
        
        {hasExclusions && (
          <button
            onClick={() => toggleCategory('CLEAR_ALL')}
            className="px-3 py-0.5 text-[11px] font-black tracking-wider uppercase rounded-full border border-accent bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer shrink-0"
          >
            แสดงทั้งหมด
          </button>
        )}
      </div>

      {legendLayoutMode === 'compact' ? (
        <div className="flex flex-wrap gap-x-2 gap-y-1.5 content-start">
          {sortedGroups.flatMap(g => g.categories).map(cat => {
            const color = cat.color || tc('ink-body');
            const isExcluded = excludedCategoryIds.has(cat.id);
            const amt = catAmounts[cat.id] || 0;
            
            return (
              <button 
                key={cat.id} 
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-none border cursor-pointer select-none transition-none bg-transparent ${
                  isExcluded ? 'opacity-30 hover:opacity-55' : 'hover:brightness-110'
                }`}
                style={{
                  backgroundColor: isExcluded ? 'transparent' : `rgba(${hexToRgb(color)}, 0.08)`,
                  borderColor: isExcluded ? `rgba(${hexToRgb(color)}, 0.1)` : `rgba(${hexToRgb(color)}, 0.25)`,
                  color: readable(color),
                }}
              >
                <div className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: color, opacity: isExcluded ? 0.3 : 1 }} />
                <span>{cat.name}</span>
                <span className="text-[11px] font-bold tabular-nums tracking-tight ml-1">{formatValue(amt)} ฿</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col flex-grow min-h-0">
          {sortedGroups.map(({ groupObj, categories: groupCats, groupTotal }) => {
            const groupColor = groupObj.color || tc('ink-muted');
            let amtColor = 'text-expense';
            let amtPrefix = '-';
            if (groupObj.type === 'income') {
              amtColor = 'text-emerald-400';
              amtPrefix = '+';
            } else if (groupObj.type === 'savings') {
              amtColor = 'text-amber-400';
              amtPrefix = '±';
            }
            
            return (
              <div key={`${groupObj.type}_${groupObj.id}`} className="flex-1 flex flex-row items-stretch gap-4 border-b border-line/30 last:border-b-0">
                <div className="flex items-center justify-between w-[280px] shrink-0 pr-4 py-3 border-r border-line/50">
                  <span className="text-[13px] font-black text-slate-200 tracking-wide flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: groupColor }} />
                    {groupObj.icon && <CategoryGlyph icon={groupObj.icon} color={groupObj.color} size={20} className="shrink-0" />}
                    <span className="truncate">{groupObj.name}</span>
                  </span>
                  <span className={`text-[13px] font-bold tracking-tight tabular-nums shrink-0 ml-2 ${amtColor}`}>
                    {amtPrefix}{formatValue(groupTotal)} ฿
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 flex-grow pl-1 py-3">
                  {groupCats.map((cat: any) => {
                    const color = cat.color || tc('ink-body');
                    const isExcluded = excludedCategoryIds.has(cat.id);
                    const amt = catAmounts[cat.id] || 0;
                    
                    return (
                      <button 
                        key={cat.id} 
                        type="button" 
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-none border cursor-pointer select-none transition-none bg-transparent ${
                          isExcluded ? 'opacity-30 hover:opacity-55' : 'hover:brightness-110'
                        }`}
                        style={{
                          backgroundColor: isExcluded ? 'transparent' : `rgba(${hexToRgb(color)}, 0.08)`,
                          borderColor: isExcluded ? `rgba(${hexToRgb(color)}, 0.1)` : `rgba(${hexToRgb(color)}, 0.25)`,
                          color: readable(color),
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: color, opacity: isExcluded ? 0.3 : 1 }} />
                        <span>{cat.name}</span>
                        <span className="text-[11px] font-bold tabular-nums tracking-tight ml-1">{formatValue(amt)} ฿</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AllocationOverviewSection({
  allocationTotals,
  legendLayoutMode,
  hexToRgb
}: { allocationTotals: any; legendLayoutMode: 'compact' | 'grouped'; hexToRgb: (hex: string | null | undefined) => string; }) {
  const rows = [
    { label: 'จำเป็น', dot: ALLOCATION_COLORS.need, pct: allocationTotals.needPct, total: allocationTotals.need, cats: allocationTotals.needCats },
    { label: 'ทั่วไป', dot: ALLOCATION_COLORS.want, pct: allocationTotals.wantPct, total: allocationTotals.want, cats: allocationTotals.wantCats },
    { label: 'เงินออม', dot: ALLOCATION_COLORS.savings, pct: allocationTotals.savingsPct, total: allocationTotals.savings, cats: allocationTotals.savingsCats },
  ];

  return (
    <div className="w-full lg:w-[320px] shrink-0 pl-0 lg:pl-5 border-t lg:border-t-0 lg:border-l border-line/50 flex flex-col gap-2.5 pt-1 justify-start relative overflow-hidden select-none">
      <span className="text-[11px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1.5 z-10">
        สัดส่วนการใช้จ่าย (Allocation)
      </span>

      <div className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-300 z-10">
        {rows.map(row => (
          <React.Fragment key={row.label}>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: row.dot }} /> {row.label}
              </span>
              <span className="font-bold tabular-nums tracking-tight text-white">
                {formatValue(row.total)} ฿ ({row.pct}%)
              </span>
            </div>
            {legendLayoutMode === 'grouped' && row.cats.length > 0 && (
              <div className="pl-3.5 mb-1 flex flex-col gap-1 border-l border-line ml-1 text-[11px] text-slate-300 font-bold">
                {row.cats.map((cat: any) => (
                  <div key={cat.id || `${cat.name}_${cat.groupName}`} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">
                        {cat.name} <span className="text-ink-body text-[11px] font-normal font-sans">({cat.groupName})</span>
                      </span>
                    </span>
                    <span className="font-bold tabular-nums tracking-tight text-slate-100 ml-2 shrink-0">{formatValue(cat.amount)} ฿</span>
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Stacked Progress Bar */}
      {allocationTotals.totalExpense > 0 && (
        <div className="h-2 w-full bg-surface border border-neutral-800 flex rounded-full overflow-hidden mt-1 shrink-0 z-10">
          <div
            style={{ width: `${allocationTotals.needPct}%`, backgroundColor: ALLOCATION_COLORS.need }}
            title={`Needs: ${allocationTotals.needPct}%`}
          />
          <div 
            style={{ width: `${allocationTotals.wantPct}%`, backgroundColor: ALLOCATION_COLORS.want }} 
            title={`Wants: ${allocationTotals.wantPct}%`} 
          />
          <div 
            style={{ width: `${allocationTotals.savingsPct}%`, backgroundColor: ALLOCATION_COLORS.savings }} 
            title={`Savings: ${allocationTotals.savingsPct}%`} 
          />
        </div>
      )}

      {/* Subtle watermark logo in background */}
      <img 
        src={sharkWhite} 
        alt="" 
        className="absolute -bottom-8 -right-8 w-36 h-36 opacity-[0.02] pointer-events-none select-none z-0" 
      />
    </div>
  );
}
