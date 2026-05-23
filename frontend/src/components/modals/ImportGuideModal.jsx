// src/components/ImportGuideModal.jsx
import React, { useEffect, useState } from 'react';
import { X, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

const GuideSection = ({ dm, icon, title, subtitle, headers, rows, features, copyText, headerColorCls }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const th = `sticky top-0 px-3 py-2 text-left font-bold border-b border-r last:border-r-0 z-10 shadow-sm ${'border-slate-700 bg-slate-700 text-slate-300'}`;
  const td = `px-3 py-1.5 border-b border-r last:border-r-0 font-mono text-[11px] ${'border-slate-800'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    showToast('คัดลอกโครงสร้างตารางเรียบร้อยแล้ว', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-sm border overflow-hidden flex flex-col ${'border-slate-700'}`}>
      <div className={`px-4 py-2.5 flex items-center justify-between border-b shrink-0 ${headerColorCls}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <div>
            <p className={`font-black text-xs ${'text-slate-200'}`}>{title}</p>
            <p className={`text-[10px] mt-0.5 opacity-80`}>{subtitle}</p>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-bold transition-all active:scale-95 border ${copied ? ('bg-emerald-900/50 text-emerald-400 border-emerald-700') : ('bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600')}`}
        >
          {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกหัวตาราง'}
        </button>
      </div>
      <div className={`p-4 space-y-3 flex-1 overflow-hidden flex flex-col ${'bg-slate-800/30'}`}>
        <p className={`text-[10px] font-bold ${'text-slate-400'}`}>โครงสร้างไฟล์:</p>
        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-sm" style={{ scrollbarWidth: 'thin', maxHeight: '180px' }}>
          <table className={`text-[11px] w-full border-collapse whitespace-nowrap ${'text-slate-300'}`}>
            <thead><tr>{headers.map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? ('bg-slate-800/60') : ('bg-slate-800/30')}>
                  {row.map((cell, j) => <td key={j} className={td}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`space-y-1 text-[11px] mt-2 shrink-0 ${'text-slate-400'}`}>
          {features.map((f, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: `✅ ${f}` }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function ImportGuideModal({ isOpen, onClose }) {
  const dm = true;
  
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tokens = {
    surface: 'bg-slate-900 border-slate-700',
    headerFooter: 'bg-slate-800 border-slate-700',
  };

  const wideFormatHeaders = ['Date','อาหารและเครื่องดื่ม','ช้อปปิ้งออนไลน์','การเดินทาง','ซักผ้า','รวม (Total)','Notes'];
  const wideCopyText = wideFormatHeaders.map(h => `"${h}"`).join(',');

  const longFormatHeaders = ['วันที่','ชนิดวัน','ประเภท','หมวดหมู่','รายละเอียด','จำนวนเงิน'];
  const longCopyText = longFormatHeaders.join(',');

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
          <div>
            <h3 className={`text-base font-black flex items-center gap-2 ${'text-slate-100'}`}>
              📖 คู่มือการ Import CSV
            </h3>
            <p className={`text-xs mt-0.5 ${'text-slate-400'}`}>รองรับ 2 รูปแบบ — ระบบจะตรวจจับอัตโนมัติ</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-sm transition-colors ${'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>
          
          <GuideSection 
            dm={dm}
            icon="📊"
            title="Format 1 — Excel Wide Format (ตารางรายวัน)"
            subtitle="สำหรับคนที่บันทึกค่าใช้จ่ายใน Excel แบบแยกคอลัมน์"
            headerColorCls={'bg-emerald-900/20 border-emerald-900/40 text-emerald-400'}
            headers={wideFormatHeaders}
            copyText={wideCopyText}
            rows={[
              ['01/03/2026','฿ 110.00','฿ -','฿ 45.00','฿ -','฿ 155.00',''],
              ['02/03/2026','฿ -','฿ 299.00','฿ -','฿ -','฿ 299.00','Shopee'],
              ['03/03/2026','฿ 60.00','฿ 199.00','฿ -','฿ -','฿ 259.00','Lazada']
            ]}
            features={[
              "ระบบจะ <strong>auto-map ชื่อคอลัมน์ → หมวดหมู่</strong> อัตโนมัติ",
              "คอลัมน์ <strong>รวม, Notes, วันที่, Date, Total</strong> จะถูกข้ามอัตโนมัติ",
              "Notes จะเป็น description เฉพาะหมวด <strong>ช้อปปิ้งออนไลน์</strong> และ <strong>อื่นๆ</strong>"
            ]}
          />

          <GuideSection 
            dm={dm}
            icon="🗂️"
            title="Format 2 — System Export (Long Format)"
            subtitle="สำหรับไฟล์ที่ Export จากระบบนี้ หรือสร้างเองแบบเป็นบรรทัด"
            headerColorCls={'bg-blue-900/20 border-blue-900/40 text-blue-400'}
            headers={longFormatHeaders}
            copyText={longCopyText}
            rows={[
              ['01/03/2026','วันหยุด','รายจ่าย','อาหารและเครื่องดื่ม','ข้าวเที่ยง','25'],
              ['01/03/2026','วันหยุด','รายจ่าย','ช้อปปิ้งออนไลน์','Shopee','299'],
              ['02/03/2026','ทำงาน','รายรับ','เงินเดือน','เงินเดือนเดือน ก.พ.','25000'],
            ]}
            features={[
              "<strong>หมวดหมู่ตรงกับระบบ</strong> → import ตรงๆ ไม่ต้อง auto-map",
              "ถ้าหมวดหมู่ไม่มีในระบบ → <strong>สร้างให้อัตโนมัติ</strong>",
              "ชนิดวัน (ทำงาน/วันหยุด) จะ<strong>ซิงค์กับปฏิทิน</strong>ด้วย",
              "รองรับทั้ง <strong>รายรับ และ รายจ่าย</strong> ในไฟล์เดียวกัน"
            ]}
          />

        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 ${tokens.headerFooter}`}>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => {
              const s = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n01/03/2026,ทำงาน,รายรับ,เงินเดือน,เงินเดือนประจำเดือนมีนาคม,25000\n01/03/2026,ทำงาน,รายจ่าย,อาหารและเครื่องดื่ม,ข้าวเที่ยง,65\n";
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + s], { type: 'text/csv;charset=utf-8;' })); a.download = 'sample_long_format.csv';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }} className={`flex-1 md:flex-none px-4 py-2 rounded-sm font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border ${'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-700'}`}>
              📋 โหลดตัวอย่าง Long
            </button>
            <button onClick={() => {
              const s = '"Date","อาหารและเครื่องดื่ม","ช้อปปิ้งออนไลน์","การเดินทาง","ซักผ้า","รวม (Total)","Notes"\n"01/03/2026","฿ 110.00","฿ -","฿ 45.00","฿ -","฿ 155.00",""\n"02/03/2026","฿ -","฿ 299.00","฿ -","฿ -","฿ 299.00","Shopee"\n';
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + s], { type: 'text/csv;charset=utf-8;' })); a.download = 'sample_wide_format.csv';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }} className={`flex-1 md:flex-none px-4 py-2 rounded-sm font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border ${'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border-emerald-700'}`}>
              📊 โหลดตัวอย่าง Wide
            </button>
          </div>
          <button onClick={onClose} className={`w-full md:w-auto px-8 py-2 rounded-sm font-bold text-xs transition-all active:scale-95 border ${'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'}`}>
            ปิด
          </button>
        </div>
      </motion.div>
    </div>
  );
}