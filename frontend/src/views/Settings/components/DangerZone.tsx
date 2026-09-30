import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import ConfirmDeleteButton from '@/components/shared/ConfirmDeleteButton';
import SectionCard from './SectionCard';

const DANGER_ICON = <AlertCircle className="w-4 h-4" />;

export interface DangerZoneProps {
  handleDeleteAllData: (opts?: any) => void;
}

const DangerZone = memo(({ handleDeleteAllData }: DangerZoneProps) => {
  return (
    <div>
      <SectionCard
        accentColor="brand"
        icon={DANGER_ICON}
        title="โซนอันตราย"
      >
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-canvas/50 rounded-none border-t border-danger/25">
          <div className="flex-1">
            <h3 className="text-[13px] font-black uppercase tracking-wider mb-1 text-danger">
              รีเซ็ตระบบเป็นค่าเริ่มต้น
            </h3>
            <p className="text-xs leading-relaxed font-semibold text-ink-body">
              จะลบ <strong className="text-danger mx-1">รายการทั้งหมดในระบบ</strong> (ทุกเดือนย้อนหลัง),{' '}
              <strong className="text-danger mx-1">ประวัติปฏิทิน</strong>{' '}และ{' '}
              <strong className="text-danger mx-1">รีเซ็ตการตั้งค่า</strong>กลับเป็นค่าเริ่มต้น
              {' '}—{' '}
              <span className="font-bold text-danger ml-1">ไม่สามารถกู้คืนได้</span>
            </p>
          </div>
          <div className="shrink-0">
            <ConfirmDeleteButton onConfirm={() => handleDeleteAllData()} variant="label" label="ล้างข้อมูลทั้งหมด" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
});

export default DangerZone;
