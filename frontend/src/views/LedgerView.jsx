// src/views/LedgerView.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Filter, Inbox, Pencil, PlusCircle, Search, Trash2, X,
  PieChart, Wallet, Coins, FileSpreadsheet
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
    <button onClick={handleClick}
      className={`rounded-sm font-bold transition-all active:scale-95 ${
        confirming 
          ? 'bg-red-500 text-white px-2 py-1 text-[10px] animate-pulse opacity-100' 
          : `p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`
      }`} title="ลบ">
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
    if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  const displayValue = isEditing 
    ? value 
    : (value ? Number(value).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '');

  return (
    <input
      type={isEditing ? "number" : "text"}
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

export default function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  availableDatesInPeriod, isDarkMode,
  setFilterPeriod, rawAvailableMonths,
  cashflowGroups = [] // <-- เพิ่ม Props ตัวนี้เข้ามา
}) {
  const dm = isDarkMode;
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  // ── จัดการการเรียงลำดับข้อมูล (Sorting) ──
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
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

  // ── จัดกลุ่มแบ่งหน้า (Pagination) ──
  const pages = useMemo(() => {
    const result = [];
    let curPage  = [];
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

  // ── สร้าง Map สำหรับแรเงาสลับสีพื้นหลัง ──
  const dateBands = useMemo(() => {
    const bands = {};
    let currentBand = 0;
    let lastDate = null;
    sortedTransactions.forEach(t => {
      if (t.date !== lastDate) {
        currentBand = 1 - currentBand; 
        lastDate = t.date;
      }
      bands[t.id] = currentBand;
    });
    return bands;
  }, [sortedTransactions]);

  useEffect(() => { setCurrentPage(1); }, [filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate, sortConfig]);
  useEffect(() => { if (pages.length > 0 && currentPage > pages.length) setCurrentPage(pages.length); }, [pages.length, currentPage]);

  const clearFilters = () => { setSearchQuery(''); setAdvancedFilterCategory('ALL'); setAdvancedFilterGroup('ALL'); setAdvancedFilterDate('ALL'); };

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

  const totalPages   = pages.length || 1;
  const currentData  = pages[currentPage - 1] || [];
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

  const card    = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const selCls  = `w-full border rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${dm ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:bg-white'}`;

  const SortHeader = ({ label, sortKey, width, align = 'left' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`px-4 py-2.5 font-bold cursor-pointer transition-colors select-none group ${width || ''} text-${align} ${dm ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-700 hover:bg-slate-200/50'}`}
        onClick={() => handleSort(sortKey)}
        title={`เรียงตาม${label}`}
      >
        <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          {label}
          <div className="flex flex-col text-[9px] leading-[0.5] opacity-30 group-hover:opacity-100 transition-opacity">
            <span className={isActive && sortConfig.direction === 'asc' ? (dm ? 'text-blue-400 opacity-100' : 'text-[#00509E] opacity-100') : ''}>▲</span>
            <span className={`mt-[1px] ${isActive && sortConfig.direction === 'desc' ? (dm ? 'text-blue-400 opacity-100' : 'text-[#00509E] opacity-100') : ''}`}>▼</span>
          </div>
        </div>
      </th>
    );
  };

  if (isReadOnlyView) {
    const latestMonth = rawAvailableMonths && rawAvailableMonths.length > 0 ? rawAvailableMonths[0] : null;
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6 max-w-screen-2xl mx-auto w-full">
        <div className={`flex flex-col items-center justify-center py-24 rounded-sm border-2 border-dashed transition-colors shadow-sm ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`p-4 rounded-sm mb-4 ${dm ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <FileSpreadsheet className={`w-12 h-12 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          </div>
          <p className={`text-xl font-bold mb-2 ${dm ? 'text-slate-200' : 'text-slate-700'}`}>รายการเดินบัญชีรองรับเฉพาะรายเดือน</p>
          <p className={`text-sm px-6 text-center max-w-md leading-relaxed mb-6 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            ตอนนี้คุณกำลังดูข้อมูลแบบ <strong>{getFilterLabel(filterPeriod)}</strong><br/>
            หากต้องการแก้ไขข้อมูลหรือดูรายการเดินบัญชีแบบละเอียด กรุณาเลือกช่วงเวลาเป็น "รายเดือน"
          </p>
          {latestMonth && setFilterPeriod && (
            <button 
              onClick={() => setFilterPeriod(latestMonth)}
              className={`px-5 py-2.5 rounded-sm text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${dm ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#00509E] hover:bg-blue-800 text-white'}`}
            >
              สลับไปดูเดือนล่าสุด ({getFilterLabel(latestMonth)})
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto w-full pb-8">
      
      {/* SIDEBAR */}
      <div className="w-full xl:w-[280px] shrink-0 flex flex-col gap-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}>

        <div className={card + ' p-4'}>
          <h3 className={`text-sm font-bold flex items-center gap-2 mb-3 pb-3 border-b ${dm ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-100'}`}>
            <PieChart className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} /> สรุปยอดตามตัวกรอง
          </h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                <Coins className="w-3.5 h-3.5 text-emerald-500" /> รายรับ
              </span>
              <span className={`text-sm font-black ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatMoney(sumInc)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                <Wallet className="w-3.5 h-3.5 text-red-500" /> รายจ่าย
              </span>
              <span className={`text-sm font-black ${dm ? 'text-red-400' : 'text-red-600'}`}>{formatMoney(sumExp)}</span>
            </div>
            <div className={`pt-2.5 border-t flex justify-between items-center ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <span className={`text-xs font-bold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>คงเหลือ</span>
              <span className={`text-base font-black ${net >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-600')}`}>{formatMoney(net)}</span>
            </div>
            <div className={`text-xs text-center font-bold py-1.5 rounded-sm ${dm ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              {displayTransactions.length} รายการ
            </div>
          </div>
        </div>

        <div className={card + ' p-4 flex flex-col gap-3'}>
          <div className={`flex items-center justify-between text-sm font-bold pb-3 border-b ${dm ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-100'}`}>
            <span className="flex items-center gap-2">
              <Filter className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} /> ตัวกรอง
            </span>
            {isFilterActive && (
              <button onClick={clearFilters}
                className={`text-xs px-2 py-1 rounded-sm border flex items-center gap-1 transition-colors ${dm ? 'text-red-400 hover:bg-red-900/30 border-red-900/50' : 'text-red-500 hover:bg-red-50 border-red-100'}`}>
                ล้าง <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="relative group">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${dm ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-[#00509E]'}`} />
            <input type="text" placeholder="ค้นหา..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-2 border rounded-sm outline-none focus:ring-1 text-sm font-medium transition-all ${dm ? 'bg-slate-900 border-slate-700 focus:border-blue-500 text-slate-200' : 'bg-slate-50 border-slate-300 focus:border-[#00509E] text-slate-800 focus:bg-white'}`}
            />
          </div>

          <select value={advancedFilterDate} onChange={e => setAdvancedFilterDate(e.target.value)}
            className={selCls} style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.9em' }}>
            <option value="ALL">🗓️ ทุกวันที่</option>
            {availableDatesInPeriod.map(d => <option key={d} value={d}>วันที่ {d}</option>)}
          </select>

          {/* ─────────────────────────────────────────────────────────────
              ตรงนี้คือส่วนที่แก้ไข: เพิ่มกลุ่ม Cashflow จาก Settings เข้ามา
          ───────────────────────────────────────────────────────────── */}
          <select value={advancedFilterGroup} onChange={e => setAdvancedFilterGroup(e.target.value)}
            className={selCls} style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.9em' }}>
            <option value="ALL">📦 ทุกกลุ่ม (All)</option>
            <option value="INCOME">🟢 รายรับทั้งหมด</option>
            <option value="EXPENSE">🔴 รายจ่ายทั้งหมด</option>
            <option value="FIXED">🔒 ภาระคงที่ (Fixed)</option>
            <option value="VARIABLE">💸 ผันแปร (Variable)</option>
            
            {/* โชว์แยกย่อยตามคอลัมน์ Cashflow */}
            {cashflowGroups && cashflowGroups.length > 0 && (
              <optgroup label="แยกตามกลุ่ม Cashflow">
                {cashflowGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.type === 'income' ? '🟢' : '🔴'} {g.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <select value={advancedFilterCategory} onChange={e => setAdvancedFilterCategory(e.target.value)}
            className={selCls} style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.9em' }}>
            <option value="ALL">🏷️ ทุกหมวดหมู่</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>

      </div>

      {/* MAIN TABLE AREA */}
      <div className={`flex-1 min-w-0 w-full flex flex-col border shadow-sm rounded-sm overflow-hidden transition-colors ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
        style={{ minHeight: 0 }}>

        <div className={`px-5 py-3.5 flex flex-row justify-between items-center gap-2 border-b shrink-0 ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <h2 className={`text-base font-black leading-tight ${dm ? 'text-slate-200' : 'text-slate-800'}`}>บัญชีแยกประเภท</h2>
            <p className={`text-xs font-medium mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{getFilterLabel(filterPeriod)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenAddModal('', 'expense')}
              className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-sm border shadow-sm transition-colors active:scale-95 ${dm ? 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-800/50' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'}`}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายการ
            </button>
            {displayTransactions.length > 0 && (
              <button onClick={() => { if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในเดือนนี้?')) handleDeleteMonth(filterPeriod); }}
                className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-sm border shadow-sm transition-colors active:scale-95 shrink-0 ${dm ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'}`}>
                <Trash2 className="w-3.5 h-3.5" /> ลบข้อมูลเดือนนี้
              </button>
            )}
          </div>
        </div>

        {displayTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-24 px-4 flex-grow">
            <Inbox className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-base font-medium">ไม่พบรายการบัญชี</p>
            {isFilterActive && (
              <button onClick={clearFilters}
                className={`mt-3 px-4 py-1.5 rounded-sm text-xs font-bold border transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}>
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-grow min-h-0 relative">
            <div className="overflow-auto flex-grow" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className={`sticky top-0 z-20 shadow-sm border-b-2 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                  <tr>
                    <SortHeader label="วันที่" sortKey="date" width="w-[130px]" />
                    <th className={`px-4 py-2.5 font-bold w-[84px] text-center ${dm ? 'text-slate-300' : 'text-slate-700'}`}>สถานะ</th>
                    <SortHeader label="หมวดหมู่" sortKey="category" width="w-[240px]" />
                    <th className={`px-4 py-2.5 font-bold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>รายละเอียด</th>
                    <SortHeader label="จำนวนเงิน" sortKey="amount" width="w-[130px]" align="right" />
                    <th className="px-2 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className={`divide-y ${dm ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                  {currentData.map((item, index, arr) => {
                    const isDateSorted = !sortConfig.key || sortConfig.key === 'date';
                    const isNewDate    = !isDateSorted || index === 0 || item.date !== arr[index - 1].date;
                    const catObj       = categories.find(c => c.name === item.category) || categories[categories.length - 1];
                    const isInc        = catObj?.type === 'income';

                    const isAlt = isDateSorted ? dateBands[item.id] === 1 : index % 2 === 1;
                    const rowBg = isAlt 
                      ? (dm ? 'bg-slate-800/40' : 'bg-slate-50/70') 
                      : 'bg-transparent';

                    return (
                      <tr key={item.id}
                        className={`group transition-colors duration-100 ${isNewDate ? (dm ? 'border-t-2 border-slate-700' : 'border-t-2 border-slate-200') : ''} ${rowBg} ${dm ? 'hover:bg-slate-700/60' : 'hover:bg-blue-50/50'}`}>

                        <td className="px-4 py-2 align-middle">
                          {isNewDate ? (
                            <div className={`flex items-center gap-1.5 font-bold px-2 py-1 rounded-sm w-fit border ${dm ? 'text-slate-200 bg-slate-800 border-slate-600' : 'text-slate-700 bg-white border-slate-300'}`}>
                              <span className="text-xs leading-none">{item.date}</span>
                              <div className={`flex items-center ml-1 border-l pl-1 gap-0.5 ${dm ? 'border-slate-600' : 'border-slate-200'}`}>
                                <button onClick={() => handleOpenAddModal(item.date, 'income')}
                                  className={`p-0.5 rounded-sm transition-colors ${dm ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-emerald-600 hover:bg-emerald-100'}`} title="เพิ่มรายรับ">
                                  <PlusCircle className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleOpenAddModal(item.date, 'expense')}
                                  className={`p-0.5 rounded-sm transition-colors ${dm ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-100'}`} title="เพิ่มรายจ่าย">
                                  <PlusCircle className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`text-center pr-8 text-sm font-black opacity-20 select-none ${dm ? 'text-slate-500' : 'text-slate-400'}`}>"</div>
                          )}
                        </td>

                        <td className="px-4 py-2 align-middle text-center">
                          <span className={`inline-flex items-center justify-center min-w-[60px] px-2 py-0.5 text-[13px] font-black rounded-sm ${isInc ? (dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dm ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}`}>
                            {isInc ? 'รายรับ' : 'รายจ่าย'}
                          </span>
                        </td>

                        <td className="px-4 py-2 align-middle">
                          <div className={`relative w-full flex items-center rounded-sm border transition-all duration-150 focus-within:ring-1 focus-within:ring-opacity-50`}
                            style={{
                              backgroundColor: `rgba(${hexToRgb(catObj?.color)}, ${dm ? 0.15 : 0.03})`,
                              borderColor:     `rgba(${hexToRgb(catObj?.color)}, ${dm ? 0.3 : 0.15})`,
                            }}>
                            <div className="absolute left-2.5 w-2 h-2 rounded-sm pointer-events-none border border-white/50" style={{ backgroundColor: catObj?.color || '#cbd5e1' }} />
                            <select value={item.category} onChange={e => handleUpdateTransaction(item.id, 'category', e.target.value)}
                              className="w-full bg-transparent outline-none appearance-none pl-6 pr-7 py-1.5 font-bold border-none text-xs cursor-pointer"
                              style={{
                                backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.85em',
                                color: catObj?.color || (dm ? '#e2e8f0' : '#475569'),
                                filter: dm ? 'brightness(1.2)' : 'none',
                              }}>
                              {categories.filter(c => c.type === catObj?.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                            </select>
                          </div>
                        </td>

                        <td className="px-4 py-2 group/input relative align-middle">
                          <Pencil className={`w-3 h-3 absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all pointer-events-none z-10 ${isInc ? (dm ? 'text-emerald-500' : 'text-emerald-400') : (dm ? 'text-blue-500' : 'text-blue-400')}`} />
                          <EditableInput
                            initialValue={item.description}
                            onSave={val => handleUpdateTransaction(item.id, 'description', val)}
                            className={`w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-sm py-1.5 px-2 pl-8 text-sm font-medium transition-all ${dm ? 'text-slate-200 hover:bg-slate-800/80 hover:border-slate-600 focus:border-blue-500' : 'text-slate-800 hover:bg-white hover:border-slate-300 hover:shadow-sm focus:border-[#00509E]'}`}
                            placeholder="รายละเอียด..."
                          />
                        </td>

                        <td className="px-4 py-2 group/input relative align-middle">
                          <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all pointer-events-none z-10 ${isInc ? (dm ? 'text-emerald-500' : 'text-emerald-400') : (dm ? 'text-red-500' : 'text-red-400')}`} />
                          <AmountEditableInput
                            initialValue={item.amount === 0 ? '' : item.amount}
                            onSave={val => handleUpdateTransaction(item.id, 'amount', val)}
                            className={`w-full bg-transparent border border-transparent rounded-sm py-1.5 px-2 text-right text-sm font-black outline-none pl-7 transition-all focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              dm
                                ? 'hover:bg-slate-800/80 hover:border-slate-600 ' + (isInc ? 'text-emerald-400 focus:border-emerald-500' : 'text-slate-200 focus:border-red-500')
                                : 'hover:bg-white hover:border-slate-300 hover:shadow-sm ' + (isInc ? 'text-emerald-600 focus:border-emerald-500' : 'text-slate-900 focus:border-[#D81A21]')
                            }`}
                            placeholder="0"
                          />
                        </td>

                        <td className="px-2 py-2 text-center align-middle">
                          <InlineConfirmDelete onDelete={() => handleDeleteTransaction(item.id)} isDarkMode={dm} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot className={`sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t-2 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                  <tr>
                    <td colSpan="4" className={`px-4 py-2.5 text-right text-xs font-bold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      รวมหน้านี้ {currentData.length} รายการ:
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-0.5 leading-none">
                        {pageInc > 0 && <span className={`text-[11px] font-bold ${dm ? 'text-emerald-500' : 'text-emerald-600'}`}>+{formatMoney(pageInc)}</span>}
                        {pageExp > 0 && <span className={`text-[11px] font-bold ${dm ? 'text-red-500' : 'text-red-600'}`}>-{formatMoney(pageExp)}</span>}
                        <span className={`text-sm font-black mt-0.5 pt-0.5 border-t ${dm ? 'border-slate-700' : 'border-slate-300'} ${pageInc - pageExp >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-600')}`}>
                          {formatMoney(pageInc - pageExp)}
                        </span>
                      </div>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>

              </table>
            </div>

            <div className={`px-5 py-3 border-t shrink-0 flex items-center justify-between ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                แสดง {currentData.length} จากทั้งหมด {sortedTransactions.length} รายการ
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-600'}`}>
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className={`p-1.5 border rounded-sm disabled:opacity-40 transition-all active:scale-95 ${dm ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className={`p-1.5 border rounded-sm disabled:opacity-40 transition-all active:scale-95 ${dm ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}