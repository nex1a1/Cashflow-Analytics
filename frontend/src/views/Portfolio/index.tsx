import { memo, useState, useCallback, useMemo } from 'react';
import { PiggyBank, RefreshCw, WifiOff, Gem } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import PortfolioSummary from './PortfolioSummary';
import AssetRow from './AssetRow';
import AssetsModal from './AssetsModal';
import { describePriceAge } from './portfolioHelpers';
import { assetColorMap, buildAllocation } from './portfolioCharts';
import { tc } from '@/constants/theme';

const TH = 'px-3 py-2 text-[11px] font-bold text-ink-muted text-right first:text-left';

const PortfolioView = memo(function PortfolioView() {
  const { portfolio, isRefreshing, priceStatus, refreshPrices, setManualPrice } = usePortfolio();
  const [manageOpen, setManageOpen] = useState(false);
  const closeManage = useCallback(() => setManageOpen(false), []);

  const { colors, weights } = useMemo(() => ({
    colors: assetColorMap(portfolio?.assets ?? []),
    weights: portfolio ? Object.fromEntries(buildAllocation(portfolio).map(a => [a.id, a.pct])) : {},
  }), [portfolio]);

  if (!portfolio) {
    return <p className="py-20 text-center text-sm text-ink-muted">กำลังโหลดพอร์ต…</p>;
  }

  const age = describePriceAge(portfolio.totals.oldestPriceAt);
  const offline = priceStatus === 'offline' || priceStatus === 'partial';

  return (
    <div className="w-full pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-black tracking-wide flex items-center gap-2.5 text-ink-display">
          <PiggyBank className="w-5 h-5 text-accent-ink" />
          <span>พอร์ตลงทุน</span>
        </h1>
        <div className="flex items-center gap-3">
          {age && (
            <span className={`text-[11px] font-semibold ${age.stale || offline ? 'text-warn' : 'text-ink-muted'}`}>
              ราคา{age.label.replace('ข้อมูล ', '')}
            </span>
          )}
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold border border-line bg-surface text-ink-soft hover:text-ink-display hover:bg-surface-hover"
          >
            <Gem className="w-4 h-4" /> จัดการสินทรัพย์
          </button>
          <button
            type="button"
            onClick={refreshPrices}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold border border-line bg-surface text-ink-soft hover:text-ink-display hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'กำลังดึงราคา…' : 'ดึงราคาใหม่'}
          </button>
        </div>
      </div>

      {offline && (
        <div role="status" className="flex items-start gap-2.5 px-4 py-3 border rounded-sm bg-warn/10 border-warn/25 text-warn text-xs font-semibold">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {priceStatus === 'offline'
              ? 'ดึงราคาออนไลน์ไม่ได้ (อาจไม่มีอินเทอร์เน็ต)'
              : 'ดึงราคาได้ไม่ครบทุกสินทรัพย์'}
            {' '}— แสดงราคาล่าสุดที่เคยดึงหรือกรอกไว้ ตัวเลขมูลค่าจึงอาจไม่ตรงกับตลาดตอนนี้ ดูวันที่ของแต่ละราคาในตาราง
          </span>
        </div>
      )}

      {portfolio.assets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 border border-line bg-surface text-center">
          <PiggyBank className="w-12 h-12 text-ink-muted" aria-hidden="true" />
          <p className="text-lg font-bold text-ink-display">ยังไม่มีสินทรัพย์ลงทุน</p>
          <p className="text-sm text-ink-body max-w-md">เพิ่มสินทรัพย์ (ทอง หุ้น คริปโต ฯลฯ) แล้วบันทึกซื้อ/ขายที่หน้าฐานข้อมูลบัญชี ในหมวดลงทุน/ออม</p>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold border border-accent/50 bg-accent/10 hover:bg-accent hover:text-on-accent text-accent-ink"
          >
            <Gem className="w-4 h-4" /> เพิ่มสินทรัพย์
          </button>
        </div>
      ) : (
        <>
          <PortfolioSummary portfolio={portfolio} />
          <div className="border border-line bg-surface overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className={TH}>สินทรัพย์</th>
                  <th className={TH}>สัดส่วน</th>
                  <th className={TH}>ที่ถืออยู่</th>
                  <th className={TH}>ต้นทุนเฉลี่ย/หน่วย</th>
                  <th className={TH}>ราคาล่าสุด</th>
                  <th className={TH}>มูลค่า</th>
                  <th className={TH}>กำไร/ขาดทุน (ยังไม่ขาย)</th>
                  <th className={TH}>ขายแล้ว</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.assets.map(a => <AssetRow key={a.id} asset={a} onSetPrice={setManualPrice} color={tc(colors[a.id])} weight={weights[a.id] ?? null} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {manageOpen && <AssetsModal onClose={closeManage} />}
    </div>
  );
});

export default PortfolioView;
