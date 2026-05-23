import React from 'react';
import { ClipboardList, Inbox, Trash2, CalendarDays } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';

export default function CartList({
  pendingItems,
  onRemoveItem,
  isProcessing
}) {
  const dm = true;

  return (
    <div className={`w-full lg:w-[40%] flex flex-col p-5 min-h-0 ${'bg-slate-800/20'}`}>
      <div className="shrink-0 flex justify-between items-center mb-3">
        <h4 className={`font-bold text-sm flex items-center gap-2 ${'text-slate-300'}`}>
          <ClipboardList className={`w-4 h-4 ${'text-slate-500'}`} /> ตะกร้า
        </h4>
        <span className={`text-white px-2 py-0.5 rounded-sm text-[10px] font-bold ${'bg-blue-600'}`}>{pendingItems.length} รายการ</span>
      </div>
      <div className={`flex-1 overflow-y-auto border rounded-sm ${'bg-slate-900 border-slate-700'}`} style={{ scrollbarWidth: 'thin' }}>
        {pendingItems.length === 0 ? (
          <div className={`h-full min-h-[150px] flex flex-col items-center justify-center ${'text-slate-500'}`}>
            <Inbox className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs font-medium">ยังไม่มีรายการในตะกร้า</p>
          </div>
        ) : (
          <div className={`divide-y ${'divide-slate-800'}`}>
            {pendingItems.map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between p-3 transition-colors animate-in fade-in slide-in-from-right-4 duration-200 ${'hover:bg-slate-800'}`}>
                <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                  <div className={`text-[10px] font-bold w-4 text-right shrink-0 ${'text-slate-500'}`}>{idx + 1}.</div>
                  <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <div className={`font-bold text-xs truncate ${'text-slate-200'}`} title={item.description}>{item.description}</div>
                    <div className="flex flex-wrap items-center gap-1 mt-1 overflow-hidden w-full">
                      <span className={`text-[9px] font-black px-1 py-0.5 rounded-sm shrink-0 ${item._isInc ? ('bg-emerald-900/40 text-emerald-400') : ('bg-red-900/40 text-red-400')}`}>
                        {item._isInc ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm border shrink min-w-0 flex items-center gap-0.5 ${'text-slate-200'}`}
                        style={{ backgroundColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${dm ? 0.2 : 0.1})`, borderColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${dm ? 0.4 : 0.3})` }}>
                        <span className="shrink-0">{item._catObj?.icon}</span>
                        <span className="truncate">{item.category}</span>
                      </span>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm border flex items-center gap-0.5 shrink-0 ${'text-slate-300 border-slate-700 bg-slate-800/80'}`}>
                        <CalendarDays className="w-2.5 h-2.5" /> {item.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-2 shrink-0">
                  <span className={`font-black text-sm whitespace-nowrap ${item._isInc ? ('text-emerald-400') : ('text-red-400')}`}>{formatMoney(item.amount)}</span>
                  <button type="button" onClick={() => onRemoveItem(item.id)} disabled={isProcessing} className={`p-1.5 rounded-sm transition-colors disabled:opacity-50 ${'text-slate-500 hover:text-white hover:bg-red-600/80'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}