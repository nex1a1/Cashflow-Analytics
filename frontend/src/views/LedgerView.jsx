// src/views/LedgerView.jsx
import { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Filter, Inbox, Pencil, PlusCircle, Search, Trash2, X,
  PieChart, Wallet, Coins
} from 'lucide-react';
import EditableInput from '../components/ui/EditableInput';
import { formatMoney } from '../utils/formatters';
import { hexToRgb } from '../utils/formatters';

export default function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  availableDatesInPeriod, isDarkMode
}) {
    const [currentPage, setCurrentPage] = useState(1);
    
    const pages = useMemo(() => {
        const result = [];
        let currentPageList = [];
        // เพิ่มรายการต่อหน้าสำหรับหน้าจอ PC ให้เห็นข้อมูลเยอะขึ้น
        const TARGET_PER_PAGE = 50; 
        
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

    useEffect(() => { setCurrentPage(1); }, [filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate]);
    useEffect(() => { if (pages.length > 0 && currentPage > pages.length) setCurrentPage(pages.length); }, [pages.length, currentPage]);

    const clearFilters = () => {
        setSearchQuery('');
        setAdvancedFilterCategory('ALL');
        setAdvancedFilterGroup('ALL');
        setAdvancedFilterDate('ALL');
    };

    const sumInc = useMemo(() => displayTransactions.filter(t => categories.find(c => c.name === t.category)?.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), [displayTransactions, categories]);
    const sumExp = useMemo(() => displayTransactions.filter(t => categories.find(c => c.name === t.category)?.type !== 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), [displayTransactions, categories]);
    const net = sumInc - sumExp;

    if (isReadOnlyView) {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                <div className={`flex flex-col items-center justify-center text-slate-500 py-32 rounded-sm border-2 border-dashed transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <CalendarDays className={`w-20 h-20 mb-6 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>โหมดภาพรวมกว้าง (อ่านอย่างเดียว)</p>
                    <p className={`text-base px-8 py-3 rounded-sm border text-center ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                        กรุณาเปลี่ยนจาก <strong>{getFilterLabel(filterPeriod)}</strong> เป็น <strong className={`font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>รายเดือน</strong>
                    </p>
                </div>
            </div>
        );
    }

    const totalPages = pages.length || 1;
    const currentData = pages[currentPage - 1] || [];
    const isFilterActive = searchQuery || advancedFilterDate !== 'ALL' || advancedFilterGroup !== 'ALL' || advancedFilterCategory !== 'ALL';

    return (
        <div className="flex flex-row gap-5 items-start h-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto w-full">
            
            {/* 1. SIDEBAR (ปรับขนาดความกว้าง ขอบเหลี่ยมขึ้น และฟอนต์ใหญ่ขึ้น) */}
            <div className="w-[340px] shrink-0 flex flex-col gap-5 sticky top-0">
                <div className={`rounded-sm border shadow-sm p-5 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 border-b pb-3 ${isDarkMode ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-100'}`}>
                        <PieChart className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}/> สรุปยอดตามตัวกรอง
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Coins className="w-4 h-4 text-emerald-500"/> รายรับ</span>
                            <span className={`text-lg font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatMoney(sumInc)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Wallet className="w-4 h-4 text-red-500"/> รายจ่าย</span>
                            <span className={`text-lg font-black ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{formatMoney(sumExp)}</span>
                        </div>
                        <div className={`pt-3 border-t mt-1 flex justify-between items-center ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <span className={`text-base font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>คงเหลือ</span>
                            <span className={`text-xl font-black ${net >= 0 ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-orange-400' : 'text-orange-600')}`}>{formatMoney(net)}</span>
                        </div>
                        <div className={`text-sm text-center font-medium py-2 mt-2 rounded-sm ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                            พบ {displayTransactions.length} รายการ
                        </div>
                    </div>
                </div>

                <div className={`rounded-sm border shadow-sm p-5 flex flex-col gap-4 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`flex items-center justify-between text-lg font-bold border-b pb-3 ${isDarkMode ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                            <Filter className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}/> ตัวกรอง
                        </div>
                        {isFilterActive && (
                            <button onClick={clearFilters} className={`text-sm px-2.5 py-1 rounded-sm transition-colors flex items-center gap-1.5 border ${isDarkMode ? 'text-red-400 hover:bg-red-900/30 border-red-900/50' : 'text-red-500 hover:bg-red-50 border-red-100'}`}>
                                ล้าง <X className="w-3.5 h-3.5"/>
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        <div className="relative group">
                            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-[#00509E]'}`}/>
                            <input 
                                type="text" placeholder="ค้นหา..." 
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2 border rounded-sm outline-none focus:ring-1 text-base font-medium transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-blue-500 focus:ring-blue-500 text-slate-200' : 'bg-slate-50 border-slate-300 focus:border-[#00509E] focus:ring-[#00509E] text-slate-800 focus:bg-white'}`}
                            />
                        </div>

                        <select value={advancedFilterDate} onChange={(e) => setAdvancedFilterDate(e.target.value)} className={`w-full border rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1em' }}>
                            <option value="ALL">🗓️ ทุกวันที่</option>
                            {availableDatesInPeriod.map(d => <option key={d} value={d}>วันที่ {d}</option>)}
                        </select>

                        <select value={advancedFilterGroup} onChange={(e) => setAdvancedFilterGroup(e.target.value)} className={`w-full border rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1em' }}>
                            <option value="ALL">📦 ทุกกลุ่มเงินสด</option>
                            <option value="INCOME">🟢 รายรับทั้งหมด</option>
                            <option value="EXPENSE">🔴 รายจ่ายทั้งหมด</option>
                            <option value="FIXED">🔒 ภาระคงที่</option>
                            <option value="VARIABLE">💸 ผันแปร</option>
                        </select>

                        <select value={advancedFilterCategory} onChange={(e) => setAdvancedFilterCategory(e.target.value)} className={`w-full border rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 font-medium transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-[#00509E] focus:bg-white'}`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1em' }}>
                            <option value="ALL">🏷️ ทุกหมวดหมู่</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. MAIN TABLE AREA */}
            <div className={`flex-1 w-full min-w-0 flex flex-col border shadow-sm rounded-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                
                <div className={`px-5 py-4 flex flex-row justify-between items-center gap-2 border-b ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                        <h2 className={`text-lg font-black leading-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>บัญชีแยกประเภท</h2>
                        <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{getFilterLabel(filterPeriod)}</p>
                    </div>
                    {displayTransactions.length > 0 && (
                        <button onClick={() => handleDeleteMonth(filterPeriod)} className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors border shadow-sm shrink-0 ${isDarkMode ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'}`}>
                            <Trash2 className="w-4 h-4" /> ลบข้อมูลเดือนนี้
                        </button>
                    )}
                </div>

                {displayTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-24 px-4 flex-grow">
                        <Inbox className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">ไม่พบรายการบัญชี</p>
                        {isFilterActive && (
                            <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-sm font-bold transition-colors">
                                ล้างตัวกรอง
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="overflow-auto custom-scrollbar flex-grow" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                            <table className="w-full text-left text-base whitespace-nowrap min-w-[800px]">
                                <thead className={`sticky top-0 z-10 shadow-sm border-b ${isDarkMode ? 'bg-slate-800/95 border-slate-700' : 'bg-slate-100/95 border-slate-300'}`}>
                                    <tr>
                                        <th className={`px-4 py-3 font-bold w-[120px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>วันที่</th>
                                        <th className={`px-4 py-3 font-bold w-[90px] text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>สถานะ</th>
                                        <th className={`px-4 py-3 font-bold w-[280px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>หมวดหมู่</th>
                                        <th className={`px-4 py-3 font-bold flex-1 min-w-[200px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>รายละเอียด</th>
                                        <th className={`px-4 py-3 font-bold text-right w-[140px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>จำนวนเงิน</th>
                                        <th className={`px-2 py-3 font-bold w-12 text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                                    {currentData.map((item, index, arr) => {
                                       const isNewDate = index === 0 || item.date !== arr[index-1].date;
                                       const currentCatObj = (categories.find(c => c.name === item.category) || categories[categories.length-1]);
                                       const isInc = currentCatObj.type === 'income';
                                       
                                       return (
                                        <tr key={item.id} className={`group transition-colors duration-100 ${isNewDate ? (isDarkMode ? 'border-t-2 border-slate-700' : 'border-t-2 border-slate-200') : ''} ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/40'}`}>
                                          <td className="px-4 py-2 align-middle">
                                            {isNewDate ? (
                                              <div className={`flex items-center gap-2 font-bold px-2 py-1 rounded-sm shadow-sm w-fit transition-colors border ${isDarkMode ? 'text-slate-200 bg-slate-800 border-slate-600' : 'text-slate-700 bg-white border-slate-300'}`}>
                                                  <span className="text-sm leading-none">{item.date}</span>
                                                  <div className={`flex items-center ml-1 border-l pl-1 ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                                                      <button onClick={() => handleOpenAddModal(item.date, 'income')} className={`p-1 rounded-sm transition-transform hover:scale-110 ${isDarkMode ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-emerald-600 hover:bg-emerald-100'}`} title="เพิ่มรายรับ"><PlusCircle className="w-3.5 h-3.5" /></button>
                                                      <button onClick={() => handleOpenAddModal(item.date, 'expense')} className={`p-1 rounded-sm transition-transform hover:scale-110 ${isDarkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-100'}`} title="เพิ่มรายจ่าย"><PlusCircle className="w-3.5 h-3.5" /></button>
                                                  </div>
                                              </div>
                                            ) : <div className={`w-full text-center pr-10 text-sm font-black opacity-30 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>"</div>}
                                          </td>
                                          
                                          <td className="px-4 py-2 align-middle text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[70px] px-2 py-1 text-xs font-black rounded-sm transition-colors ${
                                                isInc ? (isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                                            }`}>
                                                {isInc ? 'รายรับ' : 'รายจ่าย'}
                                            </span>
                                          </td>
                                          
                                          <td className="px-4 py-2 relative align-middle">
                                            <div 
                                                className={`relative w-full flex items-center rounded-sm border transition-all duration-150 focus-within:ring-1 focus-within:ring-opacity-50 group-hover:shadow-sm`} 
                                                style={{ 
                                                    backgroundColor: `rgba(${hexToRgb(currentCatObj?.color)}, ${isDarkMode ? 0.15 : 0.03})`, 
                                                    borderColor: `rgba(${hexToRgb(currentCatObj?.color)}, ${isDarkMode ? 0.3 : 0.15})`
                                                }}
                                            >
                                                <div className="absolute left-2.5 w-2 h-2 rounded-full pointer-events-none shadow-sm border border-white/50 transition-colors" style={{ backgroundColor: currentCatObj?.color || '#cbd5e1' }}></div>
                                                <select 
                                                  value={item.category}
                                                  onChange={(e) => handleUpdateTransaction(item.id, 'category', e.target.value)}
                                                  className={`w-full bg-transparent outline-none appearance-none pl-6 pr-8 py-1.5 font-bold border-none transition-colors cursor-pointer text-sm`}
                                                  style={{
                                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.9em',
                                                    color: currentCatObj?.color || (isDarkMode ? '#e2e8f0' : '#475569'),
                                                    filter: isDarkMode ? 'brightness(1.2)' : 'none'
                                                  }}
                                                >
                                                    {categories.filter(c => c.type === currentCatObj.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                                                </select>
                                            </div>
                                          </td>

                                          <td className="px-4 py-2 group/input relative align-middle">
                                            <Pencil className={`w-3.5 h-3.5 absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all duration-200 pointer-events-none z-10 ${isInc ? (isDarkMode ? 'text-emerald-500' : 'text-emerald-400') : (isDarkMode ? 'text-blue-500' : 'text-blue-400')}`} />
                                            <EditableInput 
                                                initialValue={item.description}
                                                onSave={(val) => handleUpdateTransaction(item.id, 'description', val)}
                                                className={`w-full bg-transparent border border-transparent outline-none focus:ring-1 focus:bg-white dark:focus:bg-slate-800 rounded-sm py-1.5 px-2 pl-8 text-base font-medium transition-all duration-150 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800/80 hover:border-slate-600 focus:border-blue-500' : 'text-slate-800 hover:bg-white hover:border-slate-300 hover:shadow-sm focus:border-[#00509E]'}`}
                                                placeholder="รายละเอียด..."
                                            />
                                          </td>

                                          <td className="px-4 py-2 group/input relative align-middle">
                                            <Pencil className={`w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-all duration-200 pointer-events-none z-10 ${isInc ? (isDarkMode ? 'text-emerald-500' : 'text-emerald-400') : (isDarkMode ? 'text-red-500' : 'text-red-400')}`} />
                                            <EditableInput 
                                                type="number"
                                                initialValue={item.amount === 0 ? '' : item.amount}
                                                onSave={(val) => handleUpdateTransaction(item.id, 'amount', val)}
                                                className={`w-full bg-transparent border border-transparent rounded-sm py-1.5 px-2 text-right text-base font-black outline-none pl-8 transition-all duration-150 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                    isDarkMode 
                                                    ? 'hover:bg-slate-800/80 hover:border-slate-600 ' + (isInc ? 'text-emerald-400 focus:border-emerald-500' : 'text-slate-200 focus:border-red-500') 
                                                    : 'hover:bg-white hover:border-slate-300 hover:shadow-sm ' + (isInc ? 'text-emerald-600 focus:border-emerald-500' : 'text-slate-900 focus:border-[#D81A21]')
                                                }`}
                                                placeholder="0"
                                            />
                                          </td>
                                          <td className="px-2 py-2 text-center align-middle">
                                            <button onClick={() => handleDeleteTransaction(item.id)} className={`p-1.5 rounded-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} title="ลบ">
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </td>
                                        </tr>
                                       );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className={`px-5 py-3 border-t shrink-0 flex items-center justify-between transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            {totalPages > 1 ? (
                                <div className="flex items-center gap-3 ml-auto w-full justify-end">
                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                        หน้า {currentPage} จาก {totalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                            disabled={currentPage === 1} 
                                            className={`p-1.5 border rounded-sm disabled:opacity-40 transition-all active:scale-95 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                            disabled={currentPage === totalPages} 
                                            className={`p-1.5 border rounded-sm disabled:opacity-40 transition-all active:scale-95 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`text-sm font-bold text-center w-full ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    แสดงข้อมูลหน้าเดียวจบ
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};