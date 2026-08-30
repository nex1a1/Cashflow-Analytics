import { List, Rows, Folders, Coins } from 'lucide-react';
import sharkWhite from '../../../assets/images/shark-white.svg';

const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export default function LegendAllocationBlock({
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
}) {
  return (
    <div className="bg-[#181818] rounded-none border border-[#2d2d2d] p-3.5 px-4">
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
}

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
}) {
  const isDarkMode = true;
  const hasExclusions = excludedCategoryIds.size > 0;

  return (
    <div className="flex-grow flex flex-col min-w-0">
      <div className="flex items-center gap-3 mb-3 flex-wrap sm:flex-nowrap">
        <span className="text-[13.5px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-none bg-[#da291c] animate-pulse" />
          หมวดหมู่ธุรกรรม (Categories)
        </span>
        
        {/* Layout Switcher */}
        <div className="flex items-center gap-1 shrink-0 border border-[#2d2d2d] bg-[#121212] p-0.5" title="รูปแบบการแสดงผล">
          <button
            onClick={() => handleSetLayoutMode('compact')}
            className={`p-1 rounded-none transition-none cursor-pointer ${
              legendLayoutMode === 'compact'
                ? 'bg-[#da291c] text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="แบบย่อ (Compact)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetLayoutMode('grouped')}
            className={`p-1 rounded-none transition-none cursor-pointer ${
              legendLayoutMode === 'grouped'
                ? 'bg-[#da291c] text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="แยกกลุ่ม (Grouped)"
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sort Switcher */}
        <div className="flex items-center gap-1 shrink-0 border border-[#2d2d2d] bg-[#121212] p-0.5" title="การจัดเรียง">
          <button
            onClick={() => handleSetSortMode('structure')}
            className={`p-1 rounded-none transition-none cursor-pointer ${
              legendSortMode === 'structure'
                ? 'bg-[#da291c] text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="เรียงตามโครงสร้าง (Sort by groups)"
          >
            <Folders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetSortMode('amount')}
            className={`p-1 rounded-none transition-none cursor-pointer ${
              legendSortMode === 'amount'
                ? 'bg-[#da291c] text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
            title="เรียงตามยอดเงิน (Sort by amount)"
          >
            <Coins className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-[1px] bg-[#2d2d2d] flex-1 min-w-[20px]" />
        
        {hasExclusions && (
          <button
            onClick={() => toggleCategory('CLEAR_ALL')}
            className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-none border border-[#da291c] bg-[#da291c]/10 text-[#da291c] hover:bg-[#da291c]/20 transition-none cursor-pointer shrink-0"
          >
            แสดงทั้งหมด
          </button>
        )}
      </div>

      {legendLayoutMode === 'compact' ? (
        <div className="flex flex-wrap gap-x-2 gap-y-1.5 content-start">
          {sortedGroups.flatMap(g => g.categories).map(cat => {
            const color = cat.color || '#94a3b8';
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
                  color: color,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: color, opacity: isExcluded ? 0.3 : 1 }} />
                <span className="opacity-90">{cat.name}</span>
                <span className="text-[11px] opacity-75 font-mono font-bold ml-1">{formatValue(amt)} ฿</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col flex-grow min-h-0">
          {sortedGroups.map(({ groupObj, categories: groupCats, groupTotal }) => {
            const groupColor = groupObj.color || '#64748b';
            const amtColor = groupObj.type === 'income' ? 'text-emerald-400' : groupObj.type === 'savings' ? 'text-amber-400' : 'text-red-400';
            const amtPrefix = groupObj.type === 'income' ? '+' : groupObj.type === 'savings' ? '±' : '-';
            
            return (
              <div key={groupObj.id} className="flex-1 flex flex-row items-stretch gap-4 border-b border-[#2d2d2d]/30 last:border-b-0">
                <div className="flex items-center justify-between w-[280px] shrink-0 pr-4 py-3 border-r border-[#2d2d2d]/50">
                  <span className="text-[12px] font-black text-slate-300 tracking-wide flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: groupColor }} />
                    {groupObj.icon && <span className="text-[11.5px] shrink-0">{groupObj.icon}</span>}
                    <span className="truncate">{groupObj.name}</span>
                  </span>
                  <span className={`text-[13px] font-mono font-black tracking-wide tabular-nums shrink-0 ml-2 ${amtColor}`}>
                    {amtPrefix}{formatValue(groupTotal)} ฿
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 flex-grow pl-1 py-3">
                  {groupCats.map(cat => {
                    const color = cat.color || '#94a3b8';
                    const isExcluded = excludedCategoryIds.has(cat.id);
                    const amt = catAmounts[cat.id] || 0;
                    
                    return (
                      <button 
                        key={cat.id} 
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-none border cursor-pointer select-none transition-none bg-transparent ${
                          isExcluded ? 'opacity-30 hover:opacity-55' : 'hover:brightness-110'
                        }`}
                        style={{
                          backgroundColor: isExcluded ? 'transparent' : `rgba(${hexToRgb(color)}, 0.08)`,
                          borderColor: isExcluded ? `rgba(${hexToRgb(color)}, 0.1)` : `rgba(${hexToRgb(color)}, 0.25)`,
                          color: color,
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: color, opacity: isExcluded ? 0.3 : 1 }} />
                        <span className="opacity-90">{cat.name}</span>
                        <span className="text-[10px] opacity-75 font-mono font-bold ml-1">{formatValue(amt)} ฿</span>
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
}) {
  return (
    <div className="w-full lg:w-[320px] shrink-0 pl-0 lg:pl-5 border-t lg:border-t-0 lg:border-l border-[#2d2d2d]/50 flex flex-col gap-2.5 pt-1 justify-start relative overflow-hidden select-none">
      <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase flex items-center gap-1.5 z-10">
        สัดส่วนการใช้จ่าย (Allocation)
      </span>
      
      <div className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-300 z-10">
        {/* Needs */}
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-none bg-[#EF4444]" />
            จำเป็น (Needs)
          </span>
          <span className="font-mono tabular-nums text-white">
            {formatValue(allocationTotals.need)} ฿ ({allocationTotals.needPct}%)
          </span>
        </div>
        {legendLayoutMode === 'grouped' && allocationTotals.needCats.length > 0 && (
          <div className="pl-3.5 mb-1 flex flex-col gap-1 border-l border-[#2d2d2d] ml-1 text-[10.5px] text-slate-300 font-bold">
            {allocationTotals.needCats.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">
                    {cat.name} <span className="opacity-60 text-[9px] font-normal font-sans">({cat.groupName})</span>
                  </span>
                </span>
                <span className="font-mono tabular-nums text-slate-100 ml-2 shrink-0">{formatValue(cat.amount)} ฿</span>
              </div>
            ))}
          </div>
        )}

        {/* Wants */}
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-none bg-[#F59E0B]" />
            ทั่วไป (Wants)
          </span>
          <span className="font-mono tabular-nums text-white">
            {formatValue(allocationTotals.want)} ฿ ({allocationTotals.wantPct}%)
          </span>
        </div>
        {legendLayoutMode === 'grouped' && allocationTotals.wantCats.length > 0 && (
          <div className="pl-3.5 mb-1 flex flex-col gap-1 border-l border-[#2d2d2d] ml-1 text-[10.5px] text-slate-300 font-bold">
            {allocationTotals.wantCats.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">
                    {cat.name} <span className="opacity-60 text-[9px] font-normal font-sans">({cat.groupName})</span>
                  </span>
                </span>
                <span className="font-mono tabular-nums text-slate-100 ml-2 shrink-0">{formatValue(cat.amount)} ฿</span>
              </div>
            ))}
          </div>
        )}

        {/* Savings */}
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-none bg-[#10B981]" />
            เงินออม (Savings)
          </span>
          <span className="font-mono tabular-nums text-white">
            {formatValue(allocationTotals.savings)} ฿ ({allocationTotals.savingsPct}%)
          </span>
        </div>
        {legendLayoutMode === 'grouped' && allocationTotals.savingsCats.length > 0 && (
          <div className="pl-3.5 mb-1 flex flex-col gap-1 border-l border-[#2d2d2d] ml-1 text-[10.5px] text-slate-300 font-bold">
            {allocationTotals.savingsCats.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">
                    {cat.name} <span className="opacity-60 text-[9px] font-normal font-sans">({cat.groupName})</span>
                  </span>
                </span>
                <span className="font-mono tabular-nums text-slate-100 ml-2 shrink-0">{formatValue(cat.amount)} ฿</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stacked Progress Bar */}
      {allocationTotals.totalExpense > 0 && (
        <div className="h-1.5 w-full bg-[#121212] border border-[#2d2d2d] flex rounded-none overflow-hidden mt-1 shrink-0 z-10">
          <div 
            style={{ width: `${allocationTotals.needPct}%`, backgroundColor: '#EF4444' }} 
            title={`Needs: ${allocationTotals.needPct}%`} 
          />
          <div 
            style={{ width: `${allocationTotals.wantPct}%`, backgroundColor: '#F59E0B' }} 
            title={`Wants: ${allocationTotals.wantPct}%`} 
          />
          <div 
            style={{ width: `${allocationTotals.savingsPct}%`, backgroundColor: '#10B981' }} 
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
