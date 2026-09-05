import React, { memo } from 'react';
import { Trash2, Wallet, Coins, Inbox } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';

const ALLOCATION_BADGE_STYLES = {
  need: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
  want: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
  savings: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
};

const TxRow = memo(({ tx, catObj, confirmDeleteId, onDeleteClick }) => {
  const isInc = catObj?.type === 'income';
  const color = catObj?.color || '#94a3b8';
  const groupObj = catObj?._group;
  const isConfirming = confirmDeleteId === tx.id;
  
  const rowBg = `rgba(${hexToRgb(color)}, 0.06)`;
  const borderCls = 'border-[#303030]/60';
  const allocBadgeStyle = ALLOCATION_BADGE_STYLES[tx.allocation_type] || ALLOCATION_BADGE_STYLES.savings;
  
  return (
    <div 
      className={`flex items-center gap-2.5 px-3 py-2 rounded-none border transition-all ${borderCls} hover:border-[#404040]`}
      style={{ backgroundColor: rowBg }}
    >
      <div className="w-1.5 h-6 rounded-none shrink-0" style={{ backgroundColor: color }} />
      
      {/* Description & Category with Group Breadcrumb */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold truncate text-slate-100">
            {tx.description || tx.category}
          </p>

          {/* Allocation Type Badge */}
          {tx.allocation_type && !isInc && (
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-none border shrink-0 ${allocBadgeStyle}`}>
              {(tx.allocation_type === 'savings' ? 'SAVE' : tx.allocation_type).toUpperCase()}
            </span>
          )}
        </div>

        {/* Group Breadcrumb & Category */}
        <div className="text-[10px] font-medium flex items-center gap-1 mt-0.5 min-w-0" style={{ color, filter: 'brightness(1.25)' }}>
          <span className="shrink-0">{catObj?.icon}</span>
          {groupObj?.name && (
            <>
              <span className="opacity-60 font-medium truncate max-w-[90px]" title={`กลุ่ม: ${groupObj.name}`}>
                {groupObj.name}
              </span>
              <span className="opacity-35 text-[9px] select-none">›</span>
            </>
          )}
          <span className="truncate font-semibold">{catObj?.name || tx.category}</span>
        </div>
      </div>

      {/* Amount (Ledger Inter Font) */}
      <span className={`text-xs font-bold shrink-0 tabular-nums tracking-tight ${isInc ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
        {isInc ? '+฿' : '-฿'}{formatMoney(tx.amount)}
      </span>

      {/* Delete Action */}
      <button 
        type="button"
        onClick={() => onDeleteClick(tx.id)}
        className={`shrink-0 px-2 py-1.5 rounded-none text-xs font-bold transition-colors ${
          isConfirming 
            ? 'bg-[#da291c] text-white border border-[#da291c] animate-pulse' 
            : 'text-slate-400 hover:text-red-400 hover:bg-[#303030] border border-transparent hover:border-red-800/20'
        }`}
        title={isConfirming ? "คลิกอีกครั้งเพื่อยืนยันลบ" : "ลบรายการ"}
      >
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
  const expenses = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'expense');
  const income   = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'income');

  const tokens = {
    textMuted: 'text-slate-400',
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
          <p className="text-xs font-black mb-2 flex items-center gap-1.5 text-emerald-400 uppercase tracking-wider font-sans">
            <Coins className="w-3.5 h-3.5" /> รายรับ ({income.length})
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
          <p className="text-xs font-black mb-2 flex items-center gap-1.5 text-rose-400 uppercase tracking-wider font-sans">
            <Wallet className="w-3.5 h-3.5" /> รายจ่าย ({expenses.length})
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