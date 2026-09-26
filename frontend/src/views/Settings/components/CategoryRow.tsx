import React, { memo } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import ConfirmDeleteButton from '@/components/shared/ConfirmDeleteButton';
import ColorPicker from './ColorPicker';
import DebouncedInput from './DebouncedInput';
import IconPicker from '@/components/shared/IconPicker';
import { Category, CashflowGroup } from '../../../types';

export interface CategoryRowProps {
  cat: Category;
  isNew?: boolean;
  isIncome?: boolean;
  onMove: (id: string, dir: string) => void;
  onChange: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
  filteredGroups?: CashflowGroup[];
  cashflowGroups?: CashflowGroup[];
  isFirst?: boolean;
  isLast?: boolean;
}

const CategoryRow = memo(({
  cat,
  isNew,
  isIncome,
  onMove,
  onChange,
  onDelete,
  filteredGroups = [],
  cashflowGroups = [],
  isFirst,
  isLast
}: CategoryRowProps) => {
  const focusBorder = isIncome 
    ? 'focus:border-emerald-500/70' 
    : 'focus:border-accent/70';

  const accentFocus = `${focusBorder} focus:shadow-none focus:ring-0`;

  const group = cashflowGroups.find(g => g.id === cat.cashflowGroup);
  const groupColor = group?.color || '#334155';

  const currentGroupValid = !cat.cashflowGroup || filteredGroups.some(g => g.id === cat.cashflowGroup);

  const inputCls = `px-2 py-1.5 border outline-none font-semibold text-[13px] flex-1 min-w-0 rounded-sm bg-canvas border-line ${accentFocus} text-ink-display placeholder-ink-muted`;

  const selectTheme = !currentGroupValid
    ? 'border-amber-600/50 bg-amber-950/20 text-amber-400 focus:border-amber-500'
    : `bg-canvas border-line text-ink-display ${focusBorder}`;
  const selectCls = `border text-[11px] font-bold py-1.5 px-2 outline-none cursor-pointer w-40 rounded-sm ${selectTheme}`;

  return (
    <div
      style={{ borderLeftColor: groupColor, borderLeftWidth: '1px' }}
      className="flex flex-nowrap items-center gap-1.5 px-2 py-1.5 border-b last:border-0 group/cat border-line hover:bg-surface-hover/30"
    >
      <div className="flex flex-col items-center shrink-0 opacity-0 group-hover/cat:opacity-100 text-ink-muted">
        <button
          type="button"
          onClick={() => onMove(cat.id, 'UP')}
          disabled={isFirst}
          className="p-0.5 rounded-sm disabled:opacity-20 disabled:cursor-default hover:text-white hover:bg-surface-elevated"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(cat.id, 'DOWN')}
          disabled={isLast}
          className="p-0.5 rounded-sm disabled:opacity-20 disabled:cursor-default hover:text-white hover:bg-surface-elevated"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <IconPicker icon={cat.icon} color={cat.color} onChange={v => onChange(cat.id, 'icon', v)} />

      <DebouncedInput
        requiredMessage="ต้องมีชื่อหมวดหมู่"
        isNew={isNew}
        value={cat.name || ''}
        onDebouncedChange={val => onChange(cat.id, 'name', val)}
        className={inputCls}
        placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'}
      />

      <div className="relative shrink-0">
        <select
          value={cat.cashflowGroup || ''}
          onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
          className={selectCls}
          title={!currentGroupValid ? 'กลุ่มนี้ไม่ตรงกับประเภทของหมวดหมู่' : undefined}
          aria-label="กลุ่ม Cashflow ของหมวดหมู่"
        >
          <option value="" disabled>-- กลุ่ม --</option>
          {filteredGroups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {!currentGroupValid && (
          <AlertTriangle className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 pointer-events-none" />
        )}
      </div>

      <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} />

      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} tooltip="ลบหมวดหมู่" itemLabel={cat.name} />
    </div>
  );
});

export default CategoryRow;
