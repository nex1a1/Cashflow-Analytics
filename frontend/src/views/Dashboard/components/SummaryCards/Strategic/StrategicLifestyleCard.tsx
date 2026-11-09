import { memo } from 'react';
import { Zap } from 'lucide-react';
import {
  Shimmer, renderTopItemsOverlay, BUDGET_RULES, LevelBadge, ruleLevel, ruleEdge, CARD_TONES,
  RuleHero, RuleFooter, PILL, NEUTRAL_PILL,
} from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';
import type { WantCategory, BreakdownEntry } from '../types';

interface LifestyleCardProps {
  lifestyleRatio: number;
  wantTotal: number;
  topWantCategories?: WantCategory[];
  hasIncome: boolean;
  showSkeleton?: boolean;
}

const tone = CARD_TONES.want;

export const StrategicLifestyleCard = memo(({ lifestyleRatio, wantTotal, topWantCategories, hasIncome, showSkeleton }: LifestyleCardProps) => {
  const { max } = BUDGET_RULES.lifestyle;
  const level = hasIncome ? ruleLevel(lifestyleRatio, max) : 'ok';
  const categoryEntries: BreakdownEntry[] = (topWantCategories ?? []).slice(0, 4).map(cat => ({
    key: cat.id,
    icon: cat.icon,
    iconColor: cat.color,
    label: cat.name,
    amount: cat.amount,
    pctLabel: `${cat.pctOfWant}%`
  }));

  return (
    <StrategicCardShell
      icon={Zap}
      edgeClass={ruleEdge(level)}
      label="รายจ่ายตามใจ"
      badge={!showSkeleton && <LevelBadge level={level} />}
      thresholdRow={!showSkeleton && <RuleFooter max={max} base="ของรายรับ" />}
      showOverlay={!showSkeleton}
      overlayTitle="หมวดตามใจที่จ่ายมากสุด"
      overlayBadge={categoryEntries.length > 0 && <span className={`${PILL} ${NEUTRAL_PILL}`}>{categoryEntries.length} อันดับแรก</span>}
      overlayBody={(
        <div className="grid grid-cols-2 gap-px bg-line mt-1.5 flex-1">
          {renderTopItemsOverlay(categoryEntries, 'ไม่มีรายจ่ายตามใจ', Zap, tone.text, 'รวมรายจ่ายตามใจ', wantTotal)}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <RuleHero pct={lifestyleRatio} base="ของรายรับ" amount={wantTotal} max={max} level={level} tone={tone} hasBase={hasIncome} />
      )}
    </StrategicCardShell>
  );
});

StrategicLifestyleCard.displayName = 'StrategicLifestyleCard';
