// src/views/Calendar/components/PeriodOverview/PeriodExecutiveHUD.jsx
import React from 'react';
import { DollarSign, Flame, ShieldCheck, Zap, Award } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PeriodExecutiveHUD({
  periodIncome,
  periodExpense,
  periodNet,
  savingsRate,
  cpaGrade,
  averageDailyBurn,
  zeroSpendDaysCount,
  zeroSpendPct,
  totalPeriodDays,
  peakSpendDay,
  onSelectDate
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#2d2d2d] border border-[#2d2d2d]">
      {/* 1. Inflow, Outflow & CPA Savings Grade */}
      <div className="bg-[#181818] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
            สรุปกระแสเงินสด (NET CASHFLOW)
          </span>
          <span
            className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border rounded-none flex items-center gap-1"
            style={{ color: cpaGrade.color, backgroundColor: cpaGrade.bg, borderColor: cpaGrade.border }}
          >
            <Award className="w-3 h-3" />
            เกรด {cpaGrade.grade}
          </span>
        </div>

        <div className="mt-2.5">
          <div className={`text-2xl font-black font-mono tabular-nums tracking-tight ${periodNet >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
            {periodNet >= 0 ? '+' : ''}{formatVal(periodNet)} <span className="text-xs font-normal text-slate-400">฿</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs font-mono border-t border-[#252525] pt-2">
            <div className="text-emerald-400 flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-sans">รับ</span>
              <span>+{formatVal(periodIncome)}</span>
            </div>
            <div className="text-rose-400 flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-sans">จ่าย</span>
              <span>-{formatVal(periodExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Average Daily Burn Rate */}
      <div className="bg-[#181818] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            อัตราเผาเงินเฉลี่ยต่อวัน (DAILY BURN)
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {totalPeriodDays} วันปฏิทิน
          </span>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-100 font-mono tabular-nums tracking-tight">
            ฿{formatVal(averageDailyBurn)} <span className="text-xs font-normal text-slate-400">/ วัน</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#252525] pt-2">
            <span>อัตราการออม</span>
            <span className="font-mono font-bold text-emerald-400">{savingsRate}% ({cpaGrade.text})</span>
          </div>
        </div>
      </div>

      {/* 3. Zero-Spend Days Discipline */}
      <div className="bg-[#181818] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            วันปลอดค่าใช้จ่าย (ZERO-SPEND)
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.2 bg-emerald-950/40 border border-emerald-800/40">
            {zeroSpendPct}% ของรอบ
          </span>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums tracking-tight">
            {zeroSpendDaysCount} <span className="text-xs font-normal text-slate-400">วัน (จาก {totalPeriodDays} วัน)</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#252525] pt-2">
            <span>วันที่มีการจ่ายเงิน</span>
            <span className="font-mono font-bold text-slate-200">{totalPeriodDays - zeroSpendDaysCount} วัน ({100 - zeroSpendPct}%)</span>
          </div>
        </div>
      </div>

      {/* 4. Peak Spend Day */}
      <div className="bg-[#181818] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#da291c]" />
            วันจ่ายหนักที่สุดประจำรอบ (PEAK SPEND)
          </span>
          {peakSpendDay?.date && (
            <button
              onClick={() => onSelectDate && onSelectDate(peakSpendDay.date)}
              className="text-[9px] font-black uppercase tracking-wider text-[#da291c] hover:underline cursor-pointer"
            >
              ดูรายการ
            </button>
          )}
        </div>

        <div className="mt-2.5">
          {peakSpendDay?.date ? (
            <>
              <div className="text-2xl font-black text-rose-400 font-mono tabular-nums tracking-tight">
                ฿{formatVal(peakSpendDay.amount)}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#252525] pt-2">
                <span className="font-mono text-slate-300">{peakSpendDay.date}</span>
                <span className="text-[10px] text-slate-500 font-mono">({peakSpendDay.transactions?.length || 0} รายการ)</span>
              </div>
            </>
          ) : (
            <div className="text-sm font-bold text-slate-500 py-3">
              ไม่มีข้อมูลการใช้จ่าย
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
