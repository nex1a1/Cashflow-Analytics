// src/components/AppHeader.jsx
import React from 'react';
import PropTypes from 'prop-types';
import {
  BarChart3, ClipboardList, Download, Database,
  FileSpreadsheet, Settings, CalendarPlus, Zap,
  Moon, Sun, Calendar as CalendarIcon,
} from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';
import PeriodPicker from './PeriodPicker';

const TABS = [
  { id: 'dashboard', label: 'เจาะลึกวิเคราะห์', icon: BarChart3 },
  { id: 'calendar',  label: 'ปฏิทิน',           icon: CalendarIcon },
  { id: 'ledger',    label: 'ฐานข้อมูลบัญชี',    icon: ClipboardList },
  { id: 'settings',  label: 'ตั้งค่าระบบ',       icon: Settings },
];

export default function AppHeader({
  isDarkMode, setIsDarkMode,
  dbStatus, transactionCount,
  activeTab, setActiveTab,
  filterPeriod, setFilterPeriod,
  groupedOptions,
  categories,
  isProcessing,
  onClickAddQuick,
  onClickExport,
  onFileUpload,
  onClickImportGuide,
  fileInputRef,
}) {
  const dm = isDarkMode;
  const showPeriodPicker = ['dashboard', 'analytics', 'ledger', 'calendar'].includes(activeTab);

  return (
    <div className="flex flex-col relative z-50">
      {/* ── Top Header (Logo & Global Actions) ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-3 border-b transition-colors ${dm ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* Left: Logo & Status */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-sm shadow-sm border bg-gradient-to-br transition-all ${dm ? 'from-[#00509E] to-blue-800 border-blue-700' : 'from-[#00509E] to-[#003d7a] border-[#003d7a]'}`}>
            <Database className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black tracking-tight leading-none ${dm ? 'text-white' : 'text-slate-900'}`}>
                Cashflow Analytics
              </h1>
              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border leading-none ${dm ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-[#D81A21] border-red-200'}`}>
                MASTER
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {/* DB Status Badge */}
              <span className={`flex items-center gap-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-sm border leading-none ${dbStatus.includes('Online') ? (dm ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : (dm ? 'bg-orange-900/20 text-orange-400 border-orange-800/50' : 'bg-orange-50 text-orange-700 border-orange-200')}`}>
                <span className={`w-1.5 h-1.5 rounded-sm ${dbStatus.includes('Online') ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                {dbStatus}
              </span>
              <span className={`text-[10px] font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>|</span>
              <span className={`text-[11px] font-bold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                ข้อมูล: <AnimatedNumber value={transactionCount} /> รายการ
              </span>
            </div>
          </div>
        </div>

        {/* Right: Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Utility Tools */}
          <div className={`flex items-center p-0.5 rounded-sm border shadow-sm ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <button
              onClick={() => setIsDarkMode(d => !d)}
              className={`p-1.5 rounded-sm transition-colors ${dm ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600 hover:shadow-sm'}`}
              title="สลับโหมดมืด/สว่าง"
            >
              {dm ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`w-px h-4 mx-1 ${dm ? 'bg-slate-700' : 'bg-slate-300'}`} />
            <button
              onClick={onClickExport}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] font-bold transition-all ${dm ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600 hover:shadow-sm'}`}
              title="ส่งออกข้อมูลเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
            </button>
            <div className={`w-px h-4 mx-1 ${dm ? 'bg-slate-700' : 'bg-slate-300'}`} />
            
            <label className={`cursor-pointer flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-sm transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : ''} ${dm ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600 hover:shadow-sm'}`} title="นำเข้าข้อมูลจากไฟล์ CSV">
              {isProcessing ? <Zap className="w-3.5 h-3.5 animate-pulse text-amber-500" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />}
              <span className="hidden sm:inline">{isProcessing ? 'กำลังประมวลผล...' : 'Import'}</span>
              <input type="file" accept=".csv" className="hidden" onChange={onFileUpload} disabled={isProcessing} ref={fileInputRef} />
            </label>
            <button
              onClick={onClickImportGuide}
              className={`px-1.5 py-1.5 rounded-sm text-[11px] font-black transition-colors ${dm ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm'}`}
              title="คู่มือการ Import"
            >?</button>
          </div>

          {/* Primary Action: Quick Add */}
          <button
            onClick={onClickAddQuick}
            className={`text-[11px] font-bold text-white flex items-center gap-1.5 px-3 py-2 rounded-sm shadow-sm transition-all active:scale-95 border ${dm ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'}`}
          >
            <CalendarPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">เพิ่มข้อมูลด่วน</span>
          </button>
        </div>
      </div>

      {/* ── Sub Header (Tab Navigation & Context Actions) ── */}
      <div className={`sticky top-0 z-40 flex flex-col md:flex-row justify-between items-center px-6 border-b transition-colors backdrop-blur-md ${dm ? 'bg-slate-900/85 border-slate-800 shadow-sm' : 'bg-white/85 border-slate-200 shadow-sm'}`}>
        <div className="flex w-full md:w-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative px-4 py-3 flex justify-center items-center gap-2 transition-all text-xs whitespace-nowrap group ${
                  isActive 
                    ? (dm ? 'text-blue-400 font-black' : 'text-[#00509E] font-black')
                    : (dm ? 'text-slate-400 hover:text-slate-200 font-bold' : 'text-slate-500 hover:text-slate-800 font-bold')
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} /> {label}
                {/* Active Indicator Line */}
                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm ${dm ? 'bg-blue-400' : 'bg-[#00509E]'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right side of Sub Header (e.g. PeriodPicker) */}
        {showPeriodPicker && (
          <div className="flex items-center gap-3 py-2 w-full md:w-auto justify-end">
            <PeriodPicker
              filterPeriod={filterPeriod}
              setFilterPeriod={setFilterPeriod}
              groupedOptions={groupedOptions}
              isDarkMode={dm}
            />
          </div>
        )}
      </div>
    </div>
  );
}

AppHeader.propTypes = {
  isDarkMode:         PropTypes.bool.isRequired,
  setIsDarkMode:      PropTypes.func.isRequired,
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
  categories:         PropTypes.array.isRequired,
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