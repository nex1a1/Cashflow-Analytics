import React from 'react';
import { SlidersHorizontal, LayoutList, TableProperties, PlusCircle } from 'lucide-react';

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
  handleOpenAddModal
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
        className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 px-3 py-2 rounded-none border font-mono transition-all ${
          isCurrentFilterOpen
            ? 'bg-accent/10 border-accent-ink text-accent-ink'
            : 'bg-surface border-line text-slate-400 hover:bg-surface-elevated/40 hover:border-line-strong hover:text-white'
        } ${isCurrentFilterActive ? '!border-amber-500 !text-amber-400 !bg-amber-950/20' : ''}`}
        title={viewMode === 'list' ? 'เปิด/ปิด แผงตัวกรองรายการ' : 'เปิด/ปิด แผงตัวกรองตารางแนวนอน'}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>ตัวกรอง{viewMode === 'horizontal' ? 'ตาราง' : ''}</span>
        {isCurrentFilterActive && <span className="w-1.5 h-1.5 rounded-none bg-amber-400" />}
      </button>

      <div className="flex items-center rounded-none border border-line overflow-hidden bg-surface">
        <button
          onClick={() => setViewMode('list')}
          title="มุมมองรายการ"
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-none font-mono ${
            viewMode === 'list'
              ? 'bg-surface-elevated/50 text-accent-ink font-extrabold shadow-inner'
              : 'bg-surface text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
          <span className="inline">รายการ</span>
        </button>
        <button
          onClick={() => setViewMode('horizontal')}
          title="มุมมองตารางแนวนอน"
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-none border-l border-line font-mono ${
            viewMode === 'horizontal'
              ? 'bg-surface-elevated/50 text-accent-ink font-extrabold shadow-inner'
              : 'bg-surface text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableProperties className="w-3.5 h-3.5" />
          <span className="inline">ตาราง</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => handleOpenAddModal('', 'income')}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-line bg-surface text-ink-soft hover:bg-surface-hover hover:text-ink-display"
      >
        <PlusCircle className="w-3.5 h-3.5 text-income" />
        <span>เพิ่มรายรับ</span>
      </button>
      <button
        type="button"
        onClick={() => handleOpenAddModal('', 'expense')}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-accent text-on-accent hover:bg-accent-active"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>เพิ่มรายจ่าย</span>
      </button>
    </div>
  );
};

export default LedgerHeaderActions;
