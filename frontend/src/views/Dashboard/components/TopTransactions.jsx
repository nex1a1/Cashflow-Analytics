// src/views/Dashboard/components/TopTransactions.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

export default function TopTransactions({
  analytics, categories, topXLimit, setTopXLimit, isDarkMode
}) {
  const dm = isDarkMode;
  
  // นำ CSS Tokens เดิมมาใช้ภายใน Component นี้เพื่อการแสดงผลที่ถูกต้อง
  const card = `rounded-sm border shadow-sm transition-colors h-full ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  if (!analytics || !analytics.topTransactions) return null;

  return (
    <div className={`${card} p-4`}>
      <div className={`flex items-center justify-between ${divider}`}>
        <h3 className={cardHd}>
          <AlertCircle className="w-4 h-4 text-[#D81A21]" />
          TOP&nbsp;
          <select
            value={topXLimit} 
            onChange={(e) => setTopXLimit(Number(e.target.value))}
            className={`px-1 py-0.5 text-sm font-black rounded-sm border outline-none cursor-pointer appearance-none ${dm ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 border-slate-300 text-[#D81A21]'}`}
          >
            {[5, 7, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          &nbsp;รายจ่าย
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {analytics.topTransactions.map((tx, idx) => {
          const catDef = categories.find(c => c.name === tx.category);
          return (
            <div key={tx.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-sm border transition-colors hover:shadow-sm ${dm ? 'bg-slate-900/40 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
              <span className={`text-[11px] font-black w-4 text-center shrink-0 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</span>
              <div className="flex-1 overflow-hidden">
                <p className={`text-xs font-bold truncate leading-tight mb-0.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`} title={tx.description}>{tx.description}</p>
                <span className="text-[9px] font-bold px-1.5 py-[1px] rounded-sm border text-white inline-block max-w-full truncate" style={{ backgroundColor: catDef?.color || '#64748B', borderColor: catDef?.color || '#64748B' }}>
                  {catDef?.icon} {tx.category}
                </span>
              </div>
              <span className="text-xs font-black text-[#D81A21] whitespace-nowrap shrink-0">{formatMoney(tx.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

TopTransactions.propTypes = {
  analytics: PropTypes.object.isRequired,
  categories: PropTypes.array.isRequired,
  topXLimit: PropTypes.number.isRequired,
  setTopXLimit: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};