// src/views/Dashboard/components/CashflowTable/FilterToolbar.tsx
import React from 'react';
import { FileSpreadsheet, Eye, EyeOff, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { FilterToolbarProps } from './types';

export function FilterToolbar({
  isFilterBarOpen,
  setIsFilterBarOpen,
  excludedAllocations,
  toggleAllocationFilter,
  resetFilters,
  totalExcludedCount,
}: FilterToolbarProps) {
  return (
    <div className="px-4 py-2 border-b flex flex-col gap-2 bg-surface/80 border-line">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3 bg-accent shrink-0" />
          <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-200">
            ตารางสรุปกระแสเงินสด
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterBarOpen((prev) => !prev)}
            className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold rounded-none border transition-all duration-150 select-none cursor-pointer ${
              isFilterBarOpen || totalExcludedCount > 0
                ? 'bg-accent/15 text-white border-accent/60'
                : 'bg-canvas text-neutral-300 border-line hover:bg-surface-hover hover:border-neutral-500 hover:text-white'
            }`}
            title={
              totalExcludedCount > 0
                ? `เปิด/ปิด ตัวกรอง (กำลังซ่อนอยู่ ${totalExcludedCount} รายการ)`
                : 'เปิด/ปิด ตัวกรอง Allocation'
            }
          >
            <Filter
              className={`w-3.5 h-3.5 transition-colors ${
                isFilterBarOpen || totalExcludedCount > 0 ? 'text-accent' : 'text-neutral-400 group-hover:text-white'
              }`}
            />
            {totalExcludedCount > 0 && (
              <span className="px-1 py-[1px] text-[11px] font-black bg-accent text-on-accent leading-none rounded-none shadow-sm tracking-tighter">
                {totalExcludedCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isFilterBarOpen ? 'rotate-180 text-white' : 'text-neutral-400 group-hover:text-neutral-300'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expandable Filter Bar */}
      {isFilterBarOpen && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1.5 border-t border-line/80 text-[11px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-auto">
            โหมดปิดรายการตาม Allocation (Transaction-Level):
          </span>

          {/* Fix #11: ลบ line-through ออกจาก text ใน button — ใช้ icon + opacity แทน */}
          <button
            onClick={() => toggleAllocationFilter('want')}
            className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
              excludedAllocations.has('want')
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 opacity-60'
                : 'bg-canvas text-amber-400 border-amber-800/40 hover:bg-surface-elevated hover:border-amber-600/60'
            }`}
          >
            {excludedAllocations.has('want') ? (
              <EyeOff className="w-3 h-3 text-amber-400" />
            ) : (
              <Eye className="w-3 h-3 text-amber-400" />
            )}
            <span>ปิด WANT (กิเลส)</span>
          </button>

          <button
            onClick={() => toggleAllocationFilter('need')}
            className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
              excludedAllocations.has('need')
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 opacity-60'
                : 'bg-canvas text-rose-400 border-rose-800/40 hover:bg-surface-elevated hover:border-rose-600/60'
            }`}
          >
            {excludedAllocations.has('need') ? (
              <EyeOff className="w-3 h-3 text-rose-400" />
            ) : (
              <Eye className="w-3 h-3 text-rose-400" />
            )}
            <span>ปิด NEED (จำเป็น)</span>
          </button>

          <button
            onClick={() => toggleAllocationFilter('savings')}
            className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
              excludedAllocations.has('savings')
                ? 'bg-savings/20 text-savings border-savings/60 opacity-60'
                : 'bg-canvas text-savings border-savings/30 hover:bg-surface-elevated hover:border-savings/60'
            }`}
          >
            {excludedAllocations.has('savings') ? (
              <EyeOff className="w-3 h-3 text-savings" />
            ) : (
              <Eye className="w-3 h-3 text-savings" />
            )}
            <span>ปิด SAVINGS (เงินออม)</span>
          </button>

          {totalExcludedCount > 0 && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1 font-bold rounded-none border border-neutral-700 bg-surface-hover text-neutral-300 hover:text-white hover:bg-surface-elevated transition-colors inline-flex items-center gap-1"
              title="คืนค่าการแสดงผลทั้งหมด"
            >
              <RotateCcw className="w-3 h-3 text-neutral-400" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
