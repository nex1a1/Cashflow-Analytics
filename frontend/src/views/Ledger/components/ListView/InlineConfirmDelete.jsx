import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export default function InlineConfirmDelete({ onDelete, isDarkMode }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const handleClick = () => {
    if (confirming) { 
      clearTimeout(timer.current); 
      onDelete(); 
    } else { 
      setConfirming(true); 
      timer.current = setTimeout(() => setConfirming(false), 3000); 
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      onClick={handleClick}
      className={`rounded-none transition-all active:scale-95 ${
        confirming
          ? 'bg-[#da291c] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest font-mono border border-[#da291c]'
          : 'p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent'
      }`}
      title={confirming ? 'กดอีกครั้งเพื่อลบ' : 'ลบรายการ'}
    >
      {confirming ? 'ลบ?' : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}