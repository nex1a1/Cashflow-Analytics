import React, { useMemo, useState } from 'react';
import { Star, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Reset category filter when form type (income/expense) changes
  React.useEffect(() => {
    setSuggCatFilter('ALL');
    setSearchQuery('');
  }, [formType, setSuggCatFilter]);

  const quickSuggestions = useMemo(() => {
    // Use frequentItems from backend if available
    let sourceItems = frequentItems;

    // Filter by formType (Income/Expense)
    sourceItems = sourceItems.filter(s => {
      const c = catMap[s.categoryId] || categories.find(cat => cat.id === s.categoryId || cat.name === s.categoryName);
      return c?.type === formType;
    });

    // Filter by search query (Global - ignores category filter if searching)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sourceItems = sourceItems.filter(s => 
        (s.description || '').toLowerCase().includes(q) || 
        (s.categoryName || '').toLowerCase().includes(q) ||
        String(s.amount).includes(q)
      );
    } 
    // Only apply category filter if NOT searching
    else if (suggCatFilter !== 'ALL') {
      sourceItems = sourceItems.filter(s => String(s.categoryId) === String(suggCatFilter));
    }

    return sourceItems;
  }, [frequentItems, catMap, formType, suggCatFilter, categories, searchQuery]);

  const tokens = {
    input: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${dm ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`,
    searchIcon: `absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dm ? 'text-slate-500' : 'text-slate-400'}`
  };

  return (
    <div className={`w-full md:w-2/5 p-5 flex flex-col min-h-0 ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
      <h4 className={`shrink-0 font-bold text-sm flex items-center gap-2 mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> 
        Quick Suggestions {quickSuggestions.length > 0 && `(${quickSuggestions.length})`}
      </h4>
      
      <div className="space-y-2 mb-3 shrink-0">
        <div className="relative">
          <input 
            type="text" 
            placeholder="ค้นหาที่เคยบันทึก..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={tokens.input}
          />
          <Search className={tokens.searchIcon} />
        </div>
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
            {quickSuggestions.slice(0, 100).map((s, idx) => {
              const catObj = catMap[s.categoryId] || catMap[s.categoryName] || categories.find(c => c.id === s.categoryId || c.name === s.categoryName);
              const catColor = catObj?.color || '#cbd5e1';
              const bgAlpha = dm ? 0.2 : 0.15;
              
              // Allocation Bar Color
              const allocColor = s.allocation_type === 'need' ? (dm ? '#f43f5e' : '#e11d48') :
                                s.allocation_type === 'want' ? (dm ? '#38bdf8' : '#0284c7') :
                                (dm ? '#34d399' : '#059669');

              return (
                <button 
                  type="button" 
                  key={idx} 
                  onClick={() => onApplySuggestion(s)} 
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border transition-all active:scale-95 relative overflow-hidden text-left ${
                    dm ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 shadow-sm'
                  }`}
                >
                  {/* Left Color Accents: Category (wide) + Allocation (narrow) */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: catColor }} />
                  {s.allocation_type && formType === 'expense' && (
                    <div className="absolute left-1.5 top-0 bottom-0 w-1" style={{ backgroundColor: allocColor }} title={s.allocation_type.toUpperCase()} />
                  )}
                  
                  <div className="flex items-center flex-1 min-w-0 pl-2 gap-2">
                    {/* Icon with colored background - slightly smaller */}
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]"
                      style={{ backgroundColor: `rgba(${hexToRgb(catColor)}, ${bgAlpha})` }}
                    >
                      {catObj?.icon || '📌'}
                    </div>
                    
                    <div className="flex flex-col items-start min-w-0 overflow-hidden leading-none">
                      <span className="text-xs font-bold truncate w-full">{s.description || catObj?.name || 'อื่นๆ'}</span>
                      <span className={`text-[9px] font-medium truncate w-full mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{catObj?.name}</span>
                    </div>
                  </div>

                  <div className={`flex items-center justify-end gap-2 pl-2 w-24 shrink-0 border-l ${dm ? 'border-slate-600' : 'border-slate-200'}`}>
                  <span className={`text-[13px] font-black ${formType === 'expense' ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-emerald-400' : 'text-emerald-600')}`}>
                    {s.amount}฿
                  </span>
                  <span className={`text-[9px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{s.count}x</span>
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