import React from 'react';
import {
  BarChart3, ClipboardList, Download,
  FileSpreadsheet, Settings, CalendarPlus, Zap,
  Calendar as CalendarIcon, HelpCircle, PiggyBank
} from 'lucide-react';
import sharkWhite from '../../assets/images/shark-white.svg';
import AnimatedNumber from '../ui/AnimatedNumber';
import PeriodPicker from './PeriodPicker';

import { GroupedOptions } from '../../types';

export interface AppHeaderProps {
  dbStatus: string;
  transactionCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
}

const TABS = [
  { id: 'insights', label: 'ภาพรวม',          icon: BarChart3 },
  { id: 'calendar', label: 'ปฏิทิน',           icon: CalendarIcon },
  { id: 'ledger',   label: 'ฐานข้อมูลบัญชี',    icon: ClipboardList },
  { id: 'portfolio', label: 'พอร์ตลงทุน',       icon: PiggyBank },
  { id: 'settings', label: 'ตั้งค่าระบบ',       icon: Settings },
];

const DATA_BTN = 'flex items-center gap-2 px-3 py-2.5 text-xs font-bold bg-surface text-ink-soft hover:text-ink-display hover:bg-surface-hover disabled:opacity-50 disabled:pointer-events-none';

/** Export / Import / Help as one flat hairline-split button group — three actions don't need a menu. */
function DataActions({ isProcessing, onExport, onImport, onGuide }: {
  isProcessing: boolean;
  onExport: () => void;
  onImport: () => void;
  onGuide: () => void;
}) {
  return (
    <div role="group" aria-label="ข้อมูล" className="flex gap-[1px] bg-line border border-line">
      <button type="button" className={DATA_BTN} onClick={onExport} title="ส่งออก CSV / สำรองข้อมูล">
        <Download className="w-3.5 h-3.5 text-ink-muted" />
        <span>ส่งออก</span>
      </button>
      <button type="button" className={DATA_BTN} onClick={onImport} disabled={isProcessing} title="นำเข้าจากไฟล์ CSV">
        {isProcessing
          ? <Zap className="w-3.5 h-3.5 text-amber-400" />
          : <FileSpreadsheet className="w-3.5 h-3.5 text-ink-muted" />}
        <span>{isProcessing ? 'กำลังนำเข้า...' : 'นำเข้า'}</span>
      </button>
      <button type="button" className={`${DATA_BTN} px-2.5`} onClick={onGuide} title="คู่มือรูปแบบไฟล์นำเข้า" aria-label="คู่มือรูปแบบไฟล์นำเข้า">
        <HelpCircle className="w-3.5 h-3.5 text-ink-muted" />
      </button>
    </div>
  );
}

export default function AppHeader({
  dbStatus, transactionCount,
  activeTab, setActiveTab,
  filterPeriod, setFilterPeriod,
  groupedOptions,
  isProcessing,
  onClickAddQuick,
  onClickExport,
  onFileUpload,
  onClickImportGuide,
  fileInputRef,
}: AppHeaderProps) {
  const showPeriodPicker = ['insights', 'calendar', 'ledger'].includes(activeTab);

  // ── Logic: Snappy Processing Indicator ───────────────────
  const showProcessing = isProcessing;
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <div className="flex flex-col relative z-[60]">
      {/* ── Top Header (Logo & Global Actions - Tactical HUD) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-line bg-canvas text-slate-300">
        
        {/* Left: Logo & Status Cockpit */}
        <div className="flex items-center gap-4">
          {/* Logo container: Pure sharp tactical bracket with subtle red glow */}
          <div className="p-2 rounded-none border border-accent-ink bg-surface shrink-0 hover:border-accent-ink transition-all">
            <img 
              src={sharkWhite} 
              alt="Shark Logo" 
              className="w-7 h-7 object-contain" 
            />
          </div>
          
          <div className="flex flex-col min-w-0 font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider leading-none text-white truncate select-none">
                Cashflow Shark
              </h1>
              {isDemoMode && (
                <span className="text-[11px] font-black tracking-widest px-2 py-0.5 rounded-pill border border-amber-500/50 uppercase leading-none shrink-0 bg-amber-950/60 text-amber-400">
                  DEMO MODE
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* DB Status Badge (HUD Cockpit readout style) */}
              <div className={`flex items-center gap-2 text-[11px] font-mono font-bold px-2.5 py-1 rounded-pill border transition-all ${
                dbStatus.toLowerCase().includes('online') 
                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-950/20 text-amber-400 border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-none shrink-0 ${
                  dbStatus.toLowerCase().includes('online') 
                    ? 'bg-emerald-400' 
                    : 'bg-amber-500'
                }`} />
                <span className="tracking-wider uppercase select-none">{dbStatus}</span>
              </div>
              
              {/* Records readout - Fixed with integer={true} to avoid displaying decimals */}
              <div className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-pill border bg-surface text-neutral-300 border-line hover:border-accent/30 transition-colors">
                <span className="text-neutral-500 mr-1 select-none">ทั้งหมด</span>
                <span className="text-ink-display font-black tracking-wider">
                  <AnimatedNumber value={transactionCount} integer={true} />
                </span>
                <span className="text-neutral-500 ml-1 select-none">รายการ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action Toolbar (Cockpit Controls) */}
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          <DataActions
            isProcessing={showProcessing}
            onExport={onClickExport}
            onImport={() => fileInputRef.current?.click()}
            onGuide={onClickImportGuide}
          />
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileUpload}
            disabled={showProcessing}
            ref={fileInputRef}
          />

          {/* Primary Action Button (Quick Add) - Upgraded to elegant tactical badge */}
          <button
            onClick={onClickAddQuick}
            className="text-xs font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2.5 rounded-none border border-accent/50 bg-accent/10 hover:bg-accent hover:border-accent-ink hover:text-on-accent text-accent-ink transition-all shrink-0 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>เพิ่มข้อมูลด่วน</span>
          </button>
        </div>
      </div>

      {/* ── Sub Header (Tab Navigation & Context Actions - Folder/Terminal Tabs) ── */}
      <div className="sticky top-0 z-30 flex flex-col md:flex-row justify-between items-stretch px-4 md:px-6 border-b border-line bg-surface-hover shadow-lg">
        <div className="flex w-full md:w-auto overflow-x-auto items-stretch" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <React.Fragment key={id}>
                <button
                  onClick={() => setActiveTab(id)}
                  className={`relative px-5 py-3.5 flex justify-center items-center gap-2.5 transition-all duration-150 text-xs font-bold tracking-wider uppercase whitespace-nowrap group rounded-none border-r border-t-2 ${
                    isActive
                      ? 'bg-canvas text-white border-t-accent-ink border-r-line font-black'
                      : 'text-ink-body hover:text-ink-display hover:bg-surface-hover border-t-transparent border-r-line/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-150 ${isActive ? 'scale-105 text-accent-ink' : 'group-hover:scale-105'}`} />
                  <span>{label}</span>

                  {/* Active Indicator Underline - Bold & Sharp Static line matching performance rules */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-none bg-accent" />
                  )}
                </button>

              </React.Fragment>
            );
          })}
        </div>

        {/* Right side of Sub Header (PeriodPicker Boxy Container) */}
        {showPeriodPicker && (
          <div className="flex items-center gap-3 py-2 md:py-0 px-1 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 mt-1 md:mt-0 border-line">
            <PeriodPicker
              filterPeriod={filterPeriod}
              setFilterPeriod={setFilterPeriod}
              groupedOptions={groupedOptions}
              allowCycle
            />
          </div>
        )}
      </div>
    </div>
  );
}