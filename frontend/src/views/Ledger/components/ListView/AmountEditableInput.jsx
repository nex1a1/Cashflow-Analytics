import React, { useState, useEffect } from 'react';

export default function AmountEditableInput({ initialValue, onSave, className, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');

  // Sync with initialValue only when not editing
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue === 0 || initialValue === '0' ? '' : initialValue);
    }
  }, [initialValue, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    // Remove commas before parsing just in case
    const cleanValue = String(value).replaceAll(',', '');
    const numVal = Number.parseFloat(cleanValue);
    const finalVal = Number.isNaN(numVal) ? 0 : numVal;
    
    const initialNum = Number.parseFloat(initialValue || 0);
    // Only save if the value actually changed
    if (finalVal !== initialNum) {
      onSave(finalVal);
    } else {
      // Revert to initialValue (formatted)
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

  const formatDisplay = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    const num = Number(val);
    if (Number.isNaN(num)) return val; // Fallback if somehow not a number
    return num.toLocaleString('th-TH', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isEditing ? value : formatDisplay(value)}
      onChange={e => setValue(e.target.value)}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}