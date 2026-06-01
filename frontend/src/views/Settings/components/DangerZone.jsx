import { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';

const DangerZone = memo(({ transactions, handleDeleteAllData }) => {
  return (
    <div>
      <SectionCard
        accentColor="red"
        icon={<AlertCircle className="w-3.5 h-3.5" />}
        title="Danger Zone"
      >
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-br from-red-950/15 via-[#181818] to-red-950/20 rounded-none border-t border-red-950/50">
          <div className="flex-1">
            <h3 className={`text-[13px] font-black uppercase tracking-wider mb-1 text-red-500`}>
              ล้างข้อมูลทั้งหมด (Factory Reset)
            </h3>
            <p className={`text-xs leading-relaxed font-semibold text-[#888888]`}>
              จะลบ<strong className="text-red-400 mx-1">รายการบัญชีทั้งหมด</strong>,
              <strong className="text-red-400 mx-1">ประวัติปฏิทิน</strong> และ
              <strong className="text-red-400 mx-1">รีเซ็ตการตั้งค่า</strong>กลับเป็นค่าเริ่มต้น
              —{' '}
              {transactions?.length > 0 && (
                <span className={`font-black mr-1 text-amber-500`}>
                  มีข้อมูล {transactions.length} รายการที่จะหายไป
                </span>
              )}
              <span className="font-bold text-[#da291c] ml-1">ไม่สามารถกู้คืนได้</span>
            </p>
          </div>
          <div className="shrink-0">
            <ConfirmDeleteButton onConfirm={() => handleDeleteAllData({ setShowToast: () => {} })} size="lg" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
});

export default DangerZone;

