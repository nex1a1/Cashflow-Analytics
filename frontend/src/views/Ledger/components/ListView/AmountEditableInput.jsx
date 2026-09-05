import React, { useState, useEffect, useRef } from 'react';
import { formatMoney } from '../../../../utils/formatters';

export default function AmountEditableInput({ initialValue, isInc = false, onSave, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  // Sync with initialValue only when not editing
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue === 0 || initialValue === '0' ? '' : initialValue);
    }
  }, [initialValue, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    // Remove commas, signs, and currency symbols before parsing just in case
    const cleanValue = String(value).replaceAll(',', '').replace('+', '').replace('-', '').replace('฿', '').trim();
    const numVal = Number.parseFloat(cleanValue);
    const finalVal = Number.isNaN(numVal) ? 0 : Math.abs(numVal);
    
    const initialNum = Number.parseFloat(initialValue || 0);
    // Only save if the value actually changed
    if (finalVal !== initialNum) {
      onSave(finalVal);
    } else {
      // Revert to initialValue
      setValue(initialValue === 0 || initialValue === '0' ? '' : initialValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') {
      setValue(initialValue === 0 || initialValue === '0' ? '' : initialValue);
      setIsEditing(false);
    }
  };

  const hasValue = value !== '' && value !== undefined && value !== null;
  const displayVal = hasValue ? formatMoney(value) : (placeholder || '0.00');
  const activeColor = isInc ? '#34d399' : '#f87171'; // Emerald for income, Vivid Rose Red for expense
  const prefix = isInc ? '+฿' : '-฿';
  const fontStyle = { color: activeColor, fontFamily: "'Inter', 'Bai Jamjuree', sans-serif" };

  return (
    <div 
      onClick={() => {
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }}
      className={`group/amt relative flex items-center justify-between w-full rounded-none border px-2 py-1 cursor-text transition-all ${
        isEditing 
          ? 'bg-[#121212] border-[#da291c] ring-1 ring-[#da291c]/40' 
          : 'bg-transparent border-transparent hover:bg-[#141414] hover:border-[#383838]'
      }`}
      style={fontStyle}
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
          onChange={e => setValue(e.target.value)}
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
  );
}