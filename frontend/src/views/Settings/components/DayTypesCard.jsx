import { memo } from 'react';
import { ChevronUp, ChevronDown, Lock, CalendarClock } from 'lucide-react';
import ColorPicker from './ColorPicker';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';

const DayTypesCard = memo(({
  dayTypeConfig, handleAddDayType, handleMoveDayType,
  handleDayTypeConfigChange, handleDeleteDayType
}) => {
  return (
    <SectionCard
      accentColor="orange"
      icon={<CalendarClock className="w-3.5 h-3.5" />}
      title="ชนิดวันบนปฏิทิน"
      badge={dayTypeConfig.length}
      action={{ label: 'เพิ่ม', onClick: handleAddDayType }}
    >
      <div className={`p-3 space-y-2 ${'bg-[#121212]/30'}`}>
        {dayTypeConfig.map((dt, idx) => {
          const isProtected = dt.isDefault || dayTypeConfig.length <= 2;
          return (
            <div key={dt.id}
              className={`flex items-center gap-2 px-2 py-1.5 border rounded-none group/dt ${
                'bg-[#121212]/50 border-[#3e3e3e] hover:bg-[#303030]/50 hover:border-[#da291c]/50'
              }`}>
              <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/dt:opacity-100 ${'text-[#666666]'}`}>
                <button type="button" onClick={() => handleMoveDayType(dt.id, 'UP')} disabled={idx === 0}
                  className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${'hover:text-[#da291c] hover:bg-[#303030]'}`}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleMoveDayType(dt.id, 'DOWN')} disabled={idx === dayTypeConfig.length - 1}
                  className={`p-0.5 disabled:opacity-20 disabled:cursor-default ${'hover:text-[#da291c] hover:bg-[#303030]'}`}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)}
                className={`flex-1 min-w-0 px-2 py-1.5 border outline-none font-semibold text-[13px] rounded-sm ${
                  'bg-[#121212] border-[#3e3e3e] text-[#e0e0e0] focus:border-[#da291c] focus:shadow-none placeholder-[#555555]'
                }`} placeholder="ชื่อชนิดวัน" />

              <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} />
              <div className={`w-px h-5 shrink-0 ${'bg-[#3e3e3e]'}`} />

              {isProtected
                ? <Lock className={`w-3.5 h-3.5 ${'text-[#666666]'}`} title="ลบไม่ได้ (ต้องมีอย่างน้อย 2)" />
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
