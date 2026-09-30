import React, { useMemo, memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Category, CashflowGroup } from '../../../types';
import { findOrphanCategories } from '../settingsHelpers';
import CategoryGlyph from '../../../components/shared/CategoryGlyph';

export interface OrphanWarningBannerProps {
  categories: Category[];
  cashflowGroups: CashflowGroup[];
}

const OrphanWarningBanner = memo(({ categories, cashflowGroups }: OrphanWarningBannerProps) => {
  const orphans = useMemo(() => findOrphanCategories(categories, cashflowGroups), [categories, cashflowGroups]);

  if (orphans.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 px-4 py-3 border mb-4 rounded-sm bg-warn/10 border-warn/25 text-warn">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warn" />
      <div className="text-xs leading-relaxed font-semibold">
        <strong>มีหมวดหมู่ที่กลุ่มถูกลบไปแล้ว</strong> (<span className="font-mono font-black tabular-nums">{orphans.length}</span> รายการ):{' '}
        {orphans.map((c, idx) => (
          <span key={c.id} className="inline-flex items-center gap-1.5">
            <CategoryGlyph icon={c.icon} color={c.color} size={15} />
            <span>{c.name}{idx < orphans.length - 1 ? ',' : ''}</span>
          </span>
        ))}
        <br />
        <span className="text-warn/80 font-bold">กรุณากำหนดกลุ่มใหม่ให้หมวดหมู่เหล่านี้</span>
      </div>
    </div>
  );
});

export default OrphanWarningBanner;
