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
    <>
      {/* ── Top header ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b transition-colors ${dm ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          {/* Logo block */}
          <div className={`p-2.5 rounded-sm border shadow-sm ${dm ? 'bg-[#00509E] border-blue-800' : 'bg-[#00509E] border-blue-700'}`}>
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${dm ? 'text-white' : 'text-slate-900'}`}>
              Cashflow Analytics
              <span className="text-[#D81A21] text-xl font-black italic">MASTER</span>
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`text-xs flex items-center gap-1.5 font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-sm ${dbStatus.includes('Online') ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                {dbStatus}
              </span>
              <span className={`text-xs ${dm ? 'text-slate-700' : 'text-slate-300'}`}>|</span>
              <span className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                ข้อมูล: <AnimatedNumber value={transactionCount} /> รายการ
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Dark mode toggle */}
          <button
            onClick={() => setIsDarkMode(d => !d)}
            className={`p-2 rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'}`}
            title="สลับโหมดมืด/สว่าง"
          >
            {dm ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Add quick */}
          <button
            onClick={onClickAddQuick}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all shadow-sm active:scale-95 border border-emerald-700"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> เพิ่มข้อมูลด่วน
          </button>

          {/* Export */}
          <button
            onClick={onClickExport}
            className={`hidden md:flex text-xs font-bold items-center gap-1.5 px-3 py-2 rounded-sm transition-all shadow-sm border active:scale-95 ${dm ? 'bg-blue-900/30 text-blue-400 border-blue-900/50 hover:bg-blue-900/50' : 'bg-blue-50 text-[#00509E] border-blue-200 hover:bg-[#00509E] hover:text-white'}`}
          >
            <Download className="w-3.5 h-3.5" /> ส่งออก CSV
          </button>

          {/* Import CSV */}
          <div className="flex items-center gap-1">
            <label className={`cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-sm shadow-sm border transition-all active:scale-95 ${isProcessing ? (dm ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-200 text-slate-500 border-slate-300') : (dm ? 'bg-[#00509E] hover:bg-blue-700 text-white border-blue-700' : 'bg-[#00509E] hover:bg-[#003d7a] text-white border-blue-700')}`}>
              {isProcessing
                ? <Zap className="w-3.5 h-3.5 animate-pulse text-[#F4B800]" />
                : <FileSpreadsheet className="w-3.5 h-3.5 text-blue-200" />}
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
              className={`w-7 h-7 rounded-sm font-black text-xs flex items-center justify-center transition-all active:scale-95 border ${dm ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title="คู่มือการ Import"
            >?</button>
          </div>
        </div>
      </div>

      {/* ── Tab bar + PeriodPicker ── */}
      <div className={`sticky top-0 z-50 flex flex-col md:flex-row justify-between items-center px-6 border-b gap-4 transition-colors backdrop-blur-sm ${dm ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'}`}>
        <div className="flex w-full md:w-auto overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 md:flex-none px-5 py-3.5 flex justify-center items-center gap-2 border-b-2 transition-all text-sm whitespace-nowrap ${
                activeTab === id
                  ? (dm ? 'border-blue-400 text-blue-400 font-bold' : 'border-[#00509E] text-[#00509E] font-bold')
                  : (dm ? 'border-transparent text-slate-400 hover:text-blue-300' : 'border-transparent text-slate-600 hover:text-[#00509E]')
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {showPeriodPicker && (
          <div className="flex items-center gap-3 py-2.5 w-full md:w-auto justify-end flex-wrap">
            <PeriodPicker
              filterPeriod={filterPeriod}
              setFilterPeriod={setFilterPeriod}
              groupedOptions={groupedOptions}
              isDarkMode={dm}
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