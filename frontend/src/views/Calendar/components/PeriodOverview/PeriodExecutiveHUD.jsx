// src/views/Calendar/components/PeriodOverview/PeriodExecutiveHUD.jsx
import React, { useMemo } from 'react';
import { DollarSign, Flame, ShieldCheck, Award } from 'lucide-react';

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
  workVsRest
}) {
  // Burn Pace Status evaluation
  const burnPace = useMemo(() => {
    if (!periodIncome || periodIncome <= 0) {
      return { text: 'ไม่มีข้อมูลรายรับ', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.3)' };
    }
    const ratio = (periodExpense / periodIncome) * 100;
    if (ratio <= 60) {
      return { text: 'ความเร็วปลอดภัย', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (ratio <= 85) {
      return { text: 'ความเร็วปานกลาง', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { text: 'เผาเงินเร็ว', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
  }, [periodIncome, periodExpense]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#2d2d2d] border border-[#2d2d2d]">
      {/* 1. Inflow, Outflow, Net Cashflow & CPA Savings Grade */}
      <div className="bg-[#181818] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
            สรุปกระแสเงินสด & เงินออม (NET & SAVINGS)
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

          <div className="mt-2 flex flex-col gap-1 border-t border-[#252525] pt-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <div className="text-emerald-400 flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-sans">รับ</span>
                <span>+{formatVal(periodIncome)}</span>
              </div>
              <div className="text-rose-400 flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-sans">จ่าย</span>
                <span>-{formatVal(periodExpense)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202020]">
              <span className="text-slate-400 font-sans">อัตราการออมสุทธิ</span>
              <span className="font-bold font-mono" style={{ color: cpaGrade.color }}>
                {savingsRate}% ({cpaGrade.text})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Average Daily Burn Rate with Work vs Rest Context */}
      <div className="bg-[#181818] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            อัตราเผาเงินเฉลี่ยต่อวัน (DAILY BURN)
          </span>
          <span
            className="px-1.5 py-0.2 text-[9px] font-bold border rounded-none"
            style={{ color: burnPace.color, backgroundColor: burnPace.bg, borderColor: burnPace.border }}
          >
            {burnPace.text}
          </span>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl font-black text-slate-100 font-mono tabular-nums tracking-tight">
            ฿{formatVal(averageDailyBurn)} <span className="text-xs font-normal text-slate-400">/ วัน</span>
          </div>

          <div className="mt-2 flex flex-col gap-1 border-t border-[#252525] pt-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <div className="text-blue-400 flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-sans">วันทำงาน</span>
                <span>฿{formatVal(workVsRest?.workAvgExpense || 0)}/ว.</span>
              </div>
              <div className="text-emerald-400 flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-sans">วันพักผ่อน</span>
                <span>฿{formatVal(workVsRest?.restAvgExpense || 0)}/ว.</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202020] text-slate-400">
              <span className="font-sans">ยอดใช้จ่ายรวมทั้งรอบ</span>
              <span className="font-bold text-rose-400 font-mono">฿{formatVal(periodExpense)}</span>
            </div>
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

          <div className="mt-2 flex flex-col gap-1 border-t border-[#252525] pt-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-sans">วันที่มีการจ่ายเงิน</span>
              <span className="font-bold text-slate-200">{totalPeriodDays - zeroSpendDaysCount} วัน ({100 - zeroSpendPct}%)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#202020] text-slate-400">
              <span className="font-sans">วินัยการใช้จ่าย</span>
              <span className="font-bold text-emerald-400 font-sans">
                {zeroSpendPct >= 40 ? 'ดีเยี่ยม (ปลอดจ่ายสูง)' : (zeroSpendPct >= 20 ? 'มาตรฐานดี' : 'จ่ายเกือบทุกวัน')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
