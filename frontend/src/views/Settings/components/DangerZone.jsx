import { AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import ConfirmDeleteButton from './ConfirmDeleteButton';

export default function DangerZone({ transactions, handleDeleteAllData }) {
  const { isDarkMode: dm } = useTheme();

  return (
    <div className={`border-2 overflow-hidden ${dm ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
      <div className={`px-4 py-2 border-b-2 flex items-center gap-2 ${dm ? 'bg-red-900/20 border-red-900/40' : 'bg-red-100/60 border-red-200'}`}>
        <AlertCircle className={`w-4 h-4 ${dm ? 'text-red-400' : 'text-red-600'}`} />
        <h2 className={`text-sm font-black tracking-wide ${dm ? 'text-red-400' : 'text-red-700'}`}>Danger Zone</h2>
      </div>
      <div className={`px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${dm ? '' : 'bg-white/60'}`}>
        <div className="flex-1">
          <h3 className={`text-sm font-bold mb-0.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ล้างข้อมูลทั้งหมด (Factory Reset)</h3>
          <p className={`text-xs leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            จะลบ<strong className="text-red-500 mx-1">รายการบัญชีทั้งหมด</strong>,
            <strong className="text-red-500 mx-1">ประวัติปฏิทิน</strong> และ
            <strong className="text-red-500 mx-1">รีเซ็ตการตั้งค่า</strong>กลับเป็นค่าเริ่มต้น
            —{' '}
            {transactions?.length > 0 && (
              <span className={`font-bold mr-1 ${dm ? 'text-amber-400' : 'text-amber-700'}`}>
                มีข้อมูล {transactions.length} รายการที่จะหายไป
              </span>
            )}
            <span className="font-bold text-red-600">ไม่สามารถกู้คืนได้</span>
          </p>
        </div>
        <ConfirmDeleteButton onConfirm={() => handleDeleteAllData({ setShowToast: () => {} })} size="lg" />
      </div>
    </div>
  );
}
