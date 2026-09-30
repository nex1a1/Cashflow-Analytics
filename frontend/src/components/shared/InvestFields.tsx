import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '@/components/shared/Dropdown';
import FieldError from '@/components/shared/FieldError';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatMoney } from '@/utils/formatters';
import { PortfolioAsset } from '@/types';
import {
  isGoldKind, toBaseUnits, fromBaseUnits, pricePerDisplayUnit, trimNum, checkPriceSanity, GRAMS_PER_BAHT_GOLD,
} from '@/views/Portfolio/portfolioHelpers';

export type TradeSide = 'buy' | 'sell';

export interface InvestFieldsProps {
  assetId: string;
  side: TradeSide;
  units: string;
  /** จำนวนเงินที่กรอกอยู่ (บวกเสมอ) ใช้คำนวณราคาต่อหน่วย/จำนวนหน่วย */
  amount?: number;
  onAssetChange: (assetId: string) => void;
  onSideChange: (side: TradeSide) => void;
  onUnitsChange: (units: string) => void;
  onEnter?: () => void;
  unitsError?: string;
  idPrefix: string;
}

const NONE = '';
const FIELD = 'flex-1 min-w-0 px-2 py-1.5 text-xs border bg-canvas border-line-strong text-ink-display text-right font-bold tabular-nums outline-none focus:border-accent-ink';
const LABEL = 'text-[11px] font-bold text-ink-muted shrink-0 w-[104px]';
const cleanNum = (v: string) => v.replace(/[^\d.]/g, '');

interface UnitsEditorProps extends Pick<InvestFieldsProps, 'side' | 'units' | 'amount' | 'onUnitsChange' | 'onEnter' | 'unitsError' | 'idPrefix'> {
  asset: PortfolioAsset;
}

/**
 * กรอกได้ 2 ทาง: (1) จำนวนหน่วยที่ได้มา → โชว์ราคาต่อหน่วยให้  (2) ราคาต่อหน่วย + จำนวนเงิน → คำนวณหน่วยให้
 * ทองกรอกเป็นกรัมได้ (ระบบเก็บเป็นบาททอง แปลงให้) ค่าที่ส่งออกไปฟอร์มเป็นหน่วยของระบบเสมอ
 */
