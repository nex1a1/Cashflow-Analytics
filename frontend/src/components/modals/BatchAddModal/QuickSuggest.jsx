import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { hexToRgb } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';

export default function QuickSuggest({
  transactions,
  categories,
  catMap,
  formType,
  suggCatFilter,
  setSuggCatFilter,
  onApplySuggestion,
  isProcessing,
  frequentItems = [] // Added frequentItems prop
}) {
  const { isDarkMode: dm } = useTheme();

  const quickSuggestions = useMemo(() => {
    // Use frequentItems from backend if available
    let sourceItems = frequentItems;

    // Filter by formType (Income/Expense)
    sourceItems = sourceItems.filter(s => {
      const c = catMap[s.categoryId] || categories.find(cat => cat.id === s.categoryId || cat.name === s.categoryName);
      return c?.type === formType;
    });

    // Filter by specific category if selected
    if (suggCatFilter !== 'ALL') {
      sourceItems = sourceItems.filter(s => s.categoryId === suggCatFilter || catMap[s.categoryId]?.id === suggCatFilter);
    }

    return sourceItems;
  }, [frequentItems, catMap, formType, suggCatFilter, categories]);

  const tokens = {
    input: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${dm ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`,
  };

  return (
    <div className={`w-full lg:w-[28%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
      <h4 className={`shrink-0 font-bold text-sm flex items-center gap-2 mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> 
        Quick Suggestions {quickSuggestions.length > 0 && `(${quickSuggestions.length})`}
      </h4>
      <div className="mb-3 shrink-0">
        <select value={suggCatFilter} onChange={e => setSuggCatFilter(e.target.value)} className={tokens.input}>
          <option value="ALL">📊 ทุกหมวดหมู่</option>
          {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
        {quickSuggestions.length === 0 ? (
          <p className={`text-sm text-center py-8 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีข้อมูล</p>
        ) : (
          <div className="flex flex-col gap-2">
            {quickSuggestions.map((s, idx) => {
              const catObj = catMap[s.categoryId] || catMap[s.categoryName] || categories.find(c => c.id === s.categoryId || c.name === s.categoryName);
              const catColor = catObj?.color || '#cbd5e1';
              const bgAlpha = dm ? 0.2 : 0.15;
              
              return (
                <button 
                  type="button" 
                  key={idx} 
                  onClick={() => onApplySuggestion(s)} 
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition-all active:scale-95 relative overflow-hidden ${
                    dm ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 shadow-sm'
                  }`}
                >
                  {/* Left Color Accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: catColor }} />
                  
                  <div className="flex items-center gap-2 overflow-hidden pl-1">
                    {/* Icon with colored background */}
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs"
                      style={{ backgroundColor: `rgba(${hexToRgb(catColor)}, ${bgAlpha})` }}
                    >
                      {catObj?.icon || '📌'}
                    </div>
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