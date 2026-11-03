import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** แผงของหน้าภาพรวม: หัวเล็ก (ไอคอน + ชื่อ + ปุ่มขวา) · เนื้อหา · ท้ายแผง */
export default function Panel({ title, icon: Icon, children, footer, action, overlay }: {
  title: string; icon: LucideIcon; children: ReactNode; footer?: ReactNode; action?: ReactNode;
  /** ลอยทับใต้หัวแผงพอดี (ไม่ดันเนื้อหา) */ overlay?: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col border border-line bg-surface">
      <h2 className="flex items-center gap-2 px-4 py-2 border-b border-line text-[11px] font-black text-ink-muted">
        <Icon className="w-3.5 h-3.5 text-accent-ink" aria-hidden />{title}
        {action && <span className="ml-auto flex items-center gap-2">{action}</span>}
      </h2>
      {overlay && <div className="relative h-0">{overlay}</div>}
      <div className="flex-1">{children}</div>
      {footer && <div className="flex justify-between gap-3 px-4 py-2 border-t border-line bg-surface-elevated text-[13px] font-black text-ink-display">{footer}</div>}
    </section>
  );
}

/** ลายขีดเฉียง = ลงล่วงหน้า / ยังไม่ถึง (ทั้งหน้าเดือนเดียวและตารางหลายเดือน) */
export const stripes = (color: string, alpha = 45) =>
  `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} ${alpha}%, transparent) 0 2px, transparent 2px 5px)`;

/** ปุ่มเล็กบนหัวแผง (เปิด/ปิด) แบบเดียวกับ "แยกหมวด" */
export const toggleCls = (on: boolean) =>
  `flex items-center gap-1 px-2 py-0.5 rounded-pill border border-line text-[11px] font-bold ${on ? 'bg-surface-elevated text-ink-display' : 'text-ink-body hover:text-ink-display'}`;
