// src/components/AppHeader.jsx
// ─────────────────────────────────────────────────────────────
// Header (logo + db status + action buttons) +
// Tab navigation + PeriodPicker bar
// ─────────────────────────────────────────────────────────────
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
  const showPeriodPicker = ['dashboard', 'analytics', 'ledger', 'calendar'].includes(activeTab);

  return (
    <>
      {/* ── Top header: logo + actions ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-[#00509E] to-blue-800 text-white p-3 rounded-xl shadow-md">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Cashflow Analytics <span className="text-[#D81A21] text-2xl font-black italic">MASTER</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-sm flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${dbStatus.includes('Online') ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                {dbStatus}
              </span>
              <span className={`text-sm ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>|</span>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                ข้อมูล: <AnimatedNumber value={transactionCount} /> รายการ
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          {/* Dark mode toggle */}
          <button
            onClick={() => setIsDarkMode(d => !d)}
            className={`p-2.5 rounded-lg transition-colors border shadow-sm ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'}`}
            title="สลับโหมดมืด/สว่าง"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-orange-500" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Add quick */}
          <button
            onClick={onClickAddQuick}
            className="text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm active:scale-95"
          >
            <CalendarPlus className="w-4 h-4" /> เพิ่มข้อมูลด่วน
          </button>

          {/* Export */}
          <button
            onClick={onClickExport}
            className={`hidden md:flex text-sm font-bold flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all shadow-sm border active:scale-95 ${isDarkMode ? 'bg-blue-900/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/50' : 'bg-blue-50 text-[#00509E] border-blue-200 hover:bg-[#00509E] hover:text-white'}`}
          >
            <Download className="w-4 h-4" /> ส่งออก CSV
          </button>

          {/* Import CSV */}
          <div className="flex items-center gap-1.5">
            <label className={`cursor-pointer flex items-center gap-2 font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 ${isProcessing ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-300 text-slate-600') : (isDarkMode ? 'bg-[#00509E] hover:bg-blue-700 text-white' : 'bg-[#00509E] hover:bg-[#003d7a] text-white')}`}>
              {isProcessing
                ? <Zap className="w-5 h-5 animate-pulse text-[#F4B800]" />
                : <FileSpreadsheet className={`w-5 h-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-200'}`} />}
              <span>{isProcessing ? 'กำลังประมวลผล...' : 'อัปโหลด CSV'}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={onFileUpload}
                disabled={isProcessing}
                ref={fileInputRef}
              />
            </label>
            <button
              onClick={onClickImportGuide}
              className={`w-8 h-8 rounded-full font-black text-sm flex items-center justify-center transition-all active:scale-95 border ${isDarkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title="คู่มือการ Import"
            >?</button>
          </div>
        </div>
      </div>

      {/* ── Tab bar + PeriodPicker ── */}
      <div className={`sticky top-0 z-50 flex flex-col md:flex-row justify-between items-center px-6 border-b gap-4 transition-colors duration-300 backdrop-blur-sm ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'}`}>
        <div className="flex w-full md:w-auto overflow-x-auto custom-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 md:flex-none px-5 py-4 flex justify-center items-center gap-2 border-b-[3px] transition-all text-base whitespace-nowrap ${
                activeTab === id
                  ? (isDarkMode ? 'border-blue-400 text-blue-400 font-bold bg-slate-800' : 'border-[#00509E] text-[#00509E] font-bold bg-blue-50/50')
                  : (isDarkMode ? 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-800/50' : 'border-transparent text-slate-600 hover:text-[#00509E] hover:bg-slate-100')
              }`}
            >
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </div>

        {showPeriodPicker && (
          <div className="flex items-center gap-3 py-3 w-full md:w-auto justify-end flex-wrap">
            <PeriodPicker
              filterPeriod={filterPeriod}
              setFilterPeriod={setFilterPeriod}
              groupedOptions={groupedOptions}
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>
    </>
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