import React, { useState, useEffect } from 'react';
import { Download, X, AlertCircle, ClipboardList, FileSpreadsheet, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PeriodPicker from './PeriodPicker';
import { isDateInFilter } from '../utils/dateHelpers';
import { useTheme } from '../context/ThemeContext';

export default function ExportModal({
  isOpen, onClose, transactions, categories, dayTypes, dayTypeConfig,
  groupedOptions, getFilterLabel, initialPeriod
}) {
  const { isDarkMode: dm } = useTheme();
  const [exportPeriod, setExportPeriod] = useState(initialPeriod || 'ALL');
  const [exportFormat, setExportFormat] = useState('long');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isOpen && !isExporting) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, isExporting]);

  useEffect(() => { if (isOpen) setExportPeriod(initialPeriod || 'ALL'); }, [isOpen, initialPeriod]);
  
  if (!isOpen) return null;

  const dataToExport = transactions.filter(t => isDateInFilter(t.date, exportPeriod) && !t.category.includes('หักวงเงิน'));
  const hasData = dataToExport.length > 0;

  const executeExport = () => {
    if (!hasData || isExporting) return;
    setIsExporting(true);
    
    // Use setTimeout to allow UI to update to loading state before blocking main thread
    setTimeout(() => {
      try {
        const esc = (str) => `"${String(str).replace(/"/g, '""')}"`;
        let csv = '', filename = '';

        if (exportFormat === 'long') {
          csv = 'วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n';
          dataToExport.forEach(item => {
            const [d, m, y] = item.date.split('/');
            const dow = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();
            const def = (dow === 0 || dow === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
            const tc  = dayTypeConfig.find(dt => dt.id === (dayTypes[item.date] || def)) || dayTypeConfig[0];
            const isInc = categories.find(c => c.name === item.category)?.type === 'income';
            csv += `${item.date},${esc(tc?.label || '')},${isInc ? 'รายรับ' : 'รายจ่าย'},${esc(item.category)},${esc(item.description || '')},${item.amount}\n`;
          });
          filename = `Cashflow_Long_${exportPeriod.replace('/', '-')}.csv`;
        } else {
          const expCats    = categories.filter(c => c.type === 'expense');
          const usedNames  = [...new Set(dataToExport.filter(t => categories.find(c => c.name === t.category)?.type === 'expense').map(t => t.category))];
          const ordered    = expCats.filter(c => usedNames.includes(c.name)).map(c => c.name);
          
          csv = ['Date', ...ordered, 'รวม (Total)', 'Notes'].map(h => esc(h)).join(',') + '\n';
          
          const dates = [...new Set(dataToExport.map(t => t.date))].sort((a, b) => {
            const [da,ma,ya] = a.split('/').map(Number); 
            const [db,mb,yb] = b.split('/').map(Number);
            return new Date(ya,ma-1,da) - new Date(yb,mb-1,db);
          });
          
          dates.forEach(ds => {
            const dayTx  = dataToExport.filter(t => t.date === ds);
            const notes  = dayTx.filter(t => t.description && t.description !== t.category).map(t => t.description).join(', ');
            const vals   = ordered.map(n => { const tot = dayTx.filter(t => t.category === n).reduce((s,t) => s + (parseFloat(t.amount)||0), 0); return tot > 0 ? `฿ ${tot.toFixed(2)}` : '฿ -'; });
            const total  = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'expense').reduce((s,t) => s + (parseFloat(t.amount)||0), 0);
            csv += [ds, ...vals, `฿ ${total.toFixed(2)}`, notes].map(v => esc(v)).join(',') + '\n';
          });
          filename = `Cashflow_Wide_${exportPeriod.replace('/', '-')}.csv`;
        }

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        
        onClose(); 
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    }, 50);
  };

  const fmtCard = (active) => `flex flex-col items-start p-3.5 rounded-sm border-2 transition-all text-left ${active ? (dm ? 'border-blue-500 bg-blue-900/20' : 'border-[#00509E] bg-blue-50/50') : (dm ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')}`;

  const tokens = {
    surface: dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200',
    headerFooter: dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`relative rounded-sm shadow-2xl flex flex-col w-full max-w-3xl h-[80vh] min-h-[550px] max-h-[850px] border overflow-hidden ${tokens.surface}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${tokens.headerFooter}`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
            <Download className={`w-5 h-5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} /> ส่งออกไฟล์ CSV
          </h3>
          <button onClick={onClose} disabled={isExporting} className={`p-1.5 rounded-sm transition-colors disabled:opacity-50 ${dm ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}><X className="w-5 h-5" /></button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period selector */}
            <div className={`border rounded-sm p-4 flex flex-col h-full ${dm ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
              <label className={`block text-xs font-bold mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>ช่วงเวลา</label>
              <PeriodPicker filterPeriod={exportPeriod} setFilterPeriod={setExportPeriod} groupedOptions={groupedOptions} />
              <p className={`text-[10px] mt-3 leading-relaxed ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                *แนะนำให้ส่งออกแบบ <strong className={dm ? 'text-slate-400' : 'text-slate-500'}>รายเดือน</strong> เพื่อให้ตาราง Wide Format แยกยอดรายวันได้สมบูรณ์
              </p>
              <div className={`mt-auto pt-4 flex gap-2.5 items-start text-[11px] leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                <div className={`p-1.5 rounded-sm shrink-0 ${dm ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#00509E]'}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <p>ระบบจะดึงข้อมูลใน <span className={`font-bold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{getFilterLabel(exportPeriod)}</span> มาสร้างเป็นไฟล์ CSV</p>
              </div>
            </div>

            {/* Format selector */}
            <div className={`border rounded-sm p-4 flex flex-col h-full ${dm ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
              <label className={`block text-xs font-bold mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>รูปแบบไฟล์</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setExportFormat('long')} className={fmtCard(exportFormat === 'long')}>
                  <span className={`text-xs font-black mb-1 flex items-center gap-1 ${exportFormat === 'long' ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-slate-300' : 'text-slate-700')}`}>
                    <ClipboardList className="w-3.5 h-3.5" /> Long Format
                  </span>
                  <span className={`text-[10px] leading-snug ${dm ? 'text-slate-400' : 'text-slate-500'}`}>1 แถว ต่อ 1 รายการ<br />(เหมาะสำหรับ Import กลับ)</span>
                </button>
                <button onClick={() => setExportFormat('wide')} className={fmtCard(exportFormat === 'wide')}>
                  <span className={`text-xs font-black mb-1 flex items-center gap-1 ${exportFormat === 'wide' ? (dm ? 'text-blue-400' : 'text-[#00509E]') : (dm ? 'text-slate-300' : 'text-slate-700')}`}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Wide Format
                  </span>
                  <span className={`text-[10px] leading-snug ${dm ? 'text-slate-400' : 'text-slate-500'}`}>1 แถว ต่อ 1 วัน<br />(เหมาะสำหรับ Excel)</span>
                </button>
              </div>
              <div className={`mt-auto pt-4 flex gap-2.5 items-start text-[11px] leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                <div className={`p-1.5 rounded-sm shrink-0 ${dm ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <p>รองรับ <span className={`font-bold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>ภาษาไทย 100%</span> เปิดใน Excel / Sheets ได้โดยตรง</p>
              </div>
            </div>
          </div>

          {/* Preview table */}
          <div className={`mb-5 border rounded-sm overflow-hidden flex flex-col h-[300px] ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`px-4 py-2.5 text-xs font-bold border-b flex items-center justify-between shrink-0 z-10 relative ${dm ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              <span>👀 ตัวอย่างไฟล์ ({exportFormat === 'long' ? 'Long Format' : 'Wide Format'})</span>
              {!hasData && <span className="text-red-500">❌ ไม่มีข้อมูลในช่วงเวลานี้</span>}
            </div>
            <div className={`flex-1 overflow-auto ${dm ? 'bg-slate-900/40' : 'bg-white'}`} style={{ scrollbarWidth: 'thin' }}>
              {exportFormat === 'long' ? (
                <table className={`w-full text-xs text-left whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                  <thead className={`sticky top-0 border-b z-10 shadow-sm ${dm ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                    <tr>{['วันที่','ชนิดวัน','ประเภท','หมวดหมู่','รายละเอียด','จำนวนเงิน'].map(h => <th key={h} className="px-4 py-2.5 font-bold border-r last:border-r-0 border-slate-200 dark:border-slate-700">{h}</th>)}</tr>
                  </thead>
                  <tbody className={`divide-y ${dm ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">01/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ทำงาน</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">รายจ่าย</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">อาหารและเครื่องดื่ม</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ข้าวเที่ยง</td><td className="px-4 py-2 text-right font-mono font-bold">65</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">01/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ทำงาน</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">รายจ่าย</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">การเดินทาง</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">รถไฟฟ้า</td><td className="px-4 py-2 text-right font-mono font-bold">45</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">02/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">วันหยุด</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 text-emerald-500 font-bold">รายรับ</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">รายรับพิเศษ/โบนัส</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ขายของ</td><td className="px-4 py-2 text-right font-mono font-bold text-emerald-500">500</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">03/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ทำงาน</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">รายจ่าย</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ช้อปปิ้งออนไลน์</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">Lazada</td><td className="px-4 py-2 text-right font-mono font-bold">199</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">04/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ทำงาน</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">รายจ่าย</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ซักผ้า</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">เครื่องซักผ้าหยอดเหรียญ</td><td className="px-4 py-2 text-right font-mono font-bold">40</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">04/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">ทำงาน</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 text-emerald-500 font-bold">รายรับ</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">เงินเดือน</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">เงินเดือนบริษัท</td><td className="px-4 py-2 text-right font-mono font-bold text-emerald-500">25000</td></tr>
                  </tbody>
                </table>
              ) : (
                <table className={`w-full text-xs text-left whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                  <thead className={`sticky top-0 border-b z-10 shadow-sm ${dm ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                    <tr>{['Date','อาหารและเครื่องดื่ม','ช้อปปิ้งออนไลน์','การเดินทาง','ซักผ้า','รวม (Total)','Notes'].map(h => <th key={h} className="px-4 py-2.5 font-bold border-r last:border-r-0 border-slate-200 dark:border-slate-700">{h}</th>)}</tr>
                  </thead>
                  <tbody className={`divide-y ${dm ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">01/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 110.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 45.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 155.00</td><td className="px-4 py-2 text-slate-400"></td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">02/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 299.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 299.00</td><td className="px-4 py-2">Shopee</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">03/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 60.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 199.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 259.00</td><td className="px-4 py-2">Lazada</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">04/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 80.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 40.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 120.00</td><td className="px-4 py-2"></td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">05/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 150.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 150.00</td><td className="px-4 py-2"></td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">06/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 120.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 850.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 970.00</td><td className="px-4 py-2">ค่าน้ำ, ค่าไฟ</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">07/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 350.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 350.00</td><td className="px-4 py-2">ดูหนัง Major</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">08/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 200.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 1,250.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 1,450.00</td><td className="px-4 py-2"></td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">09/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 55.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 55.00</td><td className="px-4 py-2">MRT</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">10/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 180.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 120.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 300.00</td><td className="px-4 py-2">Grab</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">06/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 120.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 850.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 970.00</td><td className="px-4 py-2">ค่าน้ำ, ค่าไฟ</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">07/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 350.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 350.00</td><td className="px-4 py-2">ดูหนัง Major</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">08/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 200.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 1,250.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 1,450.00</td><td className="px-4 py-2"></td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">09/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 55.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 55.00</td><td className="px-4 py-2">MRT</td></tr>
                    <tr><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60">10/03/2026</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 180.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-bold">฿ 120.00</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono text-slate-400">฿ -</td><td className="px-4 py-2 border-r border-slate-100 dark:border-slate-800/60 font-mono font-black text-[#D81A21]">฿ 300.00</td><td className="px-4 py-2">Grab</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end gap-2 shrink-0 ${tokens.headerFooter}`}>
          <button onClick={onClose} disabled={isExporting} className={`px-4 py-2 rounded-sm font-bold text-xs transition-all active:scale-95 border disabled:opacity-50 ${dm ? 'text-slate-300 bg-slate-800 border-slate-600 hover:bg-slate-700' : 'text-slate-600 bg-white border-slate-300 hover:bg-slate-100'}`}>ยกเลิก</button>
          <button 
            onClick={executeExport} 
            disabled={!hasData || isExporting}
            className={`px-5 py-2 text-white rounded-sm font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border disabled:opacity-50 disabled:cursor-not-allowed ${dm ? 'bg-blue-600 hover:bg-blue-500 border-blue-700' : 'bg-[#00509E] hover:bg-[#003d7a] border-blue-800'}`}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            {isExporting ? 'กำลังสร้างไฟล์...' : 'ดาวน์โหลด CSV'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}