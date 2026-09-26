import React, { useEffect, useRef } from 'react';
import { ClipboardList, Inbox, Trash2, CalendarDays, Pencil } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import { PendingBatchItem } from './index';
import CategoryGlyph from '../../shared/CategoryGlyph';

import { tc } from '@/constants/theme';
export interface CartListProps {
  pendingItems: PendingBatchItem[];
  onRemoveItem: (id: string) => void;
  onEditItem?: (item: PendingBatchItem) => void;
  editingItemId?: string | null;
  isProcessing?: boolean;
}

function CartList({
  pendingItems,
  onRemoveItem,
  onEditItem,
  editingItemId,
  isProcessing
}: CartListProps) {
  const listBottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(pendingItems.length);

  useEffect(() => {
    if (pendingItems.length > prevCountRef.current) {
      listBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = pendingItems.length;
  }, [pendingItems.length]);

  return (
    <div className="w-full lg:w-[33%] flex flex-col p-5 min-h-0 bg-surface-hover">
      <div className="shrink-0 flex justify-between items-center mb-3">
        <h4 className="font-bold text-sm flex items-center gap-2 text-slate-300">
          <ClipboardList className="w-4 h-4 text-slate-400" /> ตะกร้า
        </h4>
        <span className="text-on-accent px-2 py-0.5 rounded-none text-[11px] font-bold bg-accent">
          {pendingItems.length} รายการ
        </span>
      </div>
      <div className="flex-1 overflow-y-auto border rounded-none bg-canvas border-line-strong" style={{ scrollbarWidth: 'thin' }}>
        {pendingItems.length === 0 ? (
          <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-slate-500">
            <Inbox className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs font-medium">ยังไม่มีรายการในตะกร้า</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {pendingItems.map((item, idx) => {
              const isEditing = item.id === editingItemId;
              const catColor = item._catObj?.color || tc('ink-body');
              const catRgb = hexToRgb(catColor);

              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3 transition-colors ${
                    isEditing 
                      ? 'bg-amber-400/10 border-l-2 border-l-amber-400' 
                      : 'hover:bg-surface-elevated/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                    <div className="text-[11px] font-bold w-4 text-right shrink-0 text-slate-400">
                      {idx + 1}.
                    </div>
                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                      <div className="font-bold text-xs truncate text-slate-100 flex items-center gap-1.5" title={item.description}>
                        <span>{item.description}</span>
                        {isEditing && (
                          <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-none border border-amber-400/30">
                            กำลังแก้ไข
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1 overflow-hidden w-full">
                        <span className={`h-[22px] px-2 flex items-center text-[11px] font-black rounded-none shrink-0 ${
                          item._isInc 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                            : 'bg-expense/10 text-expense border border-expense/15'
                        }`}>
                          {item._isInc ? 'รายรับ' : 'รายจ่าย'}
                        </span>
                        <span 
                          className="h-[22px] px-2 flex items-center gap-1.5 text-[11px] font-bold rounded-none border shrink min-w-0 text-slate-100"
                          style={{ 
                            backgroundColor: `rgba(${catRgb}, 0.2)`, 
                            borderColor: `rgba(${catRgb}, 0.4)` 
                          }}
                        >
                          <CategoryGlyph icon={item._catObj?.icon} color={item._catObj?.color} size={15} className="shrink-0" />
                          {item._catObj?._group?.name && (
                            <>
                              <span className="text-ink-body font-medium truncate max-w-[70px]" title={`กลุ่ม: ${item._catObj._group.name}`}>
                                {item._catObj._group.name}
                              </span>
                              <span className="text-ink-muted text-[11px] select-none" aria-hidden="true">›</span>
                            </>
                          )}
                          <span className="truncate">{item.category}</span>
                        </span>
                        <span className="h-[22px] px-2 flex items-center gap-1.5 text-[11px] font-bold rounded-none border shrink-0 text-slate-200 border-line-strong bg-surface-elevated/40">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {item.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pl-2 shrink-0">
                    <span className={`text-xs font-bold tabular-nums tracking-tight shrink-0 mr-1 ${item._isInc ? 'text-emerald-400' : 'text-expense'}`}>
                      {item._isInc ? '+฿' : '-฿'}{formatMoney(item.amount)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => onEditItem?.(item)} 
                      disabled={isProcessing}
                      title="แก้ไขรายการนี้"
                      className={`p-1.5 rounded-none transition-colors disabled:opacity-50 ${
                        isEditing 
                          ? 'text-amber-400 bg-amber-400/20' 
                          : 'text-slate-400 hover:text-amber-400 hover:bg-amber-400/10'
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onRemoveItem(item.id)} 
                      disabled={isProcessing}
                      title="ลบรายการนี้"
                      className="p-1.5 rounded-none transition-colors disabled:opacity-50 text-slate-500 hover:text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={listBottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CartList);