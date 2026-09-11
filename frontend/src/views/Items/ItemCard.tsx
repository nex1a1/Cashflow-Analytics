import React from 'react';
import {
  Tag, Link as LinkIcon, CheckCircle2, Edit3, Trash2,
  AlertTriangle, Clock
} from 'lucide-react';
import { ItemWithDetails, ItemStatus } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { getWarrantyStatus } from '../../utils/itemHelpers';

interface ItemCardProps {
  item: ItemWithDetails;
  onEdit: (item: ItemWithDetails) => void;
  onDelete: (id: number) => void;
  onQuickPurchase?: (item: ItemWithDetails) => void;
  onQuickCancel?: (id: number) => void;
  onOpenLinkModal?: (item: ItemWithDetails) => void;
  onChangeStatus?: (id: number, status: ItemStatus) => void;
  showCategoryBadge?: boolean;
}

export default function ItemCard({
  item,
  onEdit,
  onDelete,
  onQuickPurchase,
  onQuickCancel,
  onOpenLinkModal,
  onChangeStatus,
  showCategoryBadge = false
}: ItemCardProps) {
  const isPlanned = item.status === 'planned';
  const isCancelled = item.status === 'cancelled';
  const warranty = getWarrantyStatus(item.warranty_until);

  // Determine status color indicator for left accent border
  const getBorderColorClass = () => {
    if (isCancelled) return 'border-l-neutral-700 opacity-60';
    if (isPlanned) return 'border-l-amber-500 hover:border-amber-500/80';
    switch (item.status) {
      case 'purchased':
        return 'border-l-emerald-500 hover:border-emerald-500/80';
      case 'stored':
        return 'border-l-sky-500 hover:border-sky-500/80';
      case 'broken':
        return 'border-l-[#da291c] hover:border-[#da291c]/80';
      case 'sold':
        return 'border-l-purple-500 hover:border-purple-500/80';
      default:
        return 'border-l-neutral-600';
    }
  };

  return (
    <div
      className={`px-3 py-2 border border-l-2 transition-all duration-150 rounded-none bg-[#131313] hover:bg-[#181818] border-[#252525] group flex flex-col justify-between gap-1.5 ${getBorderColorClass()}`}
    >
      {/* ── ROW 1: Primary Asset Line (Specs, Tags <──> Valuation & Link HUD) ── */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        {/* Left: Priority, Name, Brand, Source & Date Badges */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          {/* Priority Pill for Wishlist */}
          {isPlanned && item.priority > 0 && (
            <span
              className="px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0"
              title={`ความสำคัญระดับ ${item.priority}`}
            >
              P{item.priority}
            </span>
          )}

          {/* Category badge in flat list mode */}
          {showCategoryBadge && item.category_name && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#1f1f1f] text-neutral-300 border border-[#333] shrink-0">
              {item.category_name}
            </span>
          )}

          {/* Item Name */}
          <h4
            className="text-xs md:text-sm font-bold text-slate-100 group-hover:text-white truncate max-w-[220px] md:max-w-[320px] xl:max-w-[420px]"
            title={item.name}
          >
            {item.name}
          </h4>

          {/* Brand / Model */}
          {item.brand_model && (
            <span
              className="text-xs text-neutral-400 font-medium truncate shrink-0 max-w-[150px]"
              title={`ยี่ห้อ/รุ่น: ${item.brand_model}`}
            >
              · {item.brand_model}
            </span>
          )}

          {/* Source Tag Badge */}
          {item.source && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-[#1a1a1a] px-1.5 py-0.5 border border-[#2a2a2a] shrink-0"
              title={`แหล่งซื้อ: ${item.source}`}
            >
              <Tag className="w-2.5 h-2.5 text-neutral-500" />
              <span className="truncate max-w-[100px]">{item.source}</span>
            </span>
          )}

          {/* Purchased Date */}
          {item.purchased_at && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-[#1a1a1a] px-1.5 py-0.5 border border-[#2a2a2a] shrink-0"
              title={`วันที่ซื้อ: ${item.purchased_at}`}
            >
              <Clock className="w-2.5 h-2.5 text-neutral-500" />
              {item.purchased_at}
            </span>
          )}

          {/* Broken Date */}
          {item.broken_at && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-950/30 px-1.5 py-0.5 border border-red-900/40 shrink-0"
              title={`วันที่ชำรุด: ${item.broken_at}`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-[#da291c]" />
              เสีย {item.broken_at}
            </span>
          )}

          {/* Warranty Pill */}
          {warranty && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${warranty.className}`}
              title={warranty.label}
            >
              {warranty.label}
            </span>
          )}
        </div>

        {/* Right: Price & Installment / Linked HUD */}
        <div className="flex items-center gap-2 shrink-0 font-mono">
          <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono hidden sm:inline">
            {item.linked_count > 0 ? 'ราคาจริง' : (isPlanned ? 'ประมาณการ' : 'ราคา')}
          </span>
          <span
            className={`text-xs sm:text-sm md:text-base font-black tabular-nums ${
              isPlanned ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            ฿{formatMoney(item.display_price)}
          </span>

          {/* Linked Transactions Badges */}
          {item.linked_count > 1 && (
            <button
              type="button"
              onClick={() => onOpenLinkModal && onOpenLinkModal(item)}
              disabled={!onOpenLinkModal}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-950/40 text-purple-300 border-purple-500/40 hover:border-purple-400 transition-colors shrink-0"
              title="คลิกเพื่อดู/แก้ไขรายการผูกบัญชี"
            >
              ผ่อน {item.linked_count} งวด
            </button>
          )}
          {item.linked_count === 1 && (
            <button
              type="button"
              onClick={() => onOpenLinkModal && onOpenLinkModal(item)}
              disabled={!onOpenLinkModal}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 transition-colors shrink-0"
              title="คลิกเพื่อดู/แก้ไขรายการผูกบัญชี"
            >
              ผูกบัญชีแล้ว
            </button>
          )}
          {item.linked_count === 0 && !isPlanned && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-neutral-900 text-neutral-400 border-neutral-700 shrink-0">
              ราคาจดเอง
            </span>
          )}
        </div>
      </div>

      {/* ── ROW 2: Tactical Actions Line (Controls, Note & Management) ── */}
      <div className="pt-1.5 border-t border-[#202020] flex items-center justify-between gap-2 text-xs">
        {/* Left Side: Status changer, Quick Actions & Note */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          {isPlanned ? (
            <>
              {onQuickPurchase && (
                <button
                  type="button"
                  onClick={() => onQuickPurchase(item)}
                  className="px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ซื้อแล้ว
                </button>
              )}
              {onOpenLinkModal && (
                <button
                  type="button"
                  onClick={() => onOpenLinkModal(item)}
                  className="px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 bg-[#1a1a1a] text-neutral-300 border border-[#333] hover:border-amber-500 hover:text-white transition-colors"
                  title="ผูกกับรายการในบัญชี"
                >
                  <LinkIcon className="w-3 h-3 text-amber-400" />
                  <span>{item.linked_count > 0 ? `ผูกแล้ว (${item.linked_count})` : 'ผูกธุรกรรม'}</span>
                </button>
              )}
              {onQuickCancel && (
                <button
                  type="button"
                  onClick={() => onQuickCancel(item.id)}
                  className="px-1.5 py-0.5 text-[11px] font-medium text-neutral-400 hover:text-red-400 transition-colors"
                  title="เลิกอยากได้ (ยกเลิก)"
                >
                  ไม่เอาแล้ว
                </button>
              )}
            </>
          ) : (
            <>
              {/* Status Switcher Dropdown */}
              {onChangeStatus && (
                <select
                  value={item.status}
                  onChange={(e) => onChangeStatus(item.id, e.target.value as ItemStatus)}
                  aria-label="เปลี่ยนสถานะสิ่งของ"
                  className="h-6 px-2 py-0 text-[11px] font-bold bg-[#181818] text-neutral-300 border border-[#333] hover:border-[#555] rounded-none focus:outline-none focus:border-[#da291c]"
                >
                  <option value="purchased">ใช้งานอยู่ (Active)</option>
                  <option value="stored">เก็บเข้ากรุ (Stored)</option>
                  <option value="broken">พัง / ชำรุด (Broken)</option>
                  <option value="sold">ขายแล้ว (Sold)</option>
                  <option value="planned">กลับเป็น Wishlist</option>
                </select>
              )}

              {/* Link Transactions Button */}
              {onOpenLinkModal && (
                <button
                  type="button"
                  onClick={() => onOpenLinkModal(item)}
                  className={`px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 border transition-colors ${
                    item.linked_count > 0
                      ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/50'
                      : 'bg-[#1a1a1a] text-neutral-300 border-[#333] hover:border-[#da291c] hover:text-white'
                  }`}
                  title={item.linked_count > 0 ? 'คลิกเพื่อดูและจัดการรายการบัญชีที่ผูกไว้' : 'ผูกรายการบัญชีกับสิ่งของนี้'}
                >
                  <LinkIcon className={`w-3 h-3 ${item.linked_count > 0 ? 'text-emerald-400' : 'text-[#da291c]'}`} />
                  <span>{item.linked_count > 0 ? `ผูกแล้ว (${item.linked_count})` : '+ ผูกรายการบัญชี'}</span>
                </button>
              )}
            </>
          )}

          {/* Truncated Description / Note */}
          {item.description && (
            <span
              className="text-[11px] text-neutral-400 truncate max-w-[200px] sm:max-w-[280px] xl:max-w-[420px] border-l border-neutral-700/80 pl-2 italic cursor-help"
              title={`โน้ต: ${item.description}`}
            >
              {item.description}
            </span>
          )}
        </div>

        {/* Right Side: Edit & Delete Tools */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
            title="แก้ไขข้อมูล"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-neutral-500 hover:text-[#da291c] transition-colors"
            title="ลบสิ่งของ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
