import { memo, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import ColorPicker from './ColorPicker';

function AutoFocusInput({ value, onChange, className, placeholder, isNew }) {
  const ref = useRef(null);
  useEffect(() => { if (isNew && ref.current) { ref.current.focus(); ref.current.select(); } }, [isNew]);
  return <input ref={ref} type="text" value={value} onChange={onChange} className={className} placeholder={placeholder} />;
}

const CategoryRow = memo(({ cat, isNew, isIncome, onMove, onChange, onDelete, filteredGroups = [], cashflowGroups = [], isFirst, isLast }) => {
  const dm = true;
  
  const accentFocus = isIncome 
    ? 'focus:border-emerald-500/70 focus:shadow-[0_0_8px_rgba(16,185,129,0.2)] focus:ring-0' 
    : 'focus:border-[#da291c]/70 focus:shadow-[0_0_8px_rgba(218,41,28,0.2)] focus:ring-0';

  const group = cashflowGroups.find(g => g.id === cat.cashflowGroup);
  const groupColor = group?.color || ('#334155');

  const currentGroupValid = !cat.cashflowGroup || filteredGroups.some(g => g.id === cat.cashflowGroup);

  const inputCls = `px-2 py-1.5 border outline-none font-semibold text-[13px] transition-all flex-1 min-w-0 rounded-sm ${
    `bg-[#121212] border-[#3e3e3e] ${accentFocus} text-[#cbd5e1] placeholder-[#555555]`
  }`;

  const iconCls = `w-8 h-8 text-center text-base outline-none border shrink-0 transition-all rounded-sm ${
    `bg-[#121212] border-[#3e3e3e] text-white ${isIncome ? 'focus:border-emerald-500/70 focus:shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'focus:border-[#da291c]/70 focus:shadow-[0_0_8px_rgba(218,41,28,0.2)]'}`
  }`;

  const selectCls = `border text-[11px] font-bold py-1.5 px-2 outline-none transition-all cursor-pointer w-28 rounded-sm ${
    !currentGroupValid
      ? 'border-amber-600/50 bg-amber-950/20 text-amber-400 focus:border-amber-500'
      : `bg-[#121212] border-[#3e3e3e] text-[#cbd5e1] ${isIncome ? 'focus:border-emerald-500/70' : 'focus:border-[#da291c]/70'}`
  }`;

  return (
    <div style={{ borderLeftColor: groupColor, borderLeftWidth: '4px' }} className={`flex flex-nowrap items-center gap-1.5 px-2 py-1.5 border-b last:border-0 group/cat ${
      'border-[#303030] hover:bg-[#121212]/50'
    }`}>

      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity duration-200 ${'text-[#666666]'}`}>
        <button type="button" onClick={() => onMove(cat.id, 'UP')} disabled={isFirst}
          className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${'hover:text-white hover:bg-[#303030]'}`}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onMove(cat.id, 'DOWN')} disabled={isLast}
          className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${'hover:text-white hover:bg-[#303030]'}`}>
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
      <div className={`w-px h-5 shrink-0 ${'bg-[#3e3e3e]'}`} />
      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} />
    </div>
  );
});

export default CategoryRow;

