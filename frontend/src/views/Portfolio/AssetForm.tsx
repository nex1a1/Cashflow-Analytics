import { memo, useEffect, useRef, useState } from 'react';
import { Check, Loader2, AlertTriangle, Plus } from 'lucide-react';
import FieldError from '@/components/shared/FieldError';
import ConfirmDeleteButton from '@/components/shared/ConfirmDeleteButton';
import { usePortfolio } from '@/context/PortfolioContext';
import { portfolioService } from '@/services/api';
import { AssetKind, PortfolioAsset, PricePreview } from '@/types';
import { formatMoney } from '@/utils/formatters';
import { tc } from '@/constants/theme';
import { ASSET_KIND_LABELS, GRAMS_PER_BAHT_GOLD, defaultUnitLabel, formatUnits, isGoldKind } from './portfolioHelpers';
import { KIND_META } from './assetKinds';

const KINDS = Object.keys(KIND_META) as AssetKind[];
const INPUT = 'w-full px-3 py-2 border outline-none font-semibold text-[13px] rounded-sm bg-canvas border-line text-ink-display focus:border-accent-ink placeholder-ink-muted';
const LABEL = 'block mb-1.5 text-[12px] font-bold text-ink-soft';
const HINT = 'mt-1.5 text-[11px] text-ink-muted';

/** ตัวสัญลักษณ์: หุ้นเป็นตัวใหญ่ · คริปโต (CoinGecko id) เป็นตัวเล็ก */
const normSymbol = (kind: AssetKind, v: string) => {
  const t = v.trim().replace(/\s+/g, '');
  return kind === 'crypto' ? t.toLowerCase() : kind === 'us_stock' || kind === 'th_stock' ? t.toUpperCase() : t;
};

type PreviewState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; result: PricePreview };

