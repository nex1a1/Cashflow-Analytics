import React, { memo, useMemo } from 'react';
import { ChevronUp, ChevronDown, Lock, CalendarClock } from 'lucide-react';
import ColorPicker from './ColorPicker';
import ConfirmDeleteButton from '@/components/shared/ConfirmDeleteButton';
import SectionCard from './SectionCard';
import DebouncedInput from './DebouncedInput';
import { DayType } from '../../../types';

const DAY_TYPES_ICON = <CalendarClock className="w-4 h-4" />;

export interface DayTypesCardProps {
  dayTypeConfig: DayType[];
  handleAddDayType: () => void;
  handleMoveDayType: (id: string, direction: 'UP' | 'DOWN') => void;
  handleDayTypeConfigChange: (id: string, field: string, value: any) => void;
  handleDeleteDayType: (id: string) => void;
}

const DayTypesCard = memo(({
  dayTypeConfig,
  handleAddDayType,
  handleMoveDayType,
  handleDayTypeConfigChange,
  handleDeleteDayType
}: DayTypesCardProps) => {
  const addAction = useMemo(() => ({
    label: 'เพิ่ม', onClick: handleAddDayType
  }), [handleAddDayType]);

  return (
    <SectionCard
      accentColor="orange"
      icon={DAY_TYPES_ICON}
      title="ชนิดวันบนปฏิทิน"
      badge={dayTypeConfig.length}
      action={addAction}
    >
      <div className="p-3 space-y-2 bg-canvas/30">
        {dayTypeConfig.map((dt, idx) => {
          const isProtected = (dt as any).isDefault || dayTypeConfig.length <= 2;
          return (
            <div
              key={dt.id}
              className="flex items-center gap-2 px-2 py-1.5 border rounded-sm group/dt bg-surface border-line hover:bg-surface-hover/50 hover:border-line-strong transition-colors"
            >
              <div className="flex flex-col items-center shrink-0 opacity-0 group-hover/dt:opacity-100 text-ink-muted">
                <button
                  type="button"
                  onClick={() => handleMoveDayType(dt.id, 'UP')}
                  disabled={idx === 0}
                  className="p-0.5 rounded-sm disabled:opacity-20 disabled:cursor-default hover:text-accent hover:bg-surface-elevated"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDayType(dt.id, 'DOWN')}
                  disabled={idx === dayTypeConfig.length - 1}
                  className="p-0.5 rounded-sm disabled:opacity-20 disabled:cursor-default hover:text-accent hover:bg-surface-elevated"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <DebouncedInput
                requiredMessage="ต้องมีชื่อชนิดวัน"
                value={dt.label}
                onDebouncedChange={val => handleDayTypeConfigChange(dt.id, 'label', val)}
                className="flex-1 min-w-0 px-2 py-1.5 border outline-none font-semibold text-[13px] rounded-sm bg-canvas border-line text-ink-display focus:border-accent focus:shadow-none placeholder-ink-muted"
                placeholder="ชื่อชนิดวัน"
              />

              <ColorPicker color={dt.color || '#64748B'} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} />
              <div className="w-px h-5 shrink-0 bg-line" />

              {isProtected ? (
                <span title="ลบไม่ได้ (ต้องมีอย่างน้อย 2)">
                  <Lock className="w-4 h-4 text-ink-muted" />
                </span>
              ) : (
                <ConfirmDeleteButton onConfirm={() => handleDeleteDayType(dt.id)} tooltip="ลบประเภทวัน" itemLabel={dt.label} />
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
});

export default DayTypesCard;
