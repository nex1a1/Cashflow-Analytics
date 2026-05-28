import { AlertCircle } from 'lucide-react';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import SectionCard from './SectionCard';

export default function DangerZone({ transactions, handleDeleteAllData }) {
  const dm = true;

  return (
    <div>
      <SectionCard
        accentColor="red"
        icon={<AlertCircle className="w-3.5 h-3.5" />}
        title="Danger Zone"
      >
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-br from-red-950/10 via-slate-950/30 to-red-950/15">
          <div className="flex-1">
            <h3 className={`text-[13px] font-black uppercase tracking-wider mb-0.5 ${'text-red-400'}`}>
              ล้างข้อมูลทั้งหมด (Factory Reset)
            </h3>
            <p className={`text-xs leading-relaxed font-semibold ${'text-slate-400'}`}>
              จะลบ<strong className="text-red-500 mx-1">รายการบัญชีทั้งหมด</strong>,
              <strong className="text-red-500 mx-1">ประวัติปฏิทิน</strong> และ
              <strong className="text-red-500 mx-1">รีเซ็ตการตั้งค่า</strong>กลับเป็นค่าเริ่มต้น
              —{' '}
              {transactions?.length > 0 && (
                <span className={`font-black mr-1 ${'text-amber-400'}`}>
                  มีข้อมูล {transactions.length} รายการที่จะหายไป
                </span>
              )}
              <span className="font-bold text-red-650">ไม่สามารถกู้คืนได้</span>
            </p>
          </div>
          <ConfirmDeleteButton onConfirm={() => handleDeleteAllData({ setShowToast: () => {} })} size="lg" />
        </div>
      </SectionCard>
    </div>
  );
}
