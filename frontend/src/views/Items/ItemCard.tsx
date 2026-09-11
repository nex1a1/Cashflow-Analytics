import React from 'react';
import {
  Tag, Link as LinkIcon, CheckCircle2, XCircle, Edit3, Trash2,
  AlertTriangle, ShieldCheck, Clock, Archive, Sparkles, ExternalLink
} from 'lucide-react';
import { ItemWithDetails, ItemStatus } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { STATUS_CONFIG, getWarrantyStatus } from '../../utils/itemHelpers';

interface ItemCardProps {
  item: ItemWithDetails;
  onEdit: (item: ItemWithDetails) => void;
  onDelete: (id: number) => void;
  onQuickPurchase?: (item: ItemWithDetails) => void;
  onQuickCancel?: (id: number) => void;
  onOpenLinkModal?: (item: ItemWithDetails) => void;
  onChangeStatus?: (id: number, status: ItemStatus) => void;
}

export default function ItemCard({
  item,
  onEdit,
  onDelete,
  onQuickPurchase,
  onQuickCancel,
  onOpenLinkModal,
  onChangeStatus
}: ItemCardProps) {
  const isPlanned = item.status === 'planned';
  const isCancelled = item.status === 'cancelled';
  const warranty = getWarrantyStatus(item.warranty_until);
  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

  return (
    <div className={`p-3.5 border transition-all duration-150 rounded-none bg-[#141414] hover:bg-[#191919] relative group ${
      isPlanned
        ? 'border-[#2e2e2e] hover:border-amber-500/50'
        : isCancelled
        ? 'border-neutral-800 opacity-60'
        : 'border-[#2e2e2e] hover:border-[#da291c]/50'
    }`}>
      {/* Priority Ribbon / Badge for Planned */}
      {isPlanned && item.priority > 0 && (
        <div className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase bg-amber-500/20 text-amber-300 border-l border-b border-amber-500/40">
          PRIORITY {item.priority}
        </div>
      )}

      {/* Main Card Header: Name, Brand/Model & Category */}
      <div className="flex items-start justify-between gap-2 pr-14">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-white">
              {item.name}
            </h4>
            {item.brand_model && (
              <span className="text-xs text-neutral-400 font-medium truncate">
                · {item.brand_model}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-neutral-400">
            {item.source && (
              <span className="inline-flex items-center gap-1 text-neutral-300">
                <Tag className="w-3 h-3 text-neutral-500" />
                {item.source}
              </span>
            )}
            {item.purchased_at && (
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <Clock className="w-3 h-3 text-neutral-500" />
                ซื้อ {item.purchased_at}
              </span>
            )}
            {item.broken_at && (
              <span className="inline-flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3 text-[#da291c]" />
                เสีย {item.broken_at}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price & Linked Status HUD */}
      <div className="mt-3 pt-2.5 border-t border-[#252525] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            {item.linked_count > 0 ? 'ราคาจริง' : (isPlanned ? 'ประมาณการ' : 'ราคา')}
          </span>
          <span className="text-base font-black text-slate-100 tabular-nums">
            ฿{formatMoney(item.display_price)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.linked_count > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-950/40 text-purple-300 border-purple-500/40">
              ผ่อน {item.linked_count} งวด
            </span>
          )}
          {item.linked_count === 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/40 text-emerald-300 border-emerald-500/40">
              ผูกบัญชีแล้ว
            </span>
          )}
          {item.linked_count === 0 && !isPlanned && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-neutral-900 text-neutral-400 border-neutral-700">
              ราคาจดเอง
            </span>
          )}

          {warranty && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${warranty.className}`}>
              {warranty.label}
            </span>
          )}
        </div>
      </div>

      {/* Optional Description / Notes */}
      {item.description && (
        <div className="mt-2 text-xs text-neutral-400 bg-[#0d0d0d] p-2 border border-[#222] font-sans break-words line-clamp-2">
          {item.description}
        </div>
      )}

      {/* Card Actions Bar */}
      <div className="mt-3 pt-2 border-t border-[#222] flex items-center justify-between gap-2 text-xs">
        {/* Left Side: Status changer or Quick Purchase */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isPlanned ? (
            <>
              {onQuickPurchase && (
                <button
                  onClick={() => onQuickPurchase(item)}
                  className="px-2.5 py-1 text-xs font-bold flex items-center gap-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ซื้อแล้ว
                </button>
              )}
              {onQuickCancel && (
                <button
                  onClick={() => onQuickCancel(item.id)}
                  className="px-2 py-1 text-xs font-medium text-neutral-400 hover:text-red-400 transition-colors"
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
                  className="px-2 py-1 text-[11px] font-bold bg-[#1a1a1a] text-neutral-300 border border-[#333] hover:border-[#555] rounded-none focus:outline-none focus:border-[#da291c]"
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
                  onClick={() => onOpenLinkModal(item)}
                  className={`px-2 py-1 text-[11px] font-bold flex items-center gap-1 border transition-colors ${
                    item.linked_count > 0
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                      : 'bg-red-950/20 text-red-400 border-red-900/40 hover:bg-red-950/40'
                  }`}
                  title="ผูกกับรายการในบัญชี"
                >
                  <LinkIcon className="w-3 h-3 text-[#da291c]" />
                  {item.linked_count > 0 ? `ผูกแล้ว (${item.linked_count})` : 'ผูกธุรกรรม'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Side: Edit & Delete */}
        <div className="flex items-center gap-1">
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
