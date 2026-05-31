import React from 'react';
import { 
  Search, X, Hash, CalendarDays, MousePointer2, Target, 
  Calendar, Folder, Tag, ChevronDown, RefreshCw, Sparkles
} from 'lucide-react';

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
  availableDatesInPeriod, cashflowGroups, activeCashflowGroupIds, activeCategoryNames, categories,
  clearFilters, isFilterActive
}) {
  const dm = true;

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
        return 'bg-[#121212] border-[#3e3e3e] text-[#888888] hover:text-[#e0e0e0] hover:bg-[#303030]';
      }

      switch (colorScheme) {
        case 'emerald':
          return 'bg-emerald-950/30 border-emerald-800 text-emerald-400 font-bold';
        case 'rose':
          return 'bg-rose-950/30 border-rose-800 text-rose-455 font-bold';
        case 'indigo':
          return 'bg-indigo-950/30 border-indigo-800 text-indigo-400 font-bold';
        case 'amber':
          return 'bg-amber-950/30 border-amber-850 text-amber-400 font-bold';
        case 'sky':
          return 'bg-sky-950/30 border-sky-850 text-sky-400 font-bold';
        case 'blue':
        default:
          return 'bg-[#da291c] border-[#da291c] text-white font-bold';
      }
    };

    return (
      <button 
        onClick={onClick}
        className={`flex-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border first:rounded-none last:rounded-none -ml-[1px] first:ml-0 transition-colors ${getColors()}`}
      >
        {label}
      </button>
    );
  };

  // Custom visual select box (Flat Slate HUD Style)
  const CustomSelect = ({ value, onChange, options, icon, isActive }) => {
    return (
      <div className={`relative flex items-center border rounded-none bg-[#121212] transition-colors ${
        isActive 
          ? 'border-[#da291c] text-white bg-[#121212]' 
          : 'border-[#3e3e3e] text-[#888888] hover:border-[#da291c]/50 hover:bg-[#303030]/20'
      }`}>
        <div className={`pl-2 pr-1.5 py-1.5 border-r flex items-center justify-center shrink-0 ${
          isActive ? 'border-[#da291c]/40 text-[#da291c]' : 'border-[#3e3e3e] text-[#666666]'
        }`}>
          {icon}
        </div>
        
        <select
          value={value}
          onChange={onChange}
          className={`w-full bg-transparent text-xs font-bold py-1 pl-1.5 pr-7 outline-none cursor-pointer appearance-none select-none ${
            'text-[#cbd5e1]'
          }`}
        >
          {options}
        </select>
        
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
          isActive ? 'text-[#da291c]' : 'text-[#666666]'
        }`}>
          <ChevronDown className="w-3 h-3" />
        </div>
        
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#da291c]"></span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`relative p-4 rounded-none border transition-colors mb-5 ${
        'bg-[#181818] border-[#3e3e3e]'
      }`}
    >
      {/* Grid Layout (3 Columns, High Density, Mathematical Spacing) */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        
        {/* ================= COLUMN 1: SCOPE & VALUE ================= */}
        <div className={`col-span-4 pr-8 flex flex-col gap-2.5 ${
          'border-r border-[#303030]/80'
        }`}>
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <Search className="w-3 h-3 text-[#666666]" />
            <span className={`text-[9px] font-black uppercase tracking-widest ${'text-[#888888]'}`}>
              ค้นหาและขอบเขตเงิน
            </span>
          </div>

          {/* Search Box */}
          <div className="relative group">
            <Search className={`w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              'text-[#666666] group-focus-within:text-[#da291c]'
            }`} />
            <input
              type="text"
              placeholder="ค้นหารายละเอียด หรือหมวดหมู่..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-8 py-1.5 border rounded-none outline-none text-xs font-bold transition-colors ${
                'bg-[#121212] border-[#3e3e3e] focus:border-[#da291c] text-[#e0e0e0] placeholder-[#555555]'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none transition-colors ${
                  'hover:bg-[#303030] text-[#666666] hover:text-white'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Amount Limits */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${'text-[#888888]/80'}`}>
              ช่วงจำนวนเงิน (฿ Baht Range)
            </span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Hash className="w-2.5 h-2.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className={`w-full pl-6 pr-1 py-1 border rounded-none outline-none text-xs font-bold transition-colors ${
                    'bg-[#121212] border-[#3e3e3e] text-[#e0e0e0] focus:border-[#da291c] placeholder-[#555555]'
                  }`}
                />
              </div>
              <span className={`text-xs font-black ${'text-[#666666]'}`}>—</span>
              <div className="relative flex-1">
                <Hash className="w-2.5 h-2.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className={`w-full pl-6 pr-1 py-1 border rounded-none outline-none text-xs font-bold transition-colors ${
                    'bg-[#121212] border-[#3e3e3e] text-[#e0e0e0] focus:border-[#da291c] placeholder-[#555555]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: QUICK TOGGLES ================= */}
        <div className={`col-span-4 pr-8 flex flex-col gap-2.5 ${
          'border-r border-[#303030]/80'
        }`}>
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <MousePointer2 className="w-3 h-3 text-[#666666]" />
            <span className={`text-[9px] font-black uppercase tracking-widest ${'text-[#888888]'}`}>
              คัดกรองด่วนแบบกลุ่ม
            </span>
          </div>

          {/* Type Toggle */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${'text-[#888888]/80'}`}>
              ประเภทรายการ
            </span>
            <div className={`flex rounded-none p-0.5 border ${
              'bg-[#121212] border-[#3e3e3e]'
            }`}>
              <SegmentButton label="ทั้งหมด" active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} />
              <SegmentButton label="รายรับ" active={typeFilter === 'INCOME'} onClick={() => setTypeFilter('INCOME')} colorScheme="emerald" />
              <SegmentButton label="รายจ่าย" active={typeFilter === 'EXPENSE'} onClick={() => setTypeFilter('EXPENSE')} colorScheme="rose" />
              <SegmentButton label="เงินออม" active={typeFilter === 'SAVINGS'} onClick={() => setTypeFilter('SAVINGS')} colorScheme="indigo" />
            </div>
          </div>

          {/* Allocation Toggle */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${'text-[#888888]/80'}`}>
              การจัดสรรเงิน (Allocation)
            </span>
            <div className={`flex rounded-none p-0.5 border ${
              'bg-[#121212] border-[#3e3e3e]'
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
            <CalendarDays className="w-3 h-3 text-[#666666]" />
            <span className={`text-[9px] font-black uppercase tracking-widest ${'text-[#888888]'}`}>
              คัดกรองและจำแนกกลุ่ม
            </span>
          </div>

          {/* Day type toggle */}
          <div className="flex flex-col gap-1">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${'text-[#888888]/80'}`}>
              วันทำงาน / วันหยุด
            </span>
            <div className={`flex rounded-none p-0.5 border ${
              'bg-[#121212] border-[#3e3e3e]'
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
                        .filter(g => (activeCashflowGroupIds?.has ? activeCashflowGroupIds.has(g.id) : false) || advancedFilterGroup === g.id)
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
                  {categories
                    .filter(c => (activeCategoryNames?.has ? activeCategoryNames.has(c.name) : false) || advancedFilterCategory === c.name)
                    .map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
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
            'border-[#303030]'
          }`}
        >
          {/* Active stats counter */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#da291c]"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#da291c]" />
              <span className={`text-[9.5px] font-black uppercase tracking-wider ${'text-[#888888]'}`}>
                ตัวกรองที่ทำงานอยู่:
              </span>
              <span className="px-1.5 py-0.5 rounded-none text-[8.5px] font-black bg-[#121212] border border-[#3e3e3e] text-[#cbd5e1]">
                {activeCount} active
              </span>
            </div>
          </div>

          {/* Clear Filters Action */}
          <button
            onClick={clearFilters}
            className={`flex items-center gap-1.5 text-[9.5px] font-black uppercase px-3 py-1 rounded-none border transition-colors ${
              'text-rose-450 bg-rose-950/20 hover:bg-rose-950/40 border-rose-900/40'
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
