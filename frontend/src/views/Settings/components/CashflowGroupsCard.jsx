import { memo } from 'react';
import { ChevronUp, ChevronDown, Lock, AlertTriangle, Grid } from 'lucide-react';
import ColorPicker from './ColorPicker';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';

const CashflowGroupsCard = memo(({
  cashflowGroups, handleAddCashflowGroup, handleMoveCashflowGroup,
  handleChangeCashflowGroup, handleDeleteGroup, cashflowDeleteError,
  txCountByGroup, categories
}) => {
  const dm = true;

  return (
    <SectionCard
      accentColor="purple"
      icon={<Grid className="w-3.5 h-3.5" />}
      title="คอลัมน์ Cashflow"
      badge={cashflowGroups.length}
      action={{ label: 'เพิ่ม', onClick: handleAddCashflowGroup }}
    >
      <div className={`p-3 space-y-2 ${'bg-slate-950/25'}`}>
        {[...cashflowGroups].sort((a, b) => a.order_index - b.order_index).map((group, idx, arr) => {
          const hasError = cashflowDeleteError?.id === group.id;
          const txCount  = txCountByGroup[group.id] || 0;
          const inUse    = categories.some(c => c.cashflowGroup === group.id);
          return (
            <div key={group.id} className="flex flex-col gap-1">
              <div className={`flex items-center gap-1.5 p-1.5 border transition-all rounded-sm group/cg ${
                hasError
                  ? ('border-red-850 bg-red-950/25')
                  : 'bg-slate-900/50 border-slate-850 hover:bg-slate-950/50 hover:border-slate-800/80'
              }`}>
                <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cg:opacity-100 transition-opacity duration-200 ${'text-slate-650'}`}>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'UP')} disabled={idx === 0}
                    className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${'hover:text-purple-400 hover:bg-slate-800'}`}>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'DOWN')} disabled={idx === arr.length - 1}
                    className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${'hover:text-purple-400 hover:bg-slate-800'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ColorPicker color={group.color || '#64748B'} onChange={c => handleChangeCashflowGroup(group.id, 'color', c)} />

                <input type="text" value={group.icon || ''} onChange={e => handleChangeCashflowGroup(group.id, 'icon', e.target.value)} maxLength="2"
                  className={`w-8 h-8 text-center text-base outline-none border shrink-0 transition-all rounded-sm ${
                    'bg-slate-950 border-slate-850/80 text-white focus:border-purple-500/70 focus:shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                  }`} title="ไอคอน" placeholder="✨" />

                <label className={`flex items-center justify-center gap-1 cursor-pointer px-2 py-1 border text-[10px] font-black shrink-0 transition-all rounded-sm ${
                  group.highlightBg
                    ? ('bg-amber-500/10 text-amber-400 border-amber-500/35 shadow-[0_0_6px_rgba(245,158,11,0.1)]')
                    : ('text-slate-500 border-slate-850 bg-slate-950/20 hover:border-slate-700 hover:text-slate-400')
                }`} title="เทสีพื้นหลังคอลัมน์">
                  <input type="checkbox" checked={!!group.highlightBg} onChange={e => handleChangeCashflowGroup(group.id, 'highlightBg', e.target.checked)} className="hidden" />
                  <span className={`w-1.5 h-1.5 rounded-full transition-transform ${group.highlightBg ? 'bg-amber-500 scale-110' : ('bg-slate-650')}`} />
                  BG
                </label>

                <select value={group.type} onChange={e => handleChangeCashflowGroup(group.id, 'type', e.target.value)}
                  disabled={group.isDefault || inUse}
                  className={`p-1.5 text-[11px] font-bold outline-none border w-[110px] shrink-0 rounded-sm ${
                    'bg-slate-950 border-slate-850/80 text-slate-300'
                  } ${(group.isDefault || inUse) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:border-purple-500/70 focus:shadow-[0_0_8px_rgba(168,85,247,0.15)]'}`}
                  title={inUse ? 'มีหมวดหมู่ใช้งานอยู่ ไม่สามารถเปลี่ยนประเภทได้' : undefined}>
                  <option value="income">รายรับ (IN)</option>
                  <option value="expense">รายจ่าย (EXP)</option>
                  <option value="savings">ออม/ลงทุน (SAV)</option>
                </select>

                {group.type === 'expense' && (
                  <select value={group.allocation_type || 'want'} onChange={e => handleChangeCashflowGroup(group.id, 'allocation_type', e.target.value)}
                    className={`allocation-select p-1.5 text-[10px] font-black outline-none border w-[80px] shrink-0 rounded-sm cursor-pointer transition-all ${
                      group.allocation_type === 'need' ? 'bg-rose-950/40 text-rose-400 border-rose-800/50 focus:border-rose-500/70' :
                      group.allocation_type === 'savings' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 focus:border-emerald-500/70' :
                      'bg-sky-950/40 text-sky-400 border-sky-800/50 focus:border-sky-500/70'
                    }`}>
                    <option value="need" className="bg-slate-950 text-rose-400 font-extrabold">NEED</option>
                    <option value="want" className="bg-slate-950 text-sky-400 font-extrabold">WANT</option>
                    <option value="savings" className="bg-slate-950 text-emerald-400 font-extrabold">SAVE</option>
                  </select>
                )}

                <input type="text" value={group.name} onChange={e => handleChangeCashflowGroup(group.id, 'name', e.target.value)}
                  className={`flex-1 min-w-0 px-2 py-1.5 border outline-none font-semibold text-[13px] transition-all rounded-sm ${
                    'bg-slate-950 border-slate-850/80 text-slate-200 focus:border-purple-500/70 focus:shadow-[0_0_8px_rgba(168,85,247,0.2)] placeholder:text-slate-700'
                  }`} placeholder="ชื่อคอลัมน์" />

                <div className="flex items-center justify-end w-[32px] shrink-0">
                  {txCount > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 leading-none rounded-sm ${
                      'bg-slate-950/90 text-slate-400 border border-slate-850/60'
                    }`} title={`มี ${txCount} รายการในกลุ่มนี้`}>
                      {txCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center w-[28px] shrink-0">
                  {group.isDefault ? (
                    <Lock className={`w-3.5 h-3.5 ${'text-slate-650'}`} title="กลุ่ม Default ลบไม่ได้" />
                  ) : (
                    <ConfirmDeleteButton
                      onConfirm={() => handleDeleteGroup(group.id)}
                      disabled={inUse}
                      tooltip={inUse ? 'ลบไม่ได้ มีหมวดหมู่ใช้งานอยู่' : 'ลบกลุ่มนี้'}
                    />
                  )}
                </div>
              </div>

              {hasError && (
                <p className={`text-[11px] font-semibold px-2 py-1 border flex items-center gap-1 ${
                  'bg-red-900/20 border-red-800/50 text-red-400'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {cashflowDeleteError.msg}
                </p>
              )}
            </div>
          );
        })}
        {cashflowGroups.length === 0 && (
          <p className={`text-center py-4 text-xs ${'text-slate-600'}`}>ยังไม่มีคอลัมน์</p>
        )}
      </div>
    </SectionCard>
  );
});

export default CashflowGroupsCard;
