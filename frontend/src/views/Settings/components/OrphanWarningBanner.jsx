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
    <div className={`flex items-start gap-2 px-4 py-3 border mb-3 ${
      isDarkMode ? 'bg-amber-950/30 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="text-xs leading-relaxed">
        <strong>พบหมวดหมู่ที่กลุ่ม Cashflow ถูกลบไปแล้ว</strong> ({orphans.length} รายการ):{' '}
        {orphans.map(c => `${c.icon || ''} ${c.name}`).join(', ')}
        <br />
        <span className={isDarkMode ? 'text-amber-400/70' : 'text-amber-600'}>กรุณากำหนดกลุ่มใหม่ให้หมวดหมู่เหล่านี้</span>
      </div>
    </div>
  );
}
