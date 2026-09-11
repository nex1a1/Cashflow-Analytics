import React from 'react';
import { Trash2 } from 'lucide-react';
import { useConfirmTimeout } from '../../../../hooks/useConfirmTimeout';

interface InlineConfirmDeleteProps {
  onDelete: () => void;
  isDarkMode?: boolean;
}

export default function InlineConfirmDelete({ onDelete }: InlineConfirmDeleteProps) {
  const { confirming, trigger } = useConfirmTimeout();

  return (
    <button
      onClick={() => trigger(onDelete)}
      className={`rounded-none ${
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
