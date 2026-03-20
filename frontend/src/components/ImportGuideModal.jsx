// src/components/ImportGuideModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function ImportGuideModal({ isOpen, onClose, isDarkMode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div>
            <h3 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              📖 คู่มือการ Import CSV
            </h3>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รองรับ 2 รูปแบบ — ระบบจะตรวจจับอัตโนมัติ</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">

          {/* Format 1 */}
          <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 flex items-center gap-2 ${isDarkMode ? 'bg-emerald-900/20 border-b border-emerald-900/40' : 'bg-emerald-50 border-b border-emerald-200'}`}>
              <span className="text-base">📊</span>
              <div>
                <p className={`font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Format 1 — Excel Wide Format (ตารางรายวัน)</p>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>สำหรับคนที่บันทึกค่าใช้จ่ายใน Excel แบบแยกคอลัมน์</p>
              </div>
            </div>
            <div className={`p-4 space-y-3 ${isDarkMode ? 'bg-slate-800/30' : 'bg-white'}`}>
              <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้างไฟล์:</div>
              <div className="overflow-x-auto">
                <table className={`text-xs w-full border-collapse rounded-lg overflow-hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead>
                    <tr className={isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}>
                      {['วันที่','ข้าวเที่ยง','ข้าวเย็น','ของใช้','ซื้อของออนไลน์','อื่นๆ','รวม','Notes'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-bold border-b border-r last:border-r-0" style={{borderColor: isDarkMode ? '#334155' : '#e2e8f0'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['01/02/2026','฿25','฿40','฿0','฿0','฿0','฿65',''],
                      ['02/02/2026','฿23','฿0','฿150','฿299','฿750','฿1,222','Shopee + Gemini'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? (isDarkMode ? 'bg-slate-800/60' : 'bg-white') : (isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50')}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1.5 border-b border-r last:border-r-0 font-mono" style={{borderColor: isDarkMode ? '#1e293b' : '#f1f5f9'}}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`space-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <p>✅ ระบบจะ <strong>auto-map ชื่อคอลัมน์ → หมวดหมู่</strong> อัตโนมัติ เช่น "ข้าวเที่ยง" → อาหารและเครื่องดื่ม</p>
                <p>✅ คอลัมน์ <strong>รวม, Notes, วันที่</strong> จะถูกข้ามอัตโนมัติ</p>
                <p>✅ Notes จะเป็น description เฉพาะหมวด <strong>ช้อปปิ้งออนไลน์</strong> และ <strong>อื่นๆ</strong></p>
                <p>✅ รองรับทั้ง <strong>.csv ที่ export จาก Excel</strong> โดยตรง</p>
              </div>
            </div>
          </div>

          {/* Format 2 */}
          <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 flex items-center gap-2 ${isDarkMode ? 'bg-blue-900/20 border-b border-blue-900/40' : 'bg-blue-50 border-b border-blue-200'}`}>
              <span className="text-base">🗂️</span>
              <div>
                <p className={`font-black text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>Format 2 — System Export (Long Format)</p>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>สำหรับไฟล์ที่ Export จากระบบนี้ หรือสร้างเอง</p>
              </div>
            </div>
            <div className={`p-4 space-y-3 ${isDarkMode ? 'bg-slate-800/30' : 'bg-white'}`}>
              <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้างไฟล์:</div>
              <div className="overflow-x-auto">
                <table className={`text-xs w-full border-collapse rounded-lg overflow-hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead>
                    <tr className={isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}>
                      {['วันที่','ชนิดวัน','ประเภท','หมวดหมู่','รายละเอียด','จำนวนเงิน'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-bold border-b border-r last:border-r-0" style={{borderColor: isDarkMode ? '#334155' : '#e2e8f0'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['01/02/2026','วันหยุด','รายจ่าย','อาหารและเครื่องดื่ม','ข้าวเที่ยง','25'],
                      ['01/02/2026','วันหยุด','รายจ่าย','ช้อปปิ้งออนไลน์','Shopee','299'],
                      ['02/02/2026','ทำงาน','รายรับ','เงินเดือน','เงินเดือนเดือน ก.พ.','25000'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? (isDarkMode ? 'bg-slate-800/60' : 'bg-white') : (isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50')}>
                        {row.map((cell, j) => (
                          <td key={j} className={`px-2 py-1.5 border-b border-r last:border-r-0 font-mono`} style={{borderColor: isDarkMode ? '#1e293b' : '#f1f5f9'}}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`space-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <p>✅ <strong>หมวดหมู่ตรงกับระบบ</strong> → import ตรงๆ ไม่ต้อง auto-map</p>
                <p>✅ ถ้าหมวดหมู่ไม่มีในระบบ → <strong>สร้างให้อัตโนมัติ</strong></p>
                <p>✅ ชนิดวัน (ทำงาน/วันหยุด) จะ<strong>ซิงค์กับปฏิทิน</strong>ด้วย</p>
                <p>✅ รองรับทั้ง <strong>รายรับ และ รายจ่าย</strong> ในไฟล์เดียวกัน</p>
              </div>
            </div>
          </div>

        </div>

        <div className={`px-6 py-4 border-t shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <button
              onClick={() => {
                const sample = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n" +
                  "01/03/2026,ทำงาน,รายรับ,เงินเดือน,เงินเดือนประจำเดือนมีนาคม,25000\n" +
                  "01/03/2026,ทำงาน,รายจ่าย,อาหารและเครื่องดื่ม,ข้าวเที่ยง,65\n" +
                  "01/03/2026,ทำงาน,รายจ่าย,การเดินทาง,,89\n" +
                  "02/03/2026,วันหยุด,รายจ่าย,อาหารและเครื่องดื่ม,\"ข้าว, น้ำ, ขนม\",150\n" +
                  "03/03/2026,ทำงาน,รายรับ,รายรับพิเศษ/โบนัส,โบนัสพิเศษ,5000\n";
                const blob = new Blob(["\ufeff" + sample], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = 'sample_long_format.csv';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              }}
              className={`py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-700' : 'bg-blue-50 hover:bg-blue-100 text-[#00509E] border border-blue-200'}`}
            >
              📋 ตัวอย่าง Long
            </button>
            <button
              onClick={() => {
                const sample = '"Date","อาหารและเครื่องดื่ม","ช้อปปิ้งออนไลน์","การเดินทาง","ที่อยู่อาศัยและของใช้","อื่นๆ","รวม (Total)","Notes"\n' +
                  '"01/03/2026","฿ 110.00","฿ -","฿ 89.00","฿ -","฿ -","฿ 199.00",""\n' +
                  '"02/03/2026","฿ 120.00","฿ 350.00","฿ -","฿ -","฿ -","฿ 470.00","Shopee ลดราคา, จ่ายค่าส่งด้วย"\n' +
                  '"03/03/2026","฿ -","฿ -","฿ -","฿ -","฿ -","฿ -",""\n' +
                  '"04/03/2026","฿ 235.00","฿ -","฿ -","฿ -","฿ -","฿ 235.00","ข้าวเช้า+เที่ยง+เย็น"\n';
                const blob = new Blob(["\ufeff" + sample], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = 'sample_wide_format.csv';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              }}
              className={`py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
            >
              📊 ตัวอย่าง Wide
            </button>
          </div>
          <button onClick={onClose} className={`w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}