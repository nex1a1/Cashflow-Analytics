// src/components/ExportModal.jsx
import React, { useState, useEffect } from 'react';
import { Download, X, AlertCircle, ClipboardList, FileSpreadsheet, CheckCircle } from 'lucide-react';
import PeriodPicker from './PeriodPicker';
import { isDateInFilter } from '../utils/dateHelpers';

export default function ExportModal({
  isOpen,
  onClose,
  transactions,
  categories,
  dayTypes,
  dayTypeConfig,
  isDarkMode,
  groupedOptions,
  getFilterLabel,
  initialPeriod
}) {
  const [exportPeriod, setExportPeriod] = useState(initialPeriod || 'ALL');
  const [exportFormat, setExportFormat] = useState('long');
  const [showToast, setShowToast] = useState(false);

  // อัปเดตช่วงเวลาเริ่มต้นให้ตรงกับที่เลือกไว้ในหน้า Dashboard
  useEffect(() => {
    if (isOpen) {
      setExportPeriod(initialPeriod || 'ALL');
    }
  }, [isOpen, initialPeriod]);

  if (!isOpen) return null;

  const executeExport = () => {
    const dataToExport = transactions.filter(t => {
        const inPeriod = isDateInFilter(t.date, exportPeriod);
        if (!inPeriod) return false;
        const isDebtGhost = t.category.includes('หักวงเงิน');
        return !isDebtGhost; 
    });

    if (dataToExport.length === 0) return alert("ไม่มีข้อมูลในช่วงเวลาที่เลือก");

    const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
    let csvContent = '';
    let filename = '';

    if (exportFormat === 'long') {
      csvContent = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n";
      dataToExport.forEach(item => {
        const [d, m, y] = item.date.split('/');
        const dayOfWeek = new Date(y, parseInt(m)-1, d).getDay();
        const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
        const currentTypeId = dayTypes[item.date] || defaultType;
        const typeConfig = dayTypeConfig.find(dt => dt.id === currentTypeId) || dayTypeConfig[0];
        const catObj = categories.find(c => c.name === item.category);
        const isInc = catObj?.type === 'income';
        csvContent += `${item.date},${escapeCSV(typeConfig?.label || '')},${isInc ? 'รายรับ' : 'รายจ่าย'},${escapeCSV(item.category)},${escapeCSV(item.description || '')},${item.amount}\n`;
      });
      filename = `Cashflow_Long_${exportPeriod.replace('/', '-')}.csv`;
    } else {
      const expCats = categories.filter(c => c.type === 'expense');
      const usedCatNames = [...new Set(dataToExport.filter(t => categories.find(c => c.name === t.category)?.type === 'expense').map(t => t.category))];
      const orderedCats = expCats.filter(c => usedCatNames.includes(c.name)).map(c => c.name);
      csvContent = ['Date', ...orderedCats, 'รวม (Total)', 'Notes'].map(h => escapeCSV(h)).join(',') + '\n';
      const allDates = [...new Set(dataToExport.map(t => t.date))].sort((a, b) => {
        const [da,ma,ya] = a.split('/'); const [db,mb,yb] = b.split('/');
        return new Date(ya,ma-1,da) - new Date(yb,mb-1,db);
      });
      allDates.forEach(dateStr => {
        const dayTx = dataToExport.filter(t => t.date === dateStr);
        const notes = dayTx.filter(t => t.description && t.description !== t.category).map(t => t.description).join(', ');
        const rowValues = orderedCats.map(catName => {
          const total = dayTx.filter(t => t.category === catName).reduce((s,t) => s + (parseFloat(t.amount)||0), 0);
          return total > 0 ? `฿ ${total.toFixed(2)}` : '฿ -';
        });
        const dayTotal = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'expense').reduce((s,t) => s + (parseFloat(t.amount)||0), 0);
        csvContent += [dateStr, ...rowValues, `฿ ${dayTotal.toFixed(2)}`, notes].map(v => escapeCSV(v)).join(',') + '\n';
      });
      filename = `Cashflow_Wide_${exportPeriod.replace('/', '-')}.csv`;
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowToast(true);
    setTimeout(() => {
        setShowToast(false);
        onClose(); // ปิดหน้าต่างให้เนียนๆ หลังโหลดเสร็จ
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-3xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-5">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><Download className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}/> ส่งออกไฟล์ CSV</h3>
                <button onClick={onClose} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              
              <div className={`border rounded-xl p-5 flex flex-col h-full shadow-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                  <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>เลือกรอบบิลที่ต้องการส่งออก</label>
                  <PeriodPicker
                    filterPeriod={exportPeriod}
                    setFilterPeriod={setExportPeriod}
                    groupedOptions={groupedOptions}
                    isDarkMode={isDarkMode}
                  />
                  <p className={`text-[11px] mt-3 leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    *แนะนำให้ส่งออกแบบ <strong className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>รายเดือน</strong> เพื่อให้ตาราง Wide Format แยกยอดรายวันได้อย่างสมบูรณ์
                  </p>
                  
                  <div className={`mt-auto pt-5 flex gap-3 items-start text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#00509E]'}`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <p>
                      ระบบจะดึงข้อมูล <span className={isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'}>รายรับ</span> และ <span className={isDarkMode ? 'text-red-400 font-bold' : 'text-red-600 font-bold'}>รายจ่าย</span> ใน 
                      <span className={`font-bold ml-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {getFilterLabel(exportPeriod)}
                      </span> มาสร้างเป็นไฟล์ CSV เพื่อนำไปวิเคราะห์ต่อได้ทันที
                    </p>
                  </div>
              </div>

              <div className={`border rounded-xl p-5 flex flex-col h-full shadow-sm ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <label className={`block text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>รูปแบบไฟล์</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setExportFormat('long')} className={`flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${exportFormat === 'long' ? (isDarkMode ? 'border-blue-500 bg-blue-900/20 shadow-inner' : 'border-[#00509E] bg-blue-50/50 shadow-inner') : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')}`}>
                    <span className={`text-sm font-black mb-1.5 flex items-center gap-1.5 ${exportFormat === 'long' ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                      <ClipboardList className="w-4 h-4"/> Long Format
                    </span>
                    <span className={`text-[11px] leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 แถว ต่อ 1 รายการ<br/>(เหมาะสำหรับ Import กลับ)</span>
                  </button>
                  <button onClick={() => setExportFormat('wide')} className={`flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${exportFormat === 'wide' ? (isDarkMode ? 'border-blue-500 bg-blue-900/20 shadow-inner' : 'border-[#00509E] bg-blue-50/50 shadow-inner') : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')}`}>
                    <span className={`text-sm font-black mb-1.5 flex items-center gap-1.5 ${exportFormat === 'wide' ? (isDarkMode ? 'text-blue-400' : 'text-[#00509E]') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                      <FileSpreadsheet className="w-4 h-4"/> Wide Format
                    </span>
                    <span className={`text-[11px] leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 แถว ต่อ 1 วัน<br/>(เหมาะสำหรับอ่านใน Excel)</span>
                  </button>
                </div>
                
                <div className={`mt-auto pt-5 flex gap-3 items-start text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p>
                      ไฟล์ที่ส่งออกรองรับ <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ภาษาไทย 100%</span> สามารถนำไปเปิดในโปรแกรม Excel หรือ Google Sheets ได้โดยสระและตัวอักษรไม่เพี้ยน
                    </p>
                </div>
              </div>

            </div>

            <div className={`mb-6 border rounded-lg overflow-hidden transition-all duration-300 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className={`px-4 py-2.5 text-sm font-bold border-b flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                👀 ตัวอย่างหน้าตาไฟล์ที่จะได้ ({exportFormat === 'long' ? 'Long Format' : 'Wide Format'})
              </div>
              <div className={`overflow-x-auto custom-scrollbar p-0 ${isDarkMode ? 'bg-slate-900/40' : 'bg-white'}`}>
                {exportFormat === 'long' ? (
                  <table className={`w-full text-xs text-left whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <thead className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                      <tr>
                        <th className="px-4 py-3 font-bold">วันที่</th>
                        <th className="px-4 py-3 font-bold">ชนิดวัน</th>
                        <th className="px-4 py-3 font-bold">ประเภท</th>
                        <th className="px-4 py-3 font-bold">หมวดหมู่</th>
                        <th className="px-4 py-3 font-bold">รายละเอียด</th>
                        <th className="px-4 py-3 font-bold text-right">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                      <tr><td className="px-4 py-2.5">01/03/2026</td><td className="px-4 py-2.5">ทำงาน</td><td className="px-4 py-2.5">รายจ่าย</td><td className="px-4 py-2.5">อาหารและเครื่องดื่ม</td><td className="px-4 py-2.5">ข้าวเที่ยง</td><td className="px-4 py-2.5 text-right font-mono font-bold">65</td></tr>
                      <tr><td className="px-4 py-2.5">01/03/2026</td><td className="px-4 py-2.5">ทำงาน</td><td className="px-4 py-2.5">รายจ่าย</td><td className="px-4 py-2.5">การเดินทาง</td><td className="px-4 py-2.5">รถไฟฟ้า</td><td className="px-4 py-2.5 text-right font-mono font-bold">45</td></tr>
                      <tr><td className="px-4 py-2.5">02/03/2026</td><td className="px-4 py-2.5">วันหยุด</td><td className="px-4 py-2.5 text-emerald-500 font-bold">รายรับ</td><td className="px-4 py-2.5">รายรับพิเศษ/โบนัส</td><td className="px-4 py-2.5">ขายของ</td><td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-500">500</td></tr>
                    </tbody>
                  </table>
                ) : (
                  <table className={`w-full text-xs text-left whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <thead className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                      <tr>
                        <th className="px-4 py-3 font-bold">Date</th>
                        <th className="px-4 py-3 font-bold text-right">อาหารและเครื่องดื่ม</th>
                        <th className="px-4 py-3 font-bold text-right">ช้อปปิ้งออนไลน์</th>
                        <th className="px-4 py-3 font-bold text-right">รวม (Total)</th>
                        <th className="px-4 py-3 font-bold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                      <tr><td className="px-4 py-2.5">01/03/2026</td><td className="px-4 py-2.5 text-right font-mono font-bold">฿ 110.00</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono font-black text-[#D81A21]">฿ 110.00</td><td className="px-4 py-2.5 text-slate-400"></td></tr>
                      <tr><td className="px-4 py-2.5">02/03/2026</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono font-bold">฿ 299.00</td><td className="px-4 py-2.5 text-right font-mono font-black text-[#D81A21]">฿ 299.00</td><td className="px-4 py-2.5">Shopee</td></tr>
                      <tr><td className="px-4 py-2.5">03/03/2026</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono text-slate-400">฿ -</td><td className="px-4 py-2.5 text-right font-mono font-black text-[#D81A21]">฿ -</td><td className="px-4 py-2.5 text-slate-400"></td></tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={onClose} className={`px-4 py-2.5 rounded-lg font-bold transition-all active:scale-95 ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>ยกเลิก</button>
                <button onClick={executeExport} className={`px-5 py-2.5 text-white rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#00509E] hover:bg-[#003d7a]'}`}><FileSpreadsheet className="w-4 h-4"/> ดาวน์โหลด CSV</button>
            </div>
            
            {/* TOAST in Modal */}
            <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-3 z-50 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'} ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800'}`}>
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="font-medium text-base">ดาวน์โหลดสำเร็จ!</span>
            </div>
        </div>
    </div>
  );
}