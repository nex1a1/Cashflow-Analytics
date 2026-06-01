import { useState, useEffect, useRef, memo } from 'react';
import { Trash2 } from 'lucide-react';

const ConfirmDeleteButton = memo(({ onConfirm, size = 'sm', disabled = false, tooltip = 'ลบ' }) => {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const handleClick = () => {
    if (disabled) return;
    if (confirming) {
      clearTimeout(timer.current);
      onConfirm();
      setConfirming(false);
    } else {
      setConfirming(true);
      timer.current = setTimeout(() => setConfirming(false), 3000);
    }
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
      <button 
        onClick={handleClick} 
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border rounded-none ${
          confirming
            ? 'bg-[#da291c] text-white border-[#da291c] animate-pulse'
            : 'bg-red-950/20 text-red-400 hover:bg-[#da291c] hover:text-white border-red-900/50 hover:border-[#da291c]'
        }`}
        title={confirming ? 'ยืนยันการลบ?' : tooltip}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {confirming ? 'ยืนยัน? คลิกอีกครั้ง' : 'ล้างข้อมูลทั้งหมด'}
      </button>
    );
  }

  return (
    <button 
      onClick={handleClick} 
      disabled={disabled}
      className={`p-1.5 transition-all active:scale-95 rounded-none ${
        disabled
          ? 'opacity-20 cursor-not-allowed'
          : confirming
            ? 'bg-[#da291c] text-white animate-pulse'
            : 'text-[#888888] hover:text-white hover:bg-[#da291c]/25 border border-transparent hover:border-[#da291c]/45'
      }`}
      title={confirming ? 'ยืนยันการลบ?' : tooltip}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
});

export default ConfirmDeleteButton;

