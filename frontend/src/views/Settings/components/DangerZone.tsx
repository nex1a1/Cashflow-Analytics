import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';
import { TransactionDisplay } from '../../../types';

export interface DangerZoneProps {
  transactions: TransactionDisplay[];
  handleDeleteAllData: (opts?: any) => void;
}

const DangerZone = memo(({ transactions, handleDeleteAllData }: DangerZoneProps) => {
  return (
    <div>
      <SectionCard
        accentColor="brand"
        icon={<AlertCircle className="w-3.5 h-3.5" />}
        title="Danger Zone"
      >
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#121212]/50 rounded-none border-t border-[#da291c]/25">
          <div className="flex-1">
            <h3 className="text-[13px] font-black uppercase tracking-wider mb-1 text-[#da291c]">
              ล้างข้อมูลทั้งหมด (Factory Reset)
            </h3>
            <p className="text-xs leading-relaxed font-semibold text-[#888888]">
              จะลบ <strong className="text-[#da291c] mx-1">รายการบัญชีทั้งหมดในระบบ</strong> (ทุกเดือนย้อนหลัง),{' '}
              <strong className="text-[#da291c] mx-1">ประวัติปฏิทิน</strong>{' '}และ{' '}
              <strong className="text-[#da291c] mx-1">รีเซ็ตการตั้งค่า</strong>กลับเป็นค่าเริ่มต้น
              {' '}—{' '}
              {transactions?.length > 0 && (
                <span className="font-semibold mr-1 text-[#888888]">
                  (รวมถึง <span className="font-mono font-black text-amber-400 tabular-nums">{transactions.length}</span> รายการในมุมมองปัจจุบัน)
                </span>
              )}
              <span className="font-bold text-[#da291c] ml-1">ไม่สามารถกู้คืนได้</span>
            </p>
          </div>
          <div className="shrink-0">
            <ConfirmDeleteButton onConfirm={() => handleDeleteAllData()} size="lg" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
});

export default DangerZone;
