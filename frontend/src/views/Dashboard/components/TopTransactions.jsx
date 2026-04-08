// src/views/Dashboard/components/TopTransactions.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, Calendar } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { isDateInFilter } from '../../../utils/dateHelpers'; // 👈 นำเข้าตัวช่วยกรองวันที่ของคุณ

export default function TopTransactions({
  transactions,
  filterPeriod,
  dashboardCategory,
  hideFixedExpenses,
  analytics, 
  categories, 
  topXLimit, 
  setTopXLimit, 
  isDarkMode
}) {
  const dm = isDarkMode;
  
  const card = `rounded-sm border shadow-sm transition-colors h-full ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  // ⭐️ กรองข้อมูลแบบเรียงลำดับชั้น
  const displayTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    let filtered = [...transactions];

    // 1. กรองตามช่วงเวลา โดยใช้ isDateInFilter (แก้ปัญหาหน้าว่าง)
    if (filterPeriod) {
      filtered = filtered.filter(tx => isDateInFilter(tx.date, filterPeriod));
    }

    // 2. คัดเฉพาะ "รายจ่าย" อย่างปลอดภัย
    filtered = filtered.filter(tx => {
      if (tx.type === 'expense') return true;
      if (tx.type === 'income') return false; 
      const catDef = categories?.find(c => c.name === tx.category);
      return catDef ? catDef.type === 'expense' : (tx.amount < 0);
    });

    // 3. ซ่อนรายจ่ายคงที่ (ถ้าเปิดใช้งาน)
    if (hideFixedExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = categories?.find(c => c.name === tx.category);
        return catDef ? !catDef.isFixed : true;
      });
    }

    // 4. กรองตามหมวดหมู่ที่เลือกบนกราฟ
    if (dashboardCategory) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      if (!activeCats.includes('ALL')) {
        filtered = filtered.filter(tx => activeCats.includes(tx.category));
      }
    }

    // 5. จัดเรียงจากมากไปน้อย
    filtered.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return filtered.slice(0, topXLimit || 7);
  }, [transactions, categories, hideFixedExpenses, dashboardCategory, topXLimit, filterPeriod]);

  if (!displayTransactions || displayTransactions.length === 0) {
    return (
      <div className={`${card} p-4 flex flex-col items-center justify-center text-center min-h-[150px]`}>
        <p className={`text-sm font-bold opacity-60 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
          ไม่มีรายการที่ตรงกับเงื่อนไขในเดือนนี้
        </p>
      </div>
    );
  }

  return (
    <div className={`${card} p-4 flex flex-col`}>
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
      
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {displayTransactions.map((tx, idx) => {
          const catDef = categories.find(c => c.name === tx.category);
          return (
            <div key={tx.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-sm border transition-colors hover:shadow-sm ${dm ? 'bg-slate-900/40 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
              <span className={`text-[11px] font-black w-4 text-center shrink-0 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</span>
              <div className="flex-1 overflow-hidden">
                <p className={`text-xs font-bold truncate leading-tight mb-0.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`} title={tx.description}>
                  {tx.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[9px] font-bold px-1.5 py-[1px] rounded-sm border text-white inline-block max-w-full truncate" style={{ backgroundColor: catDef?.color || '#64748B', borderColor: catDef?.color || '#64748B' }}>
                    {catDef?.icon} {tx.category}
                  </span>
                  {tx.date && (
                    <span className={`text-[9px] font-medium px-1.5 py-[1px] flex items-center gap-1 rounded-sm border ${dm ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      <Calendar className="w-2.5 h-2.5" /> {tx.date}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-black text-[#D81A21] whitespace-nowrap shrink-0">{formatMoney(Math.abs(tx.amount))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

TopTransactions.propTypes = {
  transactions: PropTypes.array,
  filterPeriod: PropTypes.string,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  hideFixedExpenses: PropTypes.bool,
  analytics: PropTypes.object,
  categories: PropTypes.array.isRequired,
  topXLimit: PropTypes.number.isRequired,
  setTopXLimit: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};