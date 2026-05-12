import { memo } from 'react';
import { ChevronUp, ChevronDown, Lock, CalendarClock } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import ColorPicker from './ColorPicker';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';

const DayTypesCard = memo(({
  dayTypeConfig, handleAddDayType, handleMoveDayType,
  handleDayTypeConfigChange, handleDeleteDayType
}) => {
  const { isDarkMode: dm } = useTheme();

  return (
    <SectionCard
      accentColor="orange"
      icon={<CalendarClock className="w-3.5 h-3.5" />}
      title="ชนิดวันบนปฏิทิน"
      badge={dayTypeConfig.length}
      action={{ label: 'เพิ่ม', onClick: handleAddDayType }}
    >
      <div className={`p-2 space-y-1.5 ${dm ? '' : 'bg-slate-50/40'}`}>
        {dayTypeConfig.map((dt, idx) => {
          const isProtected = dt.isDefault || dayTypeConfig.length <= 2;
          return (
            <div key={dt.id}
              className={`flex items-center gap-2 px-2 py-1.5 border transition-colors group/dt ${
                dm ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}>
              <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/dt:opacity-100 transition-opacity ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                <button type="button" onClick={() => handleMoveDayType(dt.id, 'UP')} disabled={idx === 0}
                  className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}>
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => handleMoveDayType(dt.id, 'DOWN')} disabled={idx === dayTypeConfig.length - 1}
                  className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)}
                className={`flex-1 min-w-0 px-2 py-1 border outline-none font-semibold text-[13px] transition-colors ${
                  dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-orange-500'
                     : 'bg-white border-slate-200 text-slate-800 focus:border-orange-400'
                }`} placeholder="ชื่อชนิดวัน" />

              <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} />
              <div className={`w-px h-4 shrink-0 ${dm ? 'bg-slate-700' : 'bg-slate-200'}`} />

              {isProtected
                ? <Lock className={`w-3.5 h-3.5 ${dm ? 'text-slate-700' : 'text-slate-300'}`} title="ลบไม่ได้ (ต้องมีอย่างน้อย 2)" />
                : <ConfirmDeleteButton onConfirm={() => handleDeleteDayType(dt.id)} />
              }
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
});

export default DayTypesCard;
