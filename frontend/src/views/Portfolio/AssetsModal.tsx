import { memo, useCallback, useEffect, useState } from 'react';
import { Gem, Plus, X, Check } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { usePortfolio } from '@/context/PortfolioContext';
import { tc } from '@/constants/theme';
import { ASSET_KIND_LABELS, formatUnits } from './portfolioHelpers';
import { assetColorMap } from './portfolioCharts';
import AssetForm from './AssetForm';

const NEW = 'new';

/** จัดการสินทรัพย์: ซ้ายเป็นรายการที่มี ขวาเป็นฟอร์มเพิ่มใหม่/แก้ไขตัวที่เลือก */
const AssetsModal = memo(function AssetsModal({ onClose }: { onClose: () => void }) {
  const { portfolio } = usePortfolio();
  const trapRef = useFocusTrap<HTMLDivElement>();
  const [selected, setSelected] = useState<string>(NEW);
  const [formKey, setFormKey] = useState(0); // เปลี่ยนแล้วฟอร์มเพิ่มใหม่ล้างค่าทั้งหมด
  const [notice, setNotice] = useState<string | null>(null);
  const assets = portfolio?.assets ?? [];
  const colors = assetColorMap(assets);
  const current = selected === NEW ? null : assets.find(a => a.id === selected) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const select = useCallback((id: string) => { setSelected(id); setNotice(null); }, []);

  const onSaved = useCallback((name: string, created: boolean) => {
    if (created) { setFormKey(k => k + 1); setNotice(`เพิ่ม "${name}" แล้ว เพิ่มตัวต่อไปได้เลย`); }
    else setNotice(`บันทึก "${name}" แล้ว`);
  }, []);

  const onDeleted = useCallback(() => { setSelected(NEW); setNotice(null); }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="จัดการสินทรัพย์ลงทุน"
        tabIndex={-1}
        className="flex flex-col w-full max-w-[1000px] border border-line-strong bg-canvas"
        style={{ height: 'min(900px, calc(100vh - 48px))' }}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-line bg-surface shrink-0">
          <h3 className="flex items-center gap-2.5 text-[15px] font-black text-ink-display">
            <Gem className="w-5 h-5 text-accent-ink" aria-hidden="true" /> จัดการสินทรัพย์ลงทุน
          </h3>
          <button type="button" onClick={onClose} aria-label="ปิด" className="p-1.5 text-ink-muted hover:text-ink-display hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav aria-label="รายการสินทรัพย์" className="w-[300px] shrink-0 flex flex-col border-r border-line bg-surface">
            <div className="p-3 border-b border-line">
              <button
                type="button"
                aria-current={selected === NEW}
                onClick={() => select(NEW)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-bold border ${
                  selected === NEW ? 'bg-accent text-on-accent border-accent' : 'border-accent/50 bg-accent/10 hover:bg-accent hover:text-on-accent text-accent-ink'
                }`}
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> เพิ่มสินทรัพย์ใหม่
              </button>
            </div>
            <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold text-ink-muted">สินทรัพย์ของฉัน ({assets.length})</p>
            <ul className="flex-1 overflow-y-auto">
              {assets.map(a => {
                const on = a.id === selected;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-current={on}
                      onClick={() => select(a.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-line ${on ? 'bg-surface-elevated' : 'hover:bg-surface-hover'}`}
                    >
                      <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: tc(colors[a.id]) }} aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold truncate text-ink-display">{a.name}</span>
                        <span className="block text-[11px] truncate text-ink-muted">{ASSET_KIND_LABELS[a.kind]}{a.symbol ? ` · ${a.symbol}` : ''}</span>
                      </span>
                      <span className="text-[11px] tabular-nums text-right text-ink-body shrink-0">
                        {a.units > 0 ? `${formatUnits(a.units)} ${a.unitLabel || ''}` : a.trades.length > 0 ? 'ขายหมด' : 'ยังไม่มีรายการ'}
                      </span>
                    </button>
                  </li>
                );
              })}
              {assets.length === 0 && (
                <li className="px-4 py-6 text-[12px] text-ink-muted">ยังไม่มีสินทรัพย์ เริ่มเพิ่มตัวแรกได้ที่ฟอร์มด้านขวา</li>
              )}
            </ul>
          </nav>

          <section aria-label={current ? `แก้ไข ${current.name}` : 'เพิ่มสินทรัพย์ใหม่'} className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-line shrink-0">
              <h4 className="text-[14px] font-bold text-ink-display truncate">{current ? `แก้ไข: ${current.name}` : 'เพิ่มสินทรัพย์ใหม่'}</h4>
              {notice && (
                <span role="status" className="flex items-center gap-1.5 text-[12px] font-semibold text-income truncate">
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />{notice}
                </span>
              )}
            </div>
            <AssetForm
              key={current ? current.id : `new-${formKey}`}
              asset={current}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onCancel={onClose}
            />
          </section>
        </div>
      </div>
    </div>
  );
});

export default AssetsModal;