/** ทดสอบดึงราคาสดหลังหยุดพิมพ์ 0.6 วินาที — ไม่บันทึกอะไร ไว้จับสัญลักษณ์ผิดก่อนเพิ่มจริง */
function usePricePreview(kind: AssetKind, symbol: string): PreviewState {
  const [state, setState] = useState<PreviewState>({ status: 'idle' });
  const seq = useRef(0);

  useEffect(() => {
    const meta = KIND_META[kind];
    const ready = meta.auto && (!meta.needsSymbol || symbol.length > 0);
    const mine = ++seq.current;
    if (!ready) { setState({ status: 'idle' }); return; }
    setState({ status: 'loading' });
    const timer = setTimeout(() => {
      portfolioService.previewPrice(kind, symbol || null)
        .then(result => { if (seq.current === mine) setState({ status: 'done', result }); })
        .catch(() => { if (seq.current === mine) setState({ status: 'done', result: { ok: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' } }); });
    }, 600);
    return () => clearTimeout(timer);
  }, [kind, symbol]);

  return state;
}

const PricePreviewBox = ({ kind, symbol, unit, state }: { kind: AssetKind; symbol: string; unit: string; state: PreviewState }) => {
  const meta = KIND_META[kind];
  const box = 'flex items-start gap-2.5 px-3 py-2.5 border text-[12px]';
  if (!meta.auto) {
    return <div className={`${box} border-line bg-canvas text-ink-body`}>ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ กรอกราคาปัจจุบันเองที่ตารางในหน้าพอร์ต เมื่ออยากอัปเดตมูลค่า</div>;
  }
  if (state.status === 'idle') {
    return <div className={`${box} border-line bg-canvas text-ink-muted`}>พิมพ์สัญลักษณ์ ระบบจะลองดึงราคาล่าสุดมาให้ดูทันที</div>;
  }
  if (state.status === 'loading') {
    return <div className={`${box} border-line bg-canvas text-ink-body`}><Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />กำลังดึงราคา{symbol ? ` ${symbol}` : ''}…</div>;
  }
  const r = state.result;
  if (r.ok) {
    return (
      <div role="status" className={`${box} tint-border bg-income/5`} style={{ ['--tint-border-color' as string]: tc('income', 0.4) }}>
        <Check className="w-4 h-4 shrink-0 mt-0.5 text-income" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold text-ink-display tabular-nums">
            ฿{formatMoney(r.price)} <span className="font-normal text-ink-body">ต่อ{unit}</span>
            {isGoldKind(kind) && <span className="ml-2 font-normal text-ink-body">≈ ฿{formatMoney(r.price / GRAMS_PER_BAHT_GOLD)} ต่อกรัม</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">แหล่งข้อมูล: {r.source}</p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className={`${box} tint-border bg-warn/5`} style={{ ['--tint-border-color' as string]: tc('warn', 0.4) }}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warn" aria-hidden="true" />
      <div className="min-w-0 text-ink-body">
        <p className="font-bold text-warn">ดึงราคาไม่ได้: {r.error}</p>
        <p className="mt-0.5 text-[11px]">ตรวจตัวสะกดสัญลักษณ์ หรือเพิ่มไว้ก่อนได้เลย ระบบจะลองดึงใหม่เองและใช้ราคาที่กรอกเองระหว่างรอ</p>
      </div>
    </div>
  );
};

interface AssetFormProps {
  /** null = เพิ่มใหม่ */
  asset: PortfolioAsset | null;
  onSaved: (name: string, created: boolean) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

const AssetForm = memo(function AssetForm({ asset, onSaved, onDeleted, onCancel }: AssetFormProps) {
  const { saveAsset, deleteAsset, setManualPrice } = usePortfolio();
  const editing = asset !== null;
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? 'us_stock');
  const [symbol, setSymbol] = useState(asset?.symbol ?? '');
  const [name, setName] = useState(asset?.name ?? '');
  const [nameTouched, setNameTouched] = useState(editing);
  const [unit, setUnit] = useState(asset?.unitLabel ?? defaultUnitLabel('us_stock'));
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<{ name?: string; symbol?: string }>({});
  const [saving, setSaving] = useState(false);

  const meta = KIND_META[kind];
  const autoName = symbol || ASSET_KIND_LABELS[kind];
  const shownName = nameTouched ? name : autoName;
  const preview = usePricePreview(kind, symbol);
  const inUse = (asset?.trades.length ?? 0) > 0;

  const pickKind = (k: AssetKind) => {
    if (k === kind) return;
    // หน่วยที่ยังเป็นค่าเริ่มต้นของประเภทเดิมให้ตามประเภทใหม่ · สัญลักษณ์ของประเภทเก่าใช้กับประเภทใหม่ไม่ได้
    if (!unit || unit === defaultUnitLabel(kind)) setUnit(defaultUnitLabel(k));
    setSymbol('');
    setErrors({});
    setKind(k);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!shownName.trim()) next.name = 'ต้องมีชื่อสินทรัพย์';
    if (meta.needsSymbol && !symbol) next.symbol = 'ระบุสัญลักษณ์ ไม่งั้นดึงราคาไม่ได้';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const id = await saveAsset({ id: asset?.id, name: shownName.trim(), kind, symbol: symbol || null, unit_label: unit.trim() || null });
    if (id && !editing && !meta.auto && Number(price) > 0) await setManualPrice(id, Number(price));
    setSaving(false);
    if (id) onSaved(shownName.trim(), !editing);
  };

  return (
    <form onSubmit={submit} className="flex flex-col min-h-0 flex-1" noValidate>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        <fieldset>
          <legend className={LABEL}>ประเภทสินทรัพย์</legend>
          <div className="grid grid-cols-4 gap-[1px] bg-line border border-line">
            {KINDS.map(k => {
              const m = KIND_META[k];
              const on = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickKind(k)}
                  className={`flex flex-col items-start gap-1.5 px-3 py-3 text-left ${on ? 'bg-surface-elevated' : 'bg-surface hover:bg-surface-hover'}`}
                >
                  <m.icon className={`w-5 h-5 ${on ? 'text-accent-ink' : 'text-ink-muted'}`} aria-hidden="true" />
                  <span className={`text-[13px] font-bold ${on ? 'text-ink-display' : 'text-ink-soft'}`}>{ASSET_KIND_LABELS[k]}</span>
                  <span className="text-[11px] text-ink-muted">{m.auto ? 'ราคาอัตโนมัติ' : 'กรอกราคาเอง'}</span>
                </button>
              );
            })}
          </div>
          <p className={HINT}>{meta.blurb}</p>
          {editing && kind !== asset.kind && inUse && (
            <p className="mt-1.5 text-[11px] font-semibold text-warn">เปลี่ยนประเภทแล้วราคาที่ดึงไว้จะถูกล้างและดึงใหม่</p>
          )}
        </fieldset>

        {meta.needsSymbol && (
          <div>
            <label htmlFor="asset-symbol" className={LABEL}>
              {kind === 'crypto' ? 'CoinGecko id' : 'สัญลักษณ์'}
            </label>
            <input
              id="asset-symbol"
              value={symbol}
              onChange={e => { setSymbol(normSymbol(kind, e.target.value)); setErrors(er => ({ ...er, symbol: undefined })); }}
              aria-invalid={!!errors.symbol}
              aria-describedby={errors.symbol ? 'asset-symbol-err' : undefined}
              className={`${INPUT} tabular-nums`}
              placeholder={`เช่น ${meta.examples[0]}`}
              autoComplete="off"
              spellCheck={false}
            />
            <FieldError id="asset-symbol-err" message={errors.symbol} />
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="สัญลักษณ์ตัวอย่าง">
              {meta.examples.map(ex => (
                <button key={ex} type="button" onClick={() => setSymbol(ex)}
                  className={`px-2 py-1 text-[11px] font-bold border tabular-nums ${symbol === ex ? 'border-accent/60 bg-accent/10 text-accent-ink' : 'border-line bg-canvas text-ink-body hover:text-ink-display hover:bg-surface-hover'}`}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <div aria-live="polite">
          <span className={LABEL}>ราคาล่าสุด</span>
          <PricePreviewBox kind={kind} symbol={symbol} unit={unit || 'หน่วย'} state={preview} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_200px] gap-4">
          <div>
            <label htmlFor="asset-name" className={LABEL}>ชื่อที่แสดง</label>
            <input
              id="asset-name"
              value={shownName}
              onChange={e => { setName(e.target.value); setNameTouched(true); setErrors(er => ({ ...er, name: undefined })); }}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'asset-name-err' : undefined}
              className={INPUT}
              placeholder="เช่น Dime - AAPL, ออมทอง"
            />
            <FieldError id="asset-name-err" message={errors.name} />
            <p className={HINT}>ตั้งชื่อให้แยกได้ เช่น ใส่ชื่อแอปที่ซื้อไว้หน้าชื่อ ถ้าถือตัวเดียวกันหลายที่</p>
          </div>
          <div>
            <label htmlFor="asset-unit" className={LABEL}>หน่วยนับ</label>
            <input id="asset-unit" value={unit} onChange={e => setUnit(e.target.value)} className={INPUT} placeholder="หุ้น, บาททอง, เหรียญ" />
            <p className={HINT}>{isGoldKind(kind) ? 'ทองใช้บาททอง กรอกเป็นกรัมได้ตอนบันทึกซื้อ' : 'ใช้แสดงจำนวนที่ถือ'}</p>
          </div>
        </div>

        {!editing && !meta.auto && (
          <div className="max-w-[260px]">
            <label htmlFor="asset-price" className={LABEL}>ราคาปัจจุบันต่อ{unit || 'หน่วย'} (฿) <span className="font-normal text-ink-muted">ไม่บังคับ</span></label>
            <input id="asset-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} className={`${INPUT} tabular-nums text-right`} placeholder="เช่น 12.4567" />
            <p className={HINT}>ใส่ไว้จะเห็นมูลค่าและกำไรทันที แก้ทีหลังได้ที่ตารางพอร์ต</p>
          </div>
        )}

        {editing && (
          <dl className="grid grid-cols-3 gap-[1px] bg-line border border-line">
            {[
              ['ที่ถืออยู่', asset.units > 0 ? `${formatUnits(asset.units)} ${asset.unitLabel || 'หน่วย'}` : '–'],
              ['ต้นทุนรวม', asset.units > 0 ? `฿${formatMoney(asset.cost)}` : '–'],
              ['รายการซื้อขาย', `${asset.trades.length} รายการ`],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-3 py-2.5">
                <dt className="text-[11px] text-ink-muted">{k}</dt>
                <dd className="mt-0.5 text-[13px] font-bold tabular-nums text-ink-display">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {!editing && (
          <p className="text-[12px] text-ink-body border-t border-line pt-4">
            เพิ่มสินทรัพย์แล้ว ไปบันทึกซื้อที่หน้า <span className="font-bold text-ink-soft">ฐานข้อมูลบัญชี</span> ในหมวดลงทุน/ออม แล้วเลือกสินทรัพย์นี้ ยอดที่ถือจะขึ้นในพอร์ตเอง
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-line bg-surface shrink-0">
        {editing ? (
          <ConfirmDeleteButton
            variant="label"
            label="ลบสินทรัพย์"
            onConfirm={async () => { if (await deleteAsset(asset.id)) onDeleted(); }}
            disabled={inUse}
            tooltip={inUse ? `ลบไม่ได้ มี ${asset.trades.length} รายการซื้อขายอยู่` : 'ลบสินทรัพย์'}
            itemLabel={asset.name}
          />
        ) : <span />}
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-[12px] font-bold border border-line bg-canvas text-ink-soft hover:text-ink-display hover:bg-surface-hover">
            {editing ? 'ปิด' : 'ยกเลิก'}
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-[12px] font-bold bg-accent hover:bg-accent-active text-on-accent disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : editing ? <Check className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
            {editing ? 'บันทึกการแก้ไข' : 'เพิ่มสินทรัพย์'}
          </button>
        </div>
      </div>
    </form>
  );
});

export default AssetForm;
