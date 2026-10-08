import { memo, type ReactNode } from 'react';

const SEG = 'px-3 py-1 text-[11px] font-bold cursor-pointer';

interface Props {
  icon: ReactNode;
  title: string;
  onText: string;
  offText: string;
  enabled: boolean;
  onChange: (on: boolean) => void;
}

/** เปิด/ปิดแท็บที่ไม่ได้ใช้บ่อย — แถบเดียวบรรทัดเดียว: ไอคอน + ชื่อ + คำอธิบายสั้น + สวิตช์สองช่อง (ข้อมูลไม่ถูกลบ) */
const TabToggleRow = memo(function TabToggleRow({ icon, title, onText, offText, enabled, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface border border-line">
      <span className={`shrink-0 ${enabled ? 'text-accent-ink' : 'text-ink-muted'}`} aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-ink-display">{title}</div>
        <div className="text-[11px] text-ink-body truncate">{enabled ? onText : offText}</div>
      </div>
      <div role="group" aria-label={title} className="flex gap-[1px] bg-line border border-line shrink-0">
        <button type="button" role="switch" aria-checked={!enabled} aria-label={`ปิด${title}`} onClick={() => onChange(false)}
          className={`${SEG} ${!enabled ? 'bg-surface-elevated text-ink-display' : 'bg-surface text-ink-muted hover:text-ink-display'}`}>
          ปิด
        </button>
        <button type="button" role="switch" aria-checked={enabled} aria-label={`เปิด${title}`} onClick={() => onChange(true)}
          className={`${SEG} ${enabled ? 'bg-accent text-on-accent' : 'bg-surface text-ink-muted hover:text-ink-display'}`}>
          เปิด
        </button>
      </div>
    </div>
  );
});

export default TabToggleRow;
