import React from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const SELECT_ARROW = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

export default function FilterBar({
  searchQuery, setSearchQuery,
  advancedFilterDate, setAdvancedFilterDate,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterCategory, setAdvancedFilterCategory,
  availableDatesInPeriod, cashflowGroups, activeCashflowGroupIds, categories,
  clearFilters, isFilterActive
}) {
  const { isDarkMode: dm } = useTheme();
  const selCls = `w-full border rounded-sm px-3 py-2 text-xs outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${
    dm
      ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#00509E] focus:bg-white focus:ring-[#00509E]/10'
  }`;
  const selStyle = { backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.85em' };

  return (
    <div className={`flex flex-wrap items-center gap-2 px-4 py-3 rounded border transition-all ${
      dm ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'
    }`}>
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs group">
        <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
          dm ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-[#00509E]'
        }`} />
        <input
          type="text"
          placeholder="ค้นหารายละเอียด..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full pl-8 pr-3 py-2 border rounded-sm outline-none focus:ring-1 text-xs font-medium transition-all ${
            dm
              ? 'bg-slate-900 border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 text-slate-200 placeholder-slate-600'
              : 'bg-slate-50 border-slate-200 focus:border-[#00509E] focus:ring-[#00509E]/10 text-slate-800 focus:bg-white'
          }`}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Date filter */}
      <div className="relative min-w-[140px]">
        <select value={advancedFilterDate} onChange={e => setAdvancedFilterDate(e.target.value)} className={selCls} style={selStyle}>
          <option value="ALL">🗓️ ทุกวันที่</option>
          {availableDatesInPeriod.map(d => <option key={d} value={d}>วันที่ {d}</option>)}
        </select>
      </div>

      {/* Group filter */}
      <div className="relative min-w-[160px]">
        <select value={advancedFilterGroup} onChange={e => setAdvancedFilterGroup(e.target.value)} className={selCls} style={selStyle}>
          <option value="ALL">📦 ทุกกลุ่ม</option>
          <option value="INCOME">🟢 รายรับทั้งหมด</option>
          <option value="EXPENSE">🔴 รายจ่ายทั้งหมด</option>
          <option value="FIXED">🔒 ภาระคงที่</option>
          <option value="VARIABLE">💸 ผันแปร</option>
          {cashflowGroups?.length > 0 && (
            <optgroup label="แยกตามกลุ่ม Cashflow">
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
      </div>

      {/* Category filter */}
      <div className="relative min-w-[160px]">
        <select value={advancedFilterCategory} onChange={e => setAdvancedFilterCategory(e.target.value)} className={selCls} style={selStyle}>
          <option value="ALL">🏷️ ทุกหมวดหมู่</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {isFilterActive && (
        <button
          onClick={clearFilters}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm border transition-colors ${
            dm ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-900/40' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
          }`}
        >
          <X className="w-3 h-3" /> ล้างทั้งหมด
        </button>
      )}
    </div>
  );
}