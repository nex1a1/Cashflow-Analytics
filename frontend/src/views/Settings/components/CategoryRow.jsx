import { memo, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import ColorPicker from './ColorPicker';

function AutoFocusInput({ value, onChange, className, placeholder, isNew }) {
  const ref = useRef(null);
  useEffect(() => { if (isNew && ref.current) { ref.current.focus(); ref.current.select(); } }, [isNew]);
  return <input ref={ref} type="text" value={value} onChange={onChange} className={className} placeholder={placeholder} />;
}

const CategoryRow = memo(({ cat, isNew, isIncome, onMove, onChange, onDelete, filteredGroups = [], cashflowGroups = [], isFirst, isLast }) => {
  const { isDarkMode: dm } = useTheme();
  
  const accentFocus = isIncome 
    ? 'focus:border-emerald-500/70 focus:shadow-[0_0_8px_rgba(16,185,129,0.2)] focus:ring-0' 
    : 'focus:border-blue-500/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.2)] focus:ring-0';

  const group = cashflowGroups.find(g => g.id === cat.cashflowGroup);
  const groupColor = group?.color || (dm ? '#334155' : '#cbd5e1');

  const currentGroupValid = !cat.cashflowGroup || filteredGroups.some(g => g.id === cat.cashflowGroup);

  const inputCls = `px-2 py-1.5 border outline-none font-semibold text-[13px] transition-all flex-1 min-w-0 rounded-sm ${
    dm
      ? `bg-slate-950 border-slate-850/80 ${accentFocus} text-slate-200 placeholder:text-slate-700`
      : `bg-white border-slate-200 ${accentFocus} text-slate-800 placeholder:text-slate-400`
  }`;

  const iconCls = `w-8 h-8 text-center text-base outline-none border shrink-0 transition-all rounded-sm ${
    dm 
      ? `bg-slate-950 border-slate-850/80 text-white ${isIncome ? 'focus:border-emerald-500/70 focus:shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'focus:border-blue-500/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.2)]'}` 
      : `bg-white border-slate-200 ${isIncome ? 'focus:border-emerald-500' : 'focus:border-blue-500'} focus:bg-white`
  }`;

  const selectCls = `border text-[11px] font-bold py-1.5 px-2 outline-none transition-all cursor-pointer w-28 rounded-sm ${
    !currentGroupValid
      ? 'border-amber-400 bg-amber-50 text-amber-700'
      : dm
        ? `bg-slate-950 border-slate-850/80 text-slate-300 ${isIncome ? 'focus:border-emerald-500/70' : 'focus:border-blue-500/70'}`
        : `bg-white border-slate-200 text-slate-700 ${isIncome ? 'focus:border-emerald-500' : 'focus:border-blue-500'}`
  }`;

  return (
    <div style={{ borderLeftColor: groupColor, borderLeftWidth: '4px' }} className={`flex flex-nowrap items-center gap-1.5 px-2 py-1.5 border-b last:border-0 group/cat ${
      dm ? 'border-slate-850/50 hover:bg-slate-950/30' : 'border-slate-100 hover:bg-slate-50/50'
    }`}>

      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity duration-200 ${dm ? 'text-slate-650' : 'text-slate-400'}`}>
        <button type="button" onClick={() => onMove(cat.id, 'UP')} disabled={isFirst}
          className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${dm ? 'hover:text-slate-250 hover:bg-slate-800' : 'hover:text-slate-750 hover:bg-slate-200'}`}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onMove(cat.id, 'DOWN')} disabled={isLast}
          className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${dm ? 'hover:text-slate-250 hover:bg-slate-800' : 'hover:text-slate-750 hover:bg-slate-200'}`}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <input type="text" value={cat.icon || ''} onChange={e => onChange(cat.id, 'icon', e.target.value)} maxLength="2"
        className={iconCls} title="ไอคอน" />

      <AutoFocusInput isNew={isNew} value={cat.name || ''} onChange={e => onChange(cat.id, 'name', e.target.value)}
        className={inputCls} placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'} />

      <div className="relative shrink-0">
        <select value={cat.cashflowGroup || ''} onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
          className={selectCls}
          title={!currentGroupValid ? 'กลุ่มนี้ไม่ตรงกับประเภทของหมวดหมู่' : undefined}>
          <option value="" disabled>-- กลุ่ม --</option>
          {filteredGroups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {!currentGroupValid && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 absolute -top-1.5 -right-1.5 pointer-events-none" title="กลุ่มไม่ตรงประเภท" />
        )}
      </div>

      <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} />
      <div className={`w-px h-5 shrink-0 ${dm ? 'bg-slate-850/60' : 'bg-slate-200'}`} />
      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} />
    </div>
  );
});

export default CategoryRow;

