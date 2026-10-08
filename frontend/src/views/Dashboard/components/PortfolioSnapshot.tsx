import { memo, type ReactNode } from 'react';
import { PiggyBank, ChevronRight, WifiOff, TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAppUI } from '@/context/AppUIContext';
import { formatMoney, formatBaht } from '@/utils/formatters';
import { describePriceAge, plColor } from '@/views/Portfolio/portfolioHelpers';

interface StatProps {
  label: string;
  value: string;
  valueClass?: string;
  cellClass?: string;
  extra?: ReactNode;
}

const Stat = ({ label, value, valueClass = 'text-ink-display', cellClass = '', extra }: StatProps) => (
  <div className={`flex flex-col justify-center gap-0.5 min-w-0 px-5 py-3 ${cellClass}`}>
    <span className="text-[11px] font-bold text-ink-muted">{label}</span>
    <span className="flex items-center gap-2 text-base font-black font-mono tabular-nums">
      <span className={`truncate ${valueClass}`}>{value}</span>
      {extra}
    </span>
  </div>
);

/** สรุปมูลค่าพอร์ตแบบแถบเดียว — ซ่อนถ้ายังไม่มีสินทรัพย์ เพื่อไม่รบกวนคนที่ไม่ได้ลงทุน */
const PortfolioSnapshot = memo(function PortfolioSnapshot() {
  const { portfolio, priceStatus } = usePortfolio();
  const { setActiveTab } = useAppUI();
  if (!portfolio || portfolio.assets.length === 0) return null;

  const { totals } = portfolio;
  const age = describePriceAge(totals.oldestPriceAt);
  const degraded = priceStatus === 'offline' || priceStatus === 'partial' || !!age?.stale;
  const pct = totals.cost > 0 ? (totals.unrealized / totals.cost) * 100 : null;
  const gain = totals.unrealized > 0;
  const TrendIcon = gain ? TrendingUp : totals.unrealized < 0 ? TrendingDown : null;

  // เส้นล่างสุด: ต้นทุน vs มูลค่า — ส่วนเทาคือเงินต้นที่ทั้งสองฝั่งมีร่วมกัน ส่วนที่เหลือคือกำไร (เขียว) หรือส่วนที่หายไป (ขาว)
  const span = Math.max(totals.cost, totals.marketValue);
  const sharedPct = span > 0 ? (Math.min(totals.cost, totals.marketValue) / span) * 100 : 0;

  return (
    <button
      type="button"
      onClick={() => setActiveTab('portfolio')}
      className="group relative w-full text-left flex items-stretch divide-x divide-line overflow-hidden border border-line bg-surface hover:bg-surface-hover"
    >
      <span className="flex items-center gap-2 px-5 shrink-0 bg-savings text-canvas text-xs font-black">
        <PiggyBank className="w-5 h-5" /> พอร์ตลงทุน
      </span>
      <Stat label="มูลค่าปัจจุบัน" value={`${formatBaht(totals.marketValue)}`} />
      <Stat label="ต้นทุน" value={`${formatBaht(totals.cost)}`} valueClass="text-ink-soft" />
      <Stat
        label="กำไร/ขาดทุน ที่ยังไม่ขาย"
        value={`${gain ? '+' : ''}${formatMoney(totals.unrealized)}`}
        valueClass={plColor(totals.unrealized)}
        cellClass={gain ? 'bg-income/10' : ''}
        extra={pct != null && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-pill text-[11px] font-black leading-none ${gain ? 'bg-income text-canvas' : 'bg-surface-elevated text-ink-display'}`}>
            {TrendIcon && <TrendIcon className="w-3 h-3" aria-hidden="true" />}
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          </span>
        )}
      />
      <Stat
        label="ขายแล้ว"
        value={`${totals.realized > 0 ? '+' : ''}${formatMoney(totals.realized)}`}
        valueClass={plColor(totals.realized)}
        cellClass="grow"
      />
      <span className={`flex items-center gap-2 px-4 shrink-0 text-[11px] font-semibold ${degraded ? 'bg-warn/10 text-warn' : 'text-ink-body'}`}>
        {degraded
          ? <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          : age && <span className="w-2 h-2 rounded-full bg-income shrink-0" aria-hidden="true" />}
        {age ? `ราคา${age.label.replace('ข้อมูล ', '')}` : 'ยังไม่มีราคา'}
      </span>
      <span className="flex items-center justify-center w-11 shrink-0 bg-accent/10 text-accent-ink group-hover:bg-accent group-hover:text-on-accent">
        <ChevronRight className="w-5 h-5" aria-hidden="true" />
        <span className="sr-only">ไปที่หน้าพอร์ตลงทุน</span>
      </span>
      {span > 0 && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-[2px]">
          <span className="bg-ink-muted" style={{ width: `${sharedPct}%` }} />
          <span className={`flex-1 ${gain ? 'bg-income' : 'bg-ink-soft'}`} />
        </span>
      )}
    </button>
  );
});

export default PortfolioSnapshot;
