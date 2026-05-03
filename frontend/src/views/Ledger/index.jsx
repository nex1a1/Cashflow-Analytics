import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, LayoutList, TableProperties, PlusCircle, Trash2, 
  TrendingUp, TrendingDown, Wallet, Inbox, FileSpreadsheet 
} from 'lucide-react';
import { formatMoney } from '../../utils/formatters'; // เช็ค Path
import { useTheme } from '../../context/ThemeContext';

// นำเข้า Components ที่แยกออกมา
import StatCard from './components/StatCard';
import FilterBar from './components/FilterBar';
import LedgerTable from './components/LedgerTable';
import HorizontalLedgerView from './components/HorizontalLedgerView';

export default function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  availableDatesInPeriod,
  allDatesInPeriod,
  setFilterPeriod, rawAvailableMonths,
  cashflowGroups = [],
  activeCashflowGroupIds = new Set(),
  dayTypes = {},
  dayTypeConfig = [],
}) {
  const { isDarkMode: dm } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [filterOpen, setFilterOpen] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'horizontal'

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key) return displayTransactions;
    return [...displayTransactions].sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'amount') {
        valA = parseFloat(a.amount) || 0;
        valB = parseFloat(b.amount) || 0;
      } else if (sortConfig.key === 'category') {
        valA = a.category || '';
        valB = b.category || '';
      } else if (sortConfig.key === 'date') {
        valA = a.date.split('/').reverse().join('');
        valB = b.date.split('/').reverse().join('');
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayTransactions, sortConfig]);

  const pages = useMemo(() => {
    const result = [];
    let curPage = [];
    const TARGET = 50;
    const groups = [];
    let curGroup = [], curDate = null;

    if (sortConfig.key && sortConfig.key !== 'date') {
      for (let i = 0; i < sortedTransactions.length; i += TARGET) {
        result.push(sortedTransactions.slice(i, i + TARGET));
      }
      return result;
    }

    sortedTransactions.forEach(t => {
      if (t.date !== curDate) {
        if (curGroup.length > 0) groups.push(curGroup);
        curGroup = [t]; curDate = t.date;
      } else curGroup.push(t);
    });
    if (curGroup.length > 0) groups.push(curGroup);
    groups.forEach(grp => {
      if (curPage.length + grp.length > TARGET && curPage.length > 0) { result.push(curPage); curPage = [...grp]; }
      else curPage.push(...grp);
    });
    if (curPage.length > 0) result.push(curPage);
    return result;
  }, [sortedTransactions, sortConfig]);

  const dateBands = useMemo(() => {
    const bands = {};
    let currentBand = 0;
    let lastDate = null;
    sortedTransactions.forEach(t => {
      if (t.date !== lastDate) { currentBand = 1 - currentBand; lastDate = t.date; }
      bands[t.id] = currentBand;
    });
    return bands;
  }, [sortedTransactions]);

  useEffect(() => { setCurrentPage(1); }, [filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate, sortConfig]);
  useEffect(() => { if (pages.length > 0 && currentPage > pages.length) setCurrentPage(pages.length); }, [pages.length, currentPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setAdvancedFilterCategory('ALL');
    setAdvancedFilterGroup('ALL');
    setAdvancedFilterDate('ALL');
  };

  const catTypeMap = useMemo(() => {
    const map = {};
    categories.forEach(c => map[c.name] = c.type);
    return map;
  }, [categories]);

  const { sumInc, sumExp } = useMemo(() => {
    let inc = 0, exp = 0;
    displayTransactions.forEach(t => {
      const type = catTypeMap[t.category];
      const amt = parseFloat(t.amount) || 0;
      if (type === 'income') inc += amt;
      else exp += amt;
    });
    return { sumInc: inc, sumExp: exp };
  }, [displayTransactions, catTypeMap]);
  const net = sumInc - sumExp;

  const totalPages = pages.length || 1;
  const currentData = pages[currentPage - 1] || [];
  const isFilterActive = searchQuery || advancedFilterDate !== 'ALL' || advancedFilterGroup !== 'ALL' || advancedFilterCategory !== 'ALL';

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

  const isDateSorted = !sortConfig.key || sortConfig.key === 'date';

  if (isReadOnlyView) {
    const latestMonth = rawAvailableMonths?.length > 0 ? rawAvailableMonths[0] : null;
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6 max-w-screen-2xl mx-auto w-full">
        <div className={`flex flex-col items-center justify-center py-28 rounded border-2 border-dashed transition-colors ${dm ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`p-5 rounded mb-5 ${dm ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <FileSpreadsheet className={`w-12 h-12 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          </div>
          <p className={`text-xl font-black mb-2 ${dm ? 'text-slate-200' : 'text-slate-700'}`}>รายการเดินบัญชีรองรับเฉพาะรายเดือน</p>
          <p className={`text-sm px-6 text-center max-w-md leading-relaxed mb-8 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            ตอนนี้คุณกำลังดูข้อมูลแบบ <strong>{getFilterLabel(filterPeriod)}</strong><br />
            หากต้องการแก้ไขข้อมูลหรือดูรายการเดินบัญชีแบบละเอียด กรุณาเลือกช่วงเวลาเป็น "รายเดือน"
          </p>
          {latestMonth && setFilterPeriod && (
            <button onClick={() => setFilterPeriod(latestMonth)} className={`px-6 py-2.5 rounded-sm text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${dm ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#00509E] hover:bg-blue-800 text-white'}`}>
              สลับไปดูเดือนล่าสุด ({getFilterLabel(latestMonth)})
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 animate-in fade-in slide-in-from-bottom-3 duration-400 w-full pb-8">
      <div className="flex flex-col gap-3 mb-4">
        {/* Top Header Actions */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-black leading-tight tracking-tight ${dm ? 'text-slate-100' : 'text-slate-800'}`}>บัญชีแยกประเภท</h2>
            <p className={`text-xs font-medium mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              {getFilterLabel(filterPeriod)} · {displayTransactions.length} รายการ
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === 'list' && (
              <button onClick={() => setFilterOpen(v => !v)} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border transition-colors ${filterOpen ? dm ? 'bg-blue-600/20 border-blue-600/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700' : dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} ${isFilterActive ? (dm ? '!border-amber-500/50 !text-amber-400 !bg-amber-900/20' : '!border-amber-400 !text-amber-700 !bg-amber-50') : ''}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> ตัวกรอง
                {isFilterActive && <span className={`w-1.5 h-1.5 rounded-full ${dm ? 'bg-amber-400' : 'bg-amber-500'}`} />}
              </button>
            )}

            <div className={`flex items-center rounded-sm border overflow-hidden ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
              <button onClick={() => setViewMode('list')} title="มุมมองรายการ" className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'list' ? dm ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700' : dm ? 'bg-slate-800 text-slate-500 hover:text-slate-300' : 'bg-white text-slate-400 hover:text-slate-600'}`}>
                <LayoutList className="w-3.5 h-3.5" /><span className="hidden sm:inline">รายการ</span>
              </button>
              <button onClick={() => setViewMode('horizontal')} title="มุมมองตารางแนวนอน" className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors border-l ${dm ? 'border-slate-700' : 'border-slate-200'} ${viewMode === 'horizontal' ? dm ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700' : dm ? 'bg-slate-800 text-slate-500 hover:text-slate-300' : 'bg-white text-slate-400 hover:text-slate-600'}`}>
                <TableProperties className="w-3.5 h-3.5" /><span className="hidden sm:inline">ตาราง</span>
              </button>
            </div>

            <button onClick={() => handleOpenAddModal('', 'income')} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${dm ? 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-800/50' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'}`}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายรับ
            </button>
            <button onClick={() => handleOpenAddModal('', 'expense')} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${dm ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'}`}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายจ่าย
            </button>
            {displayTransactions.length > 0 && (
              <button onClick={() => { if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในเดือนนี้?')) handleDeleteMonth(filterPeriod); }} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${dm ? 'text-slate-500 bg-slate-800 hover:text-red-400 hover:bg-red-900/20 hover:border-red-800/50 border-slate-700' : 'text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200'}`} title="ลบข้อมูลเดือนนี้">
                <Trash2 className="w-3.5 h-3.5" /> ลบเดือนนี้
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="รายรับรวม" value={formatMoney(sumInc)} color={{ bg: dm ? 'bg-emerald-900/30' : 'bg-emerald-50', text: dm ? 'text-emerald-400' : 'text-emerald-600' }} />
          <StatCard icon={<TrendingDown className="w-4 h-4 text-red-500" />} label="รายจ่ายรวม" value={formatMoney(sumExp)} color={{ bg: dm ? 'bg-red-900/30' : 'bg-red-50', text: dm ? 'text-red-400' : 'text-red-600' }} />
          <StatCard icon={<Wallet className={`w-4 h-4 ${net >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-500')}`} />} label="คงเหลือสุทธิ" value={formatMoney(net)} color={{ bg: net >= 0 ? (dm ? 'bg-blue-900/30' : 'bg-blue-50') : (dm ? 'bg-orange-900/30' : 'bg-orange-50'), text: net >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-600') }} />
        </div>

        {/* Filters */}
        {filterOpen && viewMode === 'list' && (
          <FilterBar
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            advancedFilterDate={advancedFilterDate} setAdvancedFilterDate={setAdvancedFilterDate}
            advancedFilterGroup={advancedFilterGroup} setAdvancedFilterGroup={setAdvancedFilterGroup}
            advancedFilterCategory={advancedFilterCategory} setAdvancedFilterCategory={setAdvancedFilterCategory}
            availableDatesInPeriod={availableDatesInPeriod} cashflowGroups={cashflowGroups}
            activeCashflowGroupIds={activeCashflowGroupIds} categories={categories}
            clearFilters={clearFilters} isFilterActive={isFilterActive}
          />
        )}
      </div>

      {/* Table Area */}
      <div className={`flex flex-col border rounded overflow-hidden shadow-sm transition-colors ${dm ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-200'}`}>
        {displayTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <Inbox className={`w-14 h-14 mb-4 ${dm ? 'text-slate-700' : 'text-slate-200'}`} />
            <p className={`text-base font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ไม่พบรายการบัญชี</p>
            <p className={`text-xs mt-1 mb-4 ${dm ? 'text-slate-600' : 'text-slate-300'}`}>ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            {isFilterActive && (
              <button onClick={clearFilters} className={`px-4 py-1.5 rounded-sm text-xs font-bold border transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}>
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