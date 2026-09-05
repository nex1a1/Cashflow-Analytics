import React from 'react';
import { Pencil, PlusCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronFirst, ChevronLast } from 'lucide-react';
import EditableInput from '../../../../components/ui/EditableInput';
import AmountEditableInput from './AmountEditableInput';
import InlineConfirmDelete from './InlineConfirmDelete';
import { hexToRgb, THAI_DAY_CONFIG, getThaiDayInfo } from '../../../../utils/formatters';

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
    r = Number.parseInt(hex.substring(0, 2), 16);
    g = Number.parseInt(hex.substring(2, 4), 16);
    b = Number.parseInt(hex.substring(4, 6), 16);
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

const getGroupBadgeStyles = (hexColor) => {
  const safeColor = hexColor || '#94a3b8';
  const rgb = hexToRgb(safeColor) || '148, 163, 184';
  return {
    backgroundColor: `rgba(${rgb}, 0.12)`,
    borderColor: `rgba(${rgb}, 0.35)`,
    color: safeColor
  };
};

const SortHeader = ({ label, sortKey, className = '', align = 'left', sortConfig, handleSort }) => {
  const isActive = sortConfig.key === sortKey;
  return (
    <th
      className={`px-4 py-3 font-bold cursor-pointer select-none group text-${align} ${className} ${
        `text-slate-400 hover:text-slate-200 ${isActive ? 'text-[#da291c] bg-[#121212]/60' : 'hover:bg-[#303030]/30'}`
      }`}
      onClick={() => handleSort(sortKey)}
      title={`เรียงตาม${label}`}
    >
      <div className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wide ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <span className={`flex flex-col text-[8px] leading-[0.55] ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}>
          <span className={isActive && sortConfig.direction === 'asc' ? ('text-[#da291c]') : ''}>▲</span>
          <span className={isActive && sortConfig.direction === 'desc' ? ('text-[#da291c]') : ''}>▼</span>
        </span>
      </div>
    </th>
  );
};

export default function LedgerTable({
  currentData, sortedTransactions, categories, cashflowGroups = [],
  sortConfig, handleSort, isDateSorted, dateBands,
  handleUpdateTransaction, handleDeleteTransaction, handleOpenAddModal,
  pageInc, pageExp, formatMoney,
  currentPage, totalPages, setCurrentPage
}) {
  const dm = true;
  const [pageInput, setPageInput] = React.useState(String(currentPage));

  React.useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = () => {
    let p = Number.parseInt(pageInput, 10);
    if (Number.isNaN(p) || p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setCurrentPage(p);
    setPageInput(String(p));
  };

  return (
    <div className="flex flex-col w-full">
      <div className="overflow-auto no-scrollbar relative" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-left text-sm border-collapse whitespace-nowrap min-w-[760px] bg-[#181818]">
          <thead className="sticky top-0 z-20 border-b bg-[#121212]/95 border-[#303030]/65 backdrop-blur-md">
            <tr>
              <SortHeader 
                label="วันที่" 
                sortKey="date" 
                className="sticky left-0 z-30 bg-[#121212] border-r border-[#303030]/60 w-[140px]" 
                sortConfig={sortConfig}
                handleSort={handleSort}
              />
              <SortHeader label="หมวดหมู่" sortKey="category" className="w-[230px]" sortConfig={sortConfig} handleSort={handleSort} />
              <th className="px-3 py-3 font-bold w-[95px] text-center text-[10px] font-black uppercase tracking-widest text-slate-400">ALLOCATION</th>
              <th className="px-4 py-3 font-bold text-[10px] font-black uppercase tracking-widest text-slate-400">รายละเอียด</th>
              <SortHeader label="จำนวนเงิน" sortKey="amount" className="w-[140px]" align="right" sortConfig={sortConfig} handleSort={handleSort} />
              <th className="sticky right-0 z-30 bg-[#121212] border-l border-[#303030]/60 w-12 text-center" />
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index, arr) => {
              const isNewDate  = !isDateSorted || index === 0 || item.date !== arr[index - 1].date;
              const catObj     = categories.find(c => c.id === item.category_id) || categories.find(c => c.name === item.category) || categories[categories.length - 1];
              const groupId    = catObj?.cashflow_group_id || catObj?.cashflowGroup;
              const groupObj   = (cashflowGroups || []).find(g => g.id === groupId) || (item.group_name ? (cashflowGroups || []).find(g => g.name === item.group_name) : null);
              const pillStyles = getCategoryPillStyles(catObj?.color, dm);
              const isInc      = catObj?.type === 'income';
              const isAlt      = isDateSorted ? dateBands[item.id] === 1 : index % 2 === 1;
              const stickyBg   = isAlt ? 'bg-[#161616]' : 'bg-[#181818]';
              const isDateBoundary = isDateSorted && isNewDate && index > 0;
              const dayInfo = isNewDate ? getThaiDayInfo(item.date) : null;
              
              const aType = item.allocation_type || (isInc ? 'savings' : 'want');
              const aColors = {
                need: 'text-rose-400 border-rose-800/40 bg-rose-950/20 hover:bg-rose-900/25 hover:border-rose-700/50 focus:ring-1 focus:ring-rose-500/25',
                want: 'text-sky-400 border-sky-800/40 bg-sky-950/20 hover:bg-sky-900/25 hover:border-sky-700/50 focus:ring-1 focus:ring-sky-500/25',
                savings: 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20 hover:bg-emerald-900/25 hover:border-emerald-700/50 focus:ring-1 focus:ring-emerald-500/25'
              };

              return (
                <tr 
                  key={item.id} 
                  className={`group border-b border-[#303030]/30 hover:bg-[#303030]/10 ${
                    isDateBoundary ? 'border-t border-t-[#404040]' : ''
                  }`}
                >
                  {/* Sticky Date Column */}
                  <td className={`sticky left-0 z-10 border-r border-[#303030]/40 align-middle shadow-[2px_0_5px_rgba(0,0,0,0.12)] px-3 py-1 group-hover:bg-[#202020] ${stickyBg}`}>
                    {isNewDate ? (
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {dayInfo && (
                            <span 
                              className="px-1.5 py-0.5 text-[9px] font-black rounded-none border select-none shrink-0 tabular-nums leading-none tracking-tight" 
                              style={{
                                color: dayInfo.color,
                                backgroundColor: dayInfo.bg,
                                borderColor: dayInfo.border
                              }}
                              title={dayInfo.fullName}
                            >
                              {dayInfo.label}
                            </span>
                          )}
                          <span className="text-xs font-black tabular-nums text-slate-200 font-mono tracking-tight">
                            {item.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => handleOpenAddModal(item.date, 'income')} 
                            className="p-0.5 rounded-none text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition-colors" 
                            title={`เพิ่มรายรับ (${item.date})`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenAddModal(item.date, 'expense')} 
                            className="p-0.5 rounded-none text-[#da291c] hover:text-rose-300 hover:bg-rose-950/60 transition-colors" 
                            title={`เพิ่มรายจ่าย (${item.date})`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-1.5 min-w-0 pl-3">
                          <span className="text-slate-600 text-xs font-mono select-none font-bold" title={item.date}>
                            ↳
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => handleOpenAddModal(item.date, 'income')} 
                            className="p-0.5 rounded-none text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition-colors" 
                            title={`เพิ่มรายรับ (${item.date})`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenAddModal(item.date, 'expense')} 
                            className="p-0.5 rounded-none text-[#da291c] hover:text-rose-300 hover:bg-rose-950/60 transition-colors" 
                            title={`เพิ่มรายจ่าย (${item.date})`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Compact Single-Line Category Pill (with Inline Group Breadcrumb) */}
                  <td className="px-3 py-1 align-middle">
                    <div className="relative w-full flex items-center rounded-none border focus-within:ring-1 focus-within:ring-opacity-40" style={{ backgroundColor: pillStyles.backgroundColor, borderColor: pillStyles.borderColor }}>
                      {/* Visual Custom Overlay */}
                      <div 
                        className="category-pill-text w-full flex items-center pl-2 pr-6 py-1 text-xs select-none pointer-events-none min-w-0" 
                        style={{ '--pill-text-color': pillStyles.textColor }}
                      >
                        <span className="shrink-0 mr-1.5 text-xs">
                          {catObj?.icon}
                        </span>
                        <div className="truncate flex items-center gap-1 min-w-0" style={{ color: pillStyles.textColor }}>
                          {groupObj?.name && (
                            <>
                              <span className="opacity-60 font-medium text-[11px] truncate max-w-[90px]" title={`กลุ่ม: ${groupObj.name}`}>
                                {groupObj.name}
                              </span>
                              <span className="opacity-35 text-[10px] select-none">›</span>
                            </>
                          )}
                          <span className="truncate font-extrabold">{catObj?.name}</span>
                        </div>
                        
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-75" style={{ color: pillStyles.textColor }}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
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
                  
                  <td className="px-3 py-1 align-middle text-center">
                    {!isInc ? (
                      <select 
                        value={aType} 
                        onChange={e => handleUpdateTransaction(item.id, 'allocation_type', e.target.value)}
                        className={`allocation-select w-full bg-[#121212] outline-none appearance-none px-2 py-1 font-black border rounded-none text-[9px] text-center tracking-wider cursor-pointer ${aColors[aType]}`}
                        style={{ backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem center', backgroundSize: '0.6em' }}
                      >
                        <option value="need" className="bg-[#121212] text-rose-450 font-extrabold">NEED</option>
                        <option value="want" className="bg-[#121212] text-sky-400 font-extrabold">WANT</option>
                        <option value="savings" className="bg-[#121212] text-emerald-450 font-extrabold">SAVE</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-black opacity-20 text-slate-500">
                        —
                      </span>
                    )}
                  </td>
                  
                  <td className="px-3 py-1 group/input relative align-middle">
                    <Pencil className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-50 pointer-events-none z-10 text-slate-500" />
                    <EditableInput initialValue={item.description} onSave={val => handleUpdateTransaction(item.id, 'description', val)} className="w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-none py-1 px-2 pl-7 text-xs font-semibold text-slate-200 hover:bg-[#121212] hover:border-[#3e3e3e] focus:border-[#da291c] focus:bg-[#121212]" placeholder="รายละเอียด..." />
                  </td>
                  
                  <td className="px-3 py-1 relative align-middle">
                    <AmountEditableInput 
                      initialValue={item.amount === 0 ? '' : item.amount} 
                      isInc={isInc} 
                      onSave={val => handleUpdateTransaction(item.id, 'amount', val)} 
                      placeholder="0.00" 
                    />
                  </td>
                  
                  {/* Sticky Actions Column */}
                  <td className={`sticky right-0 z-10 border-l border-[#303030]/40 align-middle text-center shadow-[-2px_0_5px_rgba(0,0,0,0.12)] px-2 py-1 group-hover:bg-[#202020] ${stickyBg}`}>
                    <InlineConfirmDelete onDelete={() => handleDeleteTransaction(item.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Master Footer Bar (Dedicated Bottom Line) */}
      <div className="flex items-center justify-between px-4 py-3 border-t z-30 bg-[#121212]/95 border-[#303030]/60 backdrop-blur-md">
        {/* Left: Record Count */}
        <div className="text-[9px] font-black uppercase tracking-widest text-[#888888] font-mono">
          หน้า {currentPage} • แสดง {currentData.length} จาก {sortedTransactions.length} รายการ
        </div>

        {/* Center: Symmetric Speed Cockpit Pagination */}
        <div className="inline-flex items-center border border-[#303030] bg-[#121212] divide-x divide-[#303030] shadow-sm select-none">
          {/* Jump to First Page (|<) */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage <= 1}
            className={`flex items-center justify-center h-7 px-2 text-[10px] font-black font-mono transition-none ${
              currentPage <= 1
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
            }`}
            title="หน้าแรกสุด (หน้า 1)"
          >
            <ChevronFirst className="w-3.5 h-3.5" />
          </button>

          {/* Jump -10 (Only if totalPages > 10) */}
          {totalPages > 10 && (
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 10, 1))}
              disabled={currentPage <= 1}
              className={`flex items-center justify-center h-7 px-2 text-[10px] font-black font-mono tracking-tighter transition-none ${
                currentPage <= 1
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
              }`}
              title={`ถอยหลัง 10 หน้า (ไปหน้า ${Math.max(currentPage - 10, 1)})`}
            >
              -10
            </button>
          )}

          {/* Jump -5 (Only if totalPages > 5) */}
          {totalPages > 5 && (
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 5, 1))}
              disabled={currentPage <= 1}
              className={`flex items-center justify-center h-7 px-2 text-[10px] font-black font-mono tracking-tighter transition-none ${
                currentPage <= 1
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
              }`}
              title={`ถอยหลัง 5 หน้า (ไปหน้า ${Math.max(currentPage - 5, 1)})`}
            >
              -5
            </button>
          )}

          {/* Previous Page (< ก่อนหน้า) */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            className={`flex items-center gap-1 h-7 px-2.5 text-[10px] font-black font-mono uppercase tracking-wider transition-none ${
              currentPage <= 1
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
            }`}
            title={`หน้าก่อนหน้า (ไปหน้า ${Math.max(currentPage - 1, 1)})`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </button>
          
          {/* Direct Page Input Box */}
          <div 
            className="flex items-center h-7 gap-1.5 px-2.5 bg-[#161616] text-[10px] font-black font-mono tabular-nums text-slate-300"
            title="คลิกเพื่อพิมพ์เลขหน้า แล้วกด Enter (หรือใช้ลูกศรขึ้น/ลง)"
          >
            <span className="text-slate-500 font-normal uppercase tracking-wider text-[9px] select-none">หน้า</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onClick={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageSubmit();
                  e.target.blur();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                }
              }}
              onBlur={handlePageSubmit}
              className="w-7 text-center bg-[#1c1c1c] text-white font-black border border-[#303030] focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]/50 rounded-none text-[11px] py-0.5 outline-none leading-none select-all transition-colors"
            />
            <span className="text-slate-600 font-normal select-none">/</span>
            <span className="text-slate-400 font-extrabold select-none">{totalPages}</span>
          </div>

          {/* Next Page (ถัดไป >) */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className={`flex items-center gap-1 h-7 px-2.5 text-[10px] font-black font-mono uppercase tracking-wider transition-none ${
              currentPage >= totalPages
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
            }`}
            title={`หน้าถัดไป (ไปหน้า ${Math.min(currentPage + 1, totalPages)})`}
          >
            <span className="hidden sm:inline">ถัดไป</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Jump +5 (Only if totalPages > 5) */}
          {totalPages > 5 && (
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 5, totalPages))}
              disabled={currentPage >= totalPages}
              className={`flex items-center justify-center h-7 px-2 text-[10px] font-black font-mono tracking-tighter transition-none ${
                currentPage >= totalPages
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
              }`}
              title={`ข้ามไปข้างหน้า 5 หน้า (ไปหน้า ${Math.min(currentPage + 5, totalPages)})`}
            >
              +5
            </button>
          )}

          {/* Jump +10 (Only if totalPages > 10) */}
          {totalPages > 10 && (
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 10, totalPages))}
              disabled={currentPage >= totalPages}
              className={`flex items-center justify-center h-7 px-2 text-[10px] font-black font-mono tracking-tighter transition-none ${
                currentPage >= totalPages
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
              }`}
              title={`ข้ามไปข้างหน้า 10 หน้า (ไปหน้า ${Math.min(currentPage + 10, totalPages)})`}
            >
              +10
            </button>
          )}

          {/* Jump to Last Page (>|) */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className={`flex items-center justify-center h-7 px-2 text-[10px] font-black font-mono transition-none ${
              currentPage >= totalPages
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-[#cbd5e1] hover:bg-[#252525] hover:text-white active:bg-[#303030] cursor-pointer'
            }`}
            title={`หน้าสุดท้าย (หน้า ${totalPages})`}
          >
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Page Totals */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase tracking-wider text-[#888888] font-mono">รายรับหน้านี้</span>
            <span className="text-xs font-black tabular-nums text-emerald-400 font-mono">฿{formatMoney(pageInc)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase tracking-wider text-[#888888] font-mono">รายจ่ายหน้านี้</span>
            <span className="text-xs font-black tabular-nums text-[#da291c] font-mono">฿{formatMoney(pageExp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}