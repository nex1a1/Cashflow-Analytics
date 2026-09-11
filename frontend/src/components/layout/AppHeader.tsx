import React from 'react';
import {
  BarChart3, ClipboardList, Download,
  FileSpreadsheet, Settings, CalendarPlus, Zap,
  Calendar as CalendarIcon, HelpCircle, Clock
} from 'lucide-react';
import sharkBlack from '../../assets/images/shark-black.svg';
import sharkWhite from '../../assets/images/shark-white.svg';
import AnimatedNumber from '../ui/AnimatedNumber';
import PeriodPicker from './PeriodPicker';

import { GroupedOptions, InsightsMode } from '../../types';

export interface AppHeaderProps {
  dbStatus: string;
  transactionCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  insightsMode: InsightsMode;
  setInsightsMode: (mode: InsightsMode) => void;
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  groupedOptions: GroupedOptions;
  categories?: any[];
  isProcessing: boolean;
  onClickAddQuick: () => void;
  onClickExport: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClickImportGuide: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  excludeFuture?: boolean;
  onToggleExcludeFuture?: () => void;
}

const TABS = [
  { id: 'insights', label: 'เจาะลึกวิเคราะห์', icon: BarChart3 },
  { id: 'ledger',   label: 'ฐานข้อมูลบัญชี',    icon: ClipboardList },
  { id: 'settings', label: 'ตั้งค่าระบบ',       icon: Settings },
];

const INSIGHTS_MODES: Array<{ id: InsightsMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'analysis', label: 'วิเคราะห์', icon: BarChart3 },
  { id: 'calendar', label: 'ปฏิทิน',    icon: CalendarIcon },
];

