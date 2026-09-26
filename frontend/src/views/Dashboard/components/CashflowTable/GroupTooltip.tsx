// src/views/Dashboard/components/CashflowTable/GroupTooltip.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { hexToRgb } from '@/utils/formatters';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { HoveredGroupState } from './types';

import { tc } from '@/constants/theme';
export const GroupTooltip = ({ hoveredGroup }: { hoveredGroup: HoveredGroupState | null }) => {
  if (!hoveredGroup?.active) return null;
  const { x, y, group, category, type = 'group', activeCats } = hoveredGroup;

  // Handle Category Hover Tooltip
  if (type === 'category' && category) {
    const catColor = category.color || tc('ink-muted');
    const catRgb = hexToRgb(catColor);
    const groupColor = group.color || (group.type === 'income' ? tc('income') : tc('ink-muted'));

    return createPortal(
      <div
        className="fixed pointer-events-none z-[99999]"
        style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
      >
        <div className="flex flex-col items-center min-w-[170px] max-w-[320px]">
          <div
            className="w-full rounded-none p-2.5 text-[11px] font-medium shadow-2xl border bg-surface border-line-strong text-slate-200"
            style={{ backgroundColor: tc('surface') }}
          >
            <div className="flex items-center gap-2 mb-1.5 border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div
                className="w-5 h-5 flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `rgba(${catRgb}, 0.15)`,
                  borderColor: `rgba(${catRgb}, 0.35)`,
                }}
              >
                <CategoryGlyph icon={category.icon} color={catColor} size={15} fallbackEmoji="📁" />
              </div>
              <span className="font-black text-[12px] text-white tracking-wide truncate">
                {category.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <span>กลุ่มหลัก:</span>
              <span
                className="px-1.5 py-0.5 border font-bold"
                style={{
                  color: groupColor,
                  backgroundColor: `rgba(${hexToRgb(groupColor)}, 0.1)`,
                  borderColor: `rgba(${hexToRgb(groupColor)}, 0.25)`,
                }}
              >
                {group.name}
              </span>
            </div>
            <div
              className="mt-2 pt-1 border-t text-[11px] text-neutral-400"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              กดรูปตาเพื่อเปิด/ปิดการคำนวณหมวดหมู่นี้
            </div>
          </div>
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-line-strong" />
        </div>
      </div>,
      document.body,
    );
  }

  // Handle Group Hover Tooltip (always displays even if activeCats is empty)
  const isIncome = group.type === 'income';
  const groupColor = group.color || (isIncome ? tc('income') : tc('ink-muted'));
  const rgb = hexToRgb(groupColor);

  const allocationLabel =
    group.allocation_type === 'need'
      ? 'จำเป็น'
      : group.allocation_type === 'savings'
        ? 'เงินออม'
        : 'กิเลส';

  const allocationColorCls =
    group.allocation_type === 'need'
      ? 'text-rose-400 bg-rose-950/40 border-rose-500/30'
      : group.allocation_type === 'savings'
        ? 'text-savings bg-savings/10 border-savings/30'
        : 'text-amber-400 bg-amber-950/40 border-amber-500/30';

  const cats = activeCats || [];

  return createPortal(
    <div
      className="fixed pointer-events-none z-[99999]"
      style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex flex-col items-center min-w-[200px] max-w-[420px]">
        <div
          className="w-full rounded-none p-2.5 text-[11px] font-medium shadow-2xl border bg-surface border-line-strong text-slate-200"
          style={{ backgroundColor: tc('surface') }}
        >
          {/* Header with Group Icon, Name & Type Badges */}
          <div
            className="flex items-center justify-between gap-2 border-b pb-1.5 mb-2"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-5 h-5 flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `rgba(${rgb}, 0.15)`,
                  borderColor: `rgba(${rgb}, 0.35)`,
                }}
              >
                <CategoryGlyph icon={group.icon} color={groupColor} size={15} fallbackEmoji={isIncome ? '💰' : '📦'} />
              </div>
              <span className="font-black text-[12px] text-white tracking-wide truncate">
                {group.name}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className={`px-1.5 py-0.5 text-[11px] font-black border uppercase leading-none ${
                isIncome
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                  : allocationColorCls
              }`}>
                {isIncome ? 'รายรับ (+)' : allocationLabel}
              </span>
            </div>
          </div>

          {/* Subcategories if any */}
          {cats.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                <span>หมวดหมู่ย่อย ({cats.length}):</span>
                <span className="text-neutral-400 text-[11px]">คลิกคอลัมน์เพื่อดูแจกแจง</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                {cats.map((c) => {
                  const catColor = c.color || tc('ink-muted');
                  const catRgb = hexToRgb(catColor);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-1 py-0.5 px-1.5 rounded-none border text-[11px] font-bold text-slate-300"
                      style={{
                        backgroundColor: `rgba(${catRgb}, 0.08)`,
                        borderColor: `rgba(${catRgb}, 0.25)`,
                      }}
                    >
                      <CategoryGlyph icon={c.icon} color={catColor} size={13} className="shrink-0" fallbackEmoji="📁" />
                      <span className="whitespace-nowrap leading-none">{c.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-400 italic py-0.5">
              ไม่มีหมวดหมู่ย่อยที่บันทึกข้อมูลในรอบนี้
            </div>
          )}

          {/* Micro Footer Hint */}
          <div
            className="mt-2 pt-1.5 border-t text-[11px] text-neutral-400 flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <span>คลิกหัวตารางเพื่อ {cats.length > 0 ? 'ยุบ/ขยาย' : 'เลือก'}</span>
            <span>กดรูปตาเพื่อซ่อน/เปิด</span>
          </div>
        </div>
        {/* Arrow */}
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-line-strong" />
      </div>
    </div>,
    document.body,
  );
};
