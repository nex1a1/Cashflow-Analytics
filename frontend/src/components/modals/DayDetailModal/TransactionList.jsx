import React, { memo } from 'react';
import { Trash2, Wallet, Coins, Inbox } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';

const TxRow = memo(({ tx, catObj, confirmDeleteId, onDeleteClick }) => {
  const { isDarkMode: dm } = useTheme();
  const isInc = catObj?.type === 'income';
  const color = catObj?.color || '#94a3b8';
  const isConfirming = confirmDeleteId === tx.id;
  
  const rowBg = `rgba(${hexToRgb(color)}, ${dm ? 0.06 : 0.04})`;
  const borderCls = dm ? 'border-slate-700/60' : 'border-slate-100';
  const textPriCls = dm ? 'text-slate-100' : 'text-slate-800';
  
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-all ${borderCls}`}
      style={{ backgroundColor: rowBg }}>
      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${textPriCls}`}>{tx.description || tx.category}</p>
        <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5" style={{ color, filter: dm ? 'brightness(1.3)' : 'brightness(0.7)' }}>
          {catObj?.icon} {tx.category}
        </p>
      </div>
      <span className={`text-sm font-black shrink-0 ${isInc ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-red-400' : 'text-red-600')}`}>
        {isInc ? '+' : '-'}{formatMoney(tx.amount)} ฿
      </span>
      <button onClick={() => onDeleteClick(tx.id)}
        className={`shrink-0 px-2 py-1 rounded-sm text-xs font-bold transition-all active:scale-95 ${isConfirming ? 'bg-red-500 text-white' : (dm ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50')}`}>
        {isConfirming ? 'ยืนยัน?' : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}, (prev, next) => {
  return prev.tx.id === next.tx.id && 
         prev.tx.amount === next.tx.amount &&
         prev.confirmDeleteId === next.confirmDeleteId;
});

export default function TransactionList({
  dayTx,
  catMap,
  confirmDeleteId,
  handleDelete
}) {
  const { isDarkMode: dm } = useTheme();

  const expenses = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'expense');
  const income   = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'income');

  const tokens = {
    textMuted: dm ? 'text-slate-400' : 'text-slate-500',
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: 'thin' }}>
      {dayTx.length === 0 && (
        <div className={`h-full flex flex-col items-center justify-center ${tokens.textMuted} opacity-80`}>
          <Inbox className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-bold">ยังไม่มีรายการ</p>
          <p className="text-xs mt-1">เพิ่มข้อมูลใหม่ที่ฟอร์มด้านล่างเลยครับ!</p>
        </div>
      )}
      {income.length > 0 && (
        <div>
          <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Coins className="w-3.5 h-3.5" /> รายรับ
          </p>
          <div className="space-y-1.5">
            {income.map(tx => (
              <TxRow 
                key={tx.id} 
                tx={tx} 
                catObj={catMap[tx.category_id] || catMap[tx.category]} 
                confirmDeleteId={confirmDeleteId} 
                onDeleteClick={handleDelete} 
              />
            ))}
          </div>
        </div>
      )}
      {expenses.length > 0 && (
        <div>
          <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${dm ? 'text-red-400' : 'text-red-600'}`}>
            <Wallet className="w-3.5 h-3.5" /> รายจ่าย
          </p>
          <div className="space-y-1.5">
            {expenses.map(tx => (
              <TxRow 
                key={tx.id} 
                tx={tx} 
                catObj={catMap[tx.category_id] || catMap[tx.category]} 
                confirmDeleteId={confirmDeleteId} 
                onDeleteClick={handleDelete} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}