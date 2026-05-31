import React from 'react';
import { Pencil, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import EditableInput from '../../../../components/ui/EditableInput';
import AmountEditableInput from './AmountEditableInput';
import InlineConfirmDelete from './InlineConfirmDelete';
import { hexToRgb } from '../../../../utils/formatters';

const SELECT_ARROW = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

const getCategoryPillStyles = (hexColor, dm) => {
  const defaultRgb = '148, 163, 184';
  const rgb = hexToRgb(hexColor) || defaultRgb;
  
  // Parse HSL to adjust lightness beautifully for text readability
  let hex = hexColor || '#94a3b8';
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let r = 148, g = 163, b = 184;
  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  let rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  let max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  
  let textColor;
  let bgOpacity = dm ? 0.15 : 0.12;
  let borderOpacity = dm ? 0.35 : 0.25;
  
  if (dm) {
    // Dark mode: Boost lightness to at least 65% for excellent visibility
    const targetL = Math.max(l * 100, 65);
    const targetS = Math.max(s, 60);
    textColor = `hsl(${h}, ${targetS}%, ${targetL}%)`;
  } else {
    // Light mode: Clamp lightness to max 35% so it's readable
    const targetL = Math.min(l * 100, 35);
    const targetS = Math.max(s, 70);
    textColor = `hsl(${h}, ${targetS}%, ${targetL}%)`;
  }
  
  return {
    backgroundColor: `rgba(${rgb}, ${bgOpacity})`,
    borderColor: `rgba(${rgb}, ${borderOpacity})`,
    textColor,
    iconBgColor: `rgba(${rgb}, 0.25)`
  };
};

export default function LedgerTable({
  currentData, sortedTransactions, categories, 
  sortConfig, handleSort, isDateSorted, dateBands,
  handleUpdateTransaction, handleDeleteTransaction, handleOpenAddModal,
  pageInc, pageExp, formatMoney,
  currentPage, totalPages, setCurrentPage
}) {
  const dm = true;
  const SortHeader = ({ label, sortKey, className = '', align = 'left' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th
        className={`px-4 py-3 font-bold cursor-pointer transition-all select-none group text-${align} ${className} ${
          `text-slate-400 hover:text-slate-200 ${isActive ? 'text-[#da291c] bg-[#121212]/60' : 'hover:bg-[#303030]/30'}`
        }`}
        onClick={() => handleSort(sortKey)}
        title={`เรียงตาม${label}`}
      >
        <div className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wide ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          {label}
          <span className={`flex flex-col text-[8px] leading-[0.55] transition-opacity ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}>
            <span className={isActive && sortConfig.direction === 'asc' ? ('text-[#da291c]') : ''}>▲</span>
            <span className={isActive && sortConfig.direction === 'desc' ? ('text-[#da291c]') : ''}>▼</span>
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="flex flex-col w-full">
      <div className="overflow-auto no-scrollbar" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
          <thead className="sticky top-0 z-20 border-b bg-[#121212]/90 border-[#303030]/60 backdrop-blur-sm">
            <tr>
              <SortHeader label="วันที่" sortKey="date" className="w-[145px]" />
              <th className="px-4 py-3 font-bold w-[90px] text-center text-xs uppercase tracking-wide text-slate-400">ประเภท</th>
              <SortHeader label="หมวดหมู่" sortKey="category" className="w-[230px]" />
              <th className="px-4 py-3 font-bold w-[100px] text-center text-xs uppercase tracking-wide text-slate-400">ALLOCATION</th>
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wide text-slate-400">รายละเอียด</th>
              <SortHeader label="จำนวนเงิน" sortKey="amount" className="w-[140px]" align="right" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index, arr) => {
              const isNewDate  = !isDateSorted || index === 0 || item.date !== arr[index - 1].date;
              const catObj     = categories.find(c => c.id === item.category_id) || categories.find(c => c.name === item.category) || categories[categories.length - 1];
              const pillStyles = getCategoryPillStyles(catObj?.color, dm);
              const isInc      = catObj?.type === 'income';
              const isAlt      = isDateSorted ? dateBands[item.id] === 1 : index % 2 === 1;
              const rowBg      = isAlt ? ('bg-[#121212]/20') : 'bg-transparent';
              
              const aType = item.allocation_type || (isInc ? 'savings' : 'want');
              const aColors = {
                need: 'text-rose-400 border-rose-800/50 bg-rose-950/40 hover:bg-rose-900/30 hover:border-rose-700/60 focus:ring-1 focus:ring-rose-500/30',
                want: 'text-sky-400 border-sky-800/50 bg-sky-950/40 hover:bg-sky-900/30 hover:border-sky-700/60 focus:ring-1 focus:ring-sky-500/30',
                savings: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/40 hover:bg-emerald-900/30 hover:border-emerald-700/60 focus:ring-1 focus:ring-emerald-500/30'
              };

              return (
                <tr key={item.id} className={`group transition-colors duration-100 border-b border-[#303030]/40 hover:bg-[#303030]/10 ${rowBg}`}>
                  <td className="px-4 py-2.5 align-middle">
                    {isNewDate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tabular-nums text-slate-350">{item.date}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenAddModal(item.date, 'income')} className="p-1 rounded transition-colors text-emerald-550 hover:bg-emerald-900/40" title="เพิ่มรายรับวันนี้">
                            <PlusCircle className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleOpenAddModal(item.date, 'expense')} className="p-1 rounded transition-colors text-red-500 hover:bg-red-900/40" title="เพิ่มรายจ่ายวันนี้">
                            <PlusCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs select-none opacity-15 text-slate-500">&quot;</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-middle text-center">
                    <span className={`inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 text-[11px] font-black rounded-none ${isInc ? ('bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-800/60') : ('bg-red-900/30 text-red-400 ring-1 ring-red-900/50')}`}>
                      {isInc ? 'รายรับ' : 'รายจ่าย'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="relative w-full flex items-center rounded-none border transition-all duration-150 focus-within:ring-1 focus-within:ring-opacity-40" style={{ backgroundColor: pillStyles.backgroundColor, borderColor: pillStyles.borderColor }}>
                      {/* Visual Custom Overlay */}
                      <div 
                        className="category-pill-text w-full flex items-center pl-1.5 pr-7 py-1 text-xs font-extrabold select-none pointer-events-none transition-all" 
                        style={{ '--pill-text-color': pillStyles.textColor }}
                      >
                        <span className="shrink-0 mr-1.5 text-xs">
                          {catObj?.icon}
                        </span>
                        <span className="truncate">{catObj?.name}</span>
                        
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-85">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </div>

                      {/* Invisible select overlay for native interaction */}
                      <select 
                        value={item.category_id || ''} 
                        onChange={e => handleUpdateTransaction(item.id, 'category_id', e.target.value)} 
                        className="category-select absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      >
                        {categories.filter(c => c.type === catObj?.type).map(c => (
                          <option 
                            key={c.id} 
                            value={c.id}
                            className="bg-[#121212] text-slate-200"
                          >
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle text-center">
                    {!isInc ? (
                      <select 
                        value={aType} 
                        onChange={e => handleUpdateTransaction(item.id, 'allocation_type', e.target.value)}
                        className={`allocation-select w-full bg-transparent outline-none appearance-none px-2 py-1 font-black border rounded-none text-[10px] text-center transition-all cursor-pointer ${aColors[aType]}`}
                        style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem center', backgroundSize: '0.6em' }}
                      >
                        <option value="need" className="bg-[#121212] text-rose-400 font-extrabold">NEED</option>
                        <option value="want" className="bg-[#121212] text-sky-400 font-extrabold">WANT</option>
                        <option value="savings" className="bg-[#121212] text-emerald-400 font-extrabold">SAVE</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-black opacity-20 text-slate-500">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 group/input relative align-middle">
                    <Pencil className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 text-slate-500" />
                    <EditableInput initialValue={item.description} onSave={val => handleUpdateTransaction(item.id, 'description', val)} className="w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-none py-1.5 px-2 pl-7 text-sm font-medium transition-all text-slate-200 hover:bg-[#121212] hover:border-[#3e3e3e] focus:border-[#da291c] focus:bg-[#121212]" placeholder="รายละเอียด..." />
                  </td>
                  <td className="px-3 py-2 group/input relative align-middle">
                    <Pencil className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 text-slate-500" />
                    <AmountEditableInput initialValue={item.amount === 0 ? '' : item.amount} onSave={val => handleUpdateTransaction(item.id, 'amount', val)} className={`w-full bg-transparent border border-transparent rounded-none py-1.5 px-2 text-right text-sm font-black outline-none pl-7 transition-all focus:ring-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${dm ? 'hover:bg-[#121212] hover:border-[#3e3e3e] ' + (isInc ? 'text-emerald-400 focus:border-emerald-600/70' : 'text-slate-200 focus:border-[#da291c]/70') : 'hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm ' + (isInc ? 'text-emerald-600 focus:border-emerald-400' : 'text-slate-800 focus:border-red-400')}`} placeholder="0" />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <InlineConfirmDelete onDelete={() => handleDeleteTransaction(item.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Master Footer Bar (Dedicated Bottom Line) */}
      <div className={`flex items-center justify-between px-4 py-3 border-t z-30 ${
        'bg-[#121212]/90 border-[#303030]/60 backdrop-blur-sm'
      }`}>
        {/* Left: Record Count */}
        <div className={`text-[10px] font-black uppercase tracking-widest ${'text-[#888888]'}`}>
          หน้า {currentPage} • แสดง {currentData.length} จาก {sortedTransactions.length} รายการ
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-2 py-1 rounded-none border transition-all text-[10px] font-black uppercase tracking-widest ${
              currentPage === 1
                ? 'opacity-20 cursor-not-allowed'
                : 'hover:bg-[#303030] border-[#3e3e3e] bg-[#121212] text-[#cbd5e1]'
            }`}
          >
            <ChevronLeft className="w-3 h-3" /> ก่อนหน้า
          </button>
          
          <div className={`text-[11px] font-black tabular-nums ${'text-[#da291c]'}`}>
            {currentPage} / {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-2 py-1 rounded-none border transition-all text-[10px] font-black uppercase tracking-widest ${
              currentPage === totalPages
                ? 'opacity-20 cursor-not-allowed'
                : 'hover:bg-[#303030] border-[#3e3e3e] bg-[#121212] text-[#cbd5e1]'
            }`}
          >
            ถัดไป <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Page Totals */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${'text-[#888888]'}`}>รายรับในหน้านี้</span>
            <span className="text-[13px] font-black tabular-nums text-emerald-500">{formatMoney(pageInc)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${'text-[#888888]'}`}>รายจ่ายในหน้านี้</span>
            <span className="text-[13px] font-black tabular-nums text-red-500">{formatMoney(pageExp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}