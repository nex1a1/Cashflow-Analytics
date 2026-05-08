import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { hexToRgb } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export default function QuickSuggest({
  transactions,
  categories,
  catMap,
  formType,
  suggCatFilter,
  setSuggCatFilter,
  onApplySuggestion,
  isProcessing
}) {
  const { isDarkMode: dm } = useTheme();

  const quickSuggestions = useMemo(() => {
    const typeTx = transactions.filter(t => {
      const c = catMap[t.category_id] || catMap[t.category];
      if (c?.type !== formType) return false;
      const tCatId = t.category_id || c?.id;
      if (suggCatFilter !== 'ALL' && tCatId !== suggCatFilter) return false;
      return true;
    });
    const frequency = {};
    typeTx.forEach(t => {
      const c = catMap[t.category_id] || catMap[t.category];
      const tCatId = t.category_id || c?.id;
      if (!tCatId) return;
      const desc = (t.description && t.description !== t.category && t.description !== c?.name) ? t.description : '';
      const amt  = parseFloat(t.amount) || 0;
      const key  = `${tCatId}|${desc}|${amt}`;
      if (!frequency[key]) frequency[key] = { count: 0, amount: amt };
      frequency[key].count += 1;
    });
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b.count - a.count || b.amount - a.amount)
      .slice(0, 15)
      .map(([key, { count, amount }]) => {
        const [categoryId, description] = key.split('|');
        return { categoryId, description, amount: String(amount), count };
      });
  }, [transactions, catMap, formType, suggCatFilter]);

  const tokens = {
    input: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${dm ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`,
  };

  return (
    <div className={`w-full lg:w-[28%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
      <h4 className={`shrink-0 font-bold text-sm flex items-center gap-2 mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Quick Suggestions
      </h4>
      <div className="mb-3 shrink-0">
        <select value={suggCatFilter} onChange={e => setSuggCatFilter(e.target.value)} className={tokens.input}>
          <option value="ALL">📊 ทุกหมวดหมู่</option>
          {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-hidden space-y-2 pr-0.5">
        {quickSuggestions.length === 0 ? (
          <p className={`text-sm text-center py-8 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีข้อมูล</p>
        ) : (
          <div className="flex flex-col gap-2">
            {quickSuggestions.map((s, idx) => {
              const catObj = catMap[s.categoryId] || categories.find(c => c.id === s.categoryId || c.name === s.categoryId);
              return (
                <button 
                  type="button" 
                  key={idx} 
                  onClick={() => onApplySuggestion(s)} 
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition-all active:scale-95 ${
                    dm ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-sm shrink-0">{catObj?.icon || '📌'}</span>
                    <span className="text-xs font-bold truncate">{s.description || catObj?.name || 'อื่นๆ'}</span>
                  </div>
                  <div className={`flex items-center gap-2 pl-2 shrink-0 border-l ${dm ? 'border-slate-600' : 'border-slate-200'}`}>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`} title="จำนวนครั้งที่บันทึก">{s.count}x</span>
                    <span className={`text-[13px] font-black ${formType === 'expense' ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-emerald-400' : 'text-emerald-600')}`}>
                      {s.amount}฿
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}