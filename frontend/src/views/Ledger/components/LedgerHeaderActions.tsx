import React from 'react';
import { SlidersHorizontal, LayoutList, TableProperties, PlusCircle } from 'lucide-react';

export interface LedgerHeaderActionsProps {
  viewMode: 'list' | 'horizontal';
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'horizontal'>>;
  horizontalFilterOpen: boolean;
  setHorizontalFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isHorizontalFilterActive: boolean;
  handleOpenAddModal: (date: string, type: string) => void;
}

export const LedgerHeaderActions: React.FC<LedgerHeaderActionsProps> = ({
  viewMode,
  setViewMode,
  horizontalFilterOpen,
  setHorizontalFilterOpen,
  isHorizontalFilterActive,
  handleOpenAddModal
}) => {
  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      {/* The list view keeps its filters on one always-visible row; only the table view has a panel to open. */}
      {viewMode === 'horizontal' && (
        <button
          type="button"
          onClick={() => setHorizontalFilterOpen(v => !v)}
          aria-expanded={horizontalFilterOpen}
          className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 px-3 py-2 rounded-none border font-mono transition-all ${
            horizontalFilterOpen
              ? 'bg-accent/10 border-accent-ink text-accent-ink'
              : 'bg-surface border-line text-ink-body hover:bg-surface-elevated/40 hover:border-line-strong hover:text-ink-display'
          } ${isHorizontalFilterActive ? 'border-warn! text-warn! bg-warn/10!' : ''}`}
          title="เปิด/ปิด แผงตัวกรองตารางแนวนอน"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>ตัวกรองตาราง</span>
          {isHorizontalFilterActive && <span className="w-1.5 h-1.5 rounded-none bg-warn" />}
        </button>
      )}

      <div className="flex items-center rounded-none border border-line overflow-hidden bg-surface">
        <button
          onClick={() => setViewMode('list')}
          title="มุมมองรายการ"
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-none font-mono ${
            viewMode === 'list'
              ? 'bg-surface-elevated/50 text-accent-ink font-extrabold'
              : 'bg-surface text-ink-body hover:text-ink-display'
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
              ? 'bg-surface-elevated/50 text-accent-ink font-extrabold'
              : 'bg-surface text-ink-body hover:text-ink-display'
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
        onClick={() => handleOpenAddModal('', 'savings')}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-line bg-surface text-ink-soft hover:bg-surface-hover hover:text-ink-display"
      >
        <PlusCircle className="w-3.5 h-3.5 text-savings" />
        <span>เพิ่มลงทุน/ออม</span>
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
