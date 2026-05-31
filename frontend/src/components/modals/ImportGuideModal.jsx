import React, { useState, useEffect } from 'react';
import { 
  X, ClipboardList, FileSpreadsheet, ShieldCheck, 
  Info, FileText, CheckCircle, FileDown, Layers, Copy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

export default function ImportGuideModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState('long'); // 'long' | 'wide'
  const [copied, setCopied] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape' && isOpen) onClose(); 
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format Headers & Contents
  const longFormatHeaders = ['วันที่', 'ชนิดวัน', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'];
  const longCopyText = longFormatHeaders.join(',');

  const wideFormatHeaders = ['Date', 'อาหารและเครื่องดื่ม', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซักผ้า', 'รวม (Total)', 'Notes'];
  const wideCopyText = wideFormatHeaders.map(h => `"${h}"`).join(',');

  const handleCopyHeaders = () => {
    const text = selectedFormat === 'long' ? longCopyText : wideCopyText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('คัดลอกรายชื่อหัวตารางลงคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSample = () => {
    if (selectedFormat === 'long') {
      const s = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n01/03/2026,ทำงาน,รายรับ,เงินเดือน,เงินเดือนประจำเดือนมีนาคม,25000\n01/03/2026,ทำงาน,รายจ่าย,อาหารและเครื่องดื่ม,ข้าวเที่ยง,65\n";
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + s], { type: 'text/csv;charset=utf-8;' }));
      a.download = 'sample_long_format.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('ดาวน์โหลดไฟล์ตัวอย่าง Long Format สำเร็จ', 'success');
    } else {
      const s = '"Date","อาหารและเครื่องดื่ม","ช้อปปิ้งออนไลน์","การเดินทาง","ซักผ้า","รวม (Total)","Notes"\n"01/03/2026","฿ 110.00","฿ -","฿ 45.00","฿ -","฿ 155.00",""\n"02/03/2026","฿ -","฿ 299.00","฿ -","฿ -","฿ 299.00","Shopee"\n';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + s], { type: 'text/csv;charset=utf-8;' }));
      a.download = 'sample_wide_format.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('ดาวน์โหลดไฟล์ตัวอย่าง Wide Format สำเร็จ', 'success');
    }
  };

  // Color mappings for Table Headers
  const getHeaderColorClass = (header, format) => {
    if (format === 'long') {
      switch (header) {
        case 'วันที่': return 'text-[#888888]';
        case 'ชนิดวัน': return 'text-indigo-400';
        case 'ประเภท': return 'text-rose-400';
        case 'หมวดหมู่': return 'text-emerald-400';
        case 'รายละเอียด': return 'text-[#cbd5e1]';
        case 'จำนวนเงิน': return 'text-cyan-400';
        default: return 'text-[#888888]';
      }
    } else {
      switch (header) {
        case 'Date': return 'text-[#888888]';
        case 'อาหารและเครื่องดื่ม': return 'text-rose-455 text-right';
        case 'ช้อปปิ้งออนไลน์': return 'text-amber-455 text-right';
        case 'การเดินทาง': return 'text-sky-400 text-right';
        case 'ซักผ้า': return 'text-purple-400 text-right';
        case 'รวม (Total)': return 'text-[#555555] font-normal italic text-right';
        case 'Notes': return 'text-[#888888]';
        default: return 'text-[#888888]';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative rounded-none shadow-xl flex flex-col w-full max-w-[1240px] h-[85vh] border border-[#3e3e3e] bg-[#181818] overflow-hidden"
      >
        {/* Header - Minimalist Document Title */}
        <div className="px-6 py-4 border-b border-[#303030] bg-[#121212] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              คู่มือนำเข้าข้อมูลผ่านไฟล์ <span className="text-slate-500 font-normal">/ CSV Import Specification Manual</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">ศึกษาข้อกำหนดและวิเคราะห์ประเภทของตารางข้อมูลเพื่อให้ระบบประมวลผลได้อย่างราบรื่นไร้รอยต่อ</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-[#888888] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Core Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Side: Parameters Form (Format Chooser & Specifics) */}
          <div className="w-[340px] shrink-0 border-r border-[#303030] flex flex-col bg-[#1c1c1c] p-6 overflow-y-auto scrollbar-tactical space-y-6 rounded-none">
            
            {/* Section 1: Template Selection */}
            <section className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#cbd5e1] block">
                01. เลือกรูปแบบโครงสร้างไฟล์ (Format Type)
              </label>
              
              <div className="space-y-2.5">
                {/* Long Format */}
                <button
                  onClick={() => setSelectedFormat('long')}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-none border transition-colors text-left ${
                    selectedFormat === 'long'
                      ? 'border-[#da291c] bg-[#da291c]/10 text-white'
                      : 'border-[#303030] bg-[#121212] hover:border-[#da291c]/50 text-[#888888] hover:text-[#cbd5e1]'
                  }`}
                >
                  <ClipboardList className={`w-4.5 h-4.5 shrink-0 ${selectedFormat === 'long' ? 'text-white' : 'text-[#555555]'}`} />
                  <div className="flex-1">
                    <h5 className={`text-xs font-bold uppercase tracking-wide ${selectedFormat === 'long' ? 'text-white' : 'text-slate-200'}`}>
                      รายงานแยกตามรายการ (Long)
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight font-mono">
                      แถวรายการเรียงตามลำดับวันที่ รองรับประเภทวัน รายรับ รายจ่าย คละในตารางเดียว
                    </p>
                  </div>
                  {selectedFormat === 'long' && (
                    <div className="w-1.5 h-1.5 rounded-none bg-[#da291c] shrink-0" />
                  )}
                </button>

                {/* Wide Format */}
                <button
                  onClick={() => setSelectedFormat('wide')}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-none border transition-colors text-left ${
                    selectedFormat === 'wide'
                      ? 'border-[#da291c] bg-[#da291c]/10 text-white'
                      : 'border-[#303030] bg-[#121212] hover:border-[#da291c]/50 text-[#888888] hover:text-[#cbd5e1]'
                  }`}
                >
                  <FileSpreadsheet className={`w-4.5 h-4.5 shrink-0 ${selectedFormat === 'wide' ? 'text-white' : 'text-[#555555]'}`} />
                  <div className="flex-1">
                    <h5 className={`text-xs font-bold uppercase tracking-wide ${selectedFormat === 'wide' ? 'text-white' : 'text-slate-200'}`}>
                      ตารางเปรียบเทียบรายวัน (Wide)
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight font-mono">
                      คอลัมน์แนวนอนแยกตามหมวดหมู่ค่าใช้จ่าย เหมาะสำหรับย้ายข้อมูลตรงจาก Excel ประจำวัน
                    </p>
                  </div>
                  {selectedFormat === 'wide' && (
                    <div className="w-1.5 h-1.5 rounded-none bg-[#da291c] shrink-0" />
                  )}
                </button>
              </div>
            </section>

            {/* Section 2: Technical Specifications */}
            <section className="space-y-3.5 bg-[#121212] p-4 rounded-none border border-[#303030]">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#cbd5e1] block">
                02. ข้อกำหนดทางโครงสร้างระบบ
              </label>

              <div className="space-y-3 text-[10px] font-mono leading-normal text-slate-400 divide-y divide-[#303030]">
                
                {/* Row 1: Delimiter */}
                <div className="pt-2 first:pt-0">
                  <span className="text-[#888888] font-bold block mb-0.5">เครื่องหมายคั่นไฟล์ (DELIMITER):</span>
                  <span>ตรวจจับและแยกด้วยเครื่องหมายคั่น <code className="text-[#da291c] bg-[#da291c]/10 border border-[#da291c]/30 px-1.5 py-0.5 rounded-none font-bold">จุลภาค ( , )</code> หรือ <code className="text-[#da291c] bg-[#da291c]/10 border border-[#da291c]/30 px-1.5 py-0.5 rounded-none font-bold">อัฒภาค ( ; )</code> อัตโนมัติ</span>
                </div>

                {/* Row 2: Date format */}
                <div className="pt-2">
                  <span className="text-[#888888] font-bold block mb-0.5">รูปแบบฟอร์แมตวันที่ (DATE SYNTAX):</span>
                  <span>รองรับคีย์วันที่แบบสากลคลาสสิก <code className="text-cyan-455 bg-cyan-950/20 border border-cyan-900/30 px-1.5 py-0.5 rounded-none font-bold">YYYY-MM-DD</code> หรือสไตล์ตารางไทย <code className="text-cyan-455 bg-cyan-950/20 border border-cyan-900/30 px-1.5 py-0.5 rounded-none font-bold">DD/MM/YYYY</code></span>
                </div>

                {/* Row 3: Precision conversion */}
                <div className="pt-2">
                  <span className="text-[#888888] font-bold block mb-0.5">ระบบความเที่ยงตรง (PRECISION):</span>
                  <span>แปลงทศนิยมเป็นหน่วย <code className="text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.5 rounded-none font-bold">Satang Integer</code> หลังบ้านโดยมีเสถียรภาพไร้ความคลาดเคลื่อน</span>
                </div>
              </div>
            </section>

            {/* Section 3: File Utilities */}
            <section className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#cbd5e1] block">
                03. เครื่องมือจัดการเทมเพลต (Tools)
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyHeaders}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-[11px] font-bold transition-colors border-[#3e3e3e] bg-[#121212] text-[#cbd5e1] hover:bg-[#1c1c1c] hover:border-[#da291c]"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  {copied ? 'คัดลอกสำเร็จ' : 'คัดลอกหัวคอลัมน์'}
                </button>
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-[11px] font-bold transition-colors border-[#3e3e3e] bg-[#121212] text-[#cbd5e1] hover:bg-[#1c1c1c] hover:border-[#da291c]"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-400" />
                  โหลดตัวอย่าง CSV
                </button>
              </div>
            </section>

            {/* Document summary detail */}
            <div className="mt-auto p-4 border border-[#3e3e3e] bg-[#121212]/30 rounded-none text-[10px] font-mono space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[#888888] font-bold uppercase">จำนวนคอลัมน์:</span>
                <span className="text-slate-350 font-bold">{selectedFormat === 'long' ? '6 คอลัมน์หลัก' : 'ไม่จำกัด (อิงตามหมวดหมู่)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888] font-bold uppercase">สเปกวิเคราะห์:</span>
                <span className={`font-bold ${selectedFormat === 'long' ? 'text-rose-500' : 'text-[#da291c]'}`}>
                  {selectedFormat === 'long' ? 'LONG_DECODER' : 'WIDE_DECODER'}
                </span>
              </div>
              <div className="h-[1px] bg-[#303030] w-full" />
              <div className="flex justify-between items-center">
                <span className="text-[#888888] font-bold uppercase">การรองรับภาษาไทย:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> UTF-8 BOM
                </span>
              </div>
            </div>

          </div>

          {/* Right Side: Elegant Spreadsheet Preview & Deep Specifications */}
          <div className="flex-grow flex flex-col p-6 bg-[#181818] overflow-hidden">
            
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4 shrink-0 select-none">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                โครงสร้างเทมเพลตและตัวอย่างข้อมูล (Structure Previewer)
              </span>
              <span className={`text-[10px] font-mono border px-2.5 py-0.5 rounded-none font-bold text-[#da291c] bg-[#da291c]/10 border-[#da291c]/30`}>
                ACTIVE: {selectedFormat.toUpperCase()}_TEMPLATE
              </span>
            </div>

            {/* Document Sheet Simulator */}
            <div className="flex-1 rounded-none border border-[#303030] flex flex-col relative overflow-hidden bg-[#121212] mb-6">
              
              {/* Paper Watermark / Header */}
              <div className="px-4 py-2.5 border-b border-[#303030] bg-[#1c1c1c] flex justify-between items-center text-[10px] font-mono text-[#cbd5e1] tracking-widest select-none">
                <span>CASHFLOW SHARK IMPORT PROTOCOL</span>
                <span>COLUMNS: {selectedFormat === 'long' ? longFormatHeaders.length : 'Date, Categories, Notes'} // TYPE: SIMULATION</span>
              </div>

              {/* Simulated Sheet Table */}
              <div className="flex-grow overflow-auto scrollbar-tactical relative">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
                  <thead className="sticky top-0 bg-[#1c1c1c] text-[#cbd5e1] z-10 select-none">
                    <tr className="border-b border-[#303030]">
                      {(selectedFormat === 'long' ? longFormatHeaders : wideFormatHeaders).map((header, idx) => (
                        <th 
                          key={idx} 
                          className={`p-3 font-bold uppercase tracking-wider ${getHeaderColorClass(header, selectedFormat)}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303030]">
                    
                    {/* Render dynamic mockup rows with high colorful accents */}
                    {selectedFormat === 'long' ? (
                      <>
                        {/* Row 1 */}
                        <tr className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3 text-slate-400">01/03/2026</td>
                          <td className="p-3">
                            <span className="text-[10px] text-rose-455 bg-rose-955/20 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
                              วันหยุด
                            </span>
                          </td>
                          <td className="p-3"><span className="text-rose-500 font-bold">รายจ่าย</span></td>
                          <td className="p-3">
                            <span className="text-[10px] text-rose-455 bg-rose-955/20 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
                              อาหารและเครื่องดื่ม
                            </span>
                          </td>
                          <td className="p-3 text-[#cbd5e1]">ข้าวเที่ยง</td>
                          <td className="p-3 text-rose-500 font-bold">65</td>
                        </tr>
                        {/* Row 2 */}
                        <tr className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3 text-slate-400">01/03/2026</td>
                          <td className="p-3">
                            <span className="text-[10px] text-rose-455 bg-rose-955/20 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
                              วันหยุด
                            </span>
                          </td>
                          <td className="p-3"><span className="text-rose-500 font-bold">รายจ่าย</span></td>
                          <td className="p-3">
                            <span className="text-[10px] text-amber-400 bg-amber-955/20 border border-amber-900/30 px-2.5 py-0.5 rounded-full font-bold">
                              ช้อปปิ้งออนไลน์
                            </span>
                          </td>
                          <td className="p-3 text-[#cbd5e1]">Shopee</td>
                          <td className="p-3 text-rose-500 font-bold">299</td>
                        </tr>
                        {/* Row 3 */}
                        <tr className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3 text-slate-400">02/03/2026</td>
                          <td className="p-3">
                            <span className="text-[10px] text-emerald-450 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full font-bold">
                              ทำงาน
                            </span>
                          </td>
                          <td className="p-3"><span className="text-emerald-500 font-bold">รายรับ</span></td>
                          <td className="p-3">
                            <span className="text-[10px] text-emerald-450 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full font-bold">
                              เงินเดือน
                            </span>
                          </td>
                          <td className="p-3 text-[#cbd5e1]">เงินเดือนเดือน ก.พ.</td>
                          <td className="p-3 text-emerald-500 font-bold">25000</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        {/* Row 1 */}
                        <tr className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3 text-slate-400">01/03/2026</td>
                          <td className="p-3 text-right text-rose-500 font-bold">฿ 110.00</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-sky-400 font-bold">฿ 45.00</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-slate-500 font-bold italic">฿ 155.00</td>
                          <td className="p-3 text-neutral-600 italic font-sans">—</td>
                        </tr>
                        {/* Row 2 */}
                        <tr className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3 text-slate-400">02/03/2026</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-amber-500 font-bold">฿ 299.00</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-slate-500 font-bold italic">฿ 299.00</td>
                          <td className="p-3 text-slate-300 font-sans">Shopee</td>
                        </tr>
                        {/* Row 3 */}
                        <tr className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3 text-slate-400">03/03/2026</td>
                          <td className="p-3 text-right text-rose-500 font-bold">฿ 60.00</td>
                          <td className="p-3 text-right text-amber-500 font-bold">฿ 199.00</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-neutral-700 font-mono">—</td>
                          <td className="p-3 text-right text-slate-500 font-bold italic">฿ 259.00</td>
                          <td className="p-3 text-slate-300 font-sans">Lazada</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import rules & Mapping features inspector */}
            <div className="border border-[#303030] p-5 rounded-none space-y-4 shrink-0 bg-[#121212]">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#da291c]" />
                กฎเกณฑ์และพฤติกรรมการถอดรหัสข้อมูล (Mapping & Decoding Specifications)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedFormat === 'long' ? (
                  <>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">ซิงค์ปฏิทินตามชนิดวัน (Calendar Sync)</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          คอลัมน์ <span className="text-[#da291c] font-bold">"ชนิดวัน"</span> (ทำงาน/วันหยุด) จะถูกเชื่อมโยงและบันทึกสถิติประเภทวันลงในหน้าปฏิทินระบบโดยตรงอัตโนมัติ
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">การจัดการประเภทธุรกรรมที่หลากหลาย</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          ระบบถอดรหัสจากคอลัมน์ <span className="text-[#da291c] font-bold">"ประเภท"</span> รองรับ รายรับ รายจ่าย และเงินออม เพื่อประมวลผลกระแสเงินสดหลากรูปแบบในครั้งเดียว
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">สร้างหมวดหมู่อัตโนมัติ (Auto-Provision)</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          หากคอลัมน์ <span className="text-[#da291c] font-bold">"หมวดหมู่"</span> ยังไม่เคยนิยามไว้ เอ็นจิ้นจะทำการสร้างหมวดหมู่ใหม่ขึ้นมาให้อัตโนมัติโดยที่โครงสร้างระบบไม่เสียหาย
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">สเปกจำนวนเงิน Satang-First</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          ตัวเลขในช่อง <span className="text-[#da291c] font-bold">"จำนวนเงิน"</span> จะถูกนำไปคูณ 100 เพื่อแปลงเป็นสตางค์ในการประมวลผลเก็บข้อมูลระบบ (Satang Integer Map) เพื่อความแม่นยำทางบัญชี
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">สแกนหัวตารางจับคู่ค่าใช้จ่ายแนวนอน</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          ระบบจะจับคู่ชื่อคอลัมน์ภาษาไทย เช่น <span className="text-[#da291c] font-bold">"อาหารและเครื่องดื่ม"</span> หรือ <span className="text-[#da291c] font-bold">"การเดินทาง"</span> เข้ากับหมวดหมู่ที่คุณตั้งค่าไว้โดยตรง
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">กรองข้ามคอลัมน์สรุปเพื่อความปลอดภัย</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          คอลัมน์อย่างเช่น <span className="text-[#da291c] font-bold">"รวม (Total)", "Date", "Notes"</span> จะถูกตัดออกและเพิกเฉยอัตโนมัติในการสร้างยอดเงิน เพื่อกันปัญหาตัวเลขเบิ้ลสะสม
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">ถอดคอลัมน์ Notes เป็นคำอธิบาย</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          ข้อความในช่อง <span className="text-[#da291c] font-bold">"Notes"</span> ของวันนั้นๆ จะถูกนำไปใช้เป็นรายละเอียดธุรกรรม (Description) ของรายการในหมวดที่ระบบกรอก
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-200">ระบบทนทานต่อช่องว่าง (Null Tolerance)</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          กรณีมีช่องว่างหรือมีสัญลักษณ์ลบ <span className="text-[#da291c] font-bold">"฿ -"</span> ระบบจะประเมินค่าเป็นศูนย์และข้ามไปอย่างไร้ปัญหา ไม่เกิดการหยุดประมวลผลกระทันหัน
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#303030] bg-[#121212] flex justify-between items-center shrink-0 select-none">
          <div className="flex gap-6 text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-[#888888] font-bold uppercase block text-[9px]">รูปแบบเทมเพลตที่ตรวจจับ</span>
              <span className={`mt-0.5 font-bold ${selectedFormat === 'long' ? 'text-rose-500' : 'text-[#da291c]'}`}>
                {selectedFormat === 'long' ? 'Long Format (แยกบรรทัดรายการเดี่ยว)' : 'Wide Format (ตารางแยกคอลัมน์รายวัน)'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#888888] font-bold uppercase block text-[9px]">การรองรับไฟล์สำรอง</span>
              <span className="text-slate-400 mt-0.5">
                {selectedFormat === 'long' ? 'ระบบจัดเก็บแบบ Satang Integer เต็มรูปแบบ' : 'จับคู่และจัดหมวดหมู่ระบบปัญญาประดิษฐ์อัตโนมัติ'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-none font-bold text-xs uppercase transition-colors bg-[#da291c] hover:bg-[#b01e0a] text-white"
          >
            เข้าใจแล้ว & ปิดคู่มือ
          </button>
        </div>
      </motion.div>
    </div>
  );
}