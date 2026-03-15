// src/components/ui/EditableInput.jsx
import { useState, useEffect } from 'react';

export default function EditableInput({
  initialValue, type = 'text', onSave, className, placeholder
}) {
  const [val, setVal] = useState(initialValue || '');
  useEffect(() => { setVal(initialValue || ''); }, [initialValue]);

  return (
    <input
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        let finalVal = val;
        if (type === 'number') { finalVal = parseFloat(val) || 0; setVal(finalVal); }
        if (finalVal !== initialValue) onSave(finalVal);
      }}
      className={className}
      step={type === 'number' ? '0.01' : undefined}
      placeholder={placeholder}
    />
  );
}