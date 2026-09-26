import React from 'react';
import { Inbox } from 'lucide-react';
import { Category, CashflowGroup, TransactionDisplay, DayType } from '../../../types';
import { HeatmapEngineOptions } from '../hooks/useHeatmapEngine';
import HorizontalLedgerView from './HorizontalView/HorizontalLedgerView';
import LedgerTable from './ListView/LedgerTable';

export interface LedgerContentAreaProps {
  showSkeleton: boolean;
  displayTransactions: TransactionDisplay[];
  monthTransactions: TransactionDisplay[];
  horizontalFilters: HeatmapEngineOptions;
  clearHorizontalFilters?: () => void;
  isHorizontalFilterActive?: boolean;
  isFilterActive: boolean;
  clearFilters: () => void;
  viewMode: 'list' | 'horizontal';
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  formatMoney: (val: number | string) => string;
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
  allDatesInPeriod: string[];
  currentData: TransactionDisplay[];
  sortedTransactions: TransactionDisplay[];
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  handleSort: (key: string) => void;
  isDateSorted: boolean;
  dateBands: Record<string, number>;
  handleUpdateTransaction: (id: string, field: string, value: any) => Promise<boolean> | void;
  handleDeleteTransaction: (id: string) => void;
  handleOpenAddModal: (date: string, type: string) => void;
  pageInc: number;
  pageExp: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export const LedgerContentArea: React.FC<LedgerContentAreaProps> = ({
  showSkeleton,
  displayTransactions,
  monthTransactions,
  horizontalFilters,
  clearHorizontalFilters,
  isHorizontalFilterActive,
  isFilterActive,
  clearFilters,
  viewMode,
  categories,
  cashflowGroups,
  formatMoney,
  dayTypes,
  dayTypeConfig,
  allDatesInPeriod,
  currentData,
  sortedTransactions,
  sortConfig,
  handleSort,
  isDateSorted,
  dateBands,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleOpenAddModal,
  pageInc,
  pageExp,
  currentPage,
  totalPages,
  setCurrentPage
}) => {
  const renderLedgerView = () => {
    if (viewMode === 'horizontal') {
      return (
        <HorizontalLedgerView
          displayTransactions={monthTransactions}
          categories={categories}
          formatMoney={formatMoney}
          dayTypes={dayTypes}
          dayTypeConfig={dayTypeConfig}
          allDates={allDatesInPeriod}
          filterOptions={horizontalFilters}
          clearFilters={clearHorizontalFilters}
          isFilterActive={isHorizontalFilterActive}
        />
      );
    }
    return (
      <LedgerTable
        currentData={currentData}
        sortedTransactions={sortedTransactions}
        categories={categories}
        cashflowGroups={cashflowGroups}
        sortConfig={sortConfig}
        handleSort={handleSort}
        isDateSorted={isDateSorted}
        dateBands={dateBands}
        handleUpdateTransaction={handleUpdateTransaction}
        handleDeleteTransaction={handleDeleteTransaction}
        handleOpenAddModal={handleOpenAddModal}
        pageInc={pageInc}
        pageExp={pageExp}
        formatMoney={formatMoney}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    );
  };

  return (
    <div className="flex flex-col border rounded-none overflow-hidden shadow-lg min-h-[400px] relative z-0 bg-canvas border-line">
      {showSkeleton && (
        <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full absolute inset-0 z-50 bg-surface/80 backdrop-blur-[1px]">
          <div className="relative w-14 h-14 mb-4 flex items-center justify-center border border-line bg-canvas">
            <div className="w-8 h-8 border-2 border-transparent border-t-accent border-r-accent/30 rounded-full animate-spin" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-ink-body font-sans flex items-center gap-1.5">
            <span>กำลังดาวน์โหลดบัญชีแยกประเภท</span>
            <span className="text-accent animate-pulse">...</span>
          </p>
        </div>
      )}
      
      {viewMode === 'list' && displayTransactions.length === 0 && !showSkeleton ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <Inbox className="w-14 h-14 mb-4 text-ink-muted" />
          <p className="text-base font-bold text-ink-body">ไม่พบรายการบัญชี</p>
          <p className="text-xs mt-1 mb-4 text-ink-muted">ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
          {isFilterActive && (
            <button onClick={clearFilters} className="px-4 py-1.5 rounded-none text-xs font-bold border bg-surface-elevated/60 border-line-strong text-slate-300 hover:bg-surface-elevated">
              ล้างตัวกรอง
            </button>
          )}
        </div>
      ) : (
        renderLedgerView()
      )}
    </div>
  );
};

export default LedgerContentArea;
