import React from 'react';
import { Search, X, Hash, CalendarDays, MousePointer2, Target } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';

const SELECT_ARROW = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

export default function FilterBar({
  searchQuery, setSearchQuery,
  advancedFilterDate, setAdvancedFilterDate,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterCategory, setAdvancedFilterCategory,
  typeFilter, setTypeFilter,
  allocationFilter, setAllocationFilter,
  minAmount, setMinAmount,
  maxAmount, setMaxAmount,
  dayTypeFilter, setDayTypeFilter,
  availableDatesInPeriod, cashflowGroups, activeCashflowGroupIds, categories,
  clearFilters, isFilterActive
}) {
  const { isDarkMode: dm } = useTheme();

  const baseInputCls = `border rounded-sm outline-none focus:ring-1 text-[11px] font-bold transition-all ${
    dm
      ? 'bg-slate-900 border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 text-slate-200'
      : 'bg-slate-50 border-slate-200 focus:border-[#00509E] focus:ring-[#00509E]/10 text-slate-800 focus:bg-white'
  }`;

  const selCls = `${baseInputCls} px-3 py-1.5 cursor-pointer appearance-none min-w-[120px]`;
  const selStyle = { backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.85em' };

  const SegmentButton = ({ label, active, onClick, colorClass = 'blue' }) => {
    const activeCls = dm 
      ? `bg-${colorClass}-500/20 border-${colorClass}-500/40 text-${colorClass}-400`
      : `bg-${colorClass}-50 border-${colorClass}-200 text-${colorClass}-700`;
    const inactiveCls = dm
      ? 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50';

    return (
      <button 
        onClick={onClick}
        className={`px-3 py-1.5 border first:rounded-l-sm last:rounded-r-sm -ml-[1px] first:ml-0 text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 ${active ? activeCls : inactiveCls}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={`flex flex-col gap-3 p-4 rounded border shadow-sm transition-all ${
      dm ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200'
    }`}>
      
      {/* ─── ROW 1: SEARCH & QUICK TOGGLES ─── */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm group">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
            dm ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-[#00509E]'
          }`} />
          <input
            type="text"
            placeholder="ค้นหารายละเอียด หรือ หมวดหมู่..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`${baseInputCls} w-full pl-8 pr-8 py-2 placeholder:font-normal placeholder:opacity-50`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 p-1">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Type Toggle */}
        <div className="flex items-center">
          <span className="text-[10px] font-black uppercase opacity-40 mr-2 flex items-center gap-1"><MousePointer2 className="w-2.5 h-2.5" /> ประเภท</span>
          <div className="flex">
            <SegmentButton label="ทั้งหมด" active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} />
            <SegmentButton label="รายรับ" active={typeFilter === 'INCOME'} onClick={() => setTypeFilter('INCOME')} colorClass="emerald" />
            <SegmentButton label="รายจ่าย" active={typeFilter === 'EXPENSE'} onClick={() => setTypeFilter('EXPENSE')} colorClass="rose" />
            <SegmentButton label="เงินออม" active={typeFilter === 'SAVINGS'} onClick={() => setTypeFilter('SAVINGS')} colorClass="indigo" />
          </div>
        </div>

        {/* Day of Week Toggle */}
        <div className="flex items-center">
          <span className="text-[10px] font-black uppercase opacity-40 mr-2 flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" /> วัน</span>
          <div className="flex">
            <SegmentButton label="ทุกวัน" active={dayTypeFilter === 'ALL'} onClick={() => setDayTypeFilter('ALL')} />
            <SegmentButton label="Weekday" active={dayTypeFilter === 'WEEKDAY'} onClick={() => setDayTypeFilter('WEEKDAY')} />
            <SegmentButton label="Weekend" active={dayTypeFilter === 'WEEKEND'} onClick={() => setDayTypeFilter('WEEKEND')} colorClass="amber" />
          </div>
        </div>

        {/* Allocation Toggle */}
        <div className="flex items-center">
          <span className="text-[10px] font-black uppercase opacity-40 mr-2 flex items-center gap-1"><Target className="w-2.5 h-2.5" /> allocation</span>
          <div className="flex">
            <SegmentButton label="ทั้งหมด" active={allocationFilter === 'ALL'} onClick={() => setAllocationFilter('ALL')} />
            <SegmentButton label="Need" active={allocationFilter === 'need'} onClick={() => setAllocationFilter('need')} colorClass="rose" />
            <SegmentButton label="Want" active={allocationFilter === 'want'} onClick={() => setAllocationFilter('want')} colorClass="sky" />
            <SegmentButton label="Save" active={allocationFilter === 'savings'} onClick={() => setAllocationFilter('savings')} colorClass="emerald" />
          </div>
        </div>
      </div>

      {/* ─── ROW 2: SELECTORS & AMOUNT RANGE ─── */}
      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-dashed border-slate-700/20">
        
        {/* Selectors Group */}
        <div className="flex items-center gap-2">
          <select value={advancedFilterDate} onChange={e => setAdvancedFilterDate(e.target.value)} className={selCls} style={selStyle}>
            <option value="ALL">🗓️ ทุกวันที่</option>
            {availableDatesInPeriod.map(d => <option key={d} value={d}>วันที่ {d}</option>)}
          </select>

          <select value={advancedFilterGroup} onChange={e => setAdvancedFilterGroup(e.target.value)} className={selCls} style={selStyle}>
            <option value="ALL">📦 ทุกกลุ่ม</option>
            {cashflowGroups?.length > 0 && (
              <optgroup label="แยกตามกลุ่ม">
                {cashflowGroups
                  .filter(g => activeCashflowGroupIds.has(g.id))
                  .map(g => (
                    <option key={g.id} value={g.id}>
                      {g.icon ? g.icon : (g.type === 'income' ? '🟢' : '🔴')} {g.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>

          <select value={advancedFilterCategory} onChange={e => setAdvancedFilterCategory(e.target.value)} className={selCls} style={selStyle}>
            <option value="ALL">🏷️ ทุกหมวดหมู่</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* Amount Range */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] font-black uppercase opacity-40 mr-1 flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> ช่วงเงิน</span>
          <div className="flex items-center gap-1">
            <input 
              type="number" 
              placeholder="Min" 
              value={minAmount}
              onChange={e => setMinAmount(e.target.value)}
              className={`${baseInputCls} w-20 px-2 py-1.5 placeholder:font-normal`}
            />
            <span className="text-[10px] opacity-30">—</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={maxAmount}
              onChange={e => setMaxAmount(e.target.value)}
              className={`${baseInputCls} w-20 px-2 py-1.5 placeholder:font-normal`}
            />
          </div>
        </div>

        {/* Clear Button */}
        {isFilterActive && (
          <button
            onClick={clearFilters}
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-sm border transition-colors ml-2 ${
              dm ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30' : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <X className="w-3 h-3" /> ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
}
