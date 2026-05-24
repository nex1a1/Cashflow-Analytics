import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart3, ClipboardList, Download,
  FileSpreadsheet, Settings, CalendarPlus, Zap,
  Calendar as CalendarIcon, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import sharkBlack from '../../assets/images/shark-black.svg';
import sharkWhite from '../../assets/images/shark-white.svg';
import AnimatedNumber from '../ui/AnimatedNumber';
import PeriodPicker from './PeriodPicker';
import Tooltip from '../ui/Tooltip';

const TABS = [
  { id: 'dashboard', label: 'เจาะลึกวิเคราะห์', icon: BarChart3 },
  { id: 'calendar',  label: 'ปฏิทิน',           icon: CalendarIcon },
  { id: 'ledger',    label: 'ฐานข้อมูลบัญชี',    icon: ClipboardList },
  { id: 'settings',  label: 'ตั้งค่าระบบ',       icon: Settings },
];

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
}) {
  const dm = true;
  const showPeriodPicker = ['dashboard', 'analytics', 'ledger', 'calendar'].includes(activeTab);

  // ── Logic: Smooth Processing Transition ───────────────────
  const [showProcessing, setShowProcessing] = useState(isProcessing);

  useEffect(() => {
    if (isProcessing) {
      setShowProcessing(true);
    } else {
      const timer = setTimeout(() => setShowProcessing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);

  return (
    <div className="flex flex-col relative z-[60]">
      {/* ── Top Header (Logo & Global Actions - Tactical HUD) ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-3.5 border-b-2 transition-all duration-300 ${
        'bg-slate-950 border-slate-800 text-slate-100'
      }`}>
        
        {/* Left: Logo & Status Cockpit */}
        <div className="flex items-center gap-4">
          {/* Logo container: Pure sharp tactical bracket */}
          <div className={`p-2 rounded-none border-2 transition-all shrink-0 ${
            'bg-slate-900 border-blue-600'
          }`}>
            <img 
              src={dm ? sharkWhite : sharkBlack} 
              alt="Shark Logo" 
              className="w-7 h-7 object-contain" 
            />
          </div>
          
          <div className="flex flex-col min-w-0 font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-xl md:text-2xl font-black tracking-wider leading-none truncate ${
                'text-white'
              }`}>
                Cashflow Analytics
              </h1>
              <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-none border-2 uppercase leading-none shrink-0 ${
                'bg-red-950/60 text-red-400 border-red-500/50'
              }`}>
                MASTER
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* DB Status Badge (HUD Cockpit readout style) */}
              <div className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded-none border ${
                dbStatus.includes('Online') 
                  ? ('bg-emerald-950/40 text-emerald-400 border-emerald-500/50') 
                  : ('bg-amber-950/40 text-amber-400 border-amber-500/50')
              }`}>
                <span className={`w-2 h-2 rounded-none shrink-0 ${
                  dbStatus.includes('Online') 
                    ? 'bg-emerald-500 animate-pulse' 
                    : 'bg-amber-500'
                }`} />
                <span className="tracking-wider uppercase">{dbStatus}</span>
              </div>
              
              {/* Records readout */}
              <div className={`text-[10px] font-bold px-2 py-1 rounded-none border ${
                'bg-slate-900/60 text-slate-300 border-slate-800'
              }`}>
                <span className={`${'text-slate-500'} mr-1`}>ข้อมูล:</span>
                <span className={'text-blue-400 font-extrabold'}>
                  <AnimatedNumber value={transactionCount} />
                </span>
                <span className={`${'text-slate-500'} ml-1`}>รายการ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action Toolbar (Cockpit Controls) */}
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          
          {/* Utility Tools Console */}
          <div className={`flex items-center gap-1 p-1 rounded-none border-2 ${
            'bg-slate-900/80 border-slate-800'
          }`}>
            <button
              onClick={onClickExport}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-bold tracking-wider transition-all duration-150 border border-transparent ${
                'hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-blue-400'
              }`}
              title="ส่งออกข้อมูลเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <label className={`cursor-pointer flex items-center gap-2 text-xs font-bold tracking-wider px-3 py-1.5 rounded-none border border-transparent transition-all duration-150 ${
              showProcessing ? 'opacity-50 pointer-events-none' : ''
            } ${
              'hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-blue-400'
            }`} title="นำเข้าข้อมูลจากไฟล์ CSV">
              {showProcessing ? (
                <Zap className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
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
            
            <span className={`w-[1px] h-5 ${'bg-slate-800'}`} />
            
            <button
              onClick={onClickImportGuide}
              className={`p-1.5 rounded-none transition-colors border border-transparent ${
                'text-slate-400 hover:text-blue-400 hover:bg-slate-800 hover:border-slate-700'
              }`}
              title="คู่มือการ Import"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Button (Quick Add) */}
          <button
            onClick={onClickAddQuick}
            className={`text-xs font-bold tracking-wider flex items-center gap-2 px-4 py-2.5 rounded-none border-2 shrink-0 ${
              'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 hover:border-emerald-400 text-white'
            }`}
          >
            <CalendarPlus className="w-4 h-4" />
            <span>เพิ่มข้อมูลด่วน</span>
          </button>
        </div>
      </div>

      {/* ── Sub Header (Tab Navigation & Context Actions - Folder/Terminal Tabs) ── */}
      <div className={`sticky top-0 z-30 flex flex-col md:flex-row justify-between items-stretch px-4 md:px-6 border-b-2 transition-all duration-300 backdrop-blur-md ${
        'bg-slate-900/90 border-slate-800 shadow-lg'
      }`}>
        <div className="flex w-full md:w-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative px-5 py-3.5 flex justify-center items-center gap-2.5 transition-all duration-150 text-xs font-bold tracking-wider uppercase whitespace-nowrap group rounded-none border-r border-t-2 ${
                  isActive 
                    ? ('bg-slate-950 text-blue-400 border-t-blue-500 border-r-slate-800 font-black')
                    : ('text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-t-transparent border-r-slate-800/40')
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-150 ${isActive ? 'scale-110 text-blue-400' : 'group-hover:scale-110'}`} />
                <span>{label}</span>
                
                {/* Active Indicator Underline - Bold & Sharp */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-none ${'bg-blue-500'}`} 
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right side of Sub Header (PeriodPicker Boxy Container) */}
        {showPeriodPicker && (
          <div className={`flex items-center py-2 md:py-0 px-1 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 mt-1 md:mt-0 ${
            'border-slate-800'
          }`}>
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

AppHeader.propTypes = {
  dbStatus:           PropTypes.string.isRequired,
  transactionCount:   PropTypes.number.isRequired,
  activeTab:          PropTypes.string.isRequired,
  setActiveTab:       PropTypes.func.isRequired,
  filterPeriod:       PropTypes.string.isRequired,
  setFilterPeriod:    PropTypes.func.isRequired,
  groupedOptions:     PropTypes.shape({
    yearsMap:    PropTypes.object.isRequired,
    sortedYears: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  isProcessing:       PropTypes.bool.isRequired,
  onClickAddQuick:    PropTypes.func.isRequired,
  onClickExport:      PropTypes.func.isRequired,
  onFileUpload:       PropTypes.func.isRequired,
  onClickImportGuide: PropTypes.func.isRequired,
  fileInputRef:       PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]).isRequired,
};