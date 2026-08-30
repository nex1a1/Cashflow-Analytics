// src/views/Calendar/components/PeriodOverview/TemporalInsights.jsx
import React from 'react';
import { Briefcase, Coffee, PieChart, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function TemporalInsights({
  activeDayTypes,
  workVsRest,
  allocationData
}) {
  const {
    needTotal = 0,
    wantTotal = 0,
    savingsTotal = 0,
    netSurplus = 0,
    needPct = 0,
    wantPct = 0,
    savingsPct = 0,
    rankedCategories = [],
    benchmarks = { needDelta: 0, wantDelta: 0, savingsDelta: 0 }
  } = allocationData || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT CARD: WORK-LIFE FINANCIALS
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                ความสัมพันธ์ประเภทวัน vs รายจ่าย (WORK-LIFE FINANCIALS)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              อัตราส่วน {workVsRest.ratio}x
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            เปรียบเทียบอัตราการใช้จ่ายเฉลี่ยต่อวันระหว่างวันทำงานและวันพักผ่อน
          </p>
        </div>

        {/* 2 Big Comparison Pillars */}
        <div className="grid grid-cols-2 gap-2">
          {/* Work Days */}
          <div className="bg-[#121212] border border-[#252525] p-3 flex flex-col justify-between min-h-[85px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                วันทำงาน
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {workVsRest.workDays} วัน
              </span>
            </div>

            <div className="mt-2">
              <div className="text-xl font-black text-slate-100 font-mono tabular-nums">
                ฿{formatVal(workVsRest.workAvgExpense)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">/ วัน</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                รวม ฿{formatVal(workVsRest.workTotalExpense)}
              </div>
            </div>
          </div>

          {/* Rest Days */}
          <div className="bg-[#121212] border border-[#252525] p-3 flex flex-col justify-between min-h-[85px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                วันหยุด / พักผ่อน
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {workVsRest.restDays} วัน
              </span>
            </div>

            <div className="mt-2">
              <div className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                ฿{formatVal(workVsRest.restAvgExpense)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">/ วัน</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                รวม ฿{formatVal(workVsRest.restTotalExpense)}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown of Active Day Types */}
        <div className="space-y-1.5 border-t border-[#252525] pt-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            จำแนกตามสถานะปฏิทินที่บันทึก ({activeDayTypes.length} สถานะ)
          </span>
          <div className="space-y-1">
            {activeDayTypes.map((dt) => (
              <div
                key={dt.id}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-[#141414] border border-[#222222]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: dt.color }} />
                  <span className="font-bold text-slate-200">{dt.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({dt.daysCount} วัน)</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400 text-[11px]">เฉลี่ย ฿{formatVal(dt.avgExpense)}/วัน</span>
                  <span className="font-bold text-slate-200">฿{formatVal(dt.totalExpense)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. RIGHT CARD: ALLOCATION RHYTHM (DENSE & BALANCED)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                สัดส่วนการจัดสรรเงิน (ALLOCATION RHYTHM)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              เป้าหมายมาตรฐาน 50 / 30 / 20
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            การกระจายตัวของรายจ่ายจำเป็น (Need), ตามใจ (Want) และการสะสมความมั่งคั่ง (Savings)
          </p>
        </div>

        {/* 3 Core Pillar Cards (Need / Want / Savings) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Need Pillar */}
          <div className="bg-[#121212] border border-[#252525] p-2.5 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] font-black text-rose-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-500 rounded-none inline-block" />
                จำเป็น (50%)
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 border rounded-none ${
                benchmarks.needDelta <= 0
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/40 border-rose-800/40'
              }`}>
                {benchmarks.needDelta <= 0 ? `ต่ำกว่าเป้า ${Math.abs(benchmarks.needDelta)}%` : `เกินเป้า +${benchmarks.needDelta}%`}
              </span>
            </div>
            <div className="mt-1">
              <div className="text-base font-black text-slate-100 font-mono tabular-nums">
                ฿{formatVal(needTotal)}
              </div>
              <div className="text-[10px] font-mono text-rose-400 mt-0.5">
                {needPct}% ของงบรวม
              </div>
            </div>
          </div>

          {/* Want Pillar */}
          <div className="bg-[#121212] border border-[#252525] p-2.5 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] font-black text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-none inline-block" />
                ตามใจ (30%)
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 border rounded-none ${
                benchmarks.wantDelta <= 0
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                  : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
              }`}>
                {benchmarks.wantDelta <= 0 ? `ต่ำกว่าเป้า ${Math.abs(benchmarks.wantDelta)}%` : `เกินเป้า +${benchmarks.wantDelta}%`}
              </span>
            </div>
            <div className="mt-1">
              <div className="text-base font-black text-slate-100 font-mono tabular-nums">
                ฿{formatVal(wantTotal)}
              </div>
              <div className="text-[10px] font-mono text-amber-400 mt-0.5">
                {wantPct}% ของงบรวม
              </div>
            </div>
          </div>

          {/* Savings Pillar */}
          <div className="bg-[#121212] border border-[#252525] p-2.5 flex flex-col justify-between min-h-[88px]">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-none inline-block" />
                เงินออม (20%)
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 border rounded-none ${
                benchmarks.savingsDelta >= 0
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/40 border-rose-800/40'
              }`}>
                {benchmarks.savingsDelta >= 0 ? `เกินเป้า +${benchmarks.savingsDelta}%` : `ต่ำกว่าเป้า ${Math.abs(benchmarks.savingsDelta)}%`}
              </span>
            </div>
            <div className="mt-1">
              <div className="text-base font-black text-emerald-400 font-mono tabular-nums">
                ฿{formatVal(savingsTotal)}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                {savingsPct}% ของงบรวม
              </div>
            </div>
          </div>
        </div>

        {/* Stacked 3-Color Ratio Progress Bar */}
        <div className="space-y-1">
          <div className="h-4 w-full bg-[#121212] border border-[#252525] flex overflow-hidden">
            {needPct > 0 && (
              <div
                className="h-full bg-rose-600/90 border-r border-black/40 flex items-center justify-center text-[9px] font-black text-white"
                style={{ width: `${needPct}%` }}
                title={`จำเป็น (Need): ฿${formatVal(needTotal)} (${needPct}%)`}
              >
                {needPct >= 10 && `${needPct}%`}
              </div>
            )}
            {wantPct > 0 && (
              <div
                className="h-full bg-amber-500/90 border-r border-black/40 flex items-center justify-center text-[9px] font-black text-black"
                style={{ width: `${wantPct}%` }}
                title={`ตามใจ (Want): ฿${formatVal(wantTotal)} (${wantPct}%)`}
              >
                {wantPct >= 10 && `${wantPct}%`}
              </div>
            )}
            {savingsPct > 0 && (
              <div
                className="h-full bg-emerald-500/90 flex items-center justify-center text-[9px] font-black text-black"
                style={{ width: `${savingsPct}%` }}
                title={`เงินออม/สะสม (Savings): ฿${formatVal(savingsTotal)} (${savingsPct}%)`}
              >
                {savingsPct >= 10 && `${savingsPct}%`}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Category Drivers List (Fills the height seamlessly) */}
        <div className="space-y-1.5 border-t border-[#252525] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              รายการขับเคลื่อนการจัดสรรหลัก (TOP ALLOCATION DRIVERS)
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              สัดส่วนในกลุ่ม / งบรวม
            </span>
          </div>

          <div className="space-y-1">
            {/* Ranked Categories (split by allocation type) */}
            {rankedCategories.map((cat) => {
              const isNeed = cat.allocation === 'need';
              const isWant = cat.allocation === 'want';
              const groupName = isNeed ? 'Need' : (isWant ? 'Want' : 'Savings');
              const groupLabelTh = isNeed ? 'จำเป็น (Need)' : (isWant ? 'ตามใจ (Want)' : 'เงินออม (Savings)');

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-[#141414] border border-[#222222] hover:border-[#333333]"
                  title={`${cat.name} [${groupLabelTh}]: ฿${formatVal(cat.total)} (${cat.pctOfGroup}% ในกลุ่ม ${groupName}, ${cat.pctOfGrand}% ของงบรวม)`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div
                      className="w-2.5 h-2.5 rounded-none shrink-0"
                      style={{ backgroundColor: cat.color || (isNeed ? '#EF4444' : (isWant ? '#F59E0B' : '#10B981')) }}
                    />
                    <span className="font-bold text-slate-200 truncate">{cat.name}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[8px] font-black uppercase border shrink-0 ${
                        isNeed
                          ? 'bg-rose-950/50 text-rose-400 border-rose-800/40'
                          : (isWant ? 'bg-amber-950/50 text-amber-400 border-amber-800/40' : 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40')
                      }`}
                    >
                      {isNeed ? 'NEED' : (isWant ? 'WANT' : 'SAVINGS')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono shrink-0">
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[11px] font-bold text-slate-300">
                        {cat.pctOfGroup}% <span className="text-slate-500 font-normal">ใน {groupName}</span>
                      </span>
                      {cat.pctOfGrand > 0 && (
                        <span className="text-[9.5px] text-slate-500">
                          ({cat.pctOfGrand}% รวม)
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-100 min-w-[65px] text-right">
                      ฿{formatVal(cat.total)}
                    </span>
                  </div>
                </div>
              );
            })}

            {rankedCategories.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500 font-mono">
                ไม่มีข้อมูลรายการจัดสรรในช่วงเวลานี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
