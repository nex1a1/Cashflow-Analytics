import React, { useState, useEffect } from 'react';

export default function AmountEditableInput({ initialValue, onSave, className, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const handleFocus = () => setIsEditing(true);

  const handleBlur = () => {
    setIsEditing(false);
    const numVal = parseFloat(value);
    const finalVal = isNaN(numVal) ? 0 : numVal;
    if (finalVal !== parseFloat(initialValue || 0)) {
      onSave(finalVal);
    } else {
      setValue(initialValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') { setValue(initialValue); setIsEditing(false); }
  };

  const displayValue = isEditing
    ? value
    : (value ? Number(value).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '');

  return (
    <input
      type={isEditing ? 'number' : 'text'}
      value={displayValue}
      onChange={e => setValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}