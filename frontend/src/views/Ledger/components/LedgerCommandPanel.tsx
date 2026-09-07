import React from 'react';
import { Activity, TrendingUp, TrendingDown, Wallet, ChevronUp, ChevronDown } from 'lucide-react';

export function getSavingsGrade(savingsRate: number): string {
  if (savingsRate >= 20) return 'A+';
  if (savingsRate >= 10) return 'B';
  if (savingsRate > 0) return 'C';
  return 'F';
}

export function getSavingsRateStyle(savingsRate: number): string {
  if (savingsRate >= 20) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (savingsRate >= 10) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
}

export interface LedgerCommandPanelProps {
  sumInc: number;
  sumExp: number;
  net: number;
  savingsRate: number;
  formatMoney: (val: number | string) => string;
  getSubValue: (val: number) => React.ReactNode;
  showGroupBreakdown: boolean;
  setShowGroupBreakdown: React.Dispatch<React.SetStateAction<boolean>>;
  totalActiveGroupCards: number;
}

export const LedgerCommandPanel: React.FC<LedgerCommandPanelProps> = ({
  sumInc,
  sumExp,
  net,
  savingsRate,
  formatMoney,
  getSubValue,
  showGroupBreakdown,
  setShowGroupBreakdown,
  totalActiveGroupCards
}) => {
  const isNetPositive = net >= 0;
  const netBorderClass = isNetPositive 
    ? 'border-l-yellow-500 hover:bg-gradient-to-br hover:from-yellow-500/[0.02]' 
    : 'border-l-rose-500 hover:bg-gradient-to-br hover:from-rose-500/[0.02]';

  return (
    <div className="w-full flex flex-col rounded-none overflow-hidden border shadow-lg bg-[#181818] border-[#303030]">
      <div className="px-3.5 py-2 flex items-center justify-between border-b bg-[#121212]/50 border-[#303030]/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#da291c]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">
            แผงวิเคราะห์รายรับ-รายจ่าย (TRANSACTION COMMAND PANEL)
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-px bg-[#303030]/60">
        <div className="group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] border-l-emerald-500 bg-[#181818] hover:bg-[#1c1c1c] hover:bg-gradient-to-br hover:from-emerald-500/[0.02]">
          <div className="absolute -right-2 -bottom-2 opacity-[0.02] pointer-events-none text-emerald-400">
            <TrendingUp size={64} />
          </div>
          <div className="relative z-10 flex justify-between items-center mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              รายรับรวม (INCOME)
            </span>
            <span className="px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              + INFLOW
            </span>
          </div>
          <div className="relative z-10 mt-0.5">
            <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-emerald-400 font-mono">
              {formatMoney(sumInc)}
            </div>
          </div>
          <div className="relative z-10 mt-1 flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-sans">
              {getSubValue(sumInc)}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] border-l-rose-500 bg-[#181818] hover:bg-[#1c1c1c] hover:bg-gradient-to-br hover:from-rose-500/[0.02]">
          <div className="absolute -right-2 -bottom-2 opacity-[0.02] pointer-events-none text-rose-400">
            <TrendingDown size={64} />
          </div>
          <div className="relative z-10 flex justify-between items-center mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              รายจ่ายรวม (EXPENSE)
            </span>
            <span className="px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
              - OUTFLOW
            </span>
          </div>
          <div className="relative z-10 mt-0.5">
            <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-rose-400 font-mono">
              {formatMoney(sumExp)}
            </div>
          </div>
          <div className="relative z-10 mt-1 flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-sans">
              {getSubValue(sumExp)}
            </span>
          </div>
        </div>

        <div className={`group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] bg-[#181818] hover:bg-[#1c1c1c] ${netBorderClass}`}>
          <div className={`absolute -right-2 -bottom-2 opacity-[0.02] pointer-events-none ${isNetPositive ? 'text-yellow-400' : 'text-rose-400'}`}>
            <Wallet size={64} />
          </div>
          <div className="relative z-10 flex justify-between items-center mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              คงเหลือสุทธิ (NET CASHFLOW)
            </span>
            <div className="flex items-center gap-1">
              {sumInc > 0 && (
                <div className={`px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${getSavingsRateStyle(savingsRate)}`}>
                  <span>ออม {savingsRate}%</span>
                  <span className="opacity-45">|</span>
                  <span className="font-extrabold">{getSavingsGrade(savingsRate)}</span>
                </div>
              )}
              <span className={`px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border ${isNetPositive ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {isNetPositive ? 'SURPLUS' : 'DEFICIT'}
              </span>
            </div>
          </div>
          <div className="relative z-10 mt-0.5">
            <div className={`text-2xl font-black tabular-nums tracking-tight leading-none font-mono ${isNetPositive ? 'text-yellow-400' : 'text-rose-400'}`}>
              {formatMoney(net)}
            </div>
          </div>
          <div className="relative z-10 mt-1 flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-80 tabular-nums text-slate-500 font-sans">
              {getSubValue(net)}
            </span>
          </div>
        </div>
      </div>

      {totalActiveGroupCards > 0 && (
        <button
          onClick={() => setShowGroupBreakdown(v => !v)}
          className="w-full py-1.5 px-4 bg-[#121212] hover:bg-[#1f1f1f] border-t border-[#303030]/80 flex items-center justify-center gap-2 text-[10.5px] font-black uppercase tracking-widest font-mono text-slate-400 hover:text-slate-100 transition-colors group cursor-pointer"
          title="ขยาย/หุบ แผงจำแนกหมวดหมู่ย่อย"
        >
          {showGroupBreakdown ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#da291c] group-hover:-translate-y-0.5 transition-transform" />
              <span>หุบการจำแนกตามกลุ่มรายรับ-รายจ่าย</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#da291c] group-hover:translate-y-0.5 transition-transform" />
              <span>ขยายดูการจำแนกตามกลุ่มรายรับ-รายจ่าย ({totalActiveGroupCards} กลุ่ม)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export interface LedgerGroupBreakdownSectionProps {
  activeIncomeCards: React.ReactNode[];
  activeSavingsCards: React.ReactNode[];
  activeExpenseCards: React.ReactNode[];
}

export const LedgerGroupBreakdownSection: React.FC<LedgerGroupBreakdownSectionProps> = ({
  activeIncomeCards,
  activeSavingsCards,
  activeExpenseCards
}) => {
  const hasIncomeOrSavings = activeIncomeCards.length > 0 || activeSavingsCards.length > 0;
  const hasBothIncomeAndSavings = activeIncomeCards.length > 0 && activeSavingsCards.length > 0;

  return (
    <div className="flex flex-col gap-4 pb-2 mt-2">
      {hasIncomeOrSavings && (
        <div className="flex flex-wrap justify-center items-stretch gap-6 pb-2">
          {activeIncomeCards.length > 0 && (
            <div className="flex flex-col gap-1.5 items-center">
              <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-[#10b981] font-sans justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>รายรับ (Income)</span>
              </div>
              <div className="flex flex-wrap items-stretch justify-center gap-3">
                {activeIncomeCards}
              </div>
            </div>
          )}

          {hasBothIncomeAndSavings && (
            <div className="flex items-center justify-center px-2 self-stretch shrink-0">
              <div className="w-[1px] h-full min-h-[48px] bg-neutral-800" />
            </div>
          )}

          {activeSavingsCards.length > 0 && (
            <div className="flex flex-col gap-1.5 items-center">
              <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider text-amber-500 font-sans justify-center">
                <Wallet className="w-3.5 h-3.5" />
                <span>การออมและลงทุน (Savings & Investments)</span>
              </div>
              <div className="flex flex-wrap items-stretch justify-center gap-3">
                {activeSavingsCards}
              </div>
            </div>
          )}
        </div>
      )}

      {activeExpenseCards.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-2 px-1 text-[10.5px] font-black uppercase tracking-wider text-[#da291c] font-sans">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>รายจ่าย (Expenses)</span>
          </div>
          <div className="flex flex-wrap items-stretch justify-center gap-3 pb-1 px-1">
            {activeExpenseCards}
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerCommandPanel;
