import React from 'react';
import { SlidersHorizontal, LayoutList, TableProperties, PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import { useMenu } from '@/hooks/useMenu';

const MENU_ITEM = 'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-ink-soft hover:bg-surface-hover hover:text-ink-display focus-visible:bg-surface-hover';

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
  const { open, setOpen, rootRef, triggerRef } = useMenu();
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
            ? 'bg-accent/10 border-accent text-accent' 
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
              ? 'bg-surface-elevated/50 text-accent font-extrabold shadow-inner' 
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
              ? 'bg-surface-elevated/50 text-accent font-extrabold shadow-inner' 
              : 'bg-surface text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableProperties className="w-3.5 h-3.5" />
          <span className="inline">ตาราง</span>
        </button>
      </div>

      {/* Split button: the common case (expense) is one click; income + month deletion live behind the caret */}
      <div ref={rootRef} className="relative flex">
        <button
          type="button"
          onClick={() => handleOpenAddModal('', 'expense')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-accent text-on-accent hover:bg-accent-active"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>เพิ่มรายจ่าย</span>
        </button>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="ตัวเลือกเพิ่มเติม"
          onClick={() => setOpen(o => !o)}
          className="px-2 border-l bg-accent text-on-accent hover:bg-accent-active tint-border"
          style={{ '--tint-border-color': 'rgb(var(--on-accent) / 0.25)' } as React.CSSProperties}
        >
          <ChevronDown className={`w-3.5 h-3.5 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div role="menu" aria-label="ตัวเลือกเพิ่มเติม" className="absolute right-0 top-full mt-1 z-50 w-56 py-1 bg-surface-elevated border border-line-strong shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
            <button
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); handleOpenAddModal('', 'income'); }}
              className={MENU_ITEM}
            >
              <PlusCircle className="w-4 h-4 text-income shrink-0" />
              <span>เพิ่มรายรับ</span>
            </button>
            {hasTransactions && (
              <>
                <div className="my-1 h-px bg-line" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { if (confirmDeleteMonth) setOpen(false); handleDeleteMonthClick(); }}
                  className={`${MENU_ITEM} ${confirmDeleteMonth ? '!bg-danger-active !text-white' : '!text-danger hover:!bg-danger/10'}`}
                  title="ลบข้อมูลทั้งเดือนนี้ (กด 2 ครั้งเพื่อยืนยัน)"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>{confirmDeleteMonth ? 'กดอีกครั้งเพื่อยืนยันลบ' : 'ลบข้อมูลเดือนนี้'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerHeaderActions;
