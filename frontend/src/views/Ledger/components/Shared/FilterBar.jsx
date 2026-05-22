import React from 'react';
import { 
  Search, X, Hash, CalendarDays, MousePointer2, Target, 
  Calendar, Folder, Tag, ChevronDown, RefreshCw, Sparkles
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';

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

  // Dynamic active filters count
  const activeCount = [
    searchQuery !== '',
    typeFilter !== 'ALL',
    dayTypeFilter !== 'ALL',
    allocationFilter !== 'ALL',
    advancedFilterDate !== 'ALL',
    advancedFilterGroup !== 'ALL',
    advancedFilterCategory !== 'ALL',
    minAmount !== '',
    maxAmount !== ''
  ].filter(Boolean).length;

  // Segment Buttons - Styled to match the flat "รายการ / ตาราง" toggle
  const SegmentButton = ({ label, active, onClick, colorScheme = 'blue' }) => {
    const getColors = () => {
      if (!active) {
        return dm
          ? 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50';
      }

      switch (colorScheme) {
        case 'emerald':
          return dm
            ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400 font-bold'
            : 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold';
        case 'rose':
          return dm
            ? 'bg-rose-950/30 border-rose-800 text-rose-455 font-bold'
            : 'bg-rose-50 border-rose-300 text-rose-700 font-bold';
        case 'indigo':
          return dm
            ? 'bg-indigo-950/30 border-indigo-800 text-indigo-400 font-bold'
            : 'bg-indigo-50 border-indigo-300 text-indigo-755 font-bold';
        case 'amber':
          return dm
            ? 'bg-amber-950/30 border-amber-850 text-amber-400 font-bold'
            : 'bg-amber-50 border-amber-300 text-amber-700 font-bold';
        case 'sky':
          return dm
            ? 'bg-sky-950/30 border-sky-850 text-sky-400 font-bold'
            : 'bg-sky-50 border-sky-300 text-sky-700 font-bold';
        case 'blue':
        default:
          return dm
            ? 'bg-slate-800 border-slate-700 text-slate-100 font-bold'
            : 'bg-slate-100 border-slate-300 text-slate-700 font-bold';
      }
    };

    return (
      <button 
        onClick={onClick}
        className={`flex-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border first:rounded-l-sm last:rounded-r-sm -ml-[1px] first:ml-0 transition-colors ${getColors()}`}
      >
        {label}
      </button>
    );
  };

  // Custom visual select box (Flat Slate HUD Style)
  const CustomSelect = ({ value, onChange, options, icon, isActive }) => {
    return (
      <div className={`relative flex items-center border rounded-sm bg-slate-950/60 transition-colors ${
        isActive 
          ? 'border-blue-700 text-slate-100 bg-slate-950' 
          : dm ? 'border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40' : 'border-slate-200 text-slate-500 hover:border-slate-300'
      }`}>
        <div className={`pl-2 pr-1.5 py-1.5 border-r flex items-center justify-center shrink-0 ${
          isActive ? 'border-blue-700/40 text-blue-400' : dm ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}>
          {icon}
        </div>
        
        <select
          value={value}
          onChange={onChange}
          className={`w-full bg-transparent text-xs font-bold py-1 pl-1.5 pr-7 outline-none cursor-pointer appearance-none select-none ${
            dm ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {options}
        </select>
        
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
          isActive ? 'text-[#00509E]' : 'text-slate-500'
        }`}>
          <ChevronDown className="w-3 h-3" />
        </div>
        
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#00509E]"></span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`relative p-4 rounded-sm border transition-colors mb-5 ${
        dm 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Grid Layout (3 Columns, High Density, Mathematical Spacing) */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        
        {/* ================= COLUMN 1: SCOPE & VALUE ================= */}
        <div className={`col-span-4 pr-8 flex flex-col gap-2.5 ${
          dm ? 'border-r border-slate-800/80' : 'border-r border-slate-200'
        }`}>
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <Search className="w-3 h-3 text-slate-500" />
            <span className={`text-[9px] font-black uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              ค้นหาและขอบเขตเงิน
            </span>
          </div>

          {/* Search Box */}
          <div className="relative group">
            <Search className={`w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              dm ? 'text-slate-500 group-focus-within:text-[#00509E]' : 'text-slate-400 group-focus-within:text-[#00509E]'
            }`} />
            <input
              type="text"
              placeholder="ค้นหารายละเอียด หรือหมวดหมู่..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-8 py-1.5 border rounded-sm outline-none text-xs font-bold transition-colors ${
                dm
                  ? 'bg-slate-950 border-slate-800 focus:border-[#00509E] text-slate-200 placeholder:text-slate-700'
                  : 'bg-slate-50 border-slate-200 focus:border-[#00509E] text-slate-800 placeholder:text-slate-400'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm transition-colors ${
                  dm ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-200 text-slate-500'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Amount Limits */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500/80' : 'text-slate-455'}`}>
              ช่วงจำนวนเงิน (฿ Baht Range)
            </span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Hash className="w-2.5 h-2.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-650" />
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className={`w-full pl-6 pr-1 py-1 border rounded-sm outline-none text-xs font-bold transition-colors ${
                    dm 
                      ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-[#00509E] placeholder:text-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#00509E] placeholder:text-slate-450'
                  }`}
                />
              </div>
              <span className={`text-xs font-black ${dm ? 'text-slate-750' : 'text-slate-350'}`}>—</span>
              <div className="relative flex-1">
                <Hash className="w-2.5 h-2.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-655" />
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className={`w-full pl-6 pr-1 py-1 border rounded-sm outline-none text-xs font-bold transition-colors ${
                    dm 
                      ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-[#00509E] placeholder:text-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#00509E] placeholder:text-slate-455'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: QUICK TOGGLES ================= */}
        <div className={`col-span-4 pr-8 flex flex-col gap-2.5 ${
          dm ? 'border-r border-slate-800/80' : 'border-r border-slate-200'
        }`}>
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <MousePointer2 className="w-3 h-3 text-slate-500" />
            <span className={`text-[9px] font-black uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              คัดกรองด่วนแบบกลุ่ม
            </span>
          </div>

          {/* Type Toggle */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500/80' : 'text-slate-455'}`}>
              ประเภทรายการ
            </span>
            <div className={`flex rounded-sm p-0.5 border ${
              dm ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <SegmentButton label="ทั้งหมด" active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} />
              <SegmentButton label="รายรับ" active={typeFilter === 'INCOME'} onClick={() => setTypeFilter('INCOME')} colorScheme="emerald" />
              <SegmentButton label="รายจ่าย" active={typeFilter === 'EXPENSE'} onClick={() => setTypeFilter('EXPENSE')} colorScheme="rose" />
              <SegmentButton label="เงินออม" active={typeFilter === 'SAVINGS'} onClick={() => setTypeFilter('SAVINGS')} colorScheme="indigo" />
            </div>
          </div>

          {/* Allocation Toggle */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500/80' : 'text-slate-455'}`}>
              การจัดสรรเงิน (Allocation)
            </span>
            <div className={`flex rounded-sm p-0.5 border ${
              dm ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <SegmentButton label="ทั้งหมด" active={allocationFilter === 'ALL'} onClick={() => setAllocationFilter('ALL')} />
              <SegmentButton label="Need" active={allocationFilter === 'need'} onClick={() => setAllocationFilter('need')} colorScheme="rose" />
              <SegmentButton label="Want" active={allocationFilter === 'want'} onClick={() => setAllocationFilter('want')} colorScheme="sky" />
              <SegmentButton label="Save" active={allocationFilter === 'savings'} onClick={() => setAllocationFilter('savings')} colorScheme="emerald" />
            </div>
          </div>
        </div>

        {/* ================= COLUMN 3: STRUCTURE & CLASS ================= */}
        <div className="col-span-4 flex flex-col gap-2.5">
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3 text-slate-500" />
            <span className={`text-[9px] font-black uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              คัดกรองและจำแนกกลุ่ม
            </span>
          </div>

          {/* Day type toggle */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500/80' : 'text-slate-455'}`}>
              วันทำงาน / วันหยุด
            </span>
            <div className={`flex rounded-sm p-0.5 border ${
              dm ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <SegmentButton label="ทุกวัน" active={dayTypeFilter === 'ALL'} onClick={() => setDayTypeFilter('ALL')} />
              <SegmentButton label="Weekday" active={dayTypeFilter === 'WEEKDAY'} onClick={() => setDayTypeFilter('WEEKDAY')} colorScheme="blue" />
              <SegmentButton label="Weekend" active={dayTypeFilter === 'WEEKEND'} onClick={() => setDayTypeFilter('WEEKEND')} colorScheme="amber" />
            </div>
          </div>

          {/* Dropdown Selects */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Date Select */}
            <CustomSelect
              value={advancedFilterDate}
              onChange={e => setAdvancedFilterDate(e.target.value)}
              isActive={advancedFilterDate !== 'ALL'}
              icon={<Calendar className="w-3 h-3" />}
              options={
                <>
                  <option value="ALL">🗓️ วันที่</option>
                  {availableDatesInPeriod.map(d => <option key={d} value={d}>วันที่ {d}</option>)}
                </>
              }
            />

            {/* Group Select */}
            <CustomSelect
              value={advancedFilterGroup}
              onChange={e => setAdvancedFilterGroup(e.target.value)}
              isActive={advancedFilterGroup !== 'ALL'}
              icon={<Folder className="w-3 h-3" />}
              options={
                <>
                  <option value="ALL">📦 กลุ่ม</option>
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
                </>
              }
            />

            {/* Category Select */}
            <CustomSelect
              value={advancedFilterCategory}
              onChange={e => setAdvancedFilterCategory(e.target.value)}
              isActive={advancedFilterCategory !== 'ALL'}
              icon={<Tag className="w-3 h-3" />}
              options={
                <>
                  <option value="ALL">🏷️ หมวดหมู่</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                </>
              }
            />
          </div>
        </div>

      </div>

      {/* ================= BOTTOM ROW: SHARK ACTIVE STATUS & CLEAR ACTS ================= */}
      {isFilterActive && (
        <div 
          className={`flex items-center justify-between border-t border-dashed mt-3 pt-2.5 relative z-10 ${
            dm ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          {/* Active stats counter */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#00509E]"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#00509E]" />
              <span className={`text-[9.5px] font-black uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-500'}`}>
                ตัวกรองที่ทำงานอยู่:
              </span>
              <span className="px-1.5 py-0.5 rounded-sm text-[8.5px] font-black bg-slate-950 border border-slate-800 text-slate-400">
                {activeCount} active
              </span>
            </div>
          </div>

          {/* Clear Filters Action */}
          <button
            onClick={clearFilters}
            className={`flex items-center gap-1.5 text-[9.5px] font-black uppercase px-3 py-1 rounded-sm border transition-colors ${
              dm 
                ? 'text-rose-450 bg-rose-950/20 hover:bg-rose-950/40 border-rose-900/40' 
                : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <RefreshCw className="w-2.5 h-2.5" />
            ล้างการคัดกรองทั้งหมด
          </button>
        </div>
      )}

    </div>
  );
}
