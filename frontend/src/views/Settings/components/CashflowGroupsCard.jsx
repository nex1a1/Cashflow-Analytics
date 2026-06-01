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
      <div className={`p-3 space-y-2 ${'bg-[#121212]/30'}`}>
        {[...cashflowGroups].sort((a, b) => a.order_index - b.order_index).map((group, idx, arr) => {
          const hasError = cashflowDeleteError?.id === group.id;
          const txCount  = txCountByGroup[group.id] || 0;
          const inUse    = categories.some(c => c.cashflowGroup === group.id);
          return (
            <div key={group.id} className="flex flex-col gap-1">
              <div className={`flex items-center gap-1.5 p-1.5 border rounded-none group/cg ${
                hasError
                  ? ('border-red-850 bg-red-950/25')
                  : 'bg-[#121212]/50 border-[#3e3e3e] hover:bg-[#303030]/50 hover:border-[#da291c]/50'
              }`}>
                <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cg:opacity-100 ${'text-[#666666]'}`}>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'UP')} disabled={idx === 0}
                    className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${'hover:text-[#da291c] hover:bg-[#303030]'}`}>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'DOWN')} disabled={idx === arr.length - 1}
                    className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${'hover:text-[#da291c] hover:bg-[#303030]'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ColorPicker color={group.color || '#64748B'} onChange={c => handleChangeCashflowGroup(group.id, 'color', c)} />

                <input type="text" value={group.icon || ''} onChange={e => handleChangeCashflowGroup(group.id, 'icon', e.target.value)} maxLength="2"
                  className={`w-8 h-8 text-center text-base outline-none border shrink-0 rounded-sm ${
                    'bg-[#121212] border-[#3e3e3e] text-white focus:border-[#da291c] focus:shadow-none'
                  }`} title="ไอคอน" placeholder="✨" />


                <select value={group.type} onChange={e => handleChangeCashflowGroup(group.id, 'type', e.target.value)}
                  disabled={group.isDefault || inUse}
                  className={`p-1.5 text-[11px] font-bold outline-none border w-[110px] shrink-0 rounded-sm ${
                    'bg-[#121212] border-[#3e3e3e] text-[#cbd5e1]'
                  } ${(group.isDefault || inUse) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:border-[#da291c] focus:shadow-none'}`}
                  title={inUse ? 'มีหมวดหมู่ใช้งานอยู่ ไม่สามารถเปลี่ยนประเภทได้' : undefined}>
                  <option value="income">รายรับ (IN)</option>
                  <option value="expense">รายจ่าย (EXP)</option>
                  <option value="savings">ออม/ลงทุน (SAV)</option>
                </select>

                {group.type === 'expense' ? (
                  <select value={group.allocation_type || 'want'} onChange={e => handleChangeCashflowGroup(group.id, 'allocation_type', e.target.value)}
                    className={`allocation-select p-1.5 text-[10px] font-black outline-none border w-[80px] shrink-0 rounded-sm cursor-pointer ${
                      group.allocation_type === 'need' ? 'bg-[#da291c]/10 text-[#da291c] border-[#da291c]/30 focus:border-[#da291c]/65' :
                      group.allocation_type === 'savings' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 focus:border-emerald-500/65' :
                      'bg-sky-500/10 text-sky-400 border-sky-500/30 focus:border-sky-500/65'
                    }`}>
                    <option value="need" className="bg-[#121212] text-[#da291c] font-extrabold">NEED</option>
                    <option value="want" className="bg-[#121212] text-sky-400 font-extrabold">WANT</option>
                    <option value="savings" className="bg-[#121212] text-emerald-400 font-extrabold">SAVE</option>
                  </select>
                ) : (
                  <div className="w-[80px] shrink-0" />
                )}

                <input type="text" value={group.name} onChange={e => handleChangeCashflowGroup(group.id, 'name', e.target.value)}
                  className={`flex-1 min-w-0 px-2 py-1.5 border outline-none font-semibold text-[13px] rounded-sm ${
                    'bg-[#121212] border-[#3e3e3e] text-[#e0e0e0] focus:border-[#da291c] focus:shadow-none placeholder-[#555555]'
                  }`} placeholder="ชื่อคอลัมน์" />

                <div className="flex items-center justify-end w-[32px] shrink-0">
                  {txCount > 0 && (
                    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 leading-none rounded-none tabular-nums ${
                      'bg-[#121212] text-[#888888] border border-[#3e3e3e]'
                    }`} title={`มี ${txCount} รายการในกลุ่มนี้`}>
                      {txCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center w-[28px] shrink-0">
                  {group.isDefault ? (
                    <Lock className={`w-3.5 h-3.5 ${'text-[#666666]'}`} title="กลุ่ม Default ลบไม่ได้" />
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
                  'bg-red-900/20 border-red-800/50 text-[#da291c]'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {cashflowDeleteError.msg}
                </p>
              )}
            </div>
          );
        })}
        {cashflowGroups.length === 0 && (
          <p className={`text-center py-4 text-xs ${'text-[#555555]'}`}>ยังไม่มีคอลัมน์</p>
        )}
      </div>
    </SectionCard>
  );
});

export default CashflowGroupsCard;
