import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export default function OrphanWarningBanner({ categories, cashflowGroups }) {
  const { isDarkMode } = useTheme();
  const orphans = useMemo(() => {
    const validIds = new Set(cashflowGroups.map(g => g.id));
    return categories.filter(c => c.cashflowGroup && !validIds.has(c.cashflowGroup));
  }, [categories, cashflowGroups]);

  if (orphans.length === 0) return null;

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 border mb-4 rounded-sm transition-all duration-300 ${
      isDarkMode 
        ? 'bg-amber-950/20 border-amber-900/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.05)]' 
        : 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm'
    }`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
      <div className="text-xs leading-relaxed font-semibold">
        <strong>พบหมวดหมู่ที่กลุ่ม Cashflow ถูกลบไปแล้ว</strong> ({orphans.length} รายการ):{' '}
        {orphans.map(c => `${c.icon || ''} ${c.name}`).join(', ')}
        <br />
        <span className={isDarkMode ? 'text-amber-400/80 font-bold' : 'text-amber-600 font-bold'}>กรุณากำหนดกลุ่มใหม่ให้หมวดหมู่เหล่านี้</span>
      </div>
    </div>
  );
}
