import React from 'react';
import { SlidersHorizontal, LayoutList, TableProperties, PlusCircle, Trash2 } from 'lucide-react';

export interface LedgerHeaderActionsProps {
  viewMode: 'list' | 'horizontal';
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'horizontal'>>;
  filterOpen: boolean;
  setFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFilterActive: boolean;
  horizontalFilterOpen: boolean;
  setHorizontalFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isHorizontalFilterActive: boolean;
  handleOpenAddModal: (date: string, type: string) => void;
  hasTransactions: boolean;
  confirmDeleteMonth: boolean;
  handleDeleteMonthClick: () => void;
}

export const LedgerHeaderActions: React.FC<LedgerHeaderActionsProps> = ({
  viewMode,
  setViewMode,
  filterOpen,
  setFilterOpen,
  isFilterActive,
  horizontalFilterOpen,
  setHorizontalFilterOpen,
  isHorizontalFilterActive,
  handleOpenAddModal,
  hasTransactions,
  confirmDeleteMonth,
  handleDeleteMonthClick
}) => {
  const isCurrentFilterOpen = viewMode === 'list' ? filterOpen : horizontalFilterOpen;
  const toggleFilter = () => {
    if (viewMode === 'list') {
      setFilterOpen(v => !v);
    } else {
      setHorizontalFilterOpen(v => !v);
    }
  };
  const isCurrentFilterActive = viewMode === 'list' ? isFilterActive : isHorizontalFilterActive;

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <button 
        type="button"
        onClick={toggleFilter} 
        className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 px-3 py-2 rounded-none border font-mono transition-all ${
          isCurrentFilterOpen 
            ? 'bg-[#da291c]/10 border-[#da291c] text-[#da291c] shadow-[0_0_12px_rgba(218,41,28,0.12)]' 
            : 'bg-[#121212] border-[#303030] text-slate-400 hover:bg-[#303030]/40 hover:border-[#404040] hover:text-white'
        } ${isCurrentFilterActive ? '!border-amber-500 !text-amber-400 !bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]' : ''}`}
        title={viewMode === 'list' ? 'เปิด/ปิด แผงตัวกรองรายการ' : 'เปิด/ปิด แผงตัวกรองตารางแนวนอน'}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" /> 
        <span>ตัวกรอง{viewMode === 'horizontal' ? 'ตาราง' : ''}</span>
        {isCurrentFilterActive && <span className="w-1.5 h-1.5 rounded-none bg-amber-400" />}
      </button>

      <div className="flex items-center rounded-none border border-[#303030] overflow-hidden bg-[#121212]">
        <button 
          onClick={() => setViewMode('list')} 
          title="มุมมองรายการ" 
          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-none font-mono ${
            viewMode === 'list' 
              ? 'bg-[#303030]/50 text-[#da291c] font-extrabold shadow-inner' 
              : 'bg-[#121212] text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
          <span className="inline">รายการ</span>
        </button>
        <button 
          onClick={() => setViewMode('horizontal')} 
          title="มุมมองตารางแนวนอน" 
          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-none border-l border-[#303030] font-mono ${
            viewMode === 'horizontal' 
              ? 'bg-[#303030]/50 text-[#da291c] font-extrabold shadow-inner' 
              : 'bg-[#121212] text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableProperties className="w-3.5 h-3.5" />
          <span className="inline">ตาราง</span>
        </button>
      </div>

      <button 
        onClick={() => handleOpenAddModal('', 'income')} 
        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 border rounded-none font-mono text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.04)]"
      >
        <PlusCircle className="w-3.5 h-3.5" /> 
        <span>เพิ่มรายรับ</span>
      </button>
      
      <button 
        onClick={() => handleOpenAddModal('', 'expense')} 
        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 border rounded-none font-mono text-[#da291c] bg-[#da291c]/5 hover:bg-[#da291c]/10 border-[#da291c]/40 hover:border-[#da291c] shadow-[0_0_12px_rgba(218,41,28,0.04)]"
      >
        <PlusCircle className="w-3.5 h-3.5" /> 
        <span>เพิ่มรายจ่าย</span>
      </button>
      
      {hasTransactions && (
        <div className="flex items-center pl-2 ml-1 border-l border-[#303030]/60">
          <button 
            onClick={handleDeleteMonthClick} 
            className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-2 border rounded-none font-mono transition-all select-none ${
              confirmDeleteMonth
                ? 'text-white bg-[#da291c] border-[#da291c] animate-pulse shadow-[0_0_12px_rgba(218,41,28,0.4)]'
                : 'text-slate-500 bg-[#121212] border-[#2c2c2c] hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-500/40 opacity-80 hover:opacity-100'
            }`} 
            title={confirmDeleteMonth ? "คลิกอีกครั้งเพื่อยืนยันการลบข้อมูลทั้งหมดในเดือนนี้" : "ลบข้อมูลทั้งเดือนนี้ (กด 2 ครั้งเพื่อยืนยัน)"}
          >
            <Trash2 className="w-3.5 h-3.5" /> 
            <span>{confirmDeleteMonth ? 'กดยืนยันลบ!' : 'ลบเดือนนี้'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LedgerHeaderActions;
