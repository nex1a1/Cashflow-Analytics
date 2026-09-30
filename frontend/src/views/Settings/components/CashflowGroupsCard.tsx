import { memo, useMemo } from 'react';
import { ChevronUp, ChevronDown, Lock, AlertTriangle, Grid } from 'lucide-react';
import ColorPicker from './ColorPicker';
import ConfirmDeleteButton from '@/components/shared/ConfirmDeleteButton';
import SectionCard from './SectionCard';
import DebouncedInput from './DebouncedInput';
import IconPicker from '@/components/shared/IconPicker';
import AllocationSelect from '@/components/shared/AllocationSelect';
import Dropdown from '@/components/shared/Dropdown';

const GROUPS_ICON = <Grid className="w-4 h-4" />;
const GROUP_TYPE_OPTIONS = [
  { value: 'income', label: 'รายรับ' },
  { value: 'expense', label: 'รายจ่าย' },
  { value: 'savings', label: 'ลงทุน/ออม' },
];

import { Category, CashflowGroup } from '../../../types';

export interface CashflowGroupsCardProps {
  cashflowGroups: CashflowGroup[];
  handleAddCashflowGroup: () => void;
  handleMoveCashflowGroup: (id: string, dir: 'UP' | 'DOWN') => void;
  handleChangeCashflowGroup: (id: string, field: string, value: any) => unknown;
  handleDeleteGroup: (id: string) => void;
  cashflowDeleteError: { id: string; msg: string } | null;
  txCountByGroup: Record<string, number>;
  categories: Category[];
}

const CashflowGroupsCard = memo(({
  cashflowGroups, handleAddCashflowGroup, handleMoveCashflowGroup,
  handleChangeCashflowGroup, handleDeleteGroup, cashflowDeleteError,
  txCountByGroup, categories
}: CashflowGroupsCardProps) => {
  const addAction = useMemo(() => ({
    label: 'เพิ่ม', onClick: handleAddCashflowGroup
  }), [handleAddCashflowGroup]);

  return (
    <SectionCard
      accentColor="purple"
      icon={GROUPS_ICON}
      title="กลุ่มรายรับ-รายจ่าย"
      badge={cashflowGroups.length}
      action={addAction}
    >
      <div className="p-3 space-y-2 bg-canvas/30">
        {[...cashflowGroups].sort((a, b) => a.order_index - b.order_index).map((group, idx, arr) => {
          const hasError = cashflowDeleteError?.id === group.id;
          const txCount  = txCountByGroup[group.id] || 0;
          const inUse    = categories.some(c => c.cashflowGroup === group.id);
          return (
            <div key={group.id} className="flex flex-col gap-1">
              <div className={`flex items-center gap-1.5 p-1.5 border rounded-sm group/cg transition-colors ${
                hasError
                  ? 'tint-danger bg-danger/5'
                  : 'bg-surface border-line hover:bg-surface-hover/50 hover:border-line-strong'
              }`}>
                <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cg:opacity-100 focus-within:opacity-100 ${'text-ink-muted'}`}>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'UP')} aria-label={`เลื่อน ${group.name} ขึ้น`} disabled={idx === 0}
                    className={`p-0.5 rounded-sm disabled:opacity-20 disabled:cursor-default ${'hover:text-accent-ink hover:bg-surface-elevated'}`}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'DOWN')} aria-label={`เลื่อน ${group.name} ลง`} disabled={idx === arr.length - 1}
                    className={`p-0.5 rounded-sm disabled:opacity-20 disabled:cursor-default ${'hover:text-accent-ink hover:bg-surface-elevated'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <ColorPicker color={group.color || '#64748B'} onChange={c => handleChangeCashflowGroup(group.id, 'color', c)} />

                <IconPicker icon={group.icon} color={group.color} onChange={v => handleChangeCashflowGroup(group.id, 'icon', v)} />


                <Dropdown
                  value={group.type}
                  options={GROUP_TYPE_OPTIONS}
                  onChange={v => handleChangeCashflowGroup(group.id, 'type', v)}
                  disabled={group.isDefault || inUse}
                  className="w-[110px] shrink-0 bg-canvas border-line text-ink-display"
                  title={inUse ? 'มีหมวดหมู่ใช้งานอยู่ ไม่สามารถเปลี่ยนประเภทได้' : undefined}
                  aria-label="ประเภทกลุ่ม"
                />

                {group.type === 'expense' ? (
                  <div className="w-[100px] shrink-0">
                    <AllocationSelect
                      value={group.allocation_type || 'want'}
                      onChange={val => handleChangeCashflowGroup(group.id, 'allocation_type', val)}
                    />
                  </div>
                ) : group.type === 'savings' ? (
                  <div className="w-[100px] shrink-0 text-center text-[11px] font-bold text-savings" title="กลุ่มลงทุน/ออมเป็น SAVE เสมอ">SAVE</div>
                ) : (
                  <div className="w-[100px] shrink-0" />
                )}

                <DebouncedInput
                  requiredMessage="ต้องมีชื่อกลุ่ม"
                  value={group.name}
                  onDebouncedChange={val => handleChangeCashflowGroup(group.id, 'name', val)}
                  className={`flex-1 min-w-0 px-2 py-1.5 border outline-none font-semibold text-[13px] rounded-sm ${
                    'bg-canvas border-line text-ink-display focus:border-accent-ink focus:shadow-none placeholder-ink-muted'
                  }`}
                  placeholder="ชื่อกลุ่ม"
                />

                <div className="flex items-center justify-end min-w-[32px] shrink-0">
                  {txCount > 0 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 leading-none rounded-pill tabular-nums ${
                      'bg-surface-elevated text-ink-body border border-line'
                    }`} title={`มี ${txCount} รายการในกลุ่มนี้ (ในมุมมองปัจจุบัน)`}>
                      {txCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center w-[28px] shrink-0">
                  {group.isDefault ? (
                    <span title="กลุ่มเริ่มต้นลบไม่ได้">
                      <Lock className="w-4 h-4 text-ink-muted" />
                    </span>
                  ) : (
                    <ConfirmDeleteButton
                      onConfirm={() => handleDeleteGroup(group.id)}
                      disabled={inUse}
                      tooltip={inUse ? 'ลบไม่ได้ มีหมวดหมู่ใช้งานอยู่' : 'ลบกลุ่มนี้'}
                    />
                  )}
                </div>
              </div>

              {hasError && (
                <p className={`text-[11px] font-semibold px-2 py-1 border rounded-pill flex items-center gap-1 ${
                  'bg-danger/10 border-danger/50 text-danger'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {cashflowDeleteError.msg}
                </p>
              )}
            </div>
          );
        })}
        {cashflowGroups.length === 0 && (
          <p className={`text-center py-4 text-xs ${'text-ink-muted'}`}>ยังไม่มีกลุ่ม</p>
        )}
      </div>
    </SectionCard>
  );
});

export default CashflowGroupsCard;
