import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export default function ConfirmDeleteButton({ onConfirm, size = 'sm', disabled = false, tooltip = 'ลบ' }) {
  const isDarkMode = true;
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const handleClick = () => {
    if (disabled) return;
    if (confirming) { clearTimeout(timer.current); onConfirm(); setConfirming(false); }
    else { setConfirming(true); timer.current = setTimeout(() => setConfirming(false), 3000); }
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!confirming) return;
    const h = (e) => { if (e.key === 'Escape') setConfirming(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [confirming]);

  if (size === 'lg') {
    return (
      <button onClick={handleClick} disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border ${
          confirming
            ? 'bg-red-600 text-white border-red-600 animate-pulse'
            : 'bg-red-950/60 text-red-300 hover:bg-red-600 hover:text-white border-red-800'
        }`}
        title={confirming ? 'ยืนยันการลบ?' : tooltip}>
        <Trash2 className="w-3.5 h-3.5" />
        {confirming ? 'ยืนยัน? คลิกอีกครั้ง' : 'ล้างข้อมูลทั้งหมด'}
      </button>
    );
  }
  return (
    <button onClick={handleClick} disabled={disabled}
      className={`p-1 transition-all active:scale-95 ${
        disabled
          ? 'opacity-20 cursor-not-allowed'
          : confirming
            ? 'bg-red-500 text-white animate-pulse'
            : 'text-slate-600 hover:text-white hover:bg-red-500/80'
      }`}
      title={confirming ? 'ยืนยันการลบ?' : tooltip}>
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