const UnitsEditor = memo(function UnitsEditor({ asset, side, units, amount, onUnitsChange, onEnter, unitsError, idPrefix }: UnitsEditorProps) {
  const gold = isGoldKind(asset.kind);
  const [gram, setGram] = useState(gold);
  const [byPrice, setByPrice] = useState(false);
  const [rawUnits, setRawUnits] = useState(() => (units ? trimNum(fromBaseUnits(Number(units), gold), 6) : ''));
  const [rawPrice, setRawPrice] = useState('');
  const lastEmit = useRef(units);

  const baseName = asset.unitLabel || 'หน่วย';
  const unitName = gram ? 'กรัม' : baseName;

  const emit = useCallback((base: number) => {
    const s = trimNum(base, 8);
    lastEmit.current = s;
    onUnitsChange(s);
  }, [onUnitsChange]);

  // ฟอร์มถูกรีเซ็ต/โหลดรายการเดิมจากข้างนอก → ตามค่าใหม่
  useEffect(() => {
    if (units === lastEmit.current) return;
    lastEmit.current = units;
    setRawUnits(units ? trimNum(fromBaseUnits(Number(units), gram), 6) : '');
    setRawPrice('');
    setByPrice(false);
  }, [units, gram]);

  // โหมดกรอกราคา: จำนวนเงินหรือราคาเปลี่ยน → คำนวณหน่วย
  useEffect(() => {
    if (!byPrice) return;
    const p = Number(rawPrice);
    const n = amount && amount > 0 && p > 0 ? amount / p : 0;
    setRawUnits(trimNum(n, 6));
    emit(toBaseUnits(n, gram));
  }, [byPrice, rawPrice, amount, gram, emit]);

  const displayUnits = Number(rawUnits);
  const perUnit = amount && amount > 0 && displayUnits > 0 ? amount / displayUnits : null;
  const market = asset.price != null ? pricePerDisplayUnit(asset.price, gram) : null;
  const diffPct = perUnit && market ? (perUnit / market - 1) * 100 : null;
  const farOff = perUnit != null && checkPriceSanity(perUnit, market) === 'far';

  const onUnitsInput = (v: string) => {
    const c = cleanNum(v);
    setRawUnits(c);
    setByPrice(false);
    setRawPrice('');
    emit(toBaseUnits(Number(c), gram));
  };

  const switchUnit = (toGram: boolean) => {
    if (toGram === gram) return;
    const k = toGram ? GRAMS_PER_BAHT_GOLD : 1 / GRAMS_PER_BAHT_GOLD;
    setGram(toGram);
    if (byPrice) setRawPrice(trimNum(Number(rawPrice) / k, 4)); // ราคา/กรัม ↔ ราคา/บาททอง; หน่วยคำนวณใหม่ให้เอง
    else setRawUnits(trimNum(displayUnits * k, 6));
  };

  const priceShown = byPrice ? rawPrice : (perUnit ? trimNum(perUnit, 2) : '');
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-units`} className={LABEL}>
            จำนวน{unitName}ที่{side === 'buy' ? 'ได้มา' : 'ขายไป'}
          </label>
          <input
            id={`${idPrefix}-units`}
            type="text"
            inputMode="decimal"
            value={rawUnits}
            onChange={e => onUnitsInput(e.target.value)}
            onKeyDown={enter}
            aria-invalid={!!unitsError}
            aria-describedby={unitsError ? `${idPrefix}-units-err` : undefined}
            placeholder={gram ? 'เช่น 0.2393' : 'เช่น 0.0234'}
            className={FIELD}
          />
          {gold && (
            <div role="group" aria-label="หน่วยของทอง" className="flex p-0.5 border shrink-0 bg-canvas border-line">
              {([[true, 'กรัม'], [false, baseName]] as const).map(([g, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={gram === g}
                  onClick={() => switchUnit(g)}
                  className={`px-2 py-1 text-[11px] font-black ${gram === g ? 'bg-surface-elevated text-ink-display' : 'text-ink-muted hover:text-ink-display'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <FieldError id={`${idPrefix}-units-err`} message={unitsError} />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`${idPrefix}-price`} className={LABEL}>ราคาต่อ{unitName} (฿)</label>
        <input
          id={`${idPrefix}-price`}
          type="text"
          inputMode="decimal"
          value={priceShown}
          onChange={e => { setRawPrice(cleanNum(e.target.value)); setByPrice(true); }}
          onKeyDown={enter}
          placeholder={`กรอกราคา → คำนวณจำนวน${unitName}ให้`}
          className={FIELD}
        />
      </div>

      {gold && gram && displayUnits > 0 && (
        <p className="text-[11px] text-ink-muted tabular-nums">
          = {trimNum(toBaseUnits(displayUnits, true), 6)} {baseName} (1 {baseName} = {GRAMS_PER_BAHT_GOLD} กรัม)
        </p>
      )}
      {byPrice && !(amount && amount > 0) && (
        <p className="text-[11px] text-warn">กรอกจำนวนเงินด้วย ระบบจะคำนวณจำนวน{unitName}จากราคาที่กรอก</p>
      )}
      {market != null && perUnit != null && diffPct != null && (
        <p className={`text-[11px] tabular-nums ${farOff ? 'text-warn font-semibold' : 'text-ink-muted'}`}>
          ตลาดล่าสุด ฿{formatMoney(market)} ต่อ{unitName} · ที่กรอก{diffPct >= 0 ? 'สูงกว่า' : 'ต่ำกว่า'} {Math.abs(diffPct).toFixed(1)}%
          {farOff && ' — ห่างจากตลาดมาก ตรวจหน่วยและจำนวนเงินอีกครั้ง'}
        </p>
      )}
    </div>
  );
});

const InvestFields = memo(function InvestFields({
  assetId, side, units, amount, onAssetChange, onSideChange, onUnitsChange, onEnter, unitsError, idPrefix,
}: InvestFieldsProps) {
  const { portfolio } = usePortfolio();
  const assets = portfolio?.assets ?? [];
  const options = useMemo(
    () => [{ value: NONE, label: 'ออมทั่วไป (ไม่ผูกสินทรัพย์)' }, ...assets.map(a => ({ value: a.id, label: a.name }))],
    [assets],
  );
  const asset = assets.find(a => a.id === assetId);

  return (
    <div className="flex flex-col gap-2 p-2.5 border border-line bg-canvas/60">
      <div className="flex gap-2 items-center">
        <div className="flex-1 min-w-0">
          <Dropdown
            value={assetId}
            options={options}
            onChange={onAssetChange}
            className="w-full bg-canvas border-line text-ink-display"
            aria-label="สินทรัพย์"
          />
        </div>
        <div role="group" aria-label="ซื้อหรือขาย" className="flex p-0.5 border shrink-0 bg-canvas border-line">
          {([['buy', 'ซื้อ'], ['sell', 'ขาย']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              aria-pressed={side === val}
              onClick={() => onSideChange(val)}
              className={`px-3 py-1 text-[11px] font-black transition-colors ${
                side === val ? `bg-surface-elevated ${val === 'sell' ? 'text-info' : 'text-savings'}` : 'text-ink-muted hover:text-ink-display'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {asset && (
        <UnitsEditor
          key={asset.id}
          asset={asset}
          side={side}
          units={units}
          amount={amount}
          onUnitsChange={onUnitsChange}
          onEnter={onEnter}
          unitsError={unitsError}
          idPrefix={idPrefix}
        />
      )}
      {side === 'sell' && (
        <p className="text-[11px] text-ink-muted">ขาย = เงินกลับเข้ามา หักออกจากยอดออมสุทธิ ส่วนต่างจากต้นทุนคือกำไร/ขาดทุนในหน้าพอร์ต</p>
      )}
    </div>
  );
});

export default InvestFields;
