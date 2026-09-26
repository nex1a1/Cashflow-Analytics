import React, { memo } from 'react';
import { Wallet, Coins, Inbox } from 'lucide-react';
import ConfirmDeleteButton from '../../shared/ConfirmDeleteButton';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import CategoryGlyph from '../../shared/CategoryGlyph';

import { tc } from '@/constants/theme';
const ALLOCATION_BADGE_STYLES: Record<string, string> = {
  need: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
  want: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
  savings: 'bg-savings/10 text-savings border-savings/30'
};

export interface TxRowProps {
  tx: any;
  catObj?: any;
  onDeleteClick: (id: string) => void;
}

export interface TransactionListProps {
  dayTx: any[];
  catMap: Record<string, any>;
  handleDelete: (id: string) => void;
  sortBy?: 'category' | 'amount';
  setSortBy?: (sortBy: 'category' | 'amount') => void;
}

const TxRow = memo(({ tx, catObj, onDeleteClick }: TxRowProps) => {
  const isInc = catObj?.type === 'income';
  const color = catObj?.color || tc('ink-body');
  const groupObj = catObj?._group;
  
  const rowBg = `rgba(${hexToRgb(color)}, 0.06)`;
  const borderCls = 'border-line/60';
  const allocBadgeStyle = ALLOCATION_BADGE_STYLES[tx.allocation_type] || ALLOCATION_BADGE_STYLES.savings;
  
  return (
    <div 
      className={`flex items-center gap-2.5 px-3 py-2 rounded-none border transition-all ${borderCls} hover:border-line-strong`}
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
            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-none border shrink-0 ${allocBadgeStyle}`}>
              {(tx.allocation_type === 'savings' ? 'SAVE' : tx.allocation_type).toUpperCase()}
            </span>
          )}
        </div>

        {/* Group Breadcrumb & Category */}
        <div className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5 min-w-0" style={{ color, filter: 'brightness(1.25)' }}>
          <CategoryGlyph icon={catObj?.icon} color={color} size={18} className="shrink-0" />
          {groupObj?.name && (
            <>
              <span className="text-ink-body font-medium truncate max-w-[90px]" title={`กลุ่ม: ${groupObj.name}`}>
                {groupObj.name}
              </span>
              <span className="text-ink-muted text-[11px] select-none" aria-hidden="true">›</span>
            </>
          )}
          <span className="truncate font-semibold">{catObj?.name || tx.category}</span>
        </div>
      </div>

      {/* Amount (Ledger Inter Font) */}
      <span className={`text-xs font-bold shrink-0 tabular-nums tracking-tight ${isInc ? 'text-emerald-400' : 'text-expense'}`}>
        {isInc ? '+฿' : '-฿'}{formatMoney(tx.amount)}
      </span>

      <ConfirmDeleteButton
        onConfirm={() => onDeleteClick(tx.id)}
        tooltip="ลบรายการ"
        itemLabel={`${tx.description || tx.category} ${isInc ? '+' : '-'}฿${formatMoney(tx.amount)}`}
      />
    </div>
  );
}, (prev, next) => {
  return prev.tx.id === next.tx.id && 
         prev.tx.amount === next.tx.amount &&
         prev.onDeleteClick === next.onDeleteClick;
});

export default function TransactionList({
  dayTx,
  catMap,
  handleDelete,
  sortBy = 'category'
}: TransactionListProps) {
  const sortedTx = sortBy === 'amount'
    ? [...dayTx].sort((a, b) => (Number.parseFloat(String(b.amount)) || 0) - (Number.parseFloat(String(a.amount)) || 0))
    : dayTx;

  const expenses = sortedTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'expense');
  const income   = sortedTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'income');

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
            <Coins className="w-4.5 h-4.5" /> รายรับ ({income.length})
          </p>
          <div className="space-y-1.5">
            {income.map(tx => (
              <TxRow 
                key={tx.id} 
                tx={tx} 
                catObj={catMap[tx.category_id] || catMap[tx.category]} 
                onDeleteClick={handleDelete} 
              />
            ))}
          </div>
        </div>
      )}
      {expenses.length > 0 && (
        <div>
          <p className="text-xs font-black mb-2 flex items-center gap-1.5 text-expense uppercase tracking-wider font-sans">
            <Wallet className="w-4.5 h-4.5" /> รายจ่าย ({expenses.length})
          </p>
          <div className="space-y-1.5">
            {expenses.map(tx => (
              <TxRow 
                key={tx.id} 
                tx={tx} 
                catObj={catMap[tx.category_id] || catMap[tx.category]} 
                onDeleteClick={handleDelete} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}