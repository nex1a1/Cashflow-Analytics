import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, LayoutList, TableProperties, PlusCircle, Trash2, 
  TrendingUp, TrendingDown, Wallet, Inbox, Activity, ChevronDown, ChevronUp
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
  isLoading,
  transactions = []
}) {
  const dm = true;
  const [filterOpen, setFilterOpen] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'horizontal'
  const [showGroupBreakdown, setShowGroupBreakdown] = useState(false);
  const [confirmDeleteMonth, setConfirmDeleteMonth] = useState(false);

  useEffect(() => {
    if (!confirmDeleteMonth) return;
    const timer = setTimeout(() => setConfirmDeleteMonth(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteMonth]);

  const handleDeleteMonthClick = () => {
    if (confirmDeleteMonth) {
      handleDeleteMonth(filterPeriod);
      setConfirmDeleteMonth(false);
    } else {
      setConfirmDeleteMonth(true);
    }
  };

  // ── Logic: Smooth Loading Transition (Only on initial cold start without data) ──
  const showSkeleton = isLoading && (!displayTransactions || displayTransactions.length === 0) && (!transactions || transactions.length === 0);

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
    typeFilter, allocationFilter, minAmount, maxAmount, dayTypeFilter,
    categories, cashflowGroups // Pass these in for order_index lookup
  });

  // ─── Logic: Aggregation & Stats ───
  const {
    sumInc,
    sumExp,
    net,
    savingsRate,
    activeIncomeCards,
    activeSavingsCards,
    activeExpenseCards,
    getSubValue,
    catTypeMap
  } = useLedgerStats(
    displayTransactions,
    categories,
    cashflowGroups,
    formatMoney,
    dm,
    advancedFilterGroup,
    setAdvancedFilterGroup,
    allDatesInPeriod
  );

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
    <div className="flex flex-col gap-0 w-full pb-8">
      <div className="flex flex-col gap-3.5 mb-4 relative z-20">
        {/* Top Header Actions */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-[#da291c] rounded-none shrink-0" />
              <h2 className="text-2xl font-black uppercase tracking-wider leading-none text-slate-100 font-sans">
                บัญชีแยกประเภท
              </h2>
            </div>
            <p className="text-[10px] font-black tracking-widest mt-1.5 font-sans text-slate-400 uppercase flex items-center gap-2">
              <span>{getFilterLabel(filterPeriod)}</span>
              <span className="text-neutral-800 font-bold">•</span>
              <span className="text-[#da291c] font-extrabold">{displayTransactions.length}</span>
              <span>รายการ</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {viewMode === 'list' && (
              <button 
                onClick={() => setFilterOpen(v => !v)} 
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 px-3 py-2 rounded-none border font-mono ${
                  filterOpen 
                    ? 'bg-[#da291c]/10 border-[#da291c] text-[#da291c] shadow-[0_0_12px_rgba(218,41,28,0.12)]' 
                    : 'bg-[#121212] border-[#303030] text-slate-400 hover:bg-[#303030]/40 hover:border-[#404040] hover:text-white'
                } ${isFilterActive ? '!border-amber-500 !text-amber-400 !bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]' : ''}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> 
                <span>ตัวกรอง</span>
                {isFilterActive && <span className="w-1.5 h-1.5 rounded-none bg-amber-400" />}
              </button>
            )}

            <div className="flex items-center rounded-none border border-[#303030] overflow-hidden bg-[#121212]">
              <button 
                onClick={() => setViewMode('list')} 
                title="มุมมองรายการ" 
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-none font-mono ${
                  viewMode === 'list' 
                    ? 'bg-[#303030]/50 text-[#da291c] font-extrabold shadow-inner' 
                    : 'bg-[#121212] text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="inline">รายการ</span>
              </button>
              <button 
                onClick={() => setViewMode('horizontal')} 
                title="มุมมองตารางแนวนอน" 
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-none border-l border-[#303030] font-mono ${
                  viewMode === 'horizontal' 
                    ? 'bg-[#303030]/50 text-[#da291c] font-extrabold shadow-inner' 
                    : 'bg-[#121212] text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span className="inline">ตาราง</span>
              </button>
            </div>

            <button 
              onClick={() => handleOpenAddModal('', 'income')} 
              className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 border rounded-none font-mono text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.04)]"
            >
              <PlusCircle className="w-3.5 h-3.5" /> 
              <span>เพิ่มรายรับ</span>
            </button>
            
            <button 
              onClick={() => handleOpenAddModal('', 'expense')} 
              className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 border rounded-none font-mono text-[#da291c] bg-[#da291c]/5 hover:bg-[#da291c]/10 border-[#da291c]/40 hover:border-[#da291c] shadow-[0_0_12px_rgba(218,41,28,0.04)]"
            >
              <PlusCircle className="w-3.5 h-3.5" /> 
              <span>เพิ่มรายจ่าย</span>
            </button>
            
            {displayTransactions.length > 0 && (
              <button 
                onClick={handleDeleteMonthClick} 
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-2 border rounded-none font-mono transition-all select-none ${
                  confirmDeleteMonth
                    ? 'text-white bg-[#da291c] border-[#da291c] animate-pulse shadow-[0_0_12px_rgba(218,41,28,0.4)]'
                    : 'text-slate-400 bg-[#121212] border-[#303030] hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-500/40'
                }`} 
                title={confirmDeleteMonth ? "คลิกอีกครั้งเพื่อยืนยันการลบข้อมูลทั้งหมดในเดือนนี้" : "ลบข้อมูลเดือนนี้"}
              >
                <Trash2 className="w-3.5 h-3.5" /> 
                <span>{confirmDeleteMonth ? 'กดยืนยันลบ!' : 'ลบเดือนนี้'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Area (Vitals) - High-Density HUD Command Panel */}
        <div className="w-full flex flex-col rounded-none overflow-hidden border shadow-lg bg-[#181818] border-[#303030]">
          {/* Header Panel */}
          <div className="px-3.5 py-2 flex items-center justify-between border-b bg-[#121212]/50 border-[#303030]/60">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#da291c]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">
                แผงวิเคราะห์รายรับ-รายจ่าย (TRANSACTION COMMAND PANEL)
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-px bg-[#303030]/60">
            {/* INCOME CELL */}
            <div className="group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] border-l-emerald-500 bg-[#181818] hover:bg-[#1c1c1c] hover:bg-gradient-to-br hover:from-emerald-500/[0.02]">
              {/* Background Icon Glow */}
              <div className="absolute -right-2 -bottom-2 opacity-[0.02] pointer-events-none text-emerald-400">
                <TrendingUp size={64} />
              </div>
              <div className="relative z-10 flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
                  รายรับรวม (INCOME)
                </span>
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  + INFLOW
                </span>
              </div>
              <div className="relative z-10 mt-0.5">
                <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-emerald-400 font-mono">
                  {formatMoney(sumInc)}
                </div>
              </div>
              <div className="relative z-10 mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-sans">
                  {getSubValue(sumInc)}
                </span>
              </div>
            </div>

            {/* EXPENSE CELL */}
            <div className="group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] border-l-rose-500 bg-[#181818] hover:bg-[#1c1c1c] hover:bg-gradient-to-br hover:from-rose-500/[0.02]">
              {/* Background Icon Glow */}
              <div className="absolute -right-2 -bottom-2 opacity-[0.02] pointer-events-none text-rose-400">
                <TrendingDown size={64} />
              </div>
              <div className="relative z-10 flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
                  รายจ่ายรวม (EXPENSE)
                </span>
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  - OUTFLOW
                </span>
              </div>
              <div className="relative z-10 mt-0.5">
                <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-rose-400 font-mono">
                  {formatMoney(sumExp)}
                </div>
              </div>
              <div className="relative z-10 mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-sans">
                  {getSubValue(sumExp)}
                </span>
              </div>
            </div>

            {/* NET SURPLUS CELL WITH SAVINGS RATE PILL */}
            <div className={`group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] bg-[#181818] hover:bg-[#1c1c1c] ${net >= 0 ? 'border-l-yellow-500 hover:bg-gradient-to-br hover:from-yellow-500/[0.02]' : 'border-l-rose-500 hover:bg-gradient-to-br hover:from-rose-500/[0.02]'}`}>
              {/* Background Icon Glow */}
              <div className={`absolute -right-2 -bottom-2 opacity-[0.02] pointer-events-none ${net >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                <Wallet size={64} />
              </div>
              <div className="relative z-10 flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
                  คงเหลือสุทธิ (NET CASHFLOW)
                </span>
                <div className="flex items-center gap-1">
                  {sumInc > 0 && (
                    <div className={`px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                      savingsRate >= 20 
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' 
                        : (savingsRate >= 10 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')
                    }`}>
                      <span>ออม {savingsRate}%</span>
                      <span className="opacity-45">|</span>
                      <span className="font-extrabold">{savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}</span>
                    </div>
                  )}
                  <span className={`px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border ${net >= 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {net >= 0 ? 'SURPLUS' : 'DEFICIT'}
                  </span>
                </div>
              </div>
              <div className="relative z-10 mt-0.5">
                <div className={`text-2xl font-black tabular-nums tracking-tight leading-none font-mono ${net >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
                  {formatMoney(net)}
                </div>
              </div>
              <div className="relative z-10 mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-sans">
                  {getSubValue(net)}
                </span>
              </div>
            </div>
          </div>

          {/* Full-Width Awning Bar (แถบขยายยาวแบบกันสาด) */}
          {(activeIncomeCards.length > 0 || activeSavingsCards.length > 0 || activeExpenseCards.length > 0) && (
            <button
              onClick={() => setShowGroupBreakdown(v => !v)}
              className="w-full py-1.5 px-4 bg-[#121212] hover:bg-[#1f1f1f] border-t border-[#303030]/80 flex items-center justify-center gap-2 text-[10.5px] font-black uppercase tracking-widest font-mono text-slate-400 hover:text-slate-100 transition-colors group cursor-pointer"
              title="ขยาย/หุบ แผงจำแนกหมวดหมู่ย่อย"
            >
              {showGroupBreakdown ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-[#da291c] group-hover:-translate-y-0.5 transition-transform" />
                  <span>หุบการจำแนกตามกลุ่มรายรับ-รายจ่าย</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#da291c] group-hover:translate-y-0.5 transition-transform" />
                  <span>ขยายดูการจำแนกตามกลุ่มรายรับ-รายจ่าย ({activeIncomeCards.length + activeSavingsCards.length + activeExpenseCards.length} กลุ่ม)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Group Breakdown Area (Collapsible, hidden by default) */}
        {showGroupBreakdown && (activeIncomeCards.length > 0 || activeSavingsCards.length > 0 || activeExpenseCards.length > 0) && (
          <div className="flex flex-col gap-4 pb-2 mt-2">
            
            {/* Row 1: Income and Savings/Investments */}
            {(activeIncomeCards.length > 0 || activeSavingsCards.length > 0) && (
              <div className="flex flex-wrap justify-center items-stretch gap-6 pb-2">
                
                {/* Left Column: Income */}
                {activeIncomeCards.length > 0 && (
                  <div className="flex flex-col gap-1.5 items-center">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-[#10b981] font-sans justify-center">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>รายรับ (Income)</span>
                    </div>
                    <div className="flex flex-wrap items-stretch justify-center gap-3">
                      {activeIncomeCards}
                    </div>
                  </div>
                )}

                {/* Vertical Divider */}
                {activeIncomeCards.length > 0 && activeSavingsCards.length > 0 && (
                  <div className="flex items-center justify-center px-2 self-stretch shrink-0">
                    <div className="w-[1px] h-full min-h-[48px] bg-neutral-800" />
                  </div>
                )}

                {/* Right Column: Savings */}
                {activeSavingsCards.length > 0 && (
                  <div className="flex flex-col gap-1.5 items-center">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-amber-500 font-sans justify-center">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>การออมและลงทุน (Savings & Investments)</span>
                    </div>
                    <div className="flex flex-wrap items-stretch justify-center gap-3">
                      {activeSavingsCards}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Row 2: Expenses */}
            {activeExpenseCards.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-center gap-2 px-1 text-[10.5px] font-black uppercase tracking-wider text-[#da291c] font-sans">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>รายจ่าย (Expenses)</span>
                </div>
                <div className="flex flex-wrap items-stretch justify-center gap-3 pb-1 px-1">
                  {activeExpenseCards}
                </div>
              </div>
            )}

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
            filterPeriod={filterPeriod}
            dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
          />
        )}
      </div>

      {/* Table Area */}
      <div className="flex flex-col border rounded-none overflow-hidden shadow-lg min-h-[400px] relative z-0 bg-[#181818] border-[#303030]">
        {showSkeleton ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full absolute inset-0 z-50 bg-[#121212]/80 backdrop-blur-[1px]">
            <div className="relative w-14 h-14 mb-4 flex items-center justify-center border border-[#303030] bg-[#181818]">
              <div className="w-8 h-8 border-2 border-transparent border-t-[#da291c] border-r-[#da291c]/30 rounded-full animate-spin" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#888888] font-sans flex items-center gap-1.5">
              <span>กำลังดาวน์โหลดบัญชีแยกประเภท</span>
              <span className="text-[#da291c] animate-pulse">...</span>
            </p>
          </div>
        ) : null}
        
        {displayTransactions.length === 0 && !showSkeleton ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <Inbox className="w-14 h-14 mb-4 text-[#555555]" />
            <p className="text-base font-bold text-[#888888]">ไม่พบรายการบัญชี</p>
            <p className="text-xs mt-1 mb-4 text-[#555555]">ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            {isFilterActive && (
              <button onClick={clearFilters} className="px-4 py-1.5 rounded-none text-xs font-bold border bg-[#303030]/60 border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030]">
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