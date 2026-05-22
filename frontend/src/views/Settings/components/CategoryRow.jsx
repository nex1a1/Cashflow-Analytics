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
  const accentFocus = isIncome ? 'focus:border-emerald-500' : 'focus:border-blue-500';

  const group = cashflowGroups.find(g => g.id === cat.cashflowGroup);
  const groupColor = group?.color || (dm ? '#334155' : '#cbd5e1');

  const currentGroupValid = !cat.cashflowGroup || filteredGroups.some(g => g.id === cat.cashflowGroup);

  const inputCls = `px-2 py-1 border outline-none font-semibold text-[13px] transition-colors flex-1 min-w-0 ${
    dm
      ? `bg-slate-950 border-slate-850 ${accentFocus} text-slate-200 placeholder:text-slate-700`
      : `bg-white border-slate-200 ${accentFocus} text-slate-800 placeholder:text-slate-400`
  }`;

  return (
    <div style={{ borderLeftColor: groupColor, borderLeftWidth: '4px' }} className={`flex flex-nowrap items-center gap-1.5 px-2 py-1.5 border-b last:border-0 group/cat ${
      dm ? 'border-slate-850/60 hover:bg-slate-950/60' : 'border-slate-200/70 hover:bg-slate-50'
    }`}>

      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
        <button type="button" onClick={() => onMove(cat.id, 'UP')} disabled={isFirst}
          className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${dm ? 'hover:text-slate-200 hover:bg-slate-800' : 'hover:text-slate-700 hover:bg-slate-200'}`}>
          <ChevronUp className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onMove(cat.id, 'DOWN')} disabled={isLast}
          className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${dm ? 'hover:text-slate-200 hover:bg-slate-800' : 'hover:text-slate-700 hover:bg-slate-200'}`}>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <input type="text" value={cat.icon || ''} onChange={e => onChange(cat.id, 'icon', e.target.value)} maxLength="2"
        className={`w-7 h-7 text-center text-base outline-none border shrink-0 transition-colors ${
          dm ? 'bg-slate-950 border-slate-850 text-white focus:border-slate-500' : 'bg-white border-slate-200 focus:border-slate-400 focus:bg-white'
        }`} title="ไอคอน" />

      <AutoFocusInput isNew={isNew} value={cat.name || ''} onChange={e => onChange(cat.id, 'name', e.target.value)}
        className={inputCls} placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'} />

      <div className="relative shrink-0">
        <select value={cat.cashflowGroup || ''} onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
          className={`border text-[12px] font-semibold py-1 px-1.5 outline-none transition-colors cursor-pointer w-28 ${
            !currentGroupValid
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : dm
                ? 'bg-slate-950 border-slate-850 text-slate-300 focus:border-blue-500'
                : 'bg-white border-slate-200 text-slate-700 focus:border-blue-400'
          }`}
          title={!currentGroupValid ? 'กลุ่มนี้ไม่ตรงกับประเภทของหมวดหมู่' : undefined}>
          <option value="" disabled>-- กลุ่ม --</option>
          {filteredGroups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {!currentGroupValid && (
          <AlertTriangle className="w-3 h-3 text-amber-500 absolute -top-1 -right-1 pointer-events-none" title="กลุ่มไม่ตรงประเภท" />
        )}
      </div>

      <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} />
      <div className={`w-px h-4 shrink-0 ${dm ? 'bg-slate-850' : 'bg-slate-200'}`} />
      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} />
    </div>
  );
});

export default CategoryRow;
