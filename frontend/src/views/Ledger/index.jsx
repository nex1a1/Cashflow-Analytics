import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, LayoutList, TableProperties, PlusCircle, Trash2, 
  TrendingUp, TrendingDown, Wallet, Inbox, Activity
} from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

// Shared Components
import StatCard from '../../components/shared/StatCard';
import FilterBar from './components/Shared/FilterBar';

// View Components
import LedgerTable from './components/ListView/LedgerTable';
import HorizontalLedgerView from './components/HorizontalView/HorizontalLedgerView';

// Custom Hooks
import { useLedgerData } from './hooks/useLedgerData';
import { useLedgerStats } from './hooks/useLedgerStats.jsx';

export default function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  typeFilter, setTypeFilter,
  allocationFilter, setAllocationFilter,
  minAmount, setMinAmount,
  maxAmount, setMaxAmount,
  dayTypeFilter, setDayTypeFilter,
  availableDatesInPeriod,
  allDatesInPeriod,
  setFilterPeriod, rawAvailableMonths,
  cashflowGroups = [],
  activeCashflowGroupIds = new Set(),
  activeCategoryNames = new Set(),
  dayTypes = {},
  dayTypeConfig = [],
  isFilterActive,
  clearFilters,
  isLoading
}) {
  const dm = true;
  const [filterOpen, setFilterOpen] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'horizontal'

  // ── Logic: Smooth Loading Transition ───────────────────────
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      const timer = setTimeout(() => setShowSkeleton(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // ─── Logic: Data Orchestration ───
  const {
    sortedTransactions,
    pages,
    currentPage,
    setCurrentPage,
    sortConfig,
    handleSort,
    dateBands,
    isDateSorted
  } = useLedgerData(displayTransactions, filterPeriod, searchQuery, {
    advancedFilterCategory, advancedFilterGroup, advancedFilterDate,
    typeFilter, minAmount, maxAmount, dayTypeFilter,
    categories, cashflowGroups // Pass these in for order_index lookup
  });

  // ─── Logic: Aggregation & Stats ───
  const {
    sumInc,
    sumExp,
    net,
    savingsRate,
    activeGroupCards,
    getSubValue,
    catTypeMap
  } = useLedgerStats(displayTransactions, categories, cashflowGroups, formatMoney, dm);

  const totalPages = pages.length || 1;
  const currentData = pages[currentPage - 1] || [];

  // Page-specific summaries
  const { pageInc, pageExp } = useMemo(() => {
    let inc = 0, exp = 0;
    currentData.forEach(t => {
      const type = catTypeMap[t.category];
      const amt = parseFloat(t.amount) || 0;
      if (type === 'income') inc += amt;
      else exp += amt;
    });
    return { pageInc: inc, pageExp: exp };
  }, [currentData, catTypeMap]);

  return (
    <div className="flex flex-col gap-0 animate-in fade-in slide-in-from-bottom-3 duration-400 w-full pb-8">
      <div className="flex flex-col gap-3.5 mb-4">
        {/* Top Header Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-[#da291c] rounded-none shrink-0" />
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider leading-none text-slate-100 font-mono">
                บัญชีแยกประเภท
              </h2>
            </div>
            <p className="text-[10px] font-black tracking-widest mt-1.5 font-mono text-slate-400 uppercase flex items-center gap-2">
              <span>{getFilterLabel(filterPeriod)}</span>
              <span className="text-slate-800 font-bold">•</span>
              <span className="text-[#da291c] font-extrabold">{displayTransactions.length}</span>
              <span>รายการ</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {viewMode === 'list' && (
              <button 
                onClick={() => setFilterOpen(v => !v)} 
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 px-3 py-2 rounded-none border-2 transition-all active:scale-95 font-mono ${
                  filterOpen 
                    ? 'bg-[#da291c]/10 border-[#da291c] text-[#da291c] shadow-[0_0_10px_rgba(218,41,28,0.15)]' 
                    : 'bg-[#121212] border-[#303030] text-slate-450 hover:bg-[#303030]/50 hover:border-[#3e3e3e]'
                } ${isFilterActive ? '!border-amber-500 !text-amber-400 !bg-amber-950/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : ''}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> 
                <span>ตัวกรอง</span>
                {isFilterActive && <span className="w-1.5 h-1.5 rounded-none bg-amber-400 animate-pulse" />}
              </button>
            )}

            <div className="flex items-center rounded-none border-2 border-[#3e3e3e] overflow-hidden bg-[#121212]">
              <button 
                onClick={() => setViewMode('list')} 
                title="มุมมองรายการ" 
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-none font-mono ${
                  viewMode === 'list' 
                    ? 'bg-[#303030]/60 text-[#da291c] font-extrabold shadow-inner' 
                    : 'bg-[#121212] text-slate-450 hover:text-slate-200'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">รายการ</span>
              </button>
              <button 
                onClick={() => setViewMode('horizontal')} 
                title="มุมมองตารางแนวนอน" 
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-none border-l-2 border-[#3e3e3e] font-mono ${
                  viewMode === 'horizontal' 
                    ? 'bg-[#303030]/60 text-[#da291c] font-extrabold shadow-inner' 
                    : 'bg-[#121212] text-slate-450 hover:text-slate-200'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ตาราง</span>
              </button>
            </div>

            <button 
              onClick={() => handleOpenAddModal('', 'income')} 
              className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 border-2 transition-all active:scale-95 rounded-none font-mono text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/30 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
            >
              <PlusCircle className="w-3.5 h-3.5" /> 
              <span>เพิ่มรายรับ</span>
            </button>
            
            <button 
              onClick={() => handleOpenAddModal('', 'expense')} 
              className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 border-2 transition-all active:scale-95 rounded-none font-mono text-[#da291c] bg-[#da291c]/10 hover:bg-[#da291c]/20 border-[#da291c]/50 hover:border-[#da291c] shadow-[0_0_10px_rgba(218,41,28,0.05)]"
            >
              <PlusCircle className="w-3.5 h-3.5" /> 
              <span>เพิ่มรายจ่าย</span>
            </button>
            
            {displayTransactions.length > 0 && (
              <button 
                onClick={() => { if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในเดือนนี้?')) handleDeleteMonth(filterPeriod); }} 
                className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-2 border-2 transition-all active:scale-95 rounded-none font-mono text-slate-500 bg-[#181818] border-[#303030] hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-500/50" 
                title="ลบข้อมูลเดือนนี้"
              >
                <Trash2 className="w-3.5 h-3.5" /> 
                <span>ลบเดือนนี้</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Area (Vitals) - High-Density HUD Command Panel */}
        <div className="w-full flex flex-col rounded-none overflow-hidden border shadow-lg bg-[#181818] border-[#303030]">
          {/* Header Panel */}
          <div className="px-3.5 py-2 flex items-center justify-between border-b transition-colors bg-[#121212]/70 border-[#303030]/60">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#da291c]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                แผงวิเคราะห์รายรับ-รายจ่าย (TRANSACTION COMMAND PANEL)
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#303030]/60">
            {/* INCOME CELL */}
            <div className="group relative overflow-hidden p-4 flex flex-col justify-between min-h-[96px] border-l-[3px] border-l-emerald-500 transition-all duration-300 bg-[#181818] hover:bg-[#303030]/40 hover:bg-gradient-to-br hover:from-emerald-500/[0.03]">
              {/* Background Icon Glow */}
              <div className="absolute -right-3 -bottom-3 opacity-[0.03] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none text-emerald-400">
                <TrendingUp size={80} />
              </div>
              <div className="relative z-10 flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  รายรับรวม (INCOME)
                </span>
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  + INFLOW
                </span>
              </div>
              <div className="relative z-10 mt-1">
                <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-emerald-400 font-mono">
                  {formatMoney(sumInc)}
                </div>
              </div>
              <div className="relative z-10 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-mono">
                  {getSubValue(sumInc) || 'ข้อมูลในรอบบิลปัจจุบัน'}
                </span>
              </div>
            </div>

            {/* EXPENSE CELL */}
            <div className="group relative overflow-hidden p-4 flex flex-col justify-between min-h-[96px] border-l-[3px] border-l-rose-500 transition-all duration-300 bg-[#181818] hover:bg-[#303030]/40 hover:bg-gradient-to-br hover:from-rose-500/[0.03]">
              {/* Background Icon Glow */}
              <div className="absolute -right-3 -bottom-3 opacity-[0.03] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none text-rose-455">
                <TrendingDown size={80} />
              </div>
              <div className="relative z-10 flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  รายจ่ายรวม (EXPENSE)
                </span>
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  - OUTFLOW
                </span>
              </div>
              <div className="relative z-10 mt-1">
                <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-rose-400 font-mono">
                  {formatMoney(sumExp)}
                </div>
              </div>
              <div className="relative z-10 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-mono">
                  {getSubValue(sumExp) || 'ข้อมูลในรอบบิลปัจจุบัน'}
                </span>
              </div>
            </div>

            {/* NET SURPLUS CELL WITH SAVINGS RATE PILL */}
            <div className={`group relative overflow-hidden p-4 flex flex-col justify-between min-h-[96px] border-l-[3px] transition-all duration-300 bg-[#181818] hover:bg-[#303030]/40 ${net >= 0 ? 'border-l-yellow-500 hover:bg-gradient-to-br hover:from-yellow-500/[0.03]' : 'border-l-rose-500 hover:bg-gradient-to-br hover:from-rose-500/[0.03]'}`}>
              {/* Background Icon Glow */}
              <div className={`absolute -right-3 -bottom-3 opacity-[0.03] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${net >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                <Wallet size={80} />
              </div>
              <div className="relative z-10 flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  คงเหลือสุทธิ (NET CASHFLOW)
                </span>
                <div className="flex items-center gap-1">
                  {sumInc > 0 && (
                    <div className={`px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                      savingsRate >= 20 
                        ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20' 
                        : (savingsRate >= 10 ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' : 'bg-rose-500/10 text-rose-450 border-rose-500/20')
                    }`}>
                      <span>ออม {savingsRate}%</span>
                      <span className="opacity-40">|</span>
                      <span className="font-extrabold">{savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}</span>
                    </div>
                  )}
                  <span className={`px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border ${net >= 0 ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20' : 'bg-rose-500/10 text-rose-455 border-rose-500/20'}`}>
                    {net >= 0 ? 'SURPLUS' : 'DEFICIT'}
                  </span>
                </div>
              </div>
              <div className="relative z-10 mt-1">
                <div className={`text-2xl font-black tabular-nums tracking-tight leading-none font-mono ${net >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                  {formatMoney(net)}
                </div>
              </div>
              <div className="relative z-10 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-mono">
                  {getSubValue(net) || (net >= 0 ? 'สถานะ: ยอดสะสมเป็นบวก' : 'สถานะ: ยอดสะสมติดลบ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Group Breakdown Area (Visible in all view modes) */}
        {activeGroupCards.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1 no-scrollbar scroll-smooth">
            {activeGroupCards}
          </div>
        )}

        {/* Filters */}
        {filterOpen && viewMode === 'list' && (
          <FilterBar
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            advancedFilterDate={advancedFilterDate} setAdvancedFilterDate={setAdvancedFilterDate}
            advancedFilterGroup={advancedFilterGroup} setAdvancedFilterGroup={setAdvancedFilterGroup}
            advancedFilterCategory={advancedFilterCategory} setAdvancedFilterCategory={setAdvancedFilterCategory}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            allocationFilter={allocationFilter} setAllocationFilter={setAllocationFilter}
            minAmount={minAmount} setMinAmount={setMinAmount}
            maxAmount={maxAmount} setMaxAmount={setMaxAmount}
            dayTypeFilter={dayTypeFilter} setDayTypeFilter={setDayTypeFilter}
            availableDatesInPeriod={availableDatesInPeriod} cashflowGroups={cashflowGroups}
            activeCashflowGroupIds={activeCashflowGroupIds} activeCategoryNames={activeCategoryNames}
            categories={categories} clearFilters={clearFilters} isFilterActive={isFilterActive}
          />
        )}
      </div>

      {/* Table Area */}
      <div className="flex flex-col border rounded-none overflow-hidden shadow-lg transition-colors min-h-[400px] relative bg-[#181818] border-[#303030]">
        {showSkeleton ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full absolute inset-0 z-10 backdrop-blur-sm bg-[#121212]/50">
            <div className="w-12 h-12 mb-4 rounded-none border border-[#3e3e3e] animate-pulse flex items-center justify-center bg-[#181818]/60 text-[#da291c]">
              <LayoutList className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold animate-pulse text-[#888888]">กำลังโหลดข้อมูล...</p>
          </div>
        ) : null}
        
        {displayTransactions.length === 0 && !showSkeleton ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <Inbox className="w-14 h-14 mb-4 text-[#555555]" />
            <p className="text-base font-bold text-[#888888]">ไม่พบรายการบัญชี</p>
            <p className="text-xs mt-1 mb-4 text-[#555555]">ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            {isFilterActive && (
              <button onClick={clearFilters} className="px-4 py-1.5 rounded-none text-xs font-bold border transition-colors bg-[#303030]/60 border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030]">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : viewMode === 'horizontal' ? (
          <HorizontalLedgerView
            displayTransactions={displayTransactions} categories={categories}
            formatMoney={formatMoney}
            dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
            allDates={allDatesInPeriod}
          />
        ) : (
          <LedgerTable
            currentData={currentData} sortedTransactions={sortedTransactions}
            categories={categories} sortConfig={sortConfig}
            handleSort={handleSort} isDateSorted={isDateSorted}
            dateBands={dateBands} handleUpdateTransaction={handleUpdateTransaction}
            handleDeleteTransaction={handleDeleteTransaction} handleOpenAddModal={handleOpenAddModal}
            pageInc={pageInc} pageExp={pageExp} formatMoney={formatMoney}
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}