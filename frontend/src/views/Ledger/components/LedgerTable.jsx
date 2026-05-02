import React from 'react';
import { Pencil, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import EditableInput from '../../../components/ui/EditableInput'; // เช็ค Path ด้วยนะครับว่าตรงมั้ย
import AmountEditableInput from './AmountEditableInput';
import InlineConfirmDelete from './InlineConfirmDelete';
import { hexToRgb } from '../../../utils/formatters';

const SELECT_ARROW = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

export default function LedgerTable({
  currentData, sortedTransactions, categories, dm, 
  sortConfig, handleSort, isDateSorted, dateBands,
  handleUpdateTransaction, handleDeleteTransaction, handleOpenAddModal,
  pageInc, pageExp, formatMoney,
  currentPage, totalPages, setCurrentPage
}) {
  const SortHeader = ({ label, sortKey, className = '', align = 'left' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th
        className={`px-4 py-3 font-bold cursor-pointer transition-all select-none group text-${align} ${className} ${
          dm ? `text-slate-400 hover:text-slate-200 ${isActive ? 'text-blue-400 bg-slate-700/40' : 'hover:bg-slate-700/30'}` : `text-slate-500 hover:text-slate-800 ${isActive ? 'text-[#00509E] bg-blue-50/60' : 'hover:bg-slate-100/80'}`
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

  return (
    <div className="flex flex-col w-full">
      <div className="overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
          <thead className={`sticky top-0 z-20 border-b ${dm ? 'bg-slate-800/95 border-slate-700 backdrop-blur-sm' : 'bg-slate-50/95 border-slate-200 backdrop-blur-sm'}`}>
            <tr>
              <SortHeader label="วันที่" sortKey="date" className="w-[145px]" />
              <th className={`px-4 py-3 font-bold w-[90px] text-center text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ประเภท</th>
              <SortHeader label="หมวดหมู่" sortKey="category" className="w-[270px]" />
              <th className={`px-4 py-3 font-bold text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายละเอียด</th>
              <SortHeader label="จำนวนเงิน" sortKey="amount" className="w-[140px]" align="right" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index, arr) => {
              const isNewDate  = !isDateSorted || index === 0 || item.date !== arr[index - 1].date;
              const catObj     = categories.find(c => c.name === item.category) || categories[categories.length - 1];
              const isInc      = catObj?.type === 'income';
              const isAlt      = isDateSorted ? dateBands[item.id] === 1 : index % 2 === 1;
              const rowBg      = isAlt ? (dm ? 'bg-slate-800/30' : 'bg-slate-50/60') : 'bg-transparent';

              return (
                <tr key={item.id} className={`group transition-colors duration-100 border-b ${dm ? 'border-slate-800/60 hover:bg-slate-700/40' : 'border-slate-100 hover:bg-blue-50/40'} ${rowBg}`}>
                  <td className="px-4 py-2.5 align-middle">
                    {isNewDate ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black tabular-nums ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{item.date}</span>
                        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button onClick={() => handleOpenAddModal(item.date, 'income')} className={`p-1 rounded transition-colors ${dm ? 'text-emerald-500 hover:bg-emerald-900/40' : 'text-emerald-600 hover:bg-emerald-100'}`} title="เพิ่มรายรับวันนี้">
                            <PlusCircle className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleOpenAddModal(item.date, 'expense')} className={`p-1 rounded transition-colors ${dm ? 'text-red-400 hover:bg-red-900/40' : 'text-red-500 hover:bg-red-100'}`} title="เพิ่มรายจ่ายวันนี้">
                            <PlusCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-xs select-none opacity-15 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>&quot;</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-middle text-center">
                    <span className={`inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 text-[11px] font-black rounded-sm ${isInc ? (dm ? 'bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-800/60' : 'bg-emerald-100 text-emerald-700') : (dm ? 'bg-red-900/30 text-red-400 ring-1 ring-red-900/50' : 'bg-red-100 text-red-700')}`}>
                      {isInc ? 'รายรับ' : 'รายจ่าย'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="relative w-full flex items-center rounded-sm border transition-all duration-150 focus-within:ring-1 focus-within:ring-opacity-40" style={{ backgroundColor: `rgba(${hexToRgb(catObj?.color)}, ${dm ? 0.12 : 0.04})`, borderColor: `rgba(${hexToRgb(catObj?.color)}, ${dm ? 0.3 : 0.2})` }}>
                      <div className="absolute left-2.5 w-2 h-2 rounded pointer-events-none" style={{ backgroundColor: catObj?.color || '#cbd5e1' }} />
                      <select value={item.category} onChange={e => handleUpdateTransaction(item.id, 'category', e.target.value)} className="w-full bg-transparent outline-none appearance-none pl-6 pr-7 py-1.5 font-bold border-none text-xs cursor-pointer" style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.8em', color: catObj?.color || (dm ? '#e2e8f0' : '#475569'), filter: dm ? 'brightness(1.3)' : 'none' }}>
                        {categories.filter(c => c.type === catObj?.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2 group/input relative align-middle">
                    <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                    <EditableInput initialValue={item.description} onSave={val => handleUpdateTransaction(item.id, 'description', val)} className={`w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-sm py-1.5 px-2 pl-7 text-sm font-medium transition-all ${dm ? 'text-slate-200 hover:bg-slate-800/80 hover:border-slate-600/80 focus:border-blue-500/70 focus:bg-slate-800/60' : 'text-slate-700 hover:bg-white hover:border-slate-200 hover:shadow-sm focus:border-[#00509E]/50 focus:bg-white'}`} placeholder="รายละเอียด..." />
                  </td>
                  <td className="px-3 py-2 group/input relative align-middle">
                    <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                    <AmountEditableInput initialValue={item.amount === 0 ? '' : item.amount} onSave={val => handleUpdateTransaction(item.id, 'amount', val)} className={`w-full bg-transparent border border-transparent rounded-sm py-1.5 px-2 text-right text-sm font-black outline-none pl-7 transition-all focus:ring-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${dm ? 'hover:bg-slate-800/80 hover:border-slate-600/80 ' + (isInc ? 'text-emerald-400 focus:border-emerald-600/70' : 'text-slate-200 focus:border-red-600/70') : 'hover:bg-white hover:border-slate-200 hover:shadow-sm ' + (isInc ? 'text-emerald-600 focus:border-emerald-400' : 'text-slate-800 focus:border-red-400')}`} placeholder="0" />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <InlineConfirmDelete onDelete={() => handleDeleteTransaction(item.id)} isDarkMode={dm} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className={`sticky bottom-0 z-20 border-t-2 ${dm ? 'bg-slate-800/95 border-slate-700 backdrop-blur-sm' : 'bg-slate-50/95 border-slate-200 backdrop-blur-sm'}`}>
            <tr>
              <td colSpan="3" className={`px-4 py-3 text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                รวม {currentData.length} รายการในหน้านี้
              </td>
              <td className="px-4 py-3" />
              <td className="px-3 py-3 text-right">
                <div className="flex flex-col items-end gap-0.5 leading-none">
                  {pageInc > 0 && <span className={`text-[11px] font-bold tabular-nums ${dm ? 'text-emerald-500' : 'text-emerald-600'}`}>+{formatMoney(pageInc)}</span>}
                  {pageExp > 0 && <span className={`text-[11px] font-bold tabular-nums ${dm ? 'text-red-400' : 'text-red-600'}`}>-{formatMoney(pageExp)}</span>}
                  <span className={`text-sm font-black mt-1 pt-1 border-t tabular-nums ${dm ? 'border-slate-700' : 'border-slate-300'} ${pageInc - pageExp >= 0 ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-orange-400' : 'text-orange-600')}`}>
                    {formatMoney(pageInc - pageExp)}
                  </span>
                </div>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${dm ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-100'}`}>
        <span className={`text-xs font-semibold ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
          แสดง <span className={`font-black ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{currentData.length}</span> จากทั้งหมด <span className={`font-black ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{sortedTransactions.length}</span> รายการ
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${dm ? 'text-slate-500' : 'text-slate-500'}`}>
              หน้า {currentPage} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 text-xs font-bold ${dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>«</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 ${dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`min-w-[30px] h-[30px] px-1 border rounded-sm text-xs font-bold transition-all active:scale-95 ${page === currentPage ? (dm ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#00509E] border-[#00509E] text-white') : (dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 ${dm ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}><ChevronRight className="w-3.5 h-3.5" /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={`p-1.5 border rounded-sm disabled:opacity-30 transition-all active:scale-95 text-xs font-bold ${dm ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}