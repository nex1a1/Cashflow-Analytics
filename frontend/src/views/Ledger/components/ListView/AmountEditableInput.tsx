import React, { useState, useEffect, useRef, useId } from 'react';
import FieldError from '@/components/shared/FieldError';
import { formatMoney } from '../../../../utils/formatters';

import { tc } from '@/constants/theme';
interface AmountEditableInputProps {
  initialValue: number | string;
  isInc?: boolean;
  /** return false when the save failed so the cell can say so */
  onSave: (val: number) => Promise<boolean> | boolean | void;
  placeholder?: string;
}

export default function AmountEditableInput({ initialValue, isInc = false, onSave, placeholder }: AmountEditableInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string | number>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  // Sync with initialValue only when not editing
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue === 0 || initialValue === '0' ? '' : initialValue);
    }
  }, [initialValue, isEditing]);

  const revert = () => setValue(initialValue === 0 || initialValue === '0' ? '' : initialValue);

  const handleBlur = async () => {
    // Remove commas, signs, and currency symbols before parsing just in case
    const cleanValue = String(value).replaceAll(',', '').replace('+', '').replace('-', '').replace('฿', '').trim();
    const numVal = Number(cleanValue);
    // Never turn a typo into ฿0: the cell stays open with the message until it's fixed or Esc'd
    if (cleanValue === '' || !Number.isFinite(numVal) || numVal <= 0) {
      setError('ใส่จำนวนเงินเป็นตัวเลขมากกว่า 0 (Esc เพื่อยกเลิก)');
      return;
    }
    setError(null);
    setIsEditing(false);
    const finalVal = Math.abs(numVal);
    const initialNum = Number.parseFloat(String(initialValue) || '0');
    if (finalVal === initialNum) { revert(); return; }
    const ok = await onSave(finalVal);
    if (ok === false) setError('บันทึกไม่สำเร็จ ค่ากลับเป็นค่าเดิมแล้ว');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      e.preventDefault();
      revert();
      setError(null);
      setIsEditing(false);
    }
  };

  const hasValue = value !== '' && value !== undefined && value !== null;
  const displayVal = hasValue ? formatMoney(value) : (placeholder || '0.00');
  const activeColor = isInc ? tc('income') : tc('expense'); // Emerald for income, Vivid Rose Red for expense
  const prefix = isInc ? '+฿' : '-฿';
  const fontStyle: React.CSSProperties = { color: activeColor, fontFamily: "'Inter', 'Bai Jamjuree', sans-serif" };

  return (
    <div>
    <div 
      onClick={() => {
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }}
      className={`group/amt amount-editable-box relative flex items-center justify-between w-full rounded-sm border px-2 py-1 cursor-text transition-all ${
        error
          ? 'bg-surface tint-danger'
          : isEditing
          ? 'bg-surface border-accent ring-1 ring-accent/40' 
          : 'bg-transparent border-transparent hover:bg-surface hover:border-line-strong'
      }`}
      style={{ ...fontStyle, borderRadius: '4px' }}
    >
      {/* Pinned to far left: Currency Prefix */}
      <span 
        className="text-xs font-bold tracking-tight shrink-0 select-none opacity-90 mr-1"
        style={fontStyle}
      >
        {prefix}
      </span>

      {/* Pinned to far right: Numeric Amount */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => { setValue(e.target.value); if (error) setError(null); }}
          aria-label="จำนวนเงิน"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="amount-input w-full bg-transparent text-right text-xs font-bold tracking-tight tabular-nums outline-none"
          style={fontStyle}
          placeholder="0.00"
          autoFocus
        />
      ) : (
        <span 
          className="w-full text-right text-xs font-bold tracking-tight tabular-nums truncate select-none"
          style={fontStyle}
        >
          {displayVal}
        </span>
      )}
    </div>
    <FieldError id={errorId} message={error} />
    </div>
  );
}
