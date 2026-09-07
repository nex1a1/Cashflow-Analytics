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
  handleUpdateTransaction: (id: string, field: string, value: any) => void;
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
    <div className="flex flex-col border rounded-none overflow-hidden shadow-lg min-h-[400px] relative z-0 bg-[#181818] border-[#303030]">
      {showSkeleton && (
        <div className="flex flex-col items-center justify-center py-24 px-4 w-full h-full absolute inset-0 z-50 bg-[#121212]/80 backdrop-blur-[1px]">
          <div className="relative w-14 h-14 mb-4 flex items-center justify-center border border-[#303030] bg-[#181818]">
            <div className="w-8 h-8 border-2 border-transparent border-t-[#da291c] border-r-[#da291c]/30 rounded-full animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#888888] font-sans flex items-center gap-1.5">
            <span>กำลังดาวน์โหลดบัญชีแยกประเภท</span>
            <span className="text-[#da291c] animate-pulse">...</span>
          </p>
        </div>
      )}
      
      {viewMode === 'list' && displayTransactions.length === 0 && !showSkeleton ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <Inbox className="w-14 h-14 mb-4 text-[#555555]" />
          <p className="text-base font-bold text-[#888888]">ไม่พบรายการบัญชี</p>
          <p className="text-xs mt-1 mb-4 text-[#555555]">ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
          {isFilterActive && (
            <button onClick={clearFilters} className="px-4 py-1.5 rounded-none text-xs font-bold border bg-[#303030]/60 border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030]">
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
