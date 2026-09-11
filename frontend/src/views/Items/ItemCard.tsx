import React from 'react';
import {
  CheckCircle2, Edit3, Trash2, AlertTriangle
} from 'lucide-react';
import { ItemWithDetails } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { getWarrantyStatus } from '../../utils/itemHelpers';

interface ItemCardProps {
  item: ItemWithDetails;
  onEdit: (item: ItemWithDetails) => void;
  onDelete: (id: number) => void;
  onQuickPurchase?: (item: ItemWithDetails) => void;
  onOpenLinkModal?: (item: ItemWithDetails) => void;
  showCategoryBadge?: boolean;
}

export default function ItemCard({
  item,
  onEdit,
  onDelete,
  onQuickPurchase,
  onOpenLinkModal,
  showCategoryBadge = false
}: ItemCardProps) {
  const isPlanned = item.status === 'planned';
  const isCancelled = item.status === 'cancelled';
  const warranty = getWarrantyStatus(item.warranty_until);

  // Status color dot mapping
  const getStatusDotClass = () => {
    if (isCancelled) return 'bg-neutral-600';
    if (isPlanned) {
      if (item.priority >= 8) return 'bg-[#da291c] shadow-[0_0_6px_rgba(218,41,28,0.5)]';
      if (item.priority >= 4) return 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]';
      return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]';
    }
    switch (item.status) {
      case 'purchased':
        return 'bg-emerald-400';
      case 'stored':
        return 'bg-sky-400';
      case 'broken':
        return 'bg-[#da291c] animate-pulse';
      case 'sold':
        return 'bg-neutral-500';
      default:
        return 'bg-neutral-500';
    }
  };

  const getStatusTooltip = () => {
    if (isCancelled) return 'สถานะ: ยกเลิกแล้ว';
    if (isPlanned) {
      if (item.priority >= 8) return `ความสำคัญระดับ ${item.priority}/10 (สำคัญมาก / เร่งด่วน)`;
      if (item.priority >= 4) return `ความสำคัญระดับ ${item.priority}/10 (ปานกลาง / รอโปรโมชั่น)`;
      return `ความสำคัญระดับ ${item.priority}/10 (ปกติ / ชิลๆ)`;
    }
    switch (item.status) {
      case 'purchased':
        return 'สถานะ: ใช้งานอยู่ (Active)';
      case 'stored':
        return 'สถานะ: เก็บเข้ากรุ (Stored)';
      case 'broken':
        return 'สถานะ: ชำรุด / พัง (Broken)';
      case 'sold':
        return 'สถานะ: ขายแล้ว (Sold)';
      default:
        return '';
    }
  };

  // Color border reserved for quick visual scanning
  const getBorderColorClass = () => {
    if (isCancelled) return 'border-l-neutral-700 opacity-60';
    if (isPlanned) {
      if (item.priority >= 8) return 'border-l-[#da291c] hover:border-l-red-500';
      if (item.priority >= 4) return 'border-l-amber-500 hover:border-l-amber-400';
      return 'border-l-emerald-500 hover:border-l-emerald-400';
    }
    switch (item.status) {
      case 'purchased':
        return 'border-l-emerald-500/70 hover:border-emerald-500';
      case 'stored':
        return 'border-l-sky-500 hover:border-sky-500/80';
      case 'broken':
        return 'border-l-[#da291c] hover:border-[#da291c]/80';
      case 'sold':
        return 'border-l-neutral-600 hover:border-neutral-500';
      default:
        return 'border-l-neutral-600 hover:border-neutral-500';
    }
  };

  // Single muted metadata line — only what earns attention gets color.
  const metaParts: { text: string; className: string }[] = [];
  if (item.source) metaParts.push({ text: item.source, className: isPlanned ? 'text-neutral-300 font-medium' : 'text-neutral-400' });
  if (item.purchased_at) metaParts.push({ text: `ซื้อ ${item.purchased_at}`, className: 'text-neutral-500 font-mono' });
  if (item.status === 'broken' && item.broken_at) {
    metaParts.push({ text: `ชำรุด ${item.broken_at}`, className: 'text-[#da291c] font-semibold' });
  }
  // For wishlist items, show priority text with dynamic tier color
  if (isPlanned && item.priority > 0) {
    const priorityColor = item.priority >= 8
      ? 'text-red-400'
      : item.priority >= 4
      ? 'text-amber-400'
      : 'text-emerald-400';
    metaParts.push({ text: `ความสำคัญ ${item.priority}/10`, className: `${priorityColor} font-mono font-bold` });
  }
  // Warranty only surfaces here when it's actionable; healthy warranty lives in the edit form.
  if (warranty && warranty.status !== 'active') {
    metaParts.push({
      text: warranty.shortLabel,
      className: warranty.status === 'expiring_soon' ? 'text-amber-400 font-semibold' : 'text-neutral-600'
    });
  }

  // Link control rendered in row 2 next to date/source
  const renderLinkControl = () => {
    if (!onOpenLinkModal) return null;

    if (item.linked_count > 1) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLinkModal(item);
          }}
          className="text-[10px] font-bold text-amber-300 hover:text-amber-200 transition-colors shrink-0"
          title="คลิกเพื่อดู/แก้ไขรายการผูกบัญชี"
        >
          ผ่อน {item.linked_count} งวด
        </button>
      );
    }
    if (item.linked_count === 1) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLinkModal(item);
          }}
          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
          title="คลิกเพื่อดู/แก้ไขรายการผูกบัญชี"
        >
          ผูกแล้ว
        </button>
      );
    }
    if (!isPlanned) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLinkModal(item);
          }}
          className="text-[10px] font-medium text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
          title="ผูกรายการบัญชีกับสิ่งของนี้"
        >
          จดเอง
        </button>
      );
    }
    return null;
  };

  return (
    <div
      className={`px-2.5 py-1.5 border border-l-2 transition-all duration-150 rounded-none bg-[#131313] hover:bg-[#181818] border-[#252525] group flex flex-col justify-center gap-0.5 ${getBorderColorClass()}`}
    >
      {/* ── ROW 1: Status Dot, Name, priority, category & Far-Right Aligned Price ── */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Subtle Status Dot */}
          <span
            className={`w-1.5 h-1.5 shrink-0 rounded-full ${getStatusDotClass()}`}
            title={getStatusTooltip()}
          />

          {showCategoryBadge && item.category_name && (
            <span className="text-[9px] font-bold px-1 py-0.2 bg-[#1a1a1a] text-neutral-400 shrink-0">
              {item.category_name}
            </span>
          )}
          <h4
            className={`font-bold truncate ${
              isPlanned
                ? 'text-sm sm:text-[15px] text-slate-100 group-hover:text-amber-300'
                : 'text-xs sm:text-sm text-slate-100 group-hover:text-white'
            }`}
            title={item.name}
          >
            {item.name}
          </h4>
          {item.brand_model && (
            <span
              className={`truncate shrink-0 ${
                isPlanned
                  ? 'text-xs text-neutral-300 font-semibold'
                  : 'text-xs text-neutral-400 font-medium'
              }`}
              title={`ยี่ห้อ/รุ่น: ${item.brand_model}`}
            >
              · {item.brand_model}
            </span>
          )}
        </div>

        {/* Far-Right Aligned Price with Estimated Price label for Wishlist */}
        <div className="shrink-0 font-mono text-right flex items-baseline justify-end gap-1.5">
          {isPlanned && (
            <span className="text-[10px] sm:text-[11px] text-amber-400/90 font-sans font-semibold shrink-0">
              ราคาประเมิน
            </span>
          )}
          <span className={`tabular-nums font-black ${
            isPlanned
              ? 'text-sm sm:text-base text-amber-400'
              : 'text-xs sm:text-sm md:text-base text-slate-100'
          }`}>
            ฿{formatMoney(item.display_price)}
          </span>
        </div>
      </div>

      {/* ── ROW 2: Metadata + Link Status (Left) & Quick Actions (Right) ── */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Left: Metadata, Link status & Note */}
        <div className={`flex items-center gap-1.5 leading-none truncate min-w-0 flex-1 ${
          isPlanned ? 'text-[11px] sm:text-xs' : 'text-[10px] sm:text-[11px]'
        }`}>
          {metaParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-neutral-700 mx-0.5">·</span>}
              <span className={part.className}>{part.text}</span>
            </React.Fragment>
          ))}
          {/* Link status placed right after date/source */}
          {renderLinkControl() && (
            <>
              {metaParts.length > 0 && <span className="text-neutral-700 mx-0.5">·</span>}
              {renderLinkControl()}
            </>
          )}
          {item.description && (
            <>
              {(metaParts.length > 0 || renderLinkControl()) && <span className="text-neutral-700 mx-0.5">·</span>}
              <span
                className="text-neutral-500 truncate italic cursor-help"
                title={`โน้ต: ${item.description}`}
              >
                {item.description}
              </span>
            </>
          )}
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isPlanned && onQuickPurchase && (
            <button
              type="button"
              onClick={() => onQuickPurchase(item)}
              className="px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition-colors"
              title="บันทึกการซื้อ & ผูกรายการบัญชี"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ซื้อแล้ว
            </button>
          )}

          {warranty?.status === 'expiring_soon' && (
            <AlertTriangle className="w-3 h-3 text-amber-400" aria-hidden />
          )}
          <button
            onClick={() => onEdit(item)}
            className="p-0.5 text-neutral-500 hover:text-white transition-colors"
            title="แก้ไขข้อมูล / เปลี่ยนสถานะ"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-0.5 text-neutral-600 hover:text-[#da291c] transition-colors"
            title="ลบสิ่งของ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
