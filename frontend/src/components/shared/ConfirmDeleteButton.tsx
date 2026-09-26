import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { useConfirmTimeout } from '@/hooks/useConfirmTimeout';

export interface ConfirmDeleteButtonProps {
  onConfirm: () => void;
  /** 'icon' = trash glyph in a row; 'label' = full button with text */
  variant?: 'icon' | 'label';
  label?: string;
  disabled?: boolean;
  tooltip?: string;
  /** what is being deleted, for screen readers ("ลบรายการ: ค่าข้าว ฿60") */
  itemLabel?: string;
  /** hide until the row is hovered / focused (Ledger rows) */
  revealOnHover?: boolean;
}

/**
 * The single delete-confirm control: click to arm (turns solid red, says "กดอีกครั้งเพื่อลบ"),
 * click again within 3s to delete, Esc or waiting cancels. Pair with an undo toast where the
 * delete is recoverable.
 */
const ConfirmDeleteButton = memo(({
  onConfirm, variant = 'icon', label = 'ลบ', disabled = false, tooltip = 'ลบ', itemLabel, revealOnHover = false,
}: ConfirmDeleteButtonProps) => {
  const { confirming, trigger } = useConfirmTimeout();
  const armed = confirming && !disabled;
  const aria = armed ? `กดอีกครั้งเพื่อยืนยันลบ${itemLabel ? `: ${itemLabel}` : ''}` : `${tooltip}${itemLabel ? `: ${itemLabel}` : ''}`;

  const tone = armed
    ? 'bg-danger-active text-white border-danger-active'
    : variant === 'label'
      ? 'bg-danger/5 text-danger border-danger/30 hover:bg-danger/10 hover:border-danger/60'
      : 'text-ink-muted border-transparent hover:text-danger hover:bg-danger/10';

  return (
    <button
      type="button"
      onClick={() => !disabled && trigger(onConfirm)}
      disabled={disabled}
      title={armed ? 'กดอีกครั้งเพื่อยืนยัน · Esc ยกเลิก' : tooltip}
      aria-label={aria}
      className={`shrink-0 inline-flex items-center gap-1.5 border font-bold disabled:opacity-30 disabled:cursor-not-allowed ${tone} ${
        variant === 'label' ? 'px-4 py-2 text-sm' : armed ? 'px-2 py-1 text-[11px]' : 'p-1.5'
      } ${revealOnHover && !armed ? 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100' : ''}`}
    >
      {(variant === 'label' || !armed) && <Trash2 className={variant === 'label' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      {variant === 'label' ? (armed ? 'กดอีกครั้งเพื่อยืนยัน' : label) : armed && 'ลบ?'}
    </button>
  );
});

ConfirmDeleteButton.displayName = 'ConfirmDeleteButton';
export default ConfirmDeleteButton;
