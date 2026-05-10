import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export default function InlineConfirmDelete({ onDelete, isDarkMode }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const handleClick = () => {
    if (confirming) { clearTimeout(timer.current); onDelete(); }
    else { setConfirming(true); timer.current = setTimeout(() => setConfirming(false), 3000); }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      onClick={handleClick}
      className={`rounded transition-all active:scale-95 ${
        confirming
          ? 'bg-red-500 text-white px-2.5 py-1 text-[11px] font-bold animate-pulse'
          : `p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 ${
              isDarkMode
                ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30'
                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
            }`
      }`}
      title="ลบ"
    >
      {confirming ? 'ยืนยัน?' : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}