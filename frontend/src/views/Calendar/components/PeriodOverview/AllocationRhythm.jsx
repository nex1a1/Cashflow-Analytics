// src/views/Calendar/components/PeriodOverview/AllocationRhythm.jsx
import React from 'react';
import { PieChart } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function AllocationRhythm({
  allocationData
}) {
  const {
    needTotal,
    wantTotal,
    savingsTotal,
    needPct,
    wantPct,
    savingsPct,
    topNeedCats,
    topWantCats
  } = allocationData;

  return (
    <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
              สัดส่วนการจัดสรรเงินตลอดช่วงเวลา (ALLOCATION RHYTHM)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            เป้าหมายมาตรฐาน 50 / 30 / 20
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          การกระจายตัวของรายจ่ายจำเป็น (Need), ตามใจ (Want) และการสะสมความมั่งคั่ง (Savings/Surplus)
        </p>
      </div>

      {/* Stacked 3-Color Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-5 w-full bg-[#121212] border border-[#252525] flex overflow-hidden">
          {needPct > 0 && (
            <div
              className="h-full bg-rose-600/80 border-r border-black/40 flex items-center justify-center text-[10px] font-black text-white"
              style={{ width: `${needPct}%` }}
              title={`Need: ฿${formatVal(needTotal)} (${needPct}%)`}
            >
              {needPct >= 10 && `${needPct}%`}
            </div>
          )}
          {wantPct > 0 && (
            <div
              className="h-full bg-amber-500/80 border-r border-black/40 flex items-center justify-center text-[10px] font-black text-black"
              style={{ width: `${wantPct}%` }}
              title={`Want: ฿${formatVal(wantTotal)} (${wantPct}%)`}
            >
              {wantPct >= 10 && `${wantPct}%`}
            </div>
          )}
          {savingsPct > 0 && (
            <div
              className="h-full bg-emerald-500/80 flex items-center justify-center text-[10px] font-black text-black"
              style={{ width: `${savingsPct}%` }}
              title={`Savings/Surplus: ฿${formatVal(savingsTotal)} (${savingsPct}%)`}
            >
              {savingsPct >= 10 && `${savingsPct}%`}
            </div>
          )}
        </div>

        {/* 3 Metric Legend Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
          {/* Need Block */}
          <div className="bg-[#141414] border border-[#252525] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-rose-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-none inline-block" />
                จำเป็น (NEED)
              </span>
              <span className="text-xs font-mono font-bold text-rose-400">{needPct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-slate-100 mt-1">
              ฿{formatVal(needTotal)}
            </div>
            {topNeedCats && topNeedCats.length > 0 && (
              <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 border-t border-[#202020] pt-1">
                {topNeedCats.map(c => (
                  <div key={c.id} className="flex justify-between">
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono text-slate-300">฿{formatVal(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Want Block */}
          <div className="bg-[#141414] border border-[#252525] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-none inline-block" />
                ตามใจ (WANT)
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">{wantPct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-slate-100 mt-1">
              ฿{formatVal(wantTotal)}
            </div>
            {topWantCats && topWantCats.length > 0 && (
              <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 border-t border-[#202020] pt-1">
                {topWantCats.map(c => (
                  <div key={c.id} className="flex justify-between">
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono text-slate-300">฿{formatVal(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings / Surplus Block */}
          <div className="bg-[#141414] border border-[#252525] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-none inline-block" />
                เงินออม/สะสม (SAVINGS)
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">{savingsPct}%</span>
            </div>
            <div className="text-lg font-black font-mono text-emerald-400 mt-1">
              ฿{formatVal(savingsTotal)}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 border-t border-[#202020] pt-1">
              ยอดคงเหลือสุทธิหลังหักรายจ่ายทั้งหมดในรอบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