export default function AppHeader({
  dbStatus, transactionCount,
  activeTab, setActiveTab,
  insightsMode, setInsightsMode,
  filterPeriod, setFilterPeriod,
  groupedOptions,
  isProcessing,
  onClickAddQuick,
  onClickExport,
  onFileUpload,
  onClickImportGuide,
  fileInputRef,
  excludeFuture,
  onToggleExcludeFuture,
}: AppHeaderProps) {
  const dm = true;
  const showPeriodPicker = ['insights', 'ledger'].includes(activeTab);

  // ── Logic: Snappy Processing Indicator ───────────────────
  const showProcessing = isProcessing;
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <div className="flex flex-col relative z-[60]">
      {/* ── Top Header (Logo & Global Actions - Tactical HUD) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-[#2e2e2e] bg-[#181818] text-[#cbd5e1]">
        
        {/* Left: Logo & Status Cockpit */}
        <div className="flex items-center gap-4">
          {/* Logo container: Pure sharp tactical bracket with subtle red glow */}
          <div className="p-2 rounded-none border border-[#da291c] bg-[#121212] shrink-0 shadow-[0_0_12px_rgba(218,41,28,0.2)] hover:border-red-400 hover:shadow-[0_0_16px_rgba(218,41,28,0.45)] transition-all">
            <img 
              src={dm ? sharkWhite : sharkBlack} 
              alt="Shark Logo" 
              className="w-7 h-7 object-contain" 
            />
          </div>
          
          <div className="flex flex-col min-w-0 font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider leading-none bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent truncate select-none">
                Cashflow Analytics
              </h1>
              <span className="text-[9px] font-black tracking-[0.2em] px-2 py-0.5 rounded-none border border-[#da291c] uppercase leading-none shrink-0 bg-red-950/20 text-[#da291c] shadow-[0_0_8px_rgba(218,41,28,0.2)] select-none">
                MASTER
              </span>
              {isDemoMode && (
                <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-none border border-yellow-500/50 uppercase leading-none shrink-0 animate-pulse bg-yellow-950/60 text-yellow-400">
                  DEMO MODE
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* DB Status Badge (HUD Cockpit readout style) */}
              <div className={`flex items-center gap-2 text-[10px] font-mono font-bold px-2.5 py-1 rounded-none border transition-all ${
                dbStatus.toLowerCase().includes('online') 
                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
                  : 'bg-amber-950/20 text-amber-400 border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-none shrink-0 ${
                  dbStatus.toLowerCase().includes('online') 
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse' 
                    : 'bg-amber-500'
                }`} />
                <span className="tracking-wider uppercase select-none">{dbStatus}</span>
              </div>
              
              {/* Records readout - Fixed with integer={true} to avoid displaying decimals */}
              <div className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-none border bg-[#121212] text-neutral-300 border-[#303030] hover:border-[#da291c]/30 transition-colors">
                <span className="text-neutral-500 mr-1 select-none">ข้อมูล:</span>
                <span className="text-[#da291c] font-black tracking-wider">
                  <AnimatedNumber value={transactionCount} integer={true} />
                </span>
                <span className="text-neutral-500 ml-1 select-none">รายการ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action Toolbar (Cockpit Controls) */}
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          
          {/* Utility Tools Console */}
          <div className="flex items-center gap-1 p-0.5 rounded-none border border-[#303030] bg-[#121212] shadow-inner">
            <button
              onClick={onClickExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-bold tracking-wider transition-all border border-transparent hover:bg-neutral-800/80 hover:border-neutral-700/50 hover:text-white text-neutral-300"
              title="ส่งออกข้อมูลเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <label className={`cursor-pointer flex items-center gap-2 text-xs font-bold tracking-wider px-3 py-1.5 rounded-none border border-transparent transition-all hover:bg-neutral-800/80 hover:border-neutral-700/50 hover:text-white text-neutral-300 ${
              showProcessing ? 'opacity-50 pointer-events-none' : ''
            }`} title="นำเข้าข้อมูลจากไฟล์ CSV">
              {showProcessing ? (
                <Zap className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span className="hidden sm:inline">
                {showProcessing ? 'กำลังประมวลผล...' : 'Import'}
              </span>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={onFileUpload} 
                disabled={showProcessing} 
                ref={fileInputRef} 
              />
            </label>
            
            <span className="w-[1px] h-5 bg-[#2a2a2a] self-center" />
            
            <button
              onClick={onClickImportGuide}
              className="p-1.5 rounded-none transition-all border border-transparent text-neutral-500 hover:text-white hover:bg-neutral-800/80 hover:border-neutral-700/50"
              title="คู่มือการ Import"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Button (Quick Add) - Upgraded to elegant tactical badge */}
          <button
            onClick={onClickAddQuick}
            className="text-xs font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2.5 rounded-none border border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-500 hover:border-emerald-400 hover:text-[#121212] hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] text-emerald-400 transition-all shrink-0 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>เพิ่มข้อมูลด่วน</span>
          </button>
        </div>
      </div>

      {/* ── Sub Header (Tab Navigation & Context Actions - Folder/Terminal Tabs) ── */}
      <div className="sticky top-0 z-30 flex flex-col md:flex-row justify-between items-stretch px-4 md:px-6 border-b border-[#2e2e2e] bg-[#1c1c1c]/95 shadow-lg backdrop-blur-md">
        <div className="flex w-full md:w-auto overflow-x-auto items-stretch" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <React.Fragment key={id}>
                <button
                  onClick={() => setActiveTab(id)}
                  className={`relative px-5 py-3.5 flex justify-center items-center gap-2.5 transition-all duration-150 text-xs font-bold tracking-wider uppercase whitespace-nowrap group rounded-none border-r border-t-2 ${
                    isActive
                      ? 'bg-[#181818] text-white border-t-[#da291c] border-r-[#2e2e2e] font-black'
                      : 'text-[#888888] hover:text-[#e0e0e0] hover:bg-[#222] border-t-transparent border-r-[#2e2e2e]/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-150 ${isActive ? 'scale-105 text-[#da291c]' : 'group-hover:scale-105'}`} />
                  <span>{label}</span>

                  {/* Active Indicator Underline - Bold & Sharp Static line matching performance rules */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-none bg-[#da291c]" />
                  )}
                </button>

                {/* Insights Mode Switch - lives directly beside its owning tab, only while that tab is active.
                    Mirrors TimelineLayoutToggle's language (ActivityTimeline.tsx): this is a neutral
                    view switch, not a semantic/danger signal, so active state stays white-on-quiet-gray -
                    red stays reserved for the tab's own active indicator and expense/burn signals. */}
                {id === 'insights' && isActive && (
                  <div className="flex items-center gap-1 self-center shrink-0 mx-2.5 p-1 border border-[#3e3e3e] bg-[#121212]">
                    {INSIGHTS_MODES.map(({ id: modeId, label: modeLabel, icon: ModeIcon }) => {
                      const isModeActive = insightsMode === modeId;
                      return (
                        <button
                          key={modeId}
                          type="button"
                          aria-pressed={isModeActive}
                          onClick={() => setInsightsMode(modeId)}
                          title={modeId === 'analysis' ? 'โหมดวิเคราะห์ภาพรวม' : 'โหมดปฏิทินรายวัน'}
                          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-150 rounded-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${
                            isModeActive ? 'text-slate-100' : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          <ModeIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{modeLabel}</span>
                          {isModeActive && (
                            <div className="absolute inset-0 rounded-none shadow-sm z-[-1] bg-[#303030]/60" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right side of Sub Header (PeriodPicker Boxy Container) */}
        {showPeriodPicker && (
          <div className="flex items-center gap-3 py-2 md:py-0 px-1 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 mt-1 md:mt-0 border-[#2e2e2e]">
            {activeTab === 'insights' && insightsMode === 'analysis' && (
              <button
                onClick={onToggleExcludeFuture}
                title="ซ่อนรายการในอนาคต (หลังจากวันนี้) จากการคำนวณในแดชบอร์ด"
                className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-bold tracking-wider uppercase transition-all select-none rounded-none shrink-0 ${
                  excludeFuture
                    ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#181818] border-[#303030] text-slate-400 hover:text-slate-200 hover:bg-[#303030]/50'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${excludeFuture ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>ซ่อนข้อมูลอนาคต</span>
                
                {/* Tactical Micro-Switch */}
                <div className={`relative w-7 h-4 rounded-none shrink-0 ${
                  excludeFuture 
                    ? 'bg-amber-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]' 
                    : 'bg-[#181818] border border-[#303030]'
                }`}>
                  <div className={`absolute top-1/2 -translate-y-1/2 left-[2px] w-2.5 h-2.5 rounded-none ease-out transition-transform duration-100 ${
                    excludeFuture 
                      ? 'bg-white translate-x-3.5 shadow-md' 
                      : 'bg-[#303030]'
                  }`} />
                </div>
              </button>
            )}
            <PeriodPicker
              filterPeriod={filterPeriod}
              setFilterPeriod={setFilterPeriod}
              groupedOptions={groupedOptions}
            />
          </div>
        )}
      </div>
    </div>
  );
}