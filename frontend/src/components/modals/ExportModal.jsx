import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, ClipboardList, FileSpreadsheet, Database, ShieldCheck, 
  Loader2, Info, Search, FileText, Check, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PeriodPicker from '../layout/PeriodPicker';
import { isDateInFilter, fromISODate } from '../../utils/dateHelpers';
import { transactionService } from '../../services/api';
import { formatMoney } from '../../utils/formatters';

export default function ExportModal({
  isOpen, onClose, transactions: filteredTransactions, categories, dayTypes, dayTypeConfig,
  groupedOptions, getFilterLabel, initialPeriod
}) {
  // Config & State
  const [exportPeriod, setExportPeriod] = useState(initialPeriod || 'ALL');
  const [exportFormat, setExportFormat] = useState('long'); // 'long' | 'wide' | 'full'
  const [isExporting, setIsExporting] = useState(false);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [delimiter, setDelimiter] = useState(','); // ',' or ';'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense' | 'savings'
  const [previewSearch, setPreviewSearch] = useState('');

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape' && isOpen && !isExporting) onClose(); 
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, isExporting]);

  // Fetch data
  useEffect(() => { 
    if (isOpen) {
      setExportPeriod(initialPeriod || 'ALL');
      setIsExporting(false);
      
      const fetchAll = async () => {
        setIsFetching(true);
        try {
          const all = await transactionService.getAll();
          setLocalTransactions(all);
        } catch (err) {
          console.error("Export fetch failed:", err);
          setLocalTransactions(filteredTransactions);
        } finally {
          setIsFetching(false);
        }
      };
      fetchAll();
    } 
  }, [isOpen, initialPeriod, filteredTransactions]);

  // Filtered transactions calculation
  const dataToExport = useMemo(() => {
    return localTransactions.filter(t => {
      if (!isDateInFilter(t.date, exportPeriod)) return false;
      if (t.category && t.category.includes('หักวงเงิน')) return false;

      if (typeFilter !== 'all') {
        const cat = categories.find(c => c.name === t.category);
        const tType = cat?.type || 'expense';
        if (tType !== typeFilter) return false;
      }

      if (previewSearch.trim() !== '') {
        const query = previewSearch.toLowerCase();
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const catMatch = (t.category || '').toLowerCase().includes(query);
        if (!descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [localTransactions, exportPeriod, typeFilter, previewSearch, categories]);

  // Summary statistics
  const stats = useMemo(() => {
    const rowCount = exportFormat === 'full' 
      ? localTransactions.length + categories.length + dayTypeConfig.length + Object.keys(dayTypes).length
      : (exportFormat === 'wide' ? [...new Set(dataToExport.map(t => t.date))].length : dataToExport.length);
    const estKB = (rowCount * (exportFormat === 'wide' ? 0.32 : 0.14)).toFixed(1);
    return { rowCount, estKB, hasData: rowCount > 0 };
  }, [exportFormat, dataToExport, localTransactions, categories, dayTypeConfig, dayTypes]);

  if (!isOpen) return null;

  // Resolve DayType details
  const getDayTypeInfo = (date) => {
    const dtId = dayTypes[date];
    if (dtId) {
      const config = dayTypeConfig.find(d => d.id === dtId);
      return {
        label: config?.label || dtId,
        color: config?.color || '#94a3b8'
      };
    }
    const dayIdx = new Date(date).getDay();
    const isWeekend = dayIdx === 0 || dayIdx === 6;
    const config = isWeekend ? dayTypeConfig[1] : dayTypeConfig[0];
    return {
      label: config?.label || (isWeekend ? 'Holiday' : 'Workday'),
      color: config?.color || (isWeekend ? '#EF4444' : '#3B82F6')
    };
  };

  // Compile and run the actual CSV export
  const executeExport = () => {
    if ((!dataToExport.length && exportFormat !== 'full') || isExporting) return;
    
    setIsExporting(true);

    // Simple elegant loading before download
    setTimeout(() => {
      try {
        let csvContent = '\uFEFF'; // BOM
        const dlm = delimiter;

        if (exportFormat === 'long') {
          const headers = ['Date', 'DayType', 'Type', 'Category', 'Description', 'Amount', 'Note'];
          csvContent += headers.join(dlm) + '\n';
          dataToExport.forEach(t => {
            const cat = categories.find(c => c.name === t.category);
            const dt = getDayTypeInfo(t.date);

            const row = [
              t.date,
              dt.label,
              cat?.type || 'expense',
              t.category,
              `"${(t.description || '').replace(/"/g, '""')}"`,
              t.amount,
              `"${(t.dayNote || '').replace(/"/g, '""')}"`
            ];
            csvContent += row.join(dlm) + '\n';
          });
        } else if (exportFormat === 'wide') {
          const dates = [...new Set(dataToExport.map(t => t.date))].sort();
          const cats = categories.filter(c => dataToExport.some(t => t.category === c.name));
          const headers = ['Date', 'DayType', ...cats.map(c => c.name)];
          csvContent += headers.join(dlm) + '\n';
          
          dates.forEach(date => {
            const dt = getDayTypeInfo(date);
            const row = [date, dt.label];
            cats.forEach(cat => {
              const amount = dataToExport
                .filter(t => t.date === date && t.category === cat.name)
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
              row.push(amount || 0);
            });
            csvContent += row.join(dlm) + '\n';
          });
        } else if (exportFormat === 'full') {
          csvContent += 'SECTION' + dlm + 'DATA\n';
          csvContent += `TRANSACTIONS${dlm}"${JSON.stringify(localTransactions).replace(/"/g, '""')}"\n`;
          csvContent += `CATEGORIES${dlm}"${JSON.stringify(categories).replace(/"/g, '""')}"\n`;
          csvContent += `DAY_TYPES${dlm}"${JSON.stringify(dayTypes).replace(/"/g, '""')}"\n`;
          csvContent += `CONFIG${dlm}"${JSON.stringify(dayTypeConfig).replace(/"/g, '""')}"\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `CashflowShark_${exportFormat}_${exportPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export compilation failed:', err);
      } finally {
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-[#050507]/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative rounded-md shadow-xl flex flex-col w-full max-w-[1240px] h-[85vh] border border-[#232935] bg-[#0A0C11] overflow-hidden"
      >
        {/* Header - Minimalist Document Title */}
        <div className="px-6 py-4 border-b border-[#232935] bg-[#0D0F16] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              ส่งออกรายงานทางการเงิน <span className="text-slate-500 font-normal">/ Financial Statement Export</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">เลือกขอบเขตข้อมูลและรูปแบบของเอกสารที่ต้องการบันทึกเป็นไฟล์</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isExporting}
            className="p-1 text-slate-500 hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Core Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Side: Parameters Form (Minimal Paper Controls) */}
          <div className="w-[340px] shrink-0 border-r border-[#232935] flex flex-col bg-[#080A0E] p-6 overflow-y-auto scrollbar-tactical space-y-6">
            
            {/* Section 1: Period */}
            <section className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                01. ขอบเขตช่วงเวลา (Date Period)
              </label>
              <div className="bg-[#0D0F16] p-3 rounded border border-[#232935]">
                <PeriodPicker 
                  filterPeriod={exportPeriod} 
                  setFilterPeriod={setExportPeriod} 
                  groupedOptions={groupedOptions} 
                />
              </div>
            </section>

            {/* Section 2: Format Selection */}
            <section className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                02. รูปแบบเอกสาร (Document Type)
              </label>
              
              <div className="space-y-2.5">
                {/* Transactional Format */}
                <button
                  onClick={() => setExportFormat('long')}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded border transition-colors text-left ${
                    exportFormat === 'long'
                      ? 'border-slate-300 bg-slate-800/20'
                      : 'border-[#232935] bg-transparent hover:border-slate-700'
                  }`}
                >
                  <ClipboardList className={`w-4.5 h-4.5 shrink-0 ${exportFormat === 'long' ? 'text-slate-200' : 'text-slate-600'}`} />
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      รายงานแยกประเภทรายการ (Long)
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      ตารางรายการเรียงตามลำดับวันที่ เหมาะสำหรับการเก็บประวัติ
                    </p>
                  </div>
                  {exportFormat === 'long' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  )}
                </button>

                {/* Spreadsheet Format */}
                <button
                  onClick={() => setExportFormat('wide')}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded border transition-colors text-left ${
                    exportFormat === 'wide'
                      ? 'border-slate-300 bg-slate-800/20'
                      : 'border-[#232935] bg-transparent hover:border-slate-700'
                  }`}
                >
                  <FileSpreadsheet className={`w-4.5 h-4.5 shrink-0 ${exportFormat === 'wide' ? 'text-slate-200' : 'text-slate-600'}`} />
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      ตารางสเปรดชีตวิเคราะห์ (Wide Matrix)
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      ตารางเปรียบเทียบหมวดหมู่รายวัน เหมาะสำหรับรัน Pivot Excel
                    </p>
                  </div>
                  {exportFormat === 'wide' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  )}
                </button>

                {/* Database Backup Format */}
                <button
                  onClick={() => setExportFormat('full')}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded border transition-colors text-left ${
                    exportFormat === 'full'
                      ? 'border-slate-300 bg-slate-800/20'
                      : 'border-[#232935] bg-transparent hover:border-slate-700'
                  }`}
                >
                  <Database className={`w-4.5 h-4.5 shrink-0 ${exportFormat === 'full' ? 'text-slate-200' : 'text-slate-600'}`} />
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      สำเนาฐานข้อมูลของระบบ (System Backup)
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      เก็บสำเนาค่าระบบ ปฏิทินวันทำงาน และหมวดหมู่ทั้งหมด
                    </p>
                  </div>
                  {exportFormat === 'full' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  )}
                </button>
              </div>
            </section>

            {/* Section 3: Formatting & Delimiter */}
            <section className="space-y-3.5 bg-[#0D0F16]/50 p-4 rounded border border-[#232935]">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                03. ตัวเลือกเอกสาร (Format Options)
              </label>

              {/* Delimiter */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">เครื่องหมายคั่นไฟล์ (CSV Delimiter)</span>
                <div className="grid grid-cols-2 gap-1.5 bg-[#050507] p-0.5 rounded border border-[#232935]">
                  <button
                    onClick={() => setDelimiter(',')}
                    className={`py-1.5 text-[10px] font-bold rounded transition-colors ${
                      delimiter === ',' ? 'bg-[#232935] text-slate-200 border border-slate-700' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    จุลภาค ( , )
                  </button>
                  <button
                    onClick={() => setDelimiter(';')}
                    className={`py-1.5 text-[10px] font-bold rounded transition-colors ${
                      delimiter === ';' ? 'bg-[#232935] text-slate-200 border border-slate-700' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    อัฒภาค ( ; )
                  </button>
                </div>
              </div>

              {/* Type Gate */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">ประเภทรายการ (Transaction Type)</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-[#050507] border border-[#232935] text-xs font-bold text-slate-300 py-2 px-3.5 rounded cursor-pointer focus:outline-none focus:border-slate-500 transition-colors"
                >
                  <option value="all">ทุกรายการ (All Transactions)</option>
                  <option value="income">รายรับเท่านั้น (Income Only)</option>
                  <option value="expense">รายจ่ายเท่านั้น (Expense Only)</option>
                  <option value="savings">เงินออมเท่านั้น (Savings Only)</option>
                </select>
              </div>
            </section>

            {/* Document summary detail */}
            <div className="mt-auto p-4 border border-[#232935] bg-[#0D0F16]/30 rounded text-[10px] font-mono space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase">จำนวนรายการทั้งหมด:</span>
                <span className="text-slate-300 font-bold">{stats.rowCount.toLocaleString()} แถว</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase">ขนาดไฟล์โดยประมาณ:</span>
                <span className="text-slate-300 font-bold">{stats.estKB} KB</span>
              </div>
              <div className="h-[1px] bg-[#232935] w-full" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase">การแปลงตัวอักษร:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> UTF-8 BOM (Excel ไทย)
                </span>
              </div>
            </div>

          </div>

          {/* Right Side: Minimalist Sheet Preview (Print Feel) */}
          <div className="flex-grow flex flex-col p-6 bg-[#06070B] overflow-hidden">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  ตัวอย่างข้อมูลในรายงาน (Document Preview)
                </span>
              </div>

              {/* Minimal Search */}
              {exportFormat !== 'full' && (
                <div className="relative w-full sm:w-[260px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input
                    type="text"
                    placeholder="ค้นหาตามคำอธิบาย..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full bg-[#0D0F16] border border-[#232935] pl-9 pr-3 py-1.5 text-xs font-bold tracking-wide rounded focus:border-slate-600 focus:outline-none transition-colors placeholder:text-slate-600"
                  />
                  {previewSearch && (
                    <button 
                      onClick={() => setPreviewSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Document sheet simulator */}
            <div className="flex-1 rounded-md border border-[#232935] flex flex-col relative overflow-hidden bg-[#0A0D14]">
              
              {/* Paper Watermark / Header */}
              <div className="px-4 py-2.5 border-b border-[#232935] bg-[#0E1119] flex justify-between items-center text-[10px] font-mono text-slate-500 tracking-widest select-none">
                <span>CASHFLOW SHARK STATEMENT REPORT</span>
                <span>PRINT PREVIEW // TOTAL ROWS: {dataToExport.length}</span>
              </div>

              {/* Data loading or empty states */}
              {isFetching ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2.5 font-mono text-xs text-slate-500">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  <span className="uppercase tracking-widest">กำลังอ่านข้อมูลจากฐานข้อมูล...</span>
                </div>
              ) : !stats.hasData && exportFormat !== 'full' ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2.5 font-mono text-xs text-slate-500">
                  <AlertTriangle className="w-6 h-6 text-slate-600 animate-pulse" />
                  <span>ไม่พบบันทึกข้อมูลในช่วงเวลาและเงื่อนไขที่กำหนด</span>
                </div>
              ) : (
                <div className="flex-1 overflow-auto scrollbar-tactical relative">
                  
                  {/* PREVIEW: Transactional Matrix (Long) */}
                  {exportFormat === 'long' && (
                    <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
                      <thead className="sticky top-0 bg-[#0A0D14] text-slate-500 z-10 select-none">
                        <tr className="border-b border-[#232935]">
                          <th className="p-3 font-bold uppercase tracking-wider">วันที่ (Date)</th>
                          <th className="p-3 font-bold uppercase tracking-wider">ประเภทวัน</th>
                          <th className="p-3 font-bold uppercase tracking-wider">ประเภทรายการ</th>
                          <th className="p-3 font-bold uppercase tracking-wider">หมวดหมู่ (Category)</th>
                          <th className="p-3 font-bold uppercase tracking-wider">รายละเอียด</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-right">จำนวนเงิน (฿)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#232935]/30">
                        {dataToExport.slice(0, 15).map((t, idx) => {
                          const cat = categories.find(c => c.name === t.category);
                          const dt = getDayTypeInfo(t.date);
                          const isIncome = cat?.type === 'income';
                          const isSavings = cat?.type === 'savings';

                          return (
                            <tr key={t.id || idx} className="hover:bg-slate-800/10 transition-colors">
                              <td className="p-3 text-slate-400">{fromISODate(t.date)}</td>
                              <td className="p-3">
                                <span className="text-[10px] text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">
                                  {dt.label}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`text-[10px] font-bold ${
                                  isIncome 
                                    ? 'text-emerald-500' 
                                    : (isSavings ? 'text-cyan-500' : 'text-rose-500')
                                }`}>
                                  {(cat?.type || 'expense').toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span 
                                  className="border px-2 py-0.5 rounded text-[10px] font-bold"
                                  style={{
                                    borderColor: `${cat?.color || '#232935'}40`,
                                    color: cat?.color || '#94a3b8'
                                  }}
                                >
                                  {t.category}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300 max-w-[220px] truncate" title={t.description}>
                                {t.description || '—'}
                              </td>
                              <td className={`p-3 text-right font-bold ${
                                isIncome 
                                  ? 'text-emerald-500' 
                                  : (isSavings ? 'text-cyan-500' : 'text-rose-500')
                              }`}>
                                {isIncome ? '+' : (isSavings ? '±' : '-')}{formatMoney(t.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* PREVIEW: Analytical Matrix (Wide) */}
                  {exportFormat === 'wide' && (() => {
                    const dates = [...new Set(dataToExport.map(t => t.date))].sort();
                    const cats = categories.filter(c => dataToExport.some(t => t.category === c.name));
                    
                    return (
                      <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
                        <thead className="sticky top-0 bg-[#0A0D14] text-slate-500 z-10 select-none">
                          <tr className="border-b border-[#232935]">
                            <th className="p-3 font-bold uppercase tracking-wider">วันที่ (Date)</th>
                            <th className="p-3 font-bold uppercase tracking-wider">ประเภทวัน</th>
                            {cats.slice(0, 6).map(c => (
                              <th 
                                key={c.id} 
                                className="p-3 font-bold uppercase tracking-wider text-right"
                                style={{ color: c.color }}
                              >
                                {c.name}
                              </th>
                            ))}
                            {cats.length > 6 && (
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-600 text-center italic">
                                ...
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#232935]/30">
                          {dates.slice(0, 15).map(date => {
                            const dt = getDayTypeInfo(date);
                            
                            return (
                              <tr key={date} className="hover:bg-slate-800/10 transition-colors">
                                <td className="p-3 text-slate-400">{fromISODate(date)}</td>
                                <td className="p-3">
                                  <span className="text-[10px] text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded">
                                    {dt.label}
                                  </span>
                                </td>
                                {cats.slice(0, 6).map(cat => {
                                  const total = dataToExport
                                    .filter(t => t.date === date && t.category === cat.name)
                                    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                                  
                                  return (
                                    <td 
                                      key={cat.id} 
                                      className={`p-3 text-right font-bold ${
                                        total > 0 
                                          ? (cat.type === 'income' ? 'text-emerald-500' : (cat.type === 'savings' ? 'text-cyan-500' : 'text-rose-500')) 
                                          : 'text-slate-850'
                                      }`}
                                    >
                                      {total > 0 ? formatMoney(total) : '—'}
                                    </td>
                                  );
                                })}
                                {cats.length > 6 && (
                                  <td className="p-3 text-slate-700 text-center italic">...</td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* PREVIEW: Full System Backup */}
                  {exportFormat === 'full' && (
                    <div className="p-6 space-y-6 font-mono text-[11px] text-slate-400 leading-relaxed">
                      
                      <div className="border-b border-[#232935] pb-2">
                        <span className="font-bold uppercase tracking-wider text-slate-300 block text-xs">
                          สรุปโครงสร้างข้อมูลสำหรับการสำรองไฟล์ (System Data Summary)
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">ตารางด้านล่างแสดงจำนวนอาร์เรย์ของข้อมูลระบบทั้งหมดที่จะถูกจัดเก็บในรายงานฉบับเต็ม</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-[#0C0E14] border border-[#232935] p-4 rounded flex items-center justify-between">
                          <div>
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase">TRANSACTIONS MASTER TABLE</h6>
                            <p className="text-[9px] text-slate-600 mt-0.5">ตารางประวัติธุรกรรมหลักของระบบ</p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                            {localTransactions.length} รายการ
                          </span>
                        </div>

                        <div className="bg-[#0C0E14] border border-[#232935] p-4 rounded flex items-center justify-between">
                          <div>
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase">CATEGORIES SYSTEM TABLE</h6>
                            <p className="text-[9px] text-slate-600 mt-0.5">ตารางจัดจำแนกหมวดหมู่รายรับ/รายจ่าย</p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                            {categories.length} รายการ
                          </span>
                        </div>

                        <div className="bg-[#0C0E14] border border-[#232935] p-4 rounded flex items-center justify-between">
                          <div>
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase">CALENDAR DICTIONARY MAP</h6>
                            <p className="text-[9px] text-slate-600 mt-0.5">ตารางผูกประเภทวันทำงานและวันหยุด</p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                            {Object.keys(dayTypes).length} วันที่บันทึก
                          </span>
                        </div>

                        <div className="bg-[#0C0E14] border border-[#232935] p-4 rounded flex items-center justify-between">
                          <div>
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase">DAY CONFIG SYSTEM</h6>
                            <p className="text-[9px] text-slate-600 mt-0.5">ตารางสีและตัวบ่งชี้ประเภทของวัน</p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                            {dayTypeConfig.length} คลาสตั้งค่า
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 bg-[#050507] p-4 rounded border border-[#232935] text-slate-500 text-[10px] max-w-full overflow-x-auto leading-normal select-none">
                        <div># [SYSTEM EXPORT PROTOCOL VERIFIED]</div>
                        <div># SCHEMA SPECIFICATIONS: SATANG INTEGER BASED STORAGE</div>
                        <div># COMPILING OBJECT RELATIONAL DATABASE STATE... OK</div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Print Note Info */}
            <div className="mt-4 flex items-start gap-3 shrink-0 select-none">
               <Info className="w-4 h-4 text-slate-600 mt-0.5" />
               <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    คำแนะนำในการประมวลผลไฟล์ภาษาไทย (Encoding Compatibility)
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-4xl">
                    ระบบฝังตัวอักษร Byte Order Mark (BOM) ลงในข้อมูลทุกประเภทโดยอัตโนมัติ เพื่อยืนยันว่าโปรแกรม MS Excel และสเปรดชีตทั่วไปจะสามารถอ่านภาษาไทยได้อย่างถูกต้องและมีระเบียบโดยปราศจากข้อผิดพลาดของข้อความ
                  </p>
               </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#232935] bg-[#0D0F16] flex justify-between items-center shrink-0">
          <div className="flex gap-6 text-xs font-mono select-none">
            <div className="flex flex-col">
              <span className="text-slate-600 font-bold uppercase block text-[9px]">เครื่องหมายคั่น</span>
              <span className="text-slate-400 mt-0.5">{delimiter === ',' ? 'Comma (,)' : 'Semicolon (;)'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-600 font-bold uppercase block text-[9px]">ขอบเขตเป้าหมาย</span>
              <span className="text-slate-400 mt-0.5 truncate max-w-[170px]" title={getFilterLabel(exportPeriod)}>
                {getFilterLabel(exportPeriod)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              disabled={isExporting}
              className="px-5 py-2.5 rounded text-xs font-bold uppercase transition-colors hover:bg-slate-900 text-slate-500 disabled:opacity-30"
            >
              ยกเลิก
            </button>
            <button 
              onClick={executeExport} 
              disabled={(!stats.hasData && exportFormat !== 'full') || isExporting}
              className="px-6 py-2.5 rounded font-bold text-xs uppercase transition-colors bg-slate-200 hover:bg-white text-slate-950 disabled:opacity-30 disabled:hover:bg-slate-200"
            >
              {isExporting ? 'กำลังบันทึกไฟล์...' : 'ดาวน์โหลดรายงาน (CSV)'}
            </button>
          </div>
        </div>

        {/* Quiet Elegant Loading Overlay */}
        <AnimatePresence>
          {isExporting && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#050507]/90 z-[200] flex items-center justify-center select-none"
            >
              <div className="flex flex-col items-center space-y-3 font-mono">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  กำลังประมวลผลและสร้างไฟล์รายงาน...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}