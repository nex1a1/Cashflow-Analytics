import { useState, useCallback, useMemo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PortfolioAsset } from '@/types';
import FieldError from '@/components/shared/FieldError';
import { formatMoney, formatThaiDateShort } from '@/utils/formatters';
import { describeHolding, describePriceAge, formatUnits, plColor, summarizeTrades, todayIso } from './portfolioHelpers';

interface AssetDetailProps {
  asset: PortfolioAsset;
  unit: string;
  onSetPrice: (id: string, price: number) => Promise<boolean>;
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${formatMoney(n)}`;
const TH = 'py-1.5 pr-3 text-[11px] font-bold text-ink-muted bg-canvas sticky top-0';

function Tile({ label, value, sub, valueClass = 'text-ink-display' }: { label: string; value: ReactNode; sub?: ReactNode; valueClass?: string }) {
  return (
    <div className="bg-canvas px-3 py-2.5 flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-bold text-ink-muted">{label}</span>
      <span className={`font-mono tabular-nums text-[15px] font-bold ${valueClass}`}>{value}</span>
      {sub && <span className="text-[11px] text-ink-muted truncate">{sub}</span>}
    </div>
  );
}

export default function AssetDetail({ asset, unit, onSetPrice }: AssetDetailProps) {
  const [priceInput, setPriceInput] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const sum = useMemo(() => summarizeTrades(asset.trades), [asset.trades]);
  const history = useMemo(() => [...sum.rows].reverse(), [sum.rows]);
  const age = describePriceAge(asset.priceAt);
  const held = asset.units > 0;
  const firstDate = sum.rows[0]?.date;

  const submitPrice = useCallback(async () => {
    const n = Number(priceInput.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      setPriceError('กรอกราคาเป็นตัวเลขที่มากกว่า 0 เช่น 1,250.50');
      return;
    }
    if (await onSetPrice(asset.id, n)) {
      setPriceInput('');
      setPriceError(null);
    } else {
      setPriceError('บันทึกราคาไม่สำเร็จ ลองอีกครั้ง (ตัวเลขที่กรอกยังอยู่)'); // สาเหตุละเอียดอยู่ใน toast
    }
  }, [priceInput, onSetPrice, asset.id]);

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {asset.oversold && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-warn">
          <AlertTriangle className="w-4 h-4 shrink-0" /> มีรายการขายมากกว่าจำนวนที่ถือ — ตรวจสอบจำนวนหน่วยในรายการซื้อขาย
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-[1px] bg-line border border-line">
        <Tile
          label="ต้นทุนที่ถืออยู่"
          value={held ? formatMoney(asset.cost) : '–'}
          sub={asset.avgCostPerUnit != null ? `เฉลี่ย ${formatMoney(asset.avgCostPerUnit)} / ${unit}` : undefined}
        />
        <Tile
          label="มูลค่าตอนนี้"
          value={asset.marketValue == null ? '–' : formatMoney(asset.marketValue)}
          sub={asset.price == null ? 'ยังไม่มีราคา' : `${formatMoney(asset.price)} / ${unit}`}
        />
        <Tile
          label="กำไร/ขาดทุน (ยังไม่ขาย)"
          value={asset.unrealized == null ? '–' : signed(asset.unrealized)}
          valueClass={plColor(asset.unrealized)}
          sub={asset.unrealizedPct != null ? `${asset.unrealizedPct > 0 ? '+' : ''}${asset.unrealizedPct.toFixed(2)}% ของต้นทุน` : undefined}
        />
        <Tile
          label="กำไร/ขาดทุน (ขายแล้ว)"
          value={sum.sellCount === 0 ? '–' : signed(asset.realized)}
          valueClass={plColor(asset.realized)}
          sub={sum.sellCount === 0 ? 'ยังไม่เคยขาย' : `ขาย ${sum.sellCount} ครั้ง · ได้เงิน ${formatMoney(sum.soldAmount)}`}
        />
        <Tile
          label="ซื้อทั้งหมด"
          value={formatMoney(sum.boughtAmount)}
          sub={`${sum.buyCount} ครั้ง · ${formatUnits(sum.boughtUnits)} ${unit}`}
        />
        <Tile
          label="ถือมาแล้ว"
          value={firstDate ? describeHolding(firstDate, todayIso()) : '–'}
          sub={firstDate ? `ซื้อครั้งแรก ${formatThaiDateShort(firstDate)}` : undefined}
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-bold text-ink-muted mb-1">ประวัติซื้อขาย ({asset.trades.length})</h3>
          {asset.trades.length === 0 ? (
            <p className="text-[11px] text-ink-muted">ยังไม่มีรายการ — บันทึกที่หน้าฐานข้อมูลบัญชี เลือกหมวดลงทุน/ออมแล้วเลือกสินทรัพย์นี้</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto border border-line">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left">
                    <th className={`${TH} pl-3`}>วันที่</th>
                    <th className={TH}>รายการ</th>
                    <th className={`${TH} text-right`}>จำนวน</th>
                    <th className={`${TH} text-right`}>ราคา/{unit}</th>
                    <th className={`${TH} text-right`}>ยอดเงิน</th>
                    <th className={`${TH} text-right`}>คงเหลือ</th>
                    <th className={`${TH} text-right`}>กำไร/ขาดทุน</th>
                    <th className={`${TH} pr-3`}>บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(t => (
                    <tr key={t.id} className="border-t border-line/60">
                      <td className="py-1.5 pl-3 pr-3 text-ink-body whitespace-nowrap">{formatThaiDateShort(t.date)}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded-pill border font-black ${t.side === 'buy' ? 'bg-savings/10 text-savings border-savings/30' : 'bg-info/10 text-info border-info/30'}`}>
                          {t.side === 'buy' ? 'ซื้อ' : 'ขาย'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{formatUnits(t.units)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{formatMoney(t.pricePerUnit)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono tabular-nums font-bold text-ink-display">{t.side === 'sell' ? '−' : ''}{formatMoney(t.amount)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-ink-body">{formatUnits(t.balance)}</td>
                      <td className={`py-1.5 pr-3 text-right font-mono tabular-nums ${plColor(t.realized)}`}>{t.realized == null ? '–' : signed(t.realized)}</td>
                      <td className="py-1.5 pr-3 text-ink-muted max-w-[160px] truncate" title={t.description}>{t.description || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="xl:w-[300px] shrink-0 flex flex-col gap-2">
          <label htmlFor={`price-${asset.id}`} className="text-[11px] font-bold text-ink-muted">
            กรอกราคาเอง (บาทต่อ{unit})
          </label>
          <div className="flex gap-2">
            <input
              id={`price-${asset.id}`}
              inputMode="decimal"
              value={priceInput}
              onChange={e => { setPriceInput(e.target.value); setPriceError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') submitPrice(); }}
              placeholder={asset.price == null ? 'เช่น 1,250.50' : formatMoney(asset.price)}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `price-err-${asset.id}` : undefined}
              className={`flex-1 min-w-0 px-2 py-1.5 border bg-surface border-line text-ink-display text-[13px] font-mono tabular-nums ${priceError ? 'tint-danger' : ''}`}
            />
            <button type="button" onClick={submitPrice} className="px-3 py-1.5 text-[11px] font-bold border border-accent/50 bg-accent/10 hover:bg-accent hover:text-on-accent text-accent-ink">
              บันทึกราคา
            </button>
          </div>
          <FieldError id={`price-err-${asset.id}`} message={priceError} />
          <p className="text-[11px] text-ink-muted">
            {asset.autoPrice
              ? `ดึงอัตโนมัติจาก ${asset.priceSource ?? 'แหล่งข้อมูลออนไลน์'} — ราคาที่ใหม่กว่า (ดึงมา/กรอกเอง) จะถูกใช้`
              : 'ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ — กรอกราคาเองเมื่ออยากอัปเดตมูลค่า'}
          </p>
          {age && <p className={`text-[11px] ${age.stale ? 'text-warn' : 'text-ink-muted'}`}>{age.label}</p>}
        </div>
      </div>
    </div>
  );
}
