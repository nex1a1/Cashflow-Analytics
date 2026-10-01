import { memo, useState, useCallback, useMemo } from 'react';
import { PiggyBank, RefreshCw, WifiOff, Gem, ArrowUp, ArrowDown } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAppUI } from '@/context/AppUIContext';
import { formatMoney } from '@/utils/formatters';
import PortfolioSummary from './PortfolioSummary';
import AssetRow from './AssetRow';
import AssetsModal from './AssetsModal';
import { AssetSort, AssetSortKey, describePriceAge, plColor, sortAssets } from './portfolioHelpers';
import { assetColorMap, buildAllocation } from './portfolioCharts';
import { tc } from '@/constants/theme';

const TH = 'px-3 py-2 text-[11px] font-bold text-ink-muted text-right first:text-left first:sticky first:left-0 first:z-[2] first:bg-canvas';
const CELL = 'px-3 py-2.5 text-right font-mono tabular-nums text-[13px]';

/** sort = คอลัมน์ที่เรียงได้ (เฉพาะค่าที่เทียบข้ามสินทรัพย์ได้ — จำนวนหน่วย/ราคาต่อหน่วยคนละหน่วยกัน จึงไม่เรียง) */
const COLUMNS: { label: string; sort?: AssetSortKey }[] = [
  { label: 'สินทรัพย์', sort: 'name' },
  { label: 'สัดส่วน', sort: 'weight' },
  { label: 'ที่ถืออยู่' },
  { label: 'ต้นทุนเฉลี่ย/หน่วย' },
  { label: 'ราคาล่าสุด' },
  { label: 'มูลค่า', sort: 'value' },
  { label: 'กำไร/ขาดทุน (ยังไม่ขาย)', sort: 'unrealized' },
  { label: 'ขายแล้ว', sort: 'realized' },
];

const PortfolioView = memo(function PortfolioView() {
  const { portfolio, isRefreshing, priceStatus, failedPrices, refreshPrices, setManualPrice } = usePortfolio();
  const { handleOpenTradeModal } = useAppUI();
  const [manageOpen, setManageOpen] = useState(false);
  const closeManage = useCallback(() => setManageOpen(false), []);
  const [sort, setSort] = useState<AssetSort>({ key: 'value', dir: 'desc' });
  const [hideInactive, setHideInactive] = useState(false);
  const toggleSort = useCallback((key: AssetSortKey) => {
    setSort(prev => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));
  }, []);

  const { colors, weights } = useMemo(() => ({
    colors: assetColorMap(portfolio?.assets ?? []),
    weights: portfolio ? Object.fromEntries(buildAllocation(portfolio).map(a => [a.id, a.pct])) : {},
  }), [portfolio]);

  const inactiveCount = portfolio ? portfolio.assets.filter(a => a.units <= 0).length : 0;
  const rows = useMemo(() => {
    if (!portfolio) return [];
    const shown = hideInactive ? portfolio.assets.filter(a => a.units > 0) : portfolio.assets;
    return sortAssets(shown, sort, weights);
  }, [portfolio, hideInactive, sort, weights]);

  if (!portfolio) {
    return <p className="py-20 text-center text-sm text-ink-muted">กำลังโหลดพอร์ต…</p>;
  }

  const age = describePriceAge(portfolio.totals.oldestPriceAt);
  const offline = priceStatus === 'offline' || priceStatus === 'partial';
  const failedNames = portfolio.assets.filter(a => failedPrices[a.id]).map(a => a.name);
  const { totals } = portfolio;

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
              : `ดึงราคาได้ไม่ครบทุกสินทรัพย์${failedNames.length ? ` (ไม่สำเร็จ: ${failedNames.join(', ')})` : ''}`}
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
          {inactiveCount > 0 && (
            <label className="self-end flex items-center gap-2 text-[11px] font-bold text-ink-body cursor-pointer select-none">
              <input type="checkbox" checked={hideInactive} onChange={e => setHideInactive(e.target.checked)} className="accent-accent" />
              ซ่อนที่ไม่ได้ถืออยู่ ({inactiveCount})
            </label>
          )}
          <div className="border border-line bg-surface overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  {COLUMNS.map(c => (
                    <th
                      key={c.label}
                      scope="col"
                      className={TH}
                      aria-sort={c.sort && sort.key === c.sort ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {c.sort ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.sort!)}
                          className={`inline-flex items-center gap-1 font-bold hover:text-ink-display ${sort.key === c.sort ? 'text-ink-display' : ''}`}
                        >
                          {c.label}
                          {sort.key === c.sort && (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />)}
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                  <th scope="col" className={TH}><span className="sr-only">บันทึกซื้อ/ขาย</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    onSetPrice={setManualPrice}
                    onTrade={handleOpenTradeModal}
                    color={tc(colors[a.id])}
                    weight={weights[a.id] ?? null}
                    priceError={failedPrices[a.id]}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-canvas">
                  <td colSpan={5} className="px-3 py-2.5 text-[12px] font-bold text-ink-display">รวมทั้งพอร์ต (เฉพาะสินทรัพย์ที่มีราคา)</td>
                  <td className={`${CELL} font-bold text-ink-display`}>{formatMoney(totals.marketValue)}</td>
                  <td className={`${CELL} ${plColor(totals.unrealized)}`}>
                    {totals.unrealized > 0 ? '+' : ''}{formatMoney(totals.unrealized)}
                    {totals.cost > 0 && <div className="text-[11px]">{totals.unrealized > 0 ? '+' : ''}{((totals.unrealized / totals.cost) * 100).toFixed(2)}%</div>}
                  </td>
                  <td className={`${CELL} ${plColor(totals.realized)}`}>{totals.realized === 0 ? '–' : `${totals.realized > 0 ? '+' : ''}${formatMoney(totals.realized)}`}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {manageOpen && <AssetsModal onClose={closeManage} />}
    </div>
  );
});

export default PortfolioView;
