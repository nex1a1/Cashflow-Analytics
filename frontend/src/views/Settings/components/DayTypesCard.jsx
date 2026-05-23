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
      <div className={`p-3 space-y-2 ${dm ? 'bg-slate-950/25' : 'bg-slate-50/30'}`}>
        {dayTypeConfig.map((dt, idx) => {
          const isProtected = dt.isDefault || dayTypeConfig.length <= 2;
          return (
            <div key={dt.id}
              className={`flex items-center gap-2 px-2 py-1.5 border transition-all rounded-sm group/dt ${
                dm ? 'bg-slate-900/50 border-slate-850 hover:bg-slate-950/50 hover:border-slate-800/80' : 'bg-white border-slate-205 hover:bg-slate-50 shadow-sm'
              }`}>
              <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/dt:opacity-100 transition-opacity duration-200 ${dm ? 'text-slate-655' : 'text-slate-400'}`}>
                <button type="button" onClick={() => handleMoveDayType(dt.id, 'UP')} disabled={idx === 0}
                  className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${dm ? 'hover:text-orange-405 hover:bg-slate-800' : 'hover:text-orange-600 hover:bg-slate-200'}`}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleMoveDayType(dt.id, 'DOWN')} disabled={idx === dayTypeConfig.length - 1}
                  className={`p-0.5 disabled:opacity-20 disabled:cursor-default transition-all ${dm ? 'hover:text-orange-405 hover:bg-slate-800' : 'hover:text-orange-600 hover:bg-slate-200'}`}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)}
                className={`flex-1 min-w-0 px-2 py-1.5 border outline-none font-semibold text-[13px] transition-all rounded-sm ${
                  dm ? 'bg-slate-950 border-slate-850/80 text-slate-200 focus:border-orange-500/70 focus:shadow-[0_0_8px_rgba(249,115,22,0.2)] placeholder:text-slate-700'
                     : 'bg-white border-slate-200 text-slate-800 focus:border-orange-400 focus:shadow-[0_0_6px_rgba(249,115,22,0.15)]'
                }`} placeholder="ชื่อชนิดวัน" />

              <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} />
              <div className={`w-px h-5 shrink-0 ${dm ? 'bg-slate-850/60' : 'bg-slate-200'}`} />

              {isProtected
                ? <Lock className={`w-3.5 h-3.5 ${dm ? 'text-slate-650' : 'text-slate-350'}`} title="ลบไม่ได้ (ต้องมีอย่างน้อย 2)" />
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
