// src/views/LedgerView.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Filter, Inbox, Pencil, PlusCircle, Search, Trash2, X,
  PieChart, Wallet, Coins, FileSpreadsheet, TrendingUp, TrendingDown,
  ArrowUpDown, SlidersHorizontal, ChevronDown,
} from 'lucide-react';
import EditableInput from '../components/ui/EditableInput';
import { formatMoney, hexToRgb } from '../utils/formatters';

const SELECT_ARROW = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

/* ── 1. Component ป้องกันมือลั่น ── */
function InlineConfirmDelete({ onDelete, isDarkMode }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const handleClick = () => {
    if (confirming) { clearTimeout(timer.current); onDelete(); }
    else { setConfirming(true); timer.current = setTimeout(() => setConfirming(false), 3000); }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      onClick={handleClick}
      className={`rounded transition-all active:scale-95 ${
        confirming
          ? 'bg-red-500 text-white px-2.5 py-1 text-[11px] font-bold animate-pulse'
          : `p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 ${
              isDarkMode
                ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30'
                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
            }`
      }`}
      title="ลบ"
    >
      {confirming ? 'ยืนยัน?' : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── 2. Component สำหรับช่องจำนวนเงิน: โชว์ Comma แต่พิมพ์แบบ Number ── */
function AmountEditableInput({ initialValue, onSave, className, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const handleFocus = () => setIsEditing(true);

  const handleBlur = () => {
    setIsEditing(false);
    const numVal = parseFloat(value);
    const finalVal = isNaN(numVal) ? 0 : numVal;
    if (finalVal !== parseFloat(initialValue || 0)) {
      onSave(finalVal);
    } else {
      setValue(initialValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') { setValue(initialValue); setIsEditing(false); }
  };

  const displayValue = isEditing
    ? value
    : (value ? Number(value).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '');

  return (
    <input
      type={isEditing ? 'number' : 'text'}
      value={displayValue}
      onChange={e => setValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}

/* ── 3. Summary Stat Card ── */
function StatCard({ icon, label, value, color, dm }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-sm border transition-colors ${
      dm ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'
    }`}>
      <div className={`p-2 rounded-sm ${color.bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wide leading-none mb-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
          {label}
        </p>
        <p className={`text-base font-black leading-none ${color.text}`}>{value}</p>
      </div>
    </div>
  );
}

export default function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  availableDatesInPeriod, isDarkMode,
  setFilterPeriod, rawAvailableMonths,
  cashflowGroups = [],
  activeCashflowGroupIds = new Set(),
}) {
  const dm = isDarkMode;
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [filterOpen, setFilterOpen] = useState(true);

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

  const selCls = `w-full border rounded-sm px-3 py-2 text-xs outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${
    dm
      ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#00509E] focus:bg-white focus:ring-[#00509E]/10'
  }`;
  const selStyle = { backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.85em' };

  const SortHeader = ({ label, sortKey, className = '', align = 'left' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th
        className={`px-4 py-3 font-bold cursor-pointer transition-all select-none group text-${align} ${className} ${
          dm
            ? `text-slate-400 hover:text-slate-200 ${isActive ? 'text-blue-400 bg-slate-700/40' : 'hover:bg-slate-700/30'}`
            : `text-slate-500 hover:text-slate-800 ${isActive ? 'text-[#00509E] bg-blue-50/60' : 'hover:bg-slate-100/80'}`
        }`}
        onClick={() => handleSort(sortKey)}
        title={`เรียงตาม${label}`}
      >
        <div className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wide ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          {label}
          <span className={`flex flex-col text-[8px] leading-[0.55] transition-opacity ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}>
            <span className={isActive && sortConfig.direction === 'asc' ? (dm ? 'text-blue-400' : 'text-[#00509E]') : ''}>▲</span>
            <span className={isActive && sortConfig.direction === 'desc' ? (dm ? 'text-blue-400' : 'text-[#00509E]') : ''}>▼</span>
          </span>
        </div>
      </th>
    );
  };

  /* ── ReadOnly View ── */
  if (isReadOnlyView) {
    const latestMonth = rawAvailableMonths?.length > 0 ? rawAvailableMonths[0] : null;
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6 max-w-screen-2xl mx-auto w-full">
        <div className={`flex flex-col items-center justify-center py-28 rounded border-2 border-dashed transition-colors ${
          dm ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-5 rounded mb-5 ${dm ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <FileSpreadsheet className={`w-12 h-12 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          </div>
          <p className={`text-xl font-black mb-2 ${dm ? 'text-slate-200' : 'text-slate-700'}`}>
            รายการเดินบัญชีรองรับเฉพาะรายเดือน
          </p>
          <p className={`text-sm px-6 text-center max-w-md leading-relaxed mb-8 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            ตอนนี้คุณกำลังดูข้อมูลแบบ <strong>{getFilterLabel(filterPeriod)}</strong><br />
            หากต้องการแก้ไขข้อมูลหรือดูรายการเดินบัญชีแบบละเอียด กรุณาเลือกช่วงเวลาเป็น "รายเดือน"
          </p>
          {latestMonth && setFilterPeriod && (
            <button
              onClick={() => setFilterPeriod(latestMonth)}
              className={`px-6 py-2.5 rounded-sm text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${
                dm ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#00509E] hover:bg-blue-800 text-white'
              }`}
            >
              สลับไปดูเดือนล่าสุด ({getFilterLabel(latestMonth)})
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Main View ── */
  return (
    <div className="flex flex-col gap-0 animate-in fade-in slide-in-from-bottom-3 duration-400 max-w-screen-2xl mx-auto w-full pb-8">

      {/* ── TOP BAR: Title + Stats + Actions ── */}
      <div className={`flex flex-col gap-3 mb-4`}>
        {/* Row 1: Title + Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-black leading-tight tracking-tight ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
              บัญชีแยกประเภท
            </h2>
            <p className={`text-xs font-medium mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              {getFilterLabel(filterPeriod)} · {displayTransactions.length} รายการ
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFilterOpen(v => !v)}
              className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border transition-colors ${
                filterOpen
                  ? dm ? 'bg-blue-600/20 border-blue-600/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                  : dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              } ${isFilterActive ? (dm ? '!border-amber-500/50 !text-amber-400 !bg-amber-900/20' : '!border-amber-400 !text-amber-700 !bg-amber-50') : ''}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              ตัวกรอง
              {isFilterActive && <span className={`w-1.5 h-1.5 rounded-full ${dm ? 'bg-amber-400' : 'bg-amber-500'}`} />}
            </button>
            <button
              onClick={() => handleOpenAddModal('', 'income')}
              className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${
                dm ? 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-800/50' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายรับ
            </button>
            <button
              onClick={() => handleOpenAddModal('', 'expense')}
              className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${
                dm ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายจ่าย
            </button>
            {displayTransactions.length > 0 && (
              <button
                onClick={() => { if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในเดือนนี้?')) handleDeleteMonth(filterPeriod); }}
                className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-sm border shadow-sm transition-colors active:scale-95 ${
                  dm ? 'text-slate-500 bg-slate-800 hover:text-red-400 hover:bg-red-900/20 hover:border-red-800/50 border-slate-700' : 'text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200'
                }`}
                title="ลบข้อมูลเดือนนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ลบเดือนนี้
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            dm={dm}
            icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            label="รายรับรวม"
            value={formatMoney(sumInc)}
            color={{ bg: dm ? 'bg-emerald-900/30' : 'bg-emerald-50', text: dm ? 'text-emerald-400' : 'text-emerald-600' }}
          />
          <StatCard
            dm={dm}
            icon={<TrendingDown className="w-4 h-4 text-red-500" />}
            label="รายจ่ายรวม"
            value={formatMoney(sumExp)}
            color={{ bg: dm ? 'bg-red-900/30' : 'bg-red-50', text: dm ? 'text-red-400' : 'text-red-600' }}
          />
          <StatCard
            dm={dm}
            icon={<Wallet className={`w-4 h-4 ${net >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-500')}`} />}
            label="คงเหลือสุทธิ"
            value={formatMoney(net)}
            color={{
              bg: net >= 0 ? (dm ? 'bg-blue-900/30' : 'bg-blue-50') : (dm ? 'bg-orange-900/30' : 'bg-orange-50'),
              text: net >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-600'),
            }}
          />
        </div>

        {/* Row 3: Inline Filter Bar (collapsible) */}
        {filterOpen && (
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
                          {/* ✨ ดึง g.icon มาแสดง ถ้าไม่มีให้ใช้จุดสีเขียว/แดงแทน ✨ */}
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
        )}
      </div>

      {/* ── TABLE AREA ── */}
      <div className={`flex flex-col border rounded overflow-hidden shadow-sm transition-colors ${
        dm ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-200'
      }`}>
        {displayTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <Inbox className={`w-14 h-14 mb-4 ${dm ? 'text-slate-700' : 'text-slate-200'}`} />
            <p className={`text-base font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ไม่พบรายการบัญชี</p>
            <p className={`text-xs mt-1 mb-4 ${dm ? 'text-slate-600' : 'text-slate-300'}`}>ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            {isFilterActive && (
              <button
                onClick={clearFilters}
                className={`px-4 py-1.5 rounded-sm text-xs font-bold border transition-colors ${
                  dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">

                {/* ── THEAD ── */}
                <thead className={`sticky top-0 z-20 border-b ${
                  dm ? 'bg-slate-800/95 border-slate-700 backdrop-blur-sm' : 'bg-slate-50/95 border-slate-200 backdrop-blur-sm'
                }`}>
                  <tr>
                    <SortHeader label="วันที่" sortKey="date" className="w-[145px]" />
                    <th className={`px-4 py-3 font-bold w-[90px] text-center text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      ประเภท
                    </th>
                    <SortHeader label="หมวดหมู่" sortKey="category" className="w-[270px]" />
                    <th className={`px-4 py-3 font-bold text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      รายละเอียด
                    </th>
                    <SortHeader label="จำนวนเงิน" sortKey="amount" className="w-[140px]" align="right" />
                    <th className="w-10" />
                  </tr>
                </thead>

                {/* ── TBODY ── */}
                <tbody>
                  {currentData.map((item, index, arr) => {
                    const isNewDate  = !isDateSorted || index === 0 || item.date !== arr[index - 1].date;
                    const catObj     = categories.find(c => c.name === item.category) || categories[categories.length - 1];
                    const isInc      = catObj?.type === 'income';
                    const isAlt      = isDateSorted ? dateBands[item.id] === 1 : index % 2 === 1;

                    const rowBg = isAlt
                      ? (dm ? 'bg-slate-800/30' : 'bg-slate-50/60')
                      : 'bg-transparent';

                    return (
                      <tr
                        key={item.id}
                        className={`group transition-colors duration-100 border-b ${
                          dm ? 'border-slate-800/60 hover:bg-slate-700/40' : 'border-slate-100 hover:bg-blue-50/40'
                        } ${rowBg}`}
                      >
                        {/* ── DATE ── */}
                        <td className="px-4 py-2.5 align-middle">
                          {isNewDate ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black tabular-nums ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.date}
                              </span>
                              <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button
                                  onClick={() => handleOpenAddModal(item.date, 'income')}
                                  className={`p-1 rounded transition-colors ${dm ? 'text-emerald-500 hover:bg-emerald-900/40' : 'text-emerald-600 hover:bg-emerald-100'}`}
                                  title="เพิ่มรายรับวันนี้"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleOpenAddModal(item.date, 'expense')}
                                  className={`p-1 rounded transition-colors ${dm ? 'text-red-400 hover:bg-red-900/40' : 'text-red-500 hover:bg-red-100'}`}
                                  title="เพิ่มรายจ่ายวันนี้"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className={`text-xs select-none opacity-15 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>&quot;</span>
                          )}
                        </td>

                        {/* ── TYPE BADGE ── */}
                        <td className="px-4 py-2.5 align-middle text-center">
                          <span className={`inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 text-[11px] font-black rounded-sm ${
                            isInc
                              ? (dm ? 'bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-800/60' : 'bg-emerald-100 text-emerald-700')
                              : (dm ? 'bg-red-900/30 text-red-400 ring-1 ring-red-900/50' : 'bg-red-100 text-red-700')
                          }`}>
                            {isInc ? 'รายรับ' : 'รายจ่าย'}
                          </span>
                        </td>

                        {/* ── CATEGORY SELECT ── */}
                        <td className="px-3 py-2 align-middle">
                          <div
                            className="relative w-full flex items-center rounded-sm border transition-all duration-150 focus-within:ring-1 focus-within:ring-opacity-40"
                            style={{
                              backgroundColor: `rgba(${hexToRgb(catObj?.color)}, ${dm ? 0.12 : 0.04})`,
                              borderColor:     `rgba(${hexToRgb(catObj?.color)}, ${dm ? 0.3 : 0.2})`,
                            }}
                          >
                            <div
                              className="absolute left-2.5 w-2 h-2 rounded pointer-events-none"
                              style={{ backgroundColor: catObj?.color || '#cbd5e1' }}
                            />
                            <select
                              value={item.category}
                              onChange={e => handleUpdateTransaction(item.id, 'category', e.target.value)}
                              className="w-full bg-transparent outline-none appearance-none pl-6 pr-7 py-1.5 font-bold border-none text-xs cursor-pointer"
                              style={{
                                backgroundImage: SELECT_ARROW,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.5rem center',
                                backgroundSize: '0.8em',
                                color: catObj?.color || (dm ? '#e2e8f0' : '#475569'),
                                filter: dm ? 'brightness(1.3)' : 'none',
                              }}
                            >
                              {categories.filter(c => c.type === catObj?.type).map(c =>
                                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                              )}
                            </select>
                          </div>
                        </td>

                        {/* ── DESCRIPTION ── */}
                        <td className="px-3 py-2 group/input relative align-middle">
                          <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 ${
                            dm ? 'text-slate-500' : 'text-slate-400'
                          }`} />
                          <EditableInput
                            initialValue={item.description}
                            onSave={val => handleUpdateTransaction(item.id, 'description', val)}
                            className={`w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-sm py-1.5 px-2 pl-7 text-sm font-medium transition-all ${
                              dm
                                ? 'text-slate-200 hover:bg-slate-800/80 hover:border-slate-600/80 focus:border-blue-500/70 focus:bg-slate-800/60'
                                : 'text-slate-700 hover:bg-white hover:border-slate-200 hover:shadow-sm focus:border-[#00509E]/50 focus:bg-white'
                            }`}
                            placeholder="รายละเอียด..."
                          />
                        </td>

                        {/* ── AMOUNT ── */}
                        <td className="px-3 py-2 group/input relative align-middle">
                          <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 ${
                            dm ? 'text-slate-500' : 'text-slate-400'
                          }`} />
                          <AmountEditableInput
                            initialValue={item.amount === 0 ? '' : item.amount}
                            onSave={val => handleUpdateTransaction(item.id, 'amount', val)}
                            className={`w-full bg-transparent border border-transparent rounded-sm py-1.5 px-2 text-right text-sm font-black outline-none pl-7 transition-all focus:ring-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              dm
                                ? 'hover:bg-slate-800/80 hover:border-slate-600/80 ' + (isInc ? 'text-emerald-400 focus:border-emerald-600/70' : 'text-slate-200 focus:border-red-600/70')
                                : 'hover:bg-white hover:border-slate-200 hover:shadow-sm ' + (isInc ? 'text-emerald-600 focus:border-emerald-400' : 'text-slate-800 focus:border-red-400')
                            }`}
                            placeholder="0"
                          />
                        </td>

                        {/* ── DELETE ── */}
                        <td className="px-2 py-2 text-center align-middle">
                          <InlineConfirmDelete onDelete={() => handleDeleteTransaction(item.id)} isDarkMode={dm} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ── TFOOT (Summary) ── */}
                <tfoot className={`sticky bottom-0 z-20 border-t-2 ${
                  dm ? 'bg-slate-800/95 border-slate-700 backdrop-blur-sm' : 'bg-slate-50/95 border-slate-200 backdrop-blur-sm'
                }`}>
                  <tr>
                    <td colSpan="3" className={`px-4 py-3 text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                      รวม {currentData.length} รายการในหน้านี้
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5 leading-none">
                        {pageInc > 0 && (
                          <span className={`text-[11px] font-bold tabular-nums ${dm ? 'text-emerald-500' : 'text-emerald-600'}`}>
                            +{formatMoney(pageInc)}
                          </span>
                        )}
                        {pageExp > 0 && (
                          <span className={`text-[11px] font-bold tabular-nums ${dm ? 'text-red-400' : 'text-red-600'}`}>
                            -{formatMoney(pageExp)}
                          </span>
                        )}
                        <span className={`text-sm font-black mt-1 pt-1 border-t tabular-nums ${
                          dm ? 'border-slate-700' : 'border-slate-300'
                        } ${pageInc - pageExp >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-600')}`}>
                          {formatMoney(pageInc - pageExp)}
                        </span>
                      </div>
                    </td>
                    <td />
                  </tr>
                </tfoot>

              </table>
            </div>

            {/* ── PAGINATION BAR ── */}
            <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
              dm ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-100'
            }`}>
              <span className={`text-xs font-semibold ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                แสดง <span className={`font-black ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{currentData.length}</span> จากทั้งหมด <span className={`font-black ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{sortedTransactions.length}</span> รายการ
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-500'}`}>
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 text-xs font-bold ${
                        dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                      title="หน้าแรก"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 ${
                        dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Page number pills */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) page = i + 1;
                      else if (currentPage <= 3) page = i + 1;
                      else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                      else page = currentPage - 2 + i;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[30px] h-[30px] px-1 border rounded-sm text-xs font-bold transition-all active:scale-95 ${
                            page === currentPage
                              ? (dm ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#00509E] border-[#00509E] text-white')
                              : (dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 ${
                        dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 text-xs font-bold ${
                        dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                      title="หน้าสุดท้าย"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}