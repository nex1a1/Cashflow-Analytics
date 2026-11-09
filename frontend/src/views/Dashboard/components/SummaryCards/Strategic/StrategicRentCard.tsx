import { memo } from 'react';
import { Home, Building2, Zap, Globe, Droplets } from 'lucide-react';
import { formatBaht } from '@/utils/formatters';
import {
  Shimmer, BUDGET_RULES, LevelBadge, ruleLevel, ruleEdge, CARD_TONES, RuleHero, RuleFooter,
  StatCell, EmptyCell, PILL, NEUTRAL_PILL,
} from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';
import type { RentSub } from '../types';

interface RentCardProps {
  rentPercentageNum: number;
  rentTotal: number;
  rentSub?: RentSub;
  hasIncome: boolean;
  showSkeleton?: boolean;
}

const tone = CARD_TONES.rent;
const ITEMS = [
  { key: 'rent',        label: 'ค่าเช่า', Icon: Building2, cls: 'text-info' },
  { key: 'electricity', label: 'ค่าไฟ',   Icon: Zap,       cls: 'text-warn' },
  { key: 'internet',    label: 'ค่าเน็ต',  Icon: Globe,     cls: 'text-purple-400' },
  { key: 'water',       label: 'ค่าน้ำ',   Icon: Droplets,  cls: 'text-info' },
] as const;

export const StrategicRentCard = memo(({ rentPercentageNum, rentTotal, rentSub, hasIncome, showSkeleton }: RentCardProps) => {
  const { max } = BUDGET_RULES.rent;
  const level = hasIncome ? ruleLevel(rentPercentageNum, max) : 'ok';
  const filled = rentSub ? ITEMS.filter(i => rentSub[i.key] > 0).length : 0;

  return (
    <StrategicCardShell
      icon={Home}
      edgeClass={ruleEdge(level)}
      label="ภาระที่พักอาศัย"
      badge={!showSkeleton && <LevelBadge level={level} />}
      thresholdRow={!showSkeleton && <RuleFooter max={max} base="ของรายรับ" />}
      showOverlay={!showSkeleton}
      overlayTitle="รายละเอียดที่พัก"
      overlayBadge={filled > 0 && <span className={`${PILL} ${NEUTRAL_PILL}`}>{filled} รายการ</span>}
      overlayBody={rentSub && (
        <div className="grid grid-cols-2 gap-px bg-line mt-1.5 flex-1">
          {filled === 0 ? (
            <EmptyCell text="ไม่มีข้อมูลที่พักอาศัยในช่วงนี้" />
          ) : ITEMS.map(({ key, label, Icon, cls }) => (
            <StatCell key={key} icon={<Icon size={13} className={`shrink-0 ${cls}`} />} label={label} value={formatBaht(rentSub[key])} />
          ))}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <RuleHero pct={rentPercentageNum} base="ของรายรับ" amount={rentTotal} max={max} level={level} tone={tone} hasBase={hasIncome} />
      )}
    </StrategicCardShell>
  );
});

StrategicRentCard.displayName = 'StrategicRentCard';
