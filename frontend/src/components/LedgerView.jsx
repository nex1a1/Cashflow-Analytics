// src/components/LedgerView.jsx
import { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Filter, Inbox, Pencil, PlusCircle, Search, Trash2, X,
} from 'lucide-react';
import EditableInput from './ui/EditableInput';
import { formatMoney } from '../utils/formatters';
import { hexToRgb } from '../utils/formatters';

export default function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  availableDatesInPeriod, isDarkMode,paymentMethods = [],
  advancedFilterWallet, setAdvancedFilterWallet
}) {
    const [currentPage, setCurrentPage] = useState(1);
    
    const pages = useMemo(() => {
        const result = [];
        let currentPageList = [];
        const TARGET_PER_PAGE = 40; 
        
        const dateGroups = [];
        let currentGroup = [];
        let currentGroupDate = null;
        
        displayTransactions.forEach(t => {
            if (t.date !== currentGroupDate) {
                if (currentGroup.length > 0) dateGroups.push(currentGroup);
                currentGroup = [t];
                currentGroupDate = t.date;
            } else {
                currentGroup.push(t);
            }
        });
        if (currentGroup.length > 0) dateGroups.push(currentGroup);
        
        dateGroups.forEach(group => {
            if (currentPageList.length + group.length > TARGET_PER_PAGE && currentPageList.length > 0) {
                result.push(currentPageList);
                currentPageList = [...group];
            } else {
                currentPageList.push(...group);
            }
        });
        if (currentPageList.length > 0) result.push(currentPageList);
        
        return result;
    }, [displayTransactions]);

    useEffect(() => { 
        setCurrentPage(1); 
    }, [filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate, advancedFilterWallet]);

    useEffect(() => {
        if (pages.length > 0 && currentPage > pages.length) {
            setCurrentPage(pages.length);
        }
    }, [pages.length, currentPage]);

    const clearFilters = () => {
        setSearchQuery('');
        setAdvancedFilterCategory('ALL');
        setAdvancedFilterGroup('ALL');
        setAdvancedFilterDate('ALL');
        setAdvancedFilterWallet('ALL');
    };

    if (isReadOnlyView) {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className={`flex flex-col items-center justify-center text-slate-500 py-32 bg-white rounded-2xl border-2 border-dashed border-slate-200 h-[65vh] transition-colors ${isDarkMode ? 'dark:bg-slate-800 dark:border-slate-700' : ''}`}>
                    <CalendarDays className={`w-20 h-20 mb-6 text-slate-300 ${isDarkMode ? 'dark:text-slate-600' : ''}`} />
                    <p className={`text-2xl font-bold text-slate-700 mb-2 ${isDarkMode ? 'dark:text-slate-200' : ''}`}>โหมดภาพรวมกว้าง (อ่านอย่างเดียว)</p>
                    <p className={`text-base text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-center ${isDarkMode ? 'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400' : ''}`}>
                        เพื่อความรวดเร็วและป้องกันเครื่องกระตุก (Lag) <br/>
                        กรุณาเปลี่ยนจาก <strong>{getFilterLabel(filterPeriod)}</strong> เป็น <strong className={`font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>รายเดือน</strong> จากตัวกรองด้านบนครับ
                    </p>
                </div>
            </div>
        );
    }

    const totalPages = pages.length || 1;
    const currentData = pages[currentPage - 1] || [];
    const isFilterActive = searchQuery || advancedFilterDate !== 'ALL' || advancedFilterGroup !== 'ALL' || advancedFilterCategory !== 'ALL' || advancedFilterWallet !== 'ALL';

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex justify-between items-center mb-3 gap-3">
                <div className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all border shrink-0 ${isDarkMode ? 'bg-blue-900/20 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-[#00509E]'}`}>
                    แสดงผลเฉพาะ: {getFilterLabel(filterPeriod)} ({displayTransactions.length} รายการ)
                </div>
                {/* ปุ่มลบข้อมูลเดือนนี้ — ย้ายมาฝั่งขวา เพื่อลดความเสี่ยงกดพลาด */}
                {displayTransactions.length > 0 && (
                    <button onClick={() => handleDeleteMonth(filterPeriod)} className={`ml-auto text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors border shadow-sm shrink-0 ${isDarkMode ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'}`}>
                        <Trash2 className="w-4 h-4" /> ลบข้อมูลเดือนนี้
                    </button>
                )}
            </div>

            <div className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 mb-4 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`flex items-center gap-2 text-sm font-bold mb-1 border-b pb-2 ${isDarkMode ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-slate-100'}`}>
                    <Filter className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}/> ตัวกรองข้อมูลขั้นสูง (กรองได้หลายเงื่อนไขพร้อมกัน)
                    {isFilterActive && (
                        <button onClick={clearFilters} className={`ml-auto text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 border ${isDarkMode ? 'text-red-400 hover:bg-red-900/30 border-red-900/50' : 'text-red-500 hover:bg-red-50 border-red-100'}`}>
                            <X className="w-3 h-3"/> ล้างตัวกรองทั้งหมด
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="relative group">
                        <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-[#00509E]'}`}/>
                        <input 
                            type="text" placeholder="ค้นหาชื่อ, รายละเอียด, จำนวนเงิน..." 
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-1 text-sm transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-blue-500 focus:ring-blue-500 text-slate-200' : 'bg-slate-50 border-slate-300 focus:border-[#00509E] focus:ring-[#00509E] text-slate-800 focus:bg-white'}`}
                        />
                    </div>
                    <select value={advancedFilterDate} onChange={(e) => setAdvancedFilterDate(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500 focus:ring-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:ring-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">🗓️ ทุกวันที่</option>
                        {availableDatesInPeriod.map(d => <option key={d} value={d}>เฉพาะวันที่ {d}</option>)}
                    </select>
                    
                    {/* 🌟 ช่องตัวกรองกระเป๋าเงิน ย้ายมาอยู่ตรงกลาง */}
                    <select value={advancedFilterWallet || 'ALL'} onChange={(e) => setAdvancedFilterWallet(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500 focus:ring-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:ring-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">👛 ทุกกระเป๋าเงิน</option>
                        {paymentMethods?.map(pm => (
                            <option key={pm.id} value={pm.id}>
                                {pm.type === 'credit' ? '💳' : (pm.type === 'cash' ? '💵' : '🏦')} {pm.name}
                            </option>
                        ))}
                    </select>

                    <select value={advancedFilterGroup} onChange={(e) => setAdvancedFilterGroup(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500 focus:ring-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:ring-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">📦 ทุกกลุ่ม (กระแสเงินสด)</option>
                        <option value="INCOME">🟢 รายรับทั้งหมด</option>
                        <option value="EXPENSE">🔴 รายจ่ายทั้งหมด</option>
                        <option value="FIXED">🔒 เฉพาะ ภาระคงที่ (Fixed)</option>
                        <option value="VARIABLE">💸 เฉพาะ ผันแปร (Variable)</option>
                        <option value="FOOD">🍜 เฉพาะ ค่ากิน (Food)</option>
                        <option value="RENT">🏢 เฉพาะ ค่าหอ/ที่พัก (Rent)</option>
                        <option value="SUBS">💳 เฉพาะ รายเดือน/หนี้ (Subs/Debt)</option>
                        <option value="IT">💻 เฉพาะ ไอที/คอมฯ (IT)</option>
                        <option value="INVEST">📈 เฉพาะ ลงทุน/ออม (Invest)</option>
                    </select>
                    <select value={advancedFilterCategory} onChange={(e) => setAdvancedFilterCategory(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500 focus:ring-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:ring-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}>
                        <option value="ALL">🏷️ ทุกหมวดหมู่ย่อย</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                </div>
            </div>

            <div className={`w-full flex-grow overflow-hidden border shadow-sm rounded-xl flex flex-col transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ height: 'calc(100vh - 450px)' }}>
              {displayTransactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 animate-in fade-in duration-500">
                    <Inbox className="w-16 h-16 mb-4 opacity-50" />
                    <p>ไม่พบรายการบัญชี หรือไม่พบข้อมูลตามตัวกรองที่เลือก</p>
                    {isFilterActive && (
                        <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-colors">
                            ล้างตัวกรองทั้งหมด
                        </button>
                    )}
                </div>
              ) : (
                <>
                    <div className="overflow-auto flex-grow custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
                            <thead className={`sticky top-0 z-10 shadow-sm border-b ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                                <tr>
                                    <th className={`px-4 py-2.5 font-bold min-w-[130px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>วันที่</th>
                                    <th className={`px-2 py-2.5 font-bold min-w-[90px] text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ประเภท</th>
                                    <th className={`px-4 py-2.5 font-bold min-w-[290px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>หมวดหมู่</th>
                                    <th className={`px-4 py-2.5 font-bold min-w-[160px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>กระเป๋าเงิน</th>
                                    <th className={`px-4 py-2.5 font-bold w-full min-w-[250px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>รายละเอียด / หมายเหตุ</th>
                                    <th className={`px-4 py-2.5 font-bold text-right min-w-[150px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>จำนวนเงิน (฿)</th>
                                    <th className={`px-2 py-2.5 font-bold w-12 text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ลบ</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                {currentData.map((item, index, arr) => {
                                   const isNewDate = index === 0 || item.date !== arr[index-1].date;
                                   
                                   // 🌟 1. ดักจับรายการ "โอนเงิน"
                                   const isTransfer = item.category === 'โอนเงินเข้า' || item.category === 'โอนเงินออก';
                                   
                                   // 🌟 2. สร้างหมวดหมู่จำลองสีพิเศษ (Indigo) ให้การโอนเงิน เพื่อไม่ให้มันไปดึงหมวดหมู่อื่นมาแสดง
                                   const currentCatObj = isTransfer 
                                        ? { 
                                            name: item.category, 
                                            type: item.category === 'โอนเงินเข้า' ? 'income' : 'expense', 
                                            color: '#6366f1', // สีม่วง Indigo ดูเป็นกลาง ไม่ใช่รับ ไม่ใช่จ่าย
                                            icon: item.category === 'โอนเงินเข้า' ? '📥' : '📤' 
                                          }
                                        : (categories.find(c => c.name === item.category) || categories[categories.length-1]);
                                        
                                   const isInc = currentCatObj.type === 'income';
                                   
                                   // 🌟 3. ล็อคให้แสดงแค่หมวดหมู่เดียวถ้าเป็นการโอนเงิน
                                   const availableCatsForSelect = isTransfer ? [currentCatObj] : categories.filter(c => c.type === currentCatObj.type);
                                   const pmObj = paymentMethods?.find(p => p.id === item.paymentMethodId);
                                   
                                   return (
                                    <tr key={item.id} className={`group transition-colors duration-200 ${isNewDate ? (isDarkMode ? 'border-t-2 border-slate-700' : 'border-t-2 border-slate-200') : ''} ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                      <td className="px-4 py-1.5 align-middle">
                                        {isNewDate ? (
                                          <div className={`flex items-center gap-2 font-bold px-2 py-1 rounded border shadow-sm w-fit transition-colors ${isDarkMode ? 'text-slate-200 bg-slate-800 border-slate-700' : 'text-slate-800 bg-white border-slate-200'}`}>
                                              {item.date} 
                                              <div className={`flex items-center ml-1 border-l pl-2 ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                                                  <button onClick={() => handleOpenAddModal(item.date, 'income')} className={`p-1 rounded transition-transform hover:scale-110 ${isDarkMode ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-emerald-600 hover:bg-emerald-100'}`} title="เพิ่มรายรับในวันนี้"><PlusCircle className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => handleOpenAddModal(item.date, 'expense')} className={`p-1 rounded transition-transform hover:scale-110 ${isDarkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-100'}`} title="เพิ่มรายจ่ายในวันนี้"><PlusCircle className="w-3.5 h-3.5" /></button>
                                              </div>
                                          </div>
                                        ) : <span className={`pl-4 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>"</span>}
                                      </td>
                                      
                                      {/* 🌟 ปรับสีป้ายกำกับ โอนเข้า / โอนออก */}
                                      <td className="px-2 py-1.5 align-middle text-center">
                                        <span className={`inline-flex items-center justify-center w-[60px] text-[13px] font-black py-1 rounded transition-colors ${
                                            isTransfer 
                                            ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-700')
                                            : (isInc ? (isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))
                                        }`}>
                                            {isTransfer ? (item.category === 'โอนเงินเข้า' ? 'โอนเข้า' : 'โอนออก') : (isInc ? 'รายรับ' : 'รายจ่าย')}
                                        </span>
                                      </td>
                                      
                                      <td className="px-4 py-1.5 relative align-middle">
                                        <div 
                                            className={`relative w-full min-w-[200px] flex items-center rounded-lg border transition-colors shadow-sm focus-within:ring-2 focus-within:ring-opacity-50 ${isTransfer && !isDarkMode ? 'bg-indigo-50/50' : ''}`} 
                                            style={{ 
                                                backgroundColor: `rgba(${hexToRgb(currentCatObj?.color)}, ${isDarkMode ? 0.2 : 0.1})`, 
                                                borderColor: `rgba(${hexToRgb(currentCatObj?.color)}, ${isDarkMode ? 0.4 : 0.3})`
                                            }}
                                        >
                                            <div className="absolute left-3 w-3 h-3 rounded-full pointer-events-none shadow-sm border border-white/30 transition-colors" style={{ backgroundColor: currentCatObj?.color || '#cbd5e1' }}></div>
                                            <select 
                                              value={item.category}
                                              onChange={(e) => handleUpdateTransaction(item.id, 'category', e.target.value)}
                                              disabled={isTransfer} // 🌟 ล็อคไม่ให้คลิกเปลี่ยนหมวดหมู่
                                              className={`w-full bg-transparent outline-none appearance-none pl-9 pr-8 py-1.5 font-bold border-none transition-colors ${isTransfer ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                                              style={{
                                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em',
                                                color: currentCatObj?.color || (isDarkMode ? '#e2e8f0' : '#475569'),
                                                filter: isDarkMode ? 'brightness(1.2)' : 'none'
                                              }}
                                            >
                                                {availableCatsForSelect.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                                            </select>
                                        </div>
                                      </td>

                                      <td className="px-4 py-1.5 relative align-middle">
                                        <div 
                                            className={`relative w-full min-w-[140px] flex items-center rounded-lg border transition-colors shadow-sm focus-within:ring-2 focus-within:ring-opacity-50 ${!pmObj ? (isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50') : ''}`}
                                            style={pmObj ? { 
                                                backgroundColor: `rgba(${hexToRgb(pmObj.color || '#94a3b8')}, ${isDarkMode ? 0.2 : 0.1})`, 
                                                borderColor: `rgba(${hexToRgb(pmObj.color || '#94a3b8')}, ${isDarkMode ? 0.4 : 0.3})`
                                            } : {}}
                                        >
                                            {pmObj && <div className="absolute left-3 w-2.5 h-2.5 rounded-full pointer-events-none shadow-sm border border-white/30" style={{ backgroundColor: pmObj.color || '#cbd5e1' }}></div>}
                                            <select
                                                value={item.paymentMethodId || ''}
                                                onChange={(e) => handleUpdateTransaction(item.id, 'paymentMethodId', e.target.value)}
                                                className={`w-full bg-transparent outline-none appearance-none py-1.5 cursor-pointer font-bold border-none transition-colors text-xs text-left ${pmObj ? 'pl-8 pr-6' : 'pl-3 pr-6'}`}
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em',
                                                    color: pmObj?.color || (isDarkMode ? '#94a3b8' : '#64748B'),
                                                    filter: isDarkMode ? 'brightness(1.2)' : 'none'
                                                }}
                                            >
                                                <option value="" disabled>👛 ระบุกระเป๋า...</option>
                                                {paymentMethods?.map(pm => (
                                                    <option key={pm.id} value={pm.id}>
                                                        {pm.type === 'credit' ? '💳' : (pm.type === 'cash' ? '💵' : '🏦')} {pm.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                      </td>

                                      <td className="px-4 py-1.5 group/input relative align-middle">
                                        <Pencil className={`w-3.5 h-3.5 absolute left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all duration-300 pointer-events-none z-10 ${isTransfer ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : (isInc ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-blue-400' : 'text-[#00509E]'))}`} />
                                        <EditableInput 
                                            initialValue={item.description}
                                            onSave={(val) => handleUpdateTransaction(item.id, 'description', val)}
                                            className={`w-full min-w-[150px] bg-transparent border border-transparent outline-none focus:ring-1 rounded-lg py-1.5 px-3 pl-8 font-medium transition-all ${isDarkMode ? 'text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:border-blue-500 focus:ring-blue-500' : 'text-slate-800 hover:bg-slate-100 focus:bg-white ' + (isTransfer ? 'focus:border-indigo-500 focus:ring-indigo-500' : (isInc ? 'focus:border-emerald-500 focus:ring-emerald-500' : 'focus:border-[#00509E] focus:ring-[#00509E]'))}`}
                                            placeholder="ระบุรายละเอียด..."
                                        />
                                      </td>

                                      {/* 🌟 ปรับสีตัวเลขให้เป็นสีม่วง (Indigo) เฉพาะเวลาเป็นรายการโอน */}
                                      <td className="px-4 py-1.5 group/input relative align-middle">
                                        <Pencil className={`w-3.5 h-3.5 absolute left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all duration-300 pointer-events-none ${isTransfer ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : (isInc ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-[#D81A21]'))}`} />
                                        <EditableInput 
                                            type="number"
                                            initialValue={item.amount === 0 ? '' : item.amount}
                                            onSave={(val) => handleUpdateTransaction(item.id, 'amount', val)}
                                            className={`w-full min-w-[120px] bg-transparent border border-transparent rounded-lg py-1.5 px-3 text-right font-black outline-none pl-8 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                isDarkMode 
                                                ? 'hover:bg-slate-800 focus:bg-slate-800 focus:ring-1 ' + (isTransfer ? 'text-indigo-400 focus:border-indigo-500 focus:ring-indigo-500' : (isInc ? 'text-emerald-400 focus:border-emerald-500 focus:ring-emerald-500' : 'text-slate-200 focus:border-red-500 focus:ring-red-500')) 
                                                : 'hover:bg-slate-100 focus:bg-white focus:ring-1 ' + (isTransfer ? 'text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500' : (isInc ? 'text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500' : 'text-slate-900 focus:border-[#D81A21] focus:ring-[#D81A21]'))
                                            }`}
                                            placeholder="0"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 text-center align-middle">
                                        <button onClick={() => handleDeleteTransaction(item.id)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} title="ลบรายการนี้">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                   );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Summary Bar */}
                    {(() => {
                        const sumInc = displayTransactions.filter(t => {
                            const cat = categories.find(c => c.name === t.category);
                            return cat?.type === 'income';
                        }).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                        const sumExp = displayTransactions.filter(t => {
                            const cat = categories.find(c => c.name === t.category);
                            return cat?.type !== 'income';
                        }).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                        const net = sumInc - sumExp;
                        return (
                            <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 border-t shrink-0 text-sm transition-colors ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-5">
                                    <span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        ผลรวม <span className={`font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{displayTransactions.length}</span> รายการ
                                    </span>
                                    {sumInc > 0 && (
                                        <span className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            ▲ รายรับ {formatMoney(sumInc)} ฿
                                        </span>
                                    )}
                                    {sumExp > 0 && (
                                        <span className={`font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                            ▼ รายจ่าย {formatMoney(sumExp)} ฿
                                        </span>
                                    )}
                                    {(sumInc > 0 || sumExp > 0) && (
                                        <span className={`font-black border-l pl-5 ${isDarkMode ? 'border-slate-600' : 'border-slate-300'} ${net >= 0 ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                                            คงเหลือ {formatMoney(net)} ฿
                                        </span>
                                    )}
                                </div>
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-3 ml-auto">
                                        <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            หน้า {currentPage}/{totalPages}
                                        </span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-1.5 border rounded-lg disabled:opacity-40 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4"/></button>
                                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-1.5 border rounded-lg disabled:opacity-40 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </>
              )}
            </div>
        </div>
    );
};