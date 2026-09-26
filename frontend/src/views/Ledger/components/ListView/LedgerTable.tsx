import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, PlusCircle, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import EditableInput from '../../../../components/ui/EditableInput';
import AmountEditableInput from './AmountEditableInput';
import ConfirmDeleteButton from '@/components/shared/ConfirmDeleteButton';
import { hexToRgb, getThaiDayInfo } from '../../../../utils/formatters';
import { TransactionDisplay, Category, CashflowGroup } from '../../../../types';
import CategorySelect from '../../../../components/shared/CategorySelect';
import AllocationSelect from '@/components/shared/AllocationSelect';
import { readable } from '@/constants/theme';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface SortHeaderProps {
  label: string;
  sortKey: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
  sortConfig: SortConfig;
  handleSort: (key: string) => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({ label, sortKey, className = '', align = 'left', sortConfig, handleSort }) => {
  const isActive = sortConfig.key === sortKey;
  return (
    <th
      className={`px-4 py-3 font-bold cursor-pointer select-none group text-${align} ${className} ${
        `text-slate-400 hover:text-slate-200 ${isActive ? 'text-accent bg-surface/60' : 'hover:bg-surface-elevated/30'}`
      }`}
      onClick={() => handleSort(sortKey)}
      title={`เรียงตาม${label}`}
    >
      <div className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wide ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <span className={`flex flex-col text-[11px] leading-[0.55] ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}>
          <span className={isActive && sortConfig.direction === 'asc' ? ('text-accent') : ''}>▲</span>
          <span className={isActive && sortConfig.direction === 'desc' ? ('text-accent') : ''}>▼</span>
        </span>
      </div>
    </th>
  );
};

interface LedgerTableProps {
  currentData: TransactionDisplay[];
  sortedTransactions: TransactionDisplay[];
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  sortConfig: SortConfig;
  handleSort: (key: string) => void;
  isDateSorted: boolean;
  dateBands: Record<string, number>;
  handleUpdateTransaction: (id: string, field: string, value: any) => Promise<boolean> | void;
  handleDeleteTransaction: (id: string) => void;
  handleOpenAddModal: (date: string, type: string) => void;
  pageInc: number;
  pageExp: number;
  formatMoney: (val: number | string) => string;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (updater: number | ((prev: number) => number)) => void;
}

export default function LedgerTable({
  currentData, sortedTransactions, categories, cashflowGroups = [],
  sortConfig, handleSort, isDateSorted, dateBands,
  handleUpdateTransaction, handleDeleteTransaction, handleOpenAddModal,
  pageInc, pageExp, formatMoney,
  currentPage, totalPages, setCurrentPage
}: LedgerTableProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));



  useEffect(() => {
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
        <table className="w-full text-left text-sm border-collapse whitespace-nowrap min-w-[780px] bg-canvas">
          <thead className="sticky top-0 z-20 border-b bg-surface border-line/65">
            <tr>
              <SortHeader 
                label="วันเดือนปี" 
                sortKey="date" 
                className="sticky left-0 z-30 bg-surface border-r border-line/60 w-[155px] min-w-[155px]" 
                sortConfig={sortConfig}
                handleSort={handleSort}
              />
              <SortHeader label="หมวดหมู่" sortKey="category" className="w-[230px]" sortConfig={sortConfig} handleSort={handleSort} />
              <th className="px-3 py-3 font-bold w-[107px] text-center text-[11px] font-black uppercase tracking-widest text-slate-400">ALLOCATION</th>
              <th className="px-4 py-3 font-bold text-[11px] font-black uppercase tracking-widest text-slate-400">รายละเอียด</th>
              <SortHeader label="จำนวนเงิน" sortKey="amount" className="w-[140px]" align="right" sortConfig={sortConfig} handleSort={handleSort} />
              <th className="sticky right-0 z-30 bg-surface border-l border-line/60 w-12 text-center" />
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index, arr) => {
              const isNewDate  = !isDateSorted || index === 0 || item.date !== arr[index - 1].date;
              const catObj     = categories.find(c => c.id === item.category_id) || categories.find(c => c.name === item.category) || categories[categories.length - 1];
              const isInc      = (catObj as any)?.type === 'income' || item.group_type === 'income';
              const isAlt      = isDateSorted ? dateBands[item.id] === 1 : index % 2 === 1;
              const stickyBg   = isAlt ? 'bg-canvas' : 'bg-canvas';
              const isDateBoundary = isDateSorted && isNewDate && index > 0;
              const dayInfo = isNewDate ? getThaiDayInfo(item.date) : null;
              
              const aType = item.allocation_type || (isInc ? 'savings' : 'want');

              return (
                <tr 
                  key={item.id} 
                  className={`group border-b border-line/30 hover:bg-surface-elevated/10 ${
                    isDateBoundary ? 'border-t border-t-line-strong' : ''
                  }`}
                >
                  {/* Sticky Date Column */}
                  <td className={`sticky left-0 z-10 border-r border-line/40 align-middle shadow-[2px_0_5px_rgba(0,0,0,0.12)] px-3 py-1 group-hover:bg-surface-hover ${stickyBg}`}>
                    {isNewDate ? (
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-5 flex items-center justify-center shrink-0">
                            {dayInfo && (
                              <span 
                                className="w-full h-full inline-flex items-center justify-center text-[11px] font-black border select-none tabular-nums leading-none tracking-tight rounded-sm day-badge-pill" 
                                style={{
                                  color: readable(dayInfo.color),
                                  backgroundColor: dayInfo.bg,
                                  borderColor: dayInfo.border,
                                  borderRadius: '4px'
                                }}
                                title={dayInfo.fullName}
                              >
                                {dayInfo.label}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black tabular-nums text-slate-200 font-mono tracking-tight">
                            {item.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                            className="p-0.5 rounded-none text-expense hover:text-rose-300 hover:bg-expense/15 transition-colors" 
                            title={`เพิ่มรายจ่าย (${item.date})`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-5 flex items-center justify-center shrink-0">
                            <span className="text-slate-600 text-xs font-mono select-none font-bold" title={item.date}>
                              ↳
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                            className="p-0.5 rounded-none text-expense hover:text-rose-300 hover:bg-expense/15 transition-colors" 
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
                    <CategorySelect
                      value={item.category_id || ''}
                      onChange={(catId) => handleUpdateTransaction(item.id, 'category_id', catId)}
                      categories={categories}
                      cashflowGroups={cashflowGroups}
                      type={isInc ? 'income' : 'expense'}
                      variant="pill"
                      size="sm"
                    />
                  </td>
                  
                  <td className="px-2 py-1 align-middle text-center w-[95px] min-w-[95px] max-w-[95px]">
                    {!isInc ? (
                      <AllocationSelect 
                        value={aType} 
                        onChange={val => handleUpdateTransaction(item.id, 'allocation_type', val)}
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-[11px] font-black opacity-20 text-slate-500">
                        —
                      </span>
                    )}
                  </td>
                  
                  <td className="px-3 py-1 group/input relative align-middle">
                    <Pencil className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-50 pointer-events-none z-10 text-slate-500" />
                    <EditableInput initialValue={item.description} onSave={val => handleUpdateTransaction(item.id, 'description', val)} className="w-full bg-transparent border border-transparent outline-none focus:ring-1 rounded-none py-1 px-2 pl-7 text-xs font-semibold text-slate-200 hover:bg-surface hover:border-line-strong focus:border-accent focus:bg-surface" placeholder="รายละเอียด..." />
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
                  <td className={`sticky right-0 z-10 border-l border-line/40 align-middle text-center shadow-[-2px_0_5px_rgba(0,0,0,0.12)] px-2 py-1 group-hover:bg-surface-hover ${stickyBg}`}>
                    <ConfirmDeleteButton onConfirm={() => handleDeleteTransaction(item.id)} revealOnHover tooltip="ลบรายการ" itemLabel={item.description || item.category} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Master Footer Bar (Dedicated Bottom Line) */}
      <div className="flex items-center justify-between px-4 py-3 border-t z-30 bg-surface border-line/60">
        {/* Left: Record Count */}
        <div className="text-[11px] font-black uppercase tracking-widest text-ink-body font-mono">
          หน้า {currentPage} • แสดง {currentData.length} จาก {sortedTransactions.length} รายการ
        </div>

        {/* Center: Symmetric Speed Cockpit Pagination */}
        <div className="inline-flex items-center border border-line bg-surface divide-x divide-line shadow-sm select-none">
          {/* Jump to First Page (|<) */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage <= 1}
            className={`flex items-center justify-center h-7 px-2 text-[11px] font-black font-mono transition-none ${
              currentPage <= 1
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
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
              className={`flex items-center justify-center h-7 px-2 text-[11px] font-black font-mono tracking-tighter transition-none ${
                currentPage <= 1
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
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
              className={`flex items-center justify-center h-7 px-2 text-[11px] font-black font-mono tracking-tighter transition-none ${
                currentPage <= 1
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
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
            className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-black font-mono uppercase tracking-wider transition-none ${
              currentPage <= 1
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
            }`}
            title={`หน้าก่อนหน้า (ไปหน้า ${Math.max(currentPage - 1, 1)})`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </button>
          
          {/* Direct Page Input Box */}
          <div 
            className="flex items-center h-7 gap-1.5 px-2.5 bg-canvas text-[11px] font-black font-mono tabular-nums text-slate-300"
            title="คลิกเพื่อพิมพ์เลขหน้า แล้วกด Enter (หรือใช้ลูกศรขึ้น/ลง)"
          >
            <span className="text-slate-500 font-normal uppercase tracking-wider text-[11px] select-none">หน้า</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onClick={(e: React.MouseEvent<HTMLInputElement>) => (e.target as HTMLInputElement).select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageSubmit();
                  e.currentTarget.blur();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                }
              }}
              onBlur={handlePageSubmit}
              className="w-7 text-center bg-surface-hover text-white font-black border border-line focus:border-accent focus:ring-1 focus:ring-accent/50 rounded-none text-[11px] py-0.5 outline-none leading-none select-all transition-colors"
            />
            <span className="text-slate-600 font-normal select-none">/</span>
            <span className="text-slate-400 font-extrabold select-none">{totalPages}</span>
          </div>

          {/* Next Page (ถัดไป >) */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-black font-mono uppercase tracking-wider transition-none ${
              currentPage >= totalPages
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
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
              className={`flex items-center justify-center h-7 px-2 text-[11px] font-black font-mono tracking-tighter transition-none ${
                currentPage >= totalPages
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
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
              className={`flex items-center justify-center h-7 px-2 text-[11px] font-black font-mono tracking-tighter transition-none ${
                currentPage >= totalPages
                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                  : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
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
            className={`flex items-center justify-center h-7 px-2 text-[11px] font-black font-mono transition-none ${
              currentPage >= totalPages
                ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
                : 'text-slate-300 hover:bg-surface-elevated hover:text-white active:bg-surface-elevated cursor-pointer'
            }`}
            title={`หน้าสุดท้าย (หน้า ${totalPages})`}
          >
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Page Totals */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-mono">รายรับหน้านี้</span>
            <span className="text-xs font-black tabular-nums text-emerald-400 font-mono">฿{formatMoney(pageInc)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-mono">รายจ่ายหน้านี้</span>
            <span className="text-xs font-black tabular-nums text-expense font-mono">฿{formatMoney(pageExp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
