import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, LayoutList, TableProperties, PlusCircle, Trash2, 
  TrendingUp, TrendingDown, Wallet, Inbox
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
      <div className="flex flex-col gap-3 mb-4">
        {/* Top Header Actions */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-black leading-tight tracking-tight ${'text-slate-100'}`}>บัญชีแยกประเภท</h2>
            <p className={`text-xs font-medium mt-0.5 ${'text-slate-500'}`}>
              {getFilterLabel(filterPeriod)} · {displayTransactions.length} รายการ
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === 'list' && (
              <button onClick={() => setFilterOpen(v => !v)} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border transition-colors ${filterOpen ? 'bg-blue-600/20 border-blue-600/40 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'} ${isFilterActive ? ('!border-amber-500/50 !text-amber-400 !bg-amber-900/20') : ''}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> ตัวกรอง
                {isFilterActive && <span className={`w-1.5 h-1.5 rounded-full ${'bg-amber-400'}`} />}
              </button>
            )}

            <div className={`flex items-center rounded-sm border overflow-hidden ${'border-slate-700'}`}>
              <button onClick={() => setViewMode('list')} title="มุมมองรายการ" className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                <LayoutList className="w-3.5 h-3.5" /><span className="hidden sm:inline">รายการ</span>
              </button>
              <button onClick={() => setViewMode('horizontal')} title="มุมมองตารางแนวนอน" className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors border-l ${'border-slate-700'} ${viewMode === 'horizontal' ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                <TableProperties className="w-3.5 h-3.5" /><span className="hidden sm:inline">ตาราง</span>
              </button>
            </div>

            <button onClick={() => handleOpenAddModal('', 'income')} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-800/50'}`}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายรับ
            </button>
            <button onClick={() => handleOpenAddModal('', 'expense')} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50'}`}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายจ่าย
            </button>
            {displayTransactions.length > 0 && (
              <button onClick={() => { if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในเดือนนี้?')) handleDeleteMonth(filterPeriod); }} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${'text-slate-500 bg-slate-800 hover:text-red-400 hover:bg-red-900/20 hover:border-red-800/50 border-slate-700'}`} title="ลบข้อมูลเดือนนี้">
                <Trash2 className="w-3.5 h-3.5" /> ลบเดือนนี้
              </button>
            )}
          </div>
        </div>

        {/* Stats Area (Vitals) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard 
            icon={<TrendingUp />} 
            label="รายรับรวม" 
            value={formatMoney(sumInc)} 
            subValue={getSubValue(sumInc)}
            color={{ bg: 'bg-emerald-900/30', text: 'text-emerald-400' }} 
          />
          <StatCard 
            icon={<TrendingDown />} 
            label="รายจ่ายรวม" 
            value={formatMoney(sumExp)} 
            subValue={getSubValue(sumExp)}
            color={{ bg: 'bg-red-900/30', text: 'text-red-400' }} 
          />
          <StatCard 
            icon={<Wallet />} 
            label="คงเหลือสุทธิ" 
            value={formatMoney(net)} 
            subValue={getSubValue(net)}
            color={{ bg: net >= 0 ? ('bg-blue-900/30') : ('bg-orange-900/30'), text: net >= 0 ? ('text-blue-400') : ('text-orange-400') }} 
          />
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
            activeCashflowGroupIds={activeCashflowGroupIds} categories={categories}
            clearFilters={clearFilters} isFilterActive={isFilterActive}
          />
        )}
      </div>

      {/* Table Area */}
      <div className={`flex flex-col border rounded overflow-hidden shadow-sm transition-colors min-h-[400px] relative ${'bg-slate-900 border-slate-850'}`}>
        {showSkeleton ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full absolute inset-0 z-10 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            <div className={`w-12 h-12 mb-4 rounded-full animate-bounce flex items-center justify-center ${'bg-slate-800 text-blue-400'}`}>
              <LayoutList className="w-6 h-6 animate-pulse" />
            </div>
            <p className={`text-sm font-bold animate-pulse ${'text-slate-400'}`}>กำลังโหลดข้อมูล...</p>
          </div>
        ) : null}
        
        {displayTransactions.length === 0 && !showSkeleton ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <Inbox className={`w-14 h-14 mb-4 ${'text-slate-700'}`} />
            <p className={`text-base font-bold ${'text-slate-500'}`}>ไม่พบรายการบัญชี</p>
            <p className={`text-xs mt-1 mb-4 ${'text-slate-600'}`}>ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            {isFilterActive && (
              <button onClick={clearFilters} className={`px-4 py-1.5 rounded-sm text-xs font-bold border transition-colors ${'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
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