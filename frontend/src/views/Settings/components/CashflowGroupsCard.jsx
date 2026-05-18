import { memo } from 'react';
import { ChevronUp, ChevronDown, Lock, AlertTriangle, Grid } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import ColorPicker from './ColorPicker';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';

const CashflowGroupsCard = memo(({
  cashflowGroups, handleAddCashflowGroup, handleMoveCashflowGroup,
  handleChangeCashflowGroup, handleDeleteGroup, cashflowDeleteError,
  txCountByGroup, categories
}) => {
  const { isDarkMode: dm } = useTheme();

  return (
    <SectionCard
      accentColor="purple"
      icon={<Grid className="w-3.5 h-3.5" />}
      title="คอลัมน์ Cashflow"
      badge={cashflowGroups.length}
      action={{ label: 'เพิ่ม', onClick: handleAddCashflowGroup }}
    >
      <div className={`p-2 space-y-1.5 ${dm ? '' : 'bg-slate-50/40'}`}>
        {[...cashflowGroups].sort((a, b) => a.order_index - b.order_index).map((group, idx, arr) => {
          const hasError = cashflowDeleteError?.id === group.id;
          const txCount  = txCountByGroup[group.id] || 0;
          const inUse    = categories.some(c => c.cashflowGroup === group.id);
          return (
            <div key={group.id} className="flex flex-col gap-1">
              <div className={`flex items-center gap-1.5 p-1.5 border transition-colors group/cg ${
                hasError
                  ? (dm ? 'border-red-700 bg-red-900/20' : 'border-red-300 bg-red-50')
                  : dm ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}>
                <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cg:opacity-100 transition-opacity ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'UP')} disabled={idx === 0}
                    className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${dm ? 'hover:text-purple-400 hover:bg-slate-700' : 'hover:text-purple-600 hover:bg-slate-200'}`}>
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'DOWN')} disabled={idx === arr.length - 1}
                    className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${dm ? 'hover:text-purple-400 hover:bg-slate-700' : 'hover:text-purple-600 hover:bg-slate-200'}`}>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                <ColorPicker color={group.color || '#64748B'} onChange={c => handleChangeCashflowGroup(group.id, 'color', c)} />

                <input type="text" value={group.icon || ''} onChange={e => handleChangeCashflowGroup(group.id, 'icon', e.target.value)} maxLength="2"
                  className={`w-7 h-7 text-center text-base outline-none border shrink-0 transition-colors ${
                    dm ? 'bg-slate-900 border-slate-600 text-white focus:border-slate-400' : 'bg-slate-50 border-slate-200 focus:border-slate-400'
                  }`} title="ไอคอน" placeholder="✨" />

                <label className={`flex items-center justify-center gap-0.5 cursor-pointer px-1.5 py-0.5 border text-[10px] font-bold shrink-0 transition-colors ${
                  group.highlightBg
                    ? (dm ? 'bg-amber-900/40 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200')
                    : (dm ? 'text-slate-600 border-slate-700 hover:border-slate-500' : 'text-slate-400 border-slate-200 hover:border-slate-400')
                }`} title="เทสีพื้นหลังคอลัมน์">
                  <input type="checkbox" checked={!!group.highlightBg} onChange={e => handleChangeCashflowGroup(group.id, 'highlightBg', e.target.checked)} className="hidden" />
                  <span className={`w-1.5 h-1.5 rounded-full ${group.highlightBg ? 'bg-amber-500' : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                  Bg
                </label>

                <select value={group.type} onChange={e => handleChangeCashflowGroup(group.id, 'type', e.target.value)}
                  disabled={group.isDefault || inUse}
                  className={`p-1 text-[11px] font-bold outline-none border w-[68px] shrink-0 ${
                    dm ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  } ${(group.isDefault || inUse) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:border-purple-500'}`}
                  title={inUse ? 'มีหมวดหมู่ใช้งานอยู่ ไม่สามารถเปลี่ยนประเภทได้' : undefined}>
                  <option value="income">รายรับ</option>
                  <option value="expense">รายจ่าย</option>
                </select>

                {group.type !== 'income' ? (
                  <select value={group.allocation_type || 'want'} onChange={e => handleChangeCashflowGroup(group.id, 'allocation_type', e.target.value)}
                    className={`p-1 text-[11px] font-bold outline-none border w-[85px] shrink-0 transition-colors ${
                      dm ? 'bg-slate-900 border-slate-600' : 'bg-slate-50 border-slate-200'
                    } ${
                      (group.allocation_type || 'want') === 'need' 
                        ? (dm ? 'text-rose-400' : 'text-rose-600') : 
                      (group.allocation_type || 'want') === 'want' 
                        ? (dm ? 'text-sky-400' : 'text-sky-600') : // Switched from yellow to Sky/Blue for better readability
                      (dm ? 'text-emerald-400' : 'text-emerald-600')
                    } cursor-pointer focus:border-purple-500`}
                    title="ประเภทสัดส่วน (50/30/20)">
                    <option value="need">NEED (จำเป็น)</option>
                    <option value="want">WANT (ทั่วไป)</option>
                    <option value="savings">SAVING (ออม)</option>
                  </select>
                ) : (
                  <div className="w-[85px] shrink-0" /> // Spacer for alignment
                )}

                <input type="text" value={group.name} onChange={e => handleChangeCashflowGroup(group.id, 'name', e.target.value)}
                  className={`flex-1 min-w-0 px-2 py-1 border outline-none font-semibold text-[13px] transition-colors ${
                    dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-purple-500 placeholder:text-slate-600'
                       : 'bg-white border-slate-200 text-slate-800 focus:border-purple-400'
                  }`} placeholder="ชื่อคอลัมน์" />

                <div className="flex items-center justify-end w-[36px] shrink-0">
                  {txCount > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 leading-none rounded-sm ${
                      dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`} title={`มี ${txCount} รายการในกลุ่มนี้`}>
                      {txCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center w-[28px] shrink-0">
                  {group.isDefault ? (
                    <Lock className={`w-3.5 h-3.5 ${dm ? 'text-slate-600' : 'text-slate-400'}`} title="กลุ่ม Default ลบไม่ได้" />
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
                  dm ? 'bg-red-900/20 border-red-800/50 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {cashflowDeleteError.msg}
                </p>
              )}
            </div>
          );
        })}
        {cashflowGroups.length === 0 && (
          <p className={`text-center py-4 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>ยังไม่มีคอลัมน์</p>
        )}
      </div>
    </SectionCard>
  );
});

export default CashflowGroupsCard;
