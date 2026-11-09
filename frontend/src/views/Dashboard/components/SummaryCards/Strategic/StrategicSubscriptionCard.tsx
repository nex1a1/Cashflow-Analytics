import { memo } from 'react';
import { Repeat } from 'lucide-react';
import {
  Shimmer, renderTopItemsOverlay, BUDGET_RULES, LevelBadge, ruleLevel, ruleEdge, CARD_TONES,
  RuleHero, RuleFooter, PILL, NEUTRAL_PILL,
} from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';
import type { SubscriptionService, BreakdownEntry } from '../types';

interface SubscriptionCardProps {
  subscriptionTotal?: number;
  subscriptionPctOfIncome?: number | string;
  subscriptionPercentage?: number | string;
  subscriptionCount?: number;
  topSubscriptionServices?: SubscriptionService[];
  totalIncome?: number;
  showSkeleton?: boolean;
}

const tone = CARD_TONES.subscription;

export const StrategicSubscriptionCard = memo(({
  subscriptionTotal = 0,
  subscriptionPctOfIncome = 0,
  subscriptionPercentage = 0,
  subscriptionCount = 0,
  topSubscriptionServices = [],
  totalIncome = 0,
  showSkeleton
}: SubscriptionCardProps) => {
  // With no income the share falls back to expense, against its own (looser) rule.
  const isIncomeBased = totalIncome > 0;
  const displayPct = Number.parseFloat(String(isIncomeBased ? subscriptionPctOfIncome : subscriptionPercentage)) || 0;
  const max = isIncomeBased ? BUDGET_RULES.subscription.max : BUDGET_RULES.subscriptionExp.max;
  const base = isIncomeBased ? 'ของรายรับ' : 'ของรายจ่าย';
  const level = ruleLevel(displayPct, max);

  const serviceEntries: BreakdownEntry[] = topSubscriptionServices.slice(0, 4).map((s, idx) => ({
    key: idx,
    icon: s.icon,
    label: s.name,
    amount: s.amount,
    pctLabel: subscriptionTotal > 0 ? `${((s.amount / subscriptionTotal) * 100).toFixed(0)}%` : '0%'
  }));

  return (
    <StrategicCardShell
      icon={Repeat}
      edgeClass={ruleEdge(level)}
      label="บริการรายเดือน"
      badge={!showSkeleton && <LevelBadge level={level} />}
      thresholdRow={!showSkeleton && <RuleFooter max={max} base={base} />}
      showOverlay={!showSkeleton}
      overlayTitle="บริการที่จ่ายมากสุด"
      overlayBadge={subscriptionCount > 0 && <span className={`${PILL} ${NEUTRAL_PILL}`}>{subscriptionCount} รายการ</span>}
      overlayBody={(
        <div className="grid grid-cols-2 gap-px bg-line mt-1.5 flex-1">
          {renderTopItemsOverlay(serviceEntries, 'ไม่มีข้อมูลรายเดือน', Repeat, tone.text, 'ยอดรวมทั้งหมด', subscriptionTotal)}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <RuleHero pct={displayPct} base={base} amount={subscriptionTotal} max={max} level={level} tone={tone} />
      )}
    </StrategicCardShell>
  );
});

StrategicSubscriptionCard.displayName = 'StrategicSubscriptionCard';
