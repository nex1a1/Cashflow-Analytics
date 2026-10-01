import { memo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PortfolioAsset } from '@/types';
import { formatMoney } from '@/utils/formatters';
import { ASSET_KIND_LABELS, describePriceAge, formatUnits, fromBaseUnits, isGoldKind, plColor, trimNum } from './portfolioHelpers';
import AssetDetail from './AssetDetail';

interface AssetRowProps {
  asset: PortfolioAsset;
  onSetPrice: (id: string, price: number) => Promise<boolean>;
  /** เปิดฟอร์มบันทึกซื้อ/ขายของสินทรัพย์นี้ */
  onTrade: (id: string, side: 'buy' | 'sell') => void;
  /** สีประจำสินทรัพย์ (ตรงกับวงกลมสัดส่วน) */
  color: string;
  /** สัดส่วนของพอร์ต 0-100; null = ไม่ได้ถืออยู่ */
  weight: number | null;
  /** ข้อความผิดพลาดจากการดึงราคารอบล่าสุด (ไม่มี = ดึงสำเร็จหรือไม่ได้ลองดึง) */
  priceError?: string;
}

const CELL = 'px-3 py-2.5 text-right font-mono tabular-nums text-[13px]';
const TRADE_BTN = 'px-2 py-1 text-[11px] font-bold border border-line text-ink-soft hover:text-ink-display hover:bg-surface-elevated disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-soft';

const AssetRow = memo(function AssetRow({ asset, onSetPrice, onTrade, color, weight, priceError }: AssetRowProps) {
  const [open, setOpen] = useState(false);
  const held = asset.units > 0;
  const age = describePriceAge(asset.priceAt);
  const unit = asset.unitLabel || 'หน่วย';

  return (
    <>
      {/* ทั้งแถวกดเปิด/ปิดรายละเอียดได้; ปุ่มชื่อสินทรัพย์ยังเป็นตัวรับคีย์บอร์ด (คลิกจากปุ่มลอยขึ้นมาถึงแถวเอง) */}
      <tr
        onClick={() => setOpen(o => !o)}
        className={`group border-b border-line cursor-pointer hover:bg-surface-hover ${held ? '' : 'opacity-70'}`}
      >
        <td className="px-3 py-2.5 sticky left-0 z-[1] bg-surface group-hover:bg-surface-hover">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? 'ซ่อน' : 'ดู'}รายละเอียด ${asset.name}`}
            className="flex items-center gap-2 text-left"
          >
            {open ? <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />}
            <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
            <span className="flex flex-col min-w-0">
              <span className="font-bold text-[13px] text-ink-display truncate">{asset.name}</span>
              <span className="text-[11px] text-ink-muted">
                {ASSET_KIND_LABELS[asset.kind]}{asset.symbol ? ` · ${asset.symbol}` : ''}
              </span>
            </span>
          </button>
        </td>
        <td className="px-3 py-2.5 w-[130px]">
          {weight == null ? <span className="block text-right text-ink-muted">–</span> : (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-canvas"><div className="h-full" style={{ width: `${Math.max(weight, 2)}%`, backgroundColor: color }} /></div>
              <span className="w-9 text-right text-[12px] font-bold tabular-nums text-ink-soft">{weight.toFixed(0)}%</span>
            </div>
          )}
        </td>
        <td className={CELL}>{held ? <>{`${formatUnits(asset.units)} ${unit}`}{isGoldKind(asset.kind) && <div className="text-[11px] text-ink-muted font-sans">≈ {trimNum(fromBaseUnits(asset.units, true), 4)} กรัม</div>}</> : <span className="text-ink-muted font-sans">{asset.trades.length > 0 ? 'ขายหมดแล้ว' : 'ยังไม่มีรายการ'}</span>}</td>
        <td className={CELL}>{asset.avgCostPerUnit == null ? '–' : formatMoney(asset.avgCostPerUnit)}</td>
        <td className={CELL}>
          {asset.price == null ? <span className="text-warn font-sans text-[11px]">ยังไม่มีราคา</span> : formatMoney(asset.price)}
          {age && (
            <div className={`text-[11px] font-sans ${age.stale ? 'text-warn' : 'text-ink-muted'}`}>{age.label}</div>
          )}
          {priceError && (
            <div className="text-[11px] font-sans text-warn" title={priceError}>ดึงราคาไม่สำเร็จ ใช้ราคาเดิม</div>
          )}
        </td>
        <td className={`${CELL} font-bold text-ink-display`}>{asset.marketValue == null ? '–' : formatMoney(asset.marketValue)}</td>
        <td className={`${CELL} ${plColor(asset.unrealized)}`}>
          {asset.unrealized == null ? '–' : (
            <>
              {asset.unrealized > 0 ? '+' : ''}{formatMoney(asset.unrealized)}
              {asset.unrealizedPct != null && <div className="text-[11px]">{asset.unrealizedPct > 0 ? '+' : ''}{asset.unrealizedPct.toFixed(2)}%</div>}
            </>
          )}
        </td>
        <td className={`${CELL} ${plColor(asset.realized)}`}>{asset.realized === 0 ? '–' : `${asset.realized > 0 ? '+' : ''}${formatMoney(asset.realized)}`}</td>
        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button type="button" onClick={() => onTrade(asset.id, 'buy')} className={TRADE_BTN} aria-label={`บันทึกซื้อ ${asset.name}`}>ซื้อ</button>
            <button type="button" onClick={() => onTrade(asset.id, 'sell')} disabled={!held} className={TRADE_BTN} aria-label={`บันทึกขาย ${asset.name}`}>ขาย</button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-line bg-surface">
          <td colSpan={9}><AssetDetail asset={asset} unit={unit} onSetPrice={onSetPrice} /></td>
        </tr>
      )}
    </>
  );
});

export default AssetRow;
