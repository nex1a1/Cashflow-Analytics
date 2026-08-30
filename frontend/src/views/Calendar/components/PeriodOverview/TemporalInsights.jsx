// src/views/Calendar/components/PeriodOverview/TemporalInsights.jsx
import React from 'react';
import { Briefcase, Coffee, CalendarRange, Clock } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function TemporalInsights({
  dayOfWeekStats,
  activeDayTypes,
  workVsRest,
  monthCycleStats
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
      {/* 1. Work vs Rest & Day-Types Correlation */}
      <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col justify-between space-y-4">
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
          <div className="bg-[#121212] border border-[#252525] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                วันทำงาน
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {workVsRest.workDays} วัน
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xl font-black text-slate-100 font-mono tabular-nums">
                ฿{formatVal(workVsRest.workAvgExpense)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">/ วัน</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                รวม ฿{formatVal(workVsRest.workTotalExpense)}
              </div>
            </div>
          </div>

          {/* Rest Days */}
          <div className="bg-[#121212] border border-[#252525] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                วันหยุด / พักผ่อน
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {workVsRest.restDays} วัน
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                ฿{formatVal(workVsRest.restAvgExpense)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">/ วัน</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                รวม ฿{formatVal(workVsRest.restTotalExpense)}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown of Active Day Types */}
        <div className="space-y-2 border-t border-[#252525] pt-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            จำแนกตามสถานะปฏิทินที่บันทึก
          </span>
          <div className="space-y-1.5">
            {activeDayTypes.map((dt) => (
              <div
                key={dt.id}
                className="flex items-center justify-between text-xs py-1 px-2 bg-[#141414] border border-[#222222]"
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

      {/* 2. Day-of-Week Spending Heatmap & Month Cycle */}
      <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                ความเข้มข้นรายจ่ายตามวันในสัปดาห์ (DAY-OF-WEEK BURN)
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ยอดใช้จ่ายเฉลี่ยต่อวันตั้งแต่วันอาทิตย์ถึงวันเสาร์
          </p>
        </div>

        {/* 7 Days of Week Bars */}
        <div className="space-y-1.5">
          {dayOfWeekStats.map((dow) => {
            const isWeekend = dow.dow === 0 || dow.dow === 6;
            return (
              <div key={dow.dow} className="flex items-center gap-2 text-xs font-mono">
                <span className={`w-8 font-black ${isWeekend ? 'text-rose-400' : 'text-slate-300'}`}>
                  {dow.label}
                </span>

                {/* Progress Bar */}
                <div className="flex-1 h-5 bg-[#121212] border border-[#252525] relative overflow-hidden flex items-center">
                  <div
                    className={`h-full transition-all ${
                      isWeekend ? 'bg-rose-950/70 border-r-2 border-rose-500' : 'bg-blue-950/70 border-r-2 border-blue-500'
                    }`}
                    style={{ width: `${dow.relativeBarRatio}%` }}
                  />
                  <span className="absolute left-2 text-[10px] font-bold text-slate-300">
                    เฉลี่ย ฿{formatVal(dow.avgExpense)} / วัน
                  </span>
                </div>

                <span className="w-20 text-right text-slate-400 text-[11px]">
                  ฿{formatVal(dow.totalExpense)}
                </span>
              </div>
            );
          })}
        </div>

        {/* 3. Month Cycle Velocity (Early, Mid, Late) */}
        <div className="border-t border-[#252525] pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-400" />
              จังหวะการจ่ายในรอบเดือน (MONTH CYCLE VELOCITY)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {Object.entries(monthCycleStats).map(([key, cycle]) => (
              <div key={key} className="bg-[#141414] border border-[#222222] p-2">
                <span className="text-[10px] font-bold text-slate-400 block">{cycle.label}</span>
                <div className="text-sm font-black font-mono text-slate-100 mt-1">
                  ฿{formatVal(cycle.totalExpense)}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block">
                  เฉลี่ย ฿{formatVal(cycle.avgExpense)}/วัน ({cycle.pctOfTotal}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
