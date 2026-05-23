import React from 'react';
import { Pencil, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import EditableInput from '../../../../components/ui/EditableInput';
import AmountEditableInput from './AmountEditableInput';
import InlineConfirmDelete from './InlineConfirmDelete';
import { hexToRgb } from '../../../../utils/formatters';
import { useTheme } from '../../../../context/ThemeContext';

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
    iconBgColor: dm ? `rgba(${rgb}, 0.25)` : `rgba(${rgb}, 0.15)`
  };
};

export default function LedgerTable({
  currentData, sortedTransactions, categories, 
  sortConfig, handleSort, isDateSorted, dateBands,
  handleUpdateTransaction, handleDeleteTransaction, handleOpenAddModal,
  pageInc, pageExp, formatMoney,
  currentPage, totalPages, setCurrentPage
}) {
  const { isDarkMode: dm } = useTheme();
  const SortHeader = ({ label, sortKey, className = '', align = 'left' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th
        className={`px-4 py-3 font-bold cursor-pointer transition-all select-none group text-${align} ${className} ${
          dm ? `text-slate-400 hover:text-slate-200 ${isActive ? 'text-blue-400 bg-slate-900/60' : 'hover:bg-slate-850/40'}` : `text-slate-500 hover:text-slate-800 ${isActive ? 'text-[#00509E] bg-blue-50/60' : 'hover:bg-slate-100/80'}`
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
      <div className="overflow-auto no-scrollbar" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
          <thead className={`sticky top-0 z-20 border-b ${dm ? 'bg-slate-950/80 border-slate-850 backdrop-blur-sm' : 'bg-slate-50/95 border-slate-200 backdrop-blur-sm'}`}>
            <tr>
              <SortHeader label="วันที่" sortKey="date" className="w-[145px]" />
              <th className={`px-4 py-3 font-bold w-[90px] text-center text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ประเภท</th>
              <SortHeader label="หมวดหมู่" sortKey="category" className="w-[230px]" />
              <th className={`px-4 py-3 font-bold w-[100px] text-center text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ALLOCATION</th>
              <th className={`px-4 py-3 font-bold text-xs uppercase tracking-wide ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายละเอียด</th>
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
              const rowBg      = isAlt ? (dm ? 'bg-slate-950/20' : 'bg-slate-50/60') : 'bg-transparent';
              
              const aType = item.allocation_type || (isInc ? 'savings' : 'want');
              const aColors = {
                need: dm ? 'text-rose-400 border-rose-900/40 bg-rose-900/10' : 'text-rose-600 border-rose-200 bg-rose-50/50',
                want: dm ? 'text-sky-400 border-sky-900/40 bg-sky-900/10' : 'text-sky-600 border-sky-200 bg-sky-50/50',
                savings: dm ? 'text-emerald-400 border-emerald-900/40 bg-emerald-900/10' : 'text-emerald-600 border-emerald-200 bg-emerald-50/50'
              };

              return (
                <tr key={item.id} className={`group transition-colors duration-100 border-b ${dm ? 'border-slate-850/60 hover:bg-slate-850/40' : 'border-slate-100 hover:bg-blue-50/40'} ${rowBg}`}>
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
                    <div className="relative w-full flex items-center rounded-sm border transition-all duration-150 focus-within:ring-1 focus-within:ring-opacity-40" style={{ backgroundColor: pillStyles.backgroundColor, borderColor: pillStyles.borderColor }}>
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
                            className={dm ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}
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
                        className={`w-full bg-transparent outline-none appearance-none px-2 py-1 font-black border rounded-sm text-[10px] text-center transition-all cursor-pointer ${aColors[aType]}`}
                        style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem center', backgroundSize: '0.6em' }}
                      >
                        <option value="need">NEED</option>
                        <option value="want">WANT</option>
                        <option value="savings">SAVE</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black opacity-20 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 group/input relative align-middle">
                    <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                    <EditableInput initialValue={item.description} onSave={val => handleUpdateTransaction(item.id, 'description', val)} className={`w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-sm py-1.5 px-2 pl-7 text-sm font-medium transition-all ${dm ? 'text-slate-200 hover:bg-slate-950 hover:border-slate-800 focus:border-blue-500/70 focus:bg-slate-950' : 'text-slate-700 hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm focus:border-[#00509E]/50 focus:bg-slate-100'}`} placeholder="รายละเอียด..." />
                  </td>
                  <td className="px-3 py-2 group/input relative align-middle">
                    <Pencil className={`w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-60 transition-all pointer-events-none z-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                    <AmountEditableInput initialValue={item.amount === 0 ? '' : item.amount} onSave={val => handleUpdateTransaction(item.id, 'amount', val)} className={`w-full bg-transparent border border-transparent rounded-sm py-1.5 px-2 text-right text-sm font-black outline-none pl-7 transition-all focus:ring-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${dm ? 'hover:bg-slate-950 hover:border-slate-800 ' + (isInc ? 'text-emerald-400 focus:border-emerald-600/70' : 'text-slate-200 focus:border-red-600/70') : 'hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm ' + (isInc ? 'text-emerald-600 focus:border-emerald-400' : 'text-slate-800 focus:border-red-400')}`} placeholder="0" />
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
        dm ? 'bg-slate-950/80 border-slate-850 backdrop-blur-sm' : 'bg-slate-50/95 border-slate-200 backdrop-blur-sm'
      }`}>
        {/* Left: Record Count */}
        <div className={`text-[10px] font-black uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
          หน้า {currentPage} • แสดง {currentData.length} จาก {sortedTransactions.length} รายการ
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-all text-[10px] font-black uppercase tracking-widest ${
              currentPage === 1
                ? 'opacity-20 cursor-not-allowed'
                : dm ? 'hover:bg-slate-850 border-slate-800 bg-slate-900 text-slate-300' : 'hover:bg-white border-slate-300 text-slate-600 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-3 h-3" /> ก่อนหน้า
          </button>
          
          <div className={`text-[11px] font-black tabular-nums ${dm ? 'text-blue-400' : 'text-[#00509E]'}`}>
            {currentPage} / {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-all text-[10px] font-black uppercase tracking-widest ${
              currentPage === totalPages
                ? 'opacity-20 cursor-not-allowed'
                : dm ? 'hover:bg-slate-850 border-slate-800 bg-slate-900 text-slate-300' : 'hover:bg-white border-slate-300 text-slate-600 shadow-sm'
            }`}
          >
            ถัดไป <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Page Totals */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${dm ? 'text-slate-500' : 'text-slate-400'}`}>รายรับในหน้านี้</span>
            <span className="text-[13px] font-black tabular-nums text-emerald-500">{formatMoney(pageInc)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${dm ? 'text-slate-500' : 'text-slate-400'}`}>รายจ่ายในหน้านี้</span>
            <span className="text-[13px] font-black tabular-nums text-red-500">{formatMoney(pageExp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}