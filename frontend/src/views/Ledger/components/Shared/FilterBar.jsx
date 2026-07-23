import React from 'react';
import { 
  Search, X, Hash, CalendarDays, MousePointer2, Target, 
  Calendar, Folder, Tag, ChevronDown, RefreshCw, Sparkles
} from 'lucide-react';
import DatePicker from '../../../../components/ui/DatePicker';

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
  clearFilters, isFilterActive,
  filterPeriod
}) {
  const dm = true;

  // Dynamic active filters count
  const activeCount = [
    searchQuery !== '',
    typeFilter !== 'ALL',
    allocationFilter !== 'ALL',
    (advancedFilterDate !== 'ALL' || dayTypeFilter !== 'ALL'),
    advancedFilterGroup !== 'ALL',
    advancedFilterCategory !== 'ALL',
    minAmount !== '',
    maxAmount !== ''
  ].filter(Boolean).length;

  // Segment Buttons - Styled to match the flat "รายการ / ตาราง" toggle
  const SegmentButton = ({ label, active, onClick, colorScheme = 'blue' }) => {
    const getColors = () => {
      if (!active) {
        return 'bg-[#121212] border-[#303030] text-[#888888] hover:text-[#cbd5e1] hover:bg-[#303030]/30';
      }

      switch (colorScheme) {
        case 'emerald':
          return 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400 font-black shadow-[0_0_8px_rgba(16,185,129,0.06)]';
        case 'rose':
          return 'bg-rose-950/20 border-rose-500/40 text-rose-400 font-black shadow-[0_0_8px_rgba(239,68,68,0.06)]';
        case 'indigo':
          return 'bg-indigo-950/20 border-indigo-500/40 text-indigo-400 font-black shadow-[0_0_8px_rgba(99,102,241,0.06)]';
        case 'amber':
          return 'bg-amber-950/20 border-amber-500/40 text-amber-400 font-black shadow-[0_0_8px_rgba(245,158,11,0.06)]';
        case 'sky':
          return 'bg-sky-950/20 border-sky-500/40 text-sky-450 font-black shadow-[0_0_8px_rgba(56,189,248,0.06)]';
        case 'blue':
        default:
          return 'bg-[#303030] border-[#505050] text-white font-black';
      }
    };

    return (
      <button 
        onClick={onClick}
        className={`flex-1 px-1.5 py-1 text-[10px] font-black uppercase tracking-wider border first:rounded-none last:rounded-none -ml-[1px] first:ml-0 ${getColors()}`}
      >
        {label}
      </button>
    );
  };

  // Custom visual select box (Flat Slate HUD Style)
  const CustomSelect = ({ value, onChange, options, icon, isActive }) => {
    return (
      <div className={`relative flex items-center border rounded-none bg-[#121212] ${
        isActive 
          ? 'border-[#da291c] text-white bg-[#121212]' 
          : 'border-[#303030] text-[#888888] hover:border-[#da291c]/40 hover:bg-[#303030]/20'
      }`}>
        <div className={`pl-2 pr-1.5 py-1 border-r flex items-center justify-center shrink-0 ${
          isActive ? 'border-[#da291c]/30 text-[#da291c]' : 'border-[#303030] text-[#666666]'
        }`}>
          {icon}
        </div>
        
        <select
          value={value}
          onChange={onChange}
          className="w-full bg-transparent text-[11px] font-black py-1 pl-1.5 pr-7 outline-none cursor-pointer appearance-none select-none text-[#cbd5e1]"
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
    <div className="relative rounded-none border border-[#303030]/60 bg-[#121212] mb-5 z-50">
      {/* Grid Layout (3 Columns with hairline gaps, high density) */}
      <div className="grid grid-cols-3 gap-[1px] bg-[#303030]/50 relative z-20">
        
        {/* ================= COLUMN 1: SCOPE & VALUE ================= */}
        <div className="bg-[#181818] p-3.5 flex flex-col justify-between gap-2">
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
              ค้นหาและขอบเขตเงิน
            </span>
          </div>

          {/* Search Box */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              คำค้นหารายละเอียด
            </span>
            <div className="relative group">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#666666] group-focus-within:text-[#da291c]" />
              <input
                type="text"
                placeholder="ค้นหารายรายละเอียด หรือหมวดหมู่..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1 border rounded-none outline-none text-xs font-semibold bg-[#121212] border-[#303030] focus:border-[#da291c] text-[#cbd5e1] placeholder-[#555555]"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none hover:bg-[#303030] text-[#666666] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Amount Limits */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              ช่วงจำนวนเงิน (฿ Baht Range)
            </span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-full pl-6 pr-1 py-1 border rounded-none outline-none text-xs font-semibold bg-[#121212] border-[#303030] text-[#cbd5e1] focus:border-[#da291c] placeholder-[#555555] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span className="text-xs font-black text-[#555555] font-mono">—</span>
              <div className="relative flex-1">
                <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-full pl-6 pr-1 py-1 border rounded-none outline-none text-xs font-semibold bg-[#121212] border-[#303030] text-[#cbd5e1] focus:border-[#da291c] placeholder-[#555555] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: QUICK TOGGLES ================= */}
        <div className="bg-[#181818] p-3.5 flex flex-col justify-between gap-2">
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <MousePointer2 className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
              คัดกรองด่วนแบบกลุ่ม
            </span>
          </div>

          {/* Type Toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              ประเภทรายการ
            </span>
            <div className="flex rounded-none p-0.5 border bg-[#121212] border-[#303030]">
              <SegmentButton label="ทั้งหมด" active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} />
              <SegmentButton label="รายรับ" active={typeFilter === 'INCOME'} onClick={() => setTypeFilter('INCOME')} colorScheme="emerald" />
              <SegmentButton label="รายจ่าย" active={typeFilter === 'EXPENSE'} onClick={() => setTypeFilter('EXPENSE')} colorScheme="rose" />
              <SegmentButton label="เงินออม" active={typeFilter === 'SAVINGS'} onClick={() => setTypeFilter('SAVINGS')} colorScheme="indigo" />
            </div>
          </div>

          {/* Allocation Toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              การจัดสรรเงิน (Allocation)
            </span>
            <div className="flex rounded-none p-0.5 border bg-[#121212] border-[#303030]">
              <SegmentButton label="ทั้งหมด" active={allocationFilter === 'ALL'} onClick={() => setAllocationFilter('ALL')} />
              <SegmentButton label="Need" active={allocationFilter === 'need'} onClick={() => setAllocationFilter('need')} colorScheme="rose" />
              <SegmentButton label="Want" active={allocationFilter === 'want'} onClick={() => setAllocationFilter('want')} colorScheme="sky" />
              <SegmentButton label="Save" active={allocationFilter === 'savings'} onClick={() => setAllocationFilter('savings')} colorScheme="emerald" />
            </div>
          </div>
        </div>

        {/* ================= COLUMN 3: STRUCTURE & CLASS ================= */}
        <div className="bg-[#181818] p-3.5 flex flex-col justify-between gap-2 relative z-30">
          {/* Label Header */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#666666]" />
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-mono">
              คัดกรองและจำแนกกลุ่ม
            </span>
          </div>

          {/* Date Selector Row */}
          <div className="flex flex-col gap-1 relative z-50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              ตัวกรองวันที่ ( Mini Calendar & Range )
            </span>
            <DatePicker
              value={advancedFilterDate !== 'ALL' ? advancedFilterDate : dayTypeFilter}
              onChange={(val) => {
                if (val === 'WEEKDAY' || val === 'WEEKEND') {
                  setAdvancedFilterDate('ALL');
                  setDayTypeFilter(val);
                } else {
                  setAdvancedFilterDate(val);
                  setDayTypeFilter('ALL');
                }
              }}
              variant="hud"
              placeholder="วันที่"
              allowAll={true}
              availableDates={availableDatesInPeriod}
              filterPeriod={filterPeriod}
            />
          </div>

          {/* Group & Category Row */}
          <div className="flex flex-col gap-1 relative z-40">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
              จำแนกตามกลุ่ม / หมวดหมู่
            </span>
            <div className="grid grid-cols-2 gap-1.5">
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

      </div>

      {/* ================= BOTTOM ROW: SHARK ACTIVE STATUS & CLEAR ACTS ================= */}
      {isFilterActive && (
        <div className="flex items-center justify-between border-t border-[#303030]/60 p-3 bg-[#121212]/30 relative z-1">
          {/* Active stats counter */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#da291c]"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#da291c]" />
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                ตัวกรองที่ทำงานอยู่:
              </span>
              <span className="px-2 py-0.5 rounded-none text-[10px] font-black bg-[#121212] border border-[#da291c]/30 text-[#cbd5e1] font-mono">
                {activeCount} active
              </span>
            </div>
          </div>

          {/* Clear Filters Action */}
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-[10.5px] font-black uppercase px-3 py-1.5 rounded-none border text-[#da291c] bg-[#da291c]/5 hover:bg-[#da291c]/10 border-[#da291c]/30 hover:border-[#da291c] font-mono"
          >
            <RefreshCw className="w-3 h-3" />
            ล้างการคัดกรองทั้งหมด
          </button>
        </div>
      )}

    </div>
  );
}
