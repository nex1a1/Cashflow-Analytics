import { useMemo, memo } from 'react';
import { AlertTriangle } from 'lucide-react';

const OrphanWarningBanner = memo(({ categories, cashflowGroups }) => {
  const orphans = useMemo(() => {
    const validIds = new Set(cashflowGroups.map(g => g.id));
    return categories.filter(c => c.cashflowGroup && !validIds.has(c.cashflowGroup));
  }, [categories, cashflowGroups]);

  if (orphans.length === 0) return null;

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 border mb-4 rounded-none ${
      'bg-amber-950/10 border-amber-500/20 text-amber-400'
    }`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${'text-amber-400'}`} />
      <div className="text-xs leading-relaxed font-semibold">
        <strong>พบหมวดหมู่ที่กลุ่ม Cashflow ถูกลบไปแล้ว</strong> (<span className="font-mono font-black tabular-nums">{orphans.length}</span> รายการ):{' '}
        {orphans.map(c => `${c.icon || ''} ${c.name}`).join(', ')}
        <br />
        <span className={'text-amber-400/80 font-bold'}>กรุณากำหนดกลุ่มใหม่ให้หมวดหมู่เหล่านี้</span>
      </div>
    </div>
  );
});

export default OrphanWarningBanner;

