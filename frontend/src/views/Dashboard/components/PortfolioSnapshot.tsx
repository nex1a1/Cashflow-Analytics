import { memo } from 'react';
import { PiggyBank, ChevronRight, WifiOff } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAppUI } from '@/context/AppUIContext';
import { formatMoney } from '@/utils/formatters';
import { describePriceAge, plColor } from '@/views/Portfolio/portfolioHelpers';

const Stat = ({ label, value, valueClass = 'text-ink-display' }: { label: string; value: string; valueClass?: string }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-[11px] font-bold text-ink-muted">{label}</span>
    <span className={`text-base font-black font-mono tabular-nums truncate ${valueClass}`}>{value}</span>
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

  return (
    <button
      type="button"
      onClick={() => setActiveTab('portfolio')}
      className="w-full text-left flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 border border-line bg-surface hover:bg-surface-hover"
      aria-label="ไปที่หน้าพอร์ตลงทุน"
    >
      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-savings shrink-0">
        <PiggyBank className="w-4 h-4" /> พอร์ตลงทุน
      </span>
      <Stat label="มูลค่าปัจจุบัน" value={`฿${formatMoney(totals.marketValue)}`} />
      <Stat label="ต้นทุน" value={`฿${formatMoney(totals.cost)}`} />
      <Stat
        label="กำไร/ขาดทุน ที่ยังไม่ขาย"
        value={`${totals.unrealized > 0 ? '+' : ''}${formatMoney(totals.unrealized)}${pct == null ? '' : ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`}`}
        valueClass={plColor(totals.unrealized)}
      />
      <Stat
        label="ขายแล้ว"
        value={`${totals.realized > 0 ? '+' : ''}${formatMoney(totals.realized)}`}
        valueClass={plColor(totals.realized)}
      />
      <span className={`ml-auto flex items-center gap-2 text-[11px] font-semibold ${degraded ? 'text-warn' : 'text-ink-muted'}`}>
        {degraded && <WifiOff className="w-4 h-4 shrink-0" />}
        {age ? `ราคา${age.label.replace('ข้อมูล ', '')}` : 'ยังไม่มีราคา'}
        <ChevronRight className="w-4 h-4 text-ink-muted" />
      </span>
    </button>
  );
});

export default PortfolioSnapshot;
