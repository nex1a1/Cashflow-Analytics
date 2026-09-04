import React, { useState, useEffect } from 'react';
import { 
  X, ClipboardList, FileSpreadsheet, ShieldCheck, 
  FileText, CheckCircle, FileDown, Layers, Copy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

const LONG_HEADER_COLORS = {
  'วันที่': 'text-[#888888]',
  'ชนิดวัน': 'text-indigo-400',
  'ประเภท': 'text-rose-400',
  'หมวดหมู่': 'text-emerald-400',
  'รายละเอียด': 'text-[#cbd5e1]',
  'จำนวนเงิน': 'text-cyan-400',
};

const WIDE_HEADER_COLORS = {
  'Date': 'text-[#888888]',
  'อาหารและเครื่องดื่ม': 'text-rose-400 text-right',
  'ช้อปปิ้งออนไลน์': 'text-amber-400 text-right',
  'การเดินทาง': 'text-sky-400 text-right',
  'ซักผ้า': 'text-purple-400 text-right',
  'รวม (Total)': 'text-[#555555] font-normal italic text-right',
  'Notes': 'text-[#888888]',
};

const LONG_FORMAT_HEADERS = ['วันที่', 'ชนิดวัน', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'];
const WIDE_FORMAT_HEADERS = ['Date', 'อาหารและเครื่องดื่ม', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซักผ้า', 'รวม (Total)', 'Notes'];

const LONG_SAMPLE_CONTENT = "วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n01/03/2026,ทำงาน,รายรับ,เงินเดือน,เงินเดือนประจำเดือนมีนาคม,25000\n01/03/2026,ทำงาน,รายจ่าย,อาหารและเครื่องดื่ม,ข้าวเที่ยง,65\n";
const WIDE_SAMPLE_CONTENT = '"Date","อาหารและเครื่องดื่ม","ช้อปปิ้งออนไลน์","การเดินทาง","ซักผ้า","รวม (Total)","Notes"\n"01/03/2026","฿ 110.00","฿ -","฿ 45.00","฿ -","฿ 155.00",""\n"02/03/2026","฿ -","฿ 299.00","฿ -","฿ -","฿ 299.00","Shopee"\n';

function getHeaderColorClass(header, format) {
  if (format === 'long') return LONG_HEADER_COLORS[header] || 'text-[#888888]';
  return WIDE_HEADER_COLORS[header] || 'text-[#888888]';
}

function downloadSampleFile(filename, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function LongTablePreview() {
  return (
    <>
      <tr className="hover:bg-[#1c1c1c] transition-colors">
        <td className="p-3 text-slate-400">01/03/2026</td>
        <td className="p-3">
          <span className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
            วันหยุด
          </span>
        </td>
        <td className="p-3"><span className="text-rose-500 font-bold">รายจ่าย</span></td>
        <td className="p-3">
          <span className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
            อาหารและเครื่องดื่ม
          </span>
        </td>
        <td className="p-3 text-[#cbd5e1]">ข้าวเที่ยง</td>
        <td className="p-3 text-rose-500 font-bold">65</td>
      </tr>
      <tr className="hover:bg-[#1c1c1c] transition-colors">
        <td className="p-3 text-slate-400">01/03/2026</td>
        <td className="p-3">
          <span className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
            วันหยุด
          </span>
        </td>
        <td className="p-3"><span className="text-rose-500 font-bold">รายจ่าย</span></td>
        <td className="p-3">
          <span className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2.5 py-0.5 rounded-full font-bold">
            ช้อปปิ้งออนไลน์
          </span>
        </td>
        <td className="p-3 text-[#cbd5e1]">Shopee</td>
        <td className="p-3 text-rose-500 font-bold">299</td>
      </tr>
      <tr className="hover:bg-[#1c1c1c] transition-colors">
        <td className="p-3 text-slate-400">02/03/2026</td>
        <td className="p-3">
          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full font-bold">
            ทำงาน
          </span>
        </td>
        <td className="p-3"><span className="text-emerald-500 font-bold">รายรับ</span></td>
        <td className="p-3">
          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full font-bold">
            เงินเดือน
          </span>
        </td>
        <td className="p-3 text-[#cbd5e1]">เงินเดือนเดือน ก.พ.</td>
        <td className="p-3 text-emerald-500 font-bold">25000</td>
      </tr>
    </>
  );
}

function WideTablePreview() {
  return (
    <>
      <tr className="hover:bg-[#1c1c1c] transition-colors">
        <td className="p-3 text-slate-400">01/03/2026</td>
        <td className="p-3 text-right text-rose-500 font-bold">฿ 110.00</td>
        <td className="p-3 text-right text-neutral-700 font-mono">—</td>
        <td className="p-3 text-right text-sky-400 font-bold">฿ 45.00</td>
        <td className="p-3 text-right text-neutral-700 font-mono">—</td>
        <td className="p-3 text-right text-slate-500 font-bold italic">฿ 155.00</td>
        <td className="p-3 text-neutral-600 italic font-sans">—</td>
      </tr>
      <tr className="hover:bg-[#1c1c1c] transition-colors">
        <td className="p-3 text-slate-400">02/03/2026</td>
        <td className="p-3 text-right text-neutral-700 font-mono">—</td>
        <td className="p-3 text-right text-amber-500 font-bold">฿ 299.00</td>
        <td className="p-3 text-right text-neutral-700 font-mono">—</td>
        <td className="p-3 text-right text-neutral-700 font-mono">—</td>
        <td className="p-3 text-right text-slate-500 font-bold italic">฿ 299.00</td>
        <td className="p-3 text-slate-300 font-sans">Shopee</td>
      </tr>
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
  );
}

function GuideSpecsPanel({ selectedFormat }) {
  const isLong = selectedFormat === 'long';

  const longSpecs = [
    {
      title: 'ซิงค์ปฏิทินตามชนิดวัน (Calendar Sync)',
      desc: (
        <>
          คอลัมน์ <span className="text-[#da291c] font-bold">"ชนิดวัน"</span> (ทำงาน/วันหยุด) จะถูกเชื่อมโยงและบันทึกสถิติประเภทวันลงในหน้าปฏิทินระบบโดยตรงอัตโนมัติ
        </>
      ),
    },
    {
      title: 'การจัดการประเภทธุรกรรมที่หลากหลาย',
      desc: (
        <>
          ระบบถอดรหัสจากคอลัมน์ <span className="text-[#da291c] font-bold">"ประเภท"</span> รองรับ รายรับ รายจ่าย และเงินออม เพื่อประมวลผลกระแสเงินสดหลากรูปแบบในครั้งเดียว
        </>
      ),
    },
    {
      title: 'สร้างหมวดหมู่อัตโนมัติ (Auto-Provision)',
      desc: (
        <>
          หากคอลัมน์ <span className="text-[#da291c] font-bold">"หมวดหมู่"</span> ยังไม่เคยนิยามไว้ เอ็นจิ้นจะทำการสร้างหมวดหมู่ใหม่ขึ้นมาให้อัตโนมัติโดยที่โครงสร้างระบบไม่เสียหาย
        </>
      ),
    },
    {
      title: 'สเปกจำนวนเงิน Satang-First',
      desc: (
        <>
          ตัวเลขในช่อง <span className="text-[#da291c] font-bold">"จำนวนเงิน"</span> จะถูกนำไปคูณ 100 เพื่อแปลงเป็นสตางค์ในการประมวลผลเก็บข้อมูลระบบ (Satang Integer Map) เพื่อความแม่นยำทางบัญชี
        </>
      ),
    },
  ];

  const wideSpecs = [
    {
      title: 'สแกนหัวตารางจับคู่ค่าใช้จ่ายแนวนอน',
      desc: (
        <>
          ระบบจะจับคู่ชื่อคอลัมน์ภาษาไทย เช่น <span className="text-[#da291c] font-bold">"อาหารและเครื่องดื่ม"</span> หรือ <span className="text-[#da291c] font-bold">"การเดินทาง"</span> เข้ากับหมวดหมู่ที่คุณตั้งค่าไว้โดยตรง
        </>
      ),
    },
    {
      title: 'กรองข้ามคอลัมน์สรุปเพื่อความปลอดภัย',
      desc: (
        <>
          คอลัมน์อย่างเช่น <span className="text-[#da291c] font-bold">"รวม (Total)", "Date", "Notes"</span> จะถูกตัดออกและเพิกเฉยอัตโนมัติในการสร้างยอดเงิน เพื่อกันปัญหาตัวเลขเบิ้ลสะสม
        </>
      ),
    },
    {
      title: 'ถอดคอลัมน์ Notes เป็นคำอธิบาย',
      desc: (
        <>
          ข้อความในช่อง <span className="text-[#da291c] font-bold">"Notes"</span> ของวันนั้นๆ จะถูกนำไปใช้เป็นรายละเอียดธุรกรรม (Description) ของรายการในหมวดที่ระบบกรอก
        </>
      ),
    },
    {
      title: 'ระบบทนทานต่อช่องว่าง (Null Tolerance)',
      desc: (
        <>
          กรณีมีช่องว่างหรือมีสัญลักษณ์ลบ <span className="text-[#da291c] font-bold">"฿ -"</span> ระบบจะประเมินค่าเป็นศูนย์และข้ามไปอย่างไร้ปัญหา ไม่เกิดการหยุดประมวลผลกระทันหัน
        </>
      ),
    },
  ];

  const specs = isLong ? longSpecs : wideSpecs;

  return (
    <div className="border border-[#303030] p-5 rounded-none space-y-4 shrink-0 bg-[#121212]">
      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Layers className="w-4 h-4 text-[#da291c]" />
        กฎเกณฑ์และพฤติกรรมการถอดรหัสข้อมูล (Mapping & Decoding Specifications)
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specs.map((item, index) => (
          <div key={index} className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-200">{item.title}</span>
              <p className="text-[10px] text-slate-500 leading-normal">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideHeader({ onClose }) {
  return (
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
  );
}

function GuideFormatChooser({ selectedFormat, onSelectFormat }) {
  const isLong = selectedFormat === 'long';
  const isWide = selectedFormat === 'wide';

  const longBtnClass = isLong
    ? 'border-[#da291c] bg-[#da291c]/10 text-white'
    : 'border-[#303030] bg-[#121212] hover:border-[#da291c]/50 text-[#888888] hover:text-[#cbd5e1]';

  const wideBtnClass = isWide
    ? 'border-[#da291c] bg-[#da291c]/10 text-white'
    : 'border-[#303030] bg-[#121212] hover:border-[#da291c]/50 text-[#888888] hover:text-[#cbd5e1]';

  return (
    <section className="space-y-2.5">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#cbd5e1] block">
        01. เลือกรูปแบบโครงสร้างไฟล์ (Format Type)
      </h4>
      
      <div className="space-y-2.5">
        <button
          onClick={() => onSelectFormat('long')}
          className={`w-full flex items-center gap-3.5 p-3.5 rounded-none border transition-colors text-left ${longBtnClass}`}
        >
          <ClipboardList className={`w-4.5 h-4.5 shrink-0 ${isLong ? 'text-white' : 'text-[#555555]'}`} />
          <div className="flex-1">
            <h5 className={`text-xs font-bold uppercase tracking-wide ${isLong ? 'text-white' : 'text-slate-200'}`}>
              รายงานแยกตามรายการ (Long)
            </h5>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight font-mono">
              แถวรายการเรียงตามลำดับวันที่ รองรับประเภทวัน รายรับ รายจ่าย คละในตารางเดียว
            </p>
          </div>
          {isLong && <div className="w-1.5 h-1.5 rounded-none bg-[#da291c] shrink-0" />}
        </button>

        <button
          onClick={() => onSelectFormat('wide')}
          className={`w-full flex items-center gap-3.5 p-3.5 rounded-none border transition-colors text-left ${wideBtnClass}`}
        >
          <FileSpreadsheet className={`w-4.5 h-4.5 shrink-0 ${isWide ? 'text-white' : 'text-[#555555]'}`} />
          <div className="flex-1">
            <h5 className={`text-xs font-bold uppercase tracking-wide ${isWide ? 'text-white' : 'text-slate-200'}`}>
              ตารางเปรียบเทียบรายวัน (Wide)
            </h5>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight font-mono">
              คอลัมน์แนวนอนแยกตามหมวดหมู่ค่าใช้จ่าย เหมาะสำหรับย้ายข้อมูลตรงจาก Excel ประจำวัน
            </p>
          </div>
          {isWide && <div className="w-1.5 h-1.5 rounded-none bg-[#da291c] shrink-0" />}
        </button>
      </div>
    </section>
  );
}

function GuideTechSpecs() {
  return (
    <section className="space-y-3.5 bg-[#121212] p-4 rounded-none border border-[#303030]">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#cbd5e1] block">
        02. ข้อกำหนดทางโครงสร้างระบบ
      </h4>

      <div className="space-y-3 text-[10px] font-mono leading-normal text-slate-400 divide-y divide-[#303030]">
        <div className="pt-2 first:pt-0">
          <span className="text-[#888888] font-bold block mb-0.5">เครื่องหมายคั่นไฟล์ (DELIMITER):</span>
          <span>ตรวจจับและแยกด้วยเครื่องหมายคั่น <code className="text-[#da291c] bg-[#da291c]/10 border border-[#da291c]/30 px-1.5 py-0.5 rounded-none font-bold">จุลภาค ( , )</code> หรือ <code className="text-[#da291c] bg-[#da291c]/10 border border-[#da291c]/30 px-1.5 py-0.5 rounded-none font-bold">อัฒภาค ( ; )</code> อัตโนมัติ</span>
        </div>

        <div className="pt-2">
          <span className="text-[#888888] font-bold block mb-0.5">รูปแบบฟอร์แมตวันที่ (DATE SYNTAX):</span>
          <span>รองรับคีย์วันที่แบบสากลคลาสสิก <code className="text-cyan-455 bg-cyan-950/20 border border-cyan-900/30 px-1.5 py-0.5 rounded-none font-bold">YYYY-MM-DD</code> หรือสไตล์ตารางไทย <code className="text-cyan-455 bg-cyan-950/20 border border-cyan-900/30 px-1.5 py-0.5 rounded-none font-bold">DD/MM/YYYY</code></span>
        </div>

        <div className="pt-2">
          <span className="text-[#888888] font-bold block mb-0.5">ระบบความเที่ยงตรง (PRECISION):</span>
          <span>แปลงทศนิยมเป็นหน่วย <code className="text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.5 rounded-none font-bold">Satang Integer</code> หลังบ้านโดยมีเสถียรภาพไร้ความคลาดเคลื่อน</span>
        </div>
      </div>
    </section>
  );
}

function GuideTemplateTools({ copied, onCopy, onDownload }) {
  return (
    <section className="space-y-2.5">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#cbd5e1] block">
        03. เครื่องมือจัดการเทมเพลต (Tools)
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCopy}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-[11px] font-bold transition-colors border-[#3e3e3e] bg-[#121212] text-[#cbd5e1] hover:bg-[#1c1c1c] hover:border-[#da291c]"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          {copied ? 'คัดลอกสำเร็จ' : 'คัดลอกหัวคอลัมน์'}
        </button>
        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-[11px] font-bold transition-colors border-[#3e3e3e] bg-[#121212] text-[#cbd5e1] hover:bg-[#1c1c1c] hover:border-[#da291c]"
        >
          <FileDown className="w-3.5 h-3.5 text-slate-400" />
          โหลดตัวอย่าง CSV
        </button>
      </div>
    </section>
  );
}

function GuideFormatSummary({ selectedFormat }) {
  const isLong = selectedFormat === 'long';
  return (
    <div className="mt-auto p-4 border border-[#3e3e3e] bg-[#121212]/30 rounded-none text-[10px] font-mono space-y-2.5">
      <div className="flex justify-between items-center">
        <span className="text-[#888888] font-bold uppercase">จำนวนคอลัมน์:</span>
        <span className="text-slate-300 font-bold">{isLong ? '6 คอลัมน์หลัก' : 'ไม่จำกัด (อิงตามหมวดหมู่)'}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[#888888] font-bold uppercase">สเปกวิเคราะห์:</span>
        <span className={`font-bold ${isLong ? 'text-rose-500' : 'text-[#da291c]'}`}>
          {isLong ? 'LONG_DECODER' : 'WIDE_DECODER'}
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
  );
}

function GuidePreviewSheet({ selectedFormat }) {
  const isLong = selectedFormat === 'long';
  const headers = isLong ? LONG_FORMAT_HEADERS : WIDE_FORMAT_HEADERS;
  const colCountText = isLong ? `${headers.length}` : 'Date, Categories, Notes';

  return (
    <>
      <div className="flex justify-between items-center mb-4 shrink-0 select-none">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          โครงสร้างเทมเพลตและตัวอย่างข้อมูล (Structure Previewer)
        </span>
        <span className="text-[10px] font-mono border px-2.5 py-0.5 rounded-none font-bold text-[#da291c] bg-[#da291c]/10 border-[#da291c]/30">
          ACTIVE: {selectedFormat.toUpperCase()}_TEMPLATE
        </span>
      </div>

      <div className="flex-1 rounded-none border border-[#303030] flex flex-col relative overflow-hidden bg-[#121212] mb-6">
        <div className="px-4 py-2.5 border-b border-[#303030] bg-[#1c1c1c] flex justify-between items-center text-[10px] font-mono text-[#cbd5e1] tracking-widest select-none">
          <span>CASHFLOW SHARK IMPORT PROTOCOL</span>
          <span>COLUMNS: {colCountText} {'//'} TYPE: SIMULATION</span>
        </div>

        <div className="flex-grow overflow-auto scrollbar-tactical relative">
          <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
            <thead className="sticky top-0 bg-[#1c1c1c] text-[#cbd5e1] z-10 select-none">
              <tr className="border-b border-[#303030]">
                {headers.map((header, idx) => (
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
              {isLong ? <LongTablePreview /> : <WideTablePreview />}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function GuideFooter({ selectedFormat, onClose }) {
  const isLong = selectedFormat === 'long';

  return (
    <div className="px-6 py-4 border-t border-[#303030] bg-[#121212] flex justify-between items-center shrink-0 select-none">
      <div className="flex gap-6 text-xs font-mono">
        <div className="flex flex-col">
          <span className="text-[#888888] font-bold block text-[9px] uppercase">รูปแบบเทมเพลตที่ตรวจจับ</span>
          <span className={`mt-0.5 font-bold ${isLong ? 'text-rose-500' : 'text-[#da291c]'}`}>
            {isLong ? 'Long Format (แยกบรรทัดรายการเดี่ยว)' : 'Wide Format (ตารางแยกคอลัมน์รายวัน)'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#888888] font-bold block text-[9px] uppercase">การรองรับไฟล์สำรอง</span>
          <span className="text-slate-400 mt-0.5">
            {isLong ? 'ระบบจัดเก็บแบบ Satang Integer เต็มรูปแบบ' : 'จับคู่และจัดหมวดหมู่ระบบปัญญาประดิษฐ์อัตโนมัติ'}
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
  );
}

export default function ImportGuideModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState('long'); // 'long' | 'wide'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape' && isOpen) onClose(); 
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyHeaders = () => {
    const text = selectedFormat === 'long' 
      ? LONG_FORMAT_HEADERS.join(',') 
      : WIDE_FORMAT_HEADERS.map(h => `"${h}"`).join(',');
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('คัดลอกรายชื่อหัวตารางลงคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSample = () => {
    if (selectedFormat === 'long') {
      downloadSampleFile('sample_long_format.csv', LONG_SAMPLE_CONTENT);
      showToast('ดาวน์โหลดไฟล์ตัวอย่าง Long Format สำเร็จ', 'success');
      return;
    }
    downloadSampleFile('sample_wide_format.csv', WIDE_SAMPLE_CONTENT);
    showToast('ดาวน์โหลดไฟล์ตัวอย่าง Wide Format สำเร็จ', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative rounded-none shadow-xl flex flex-col w-full max-w-[1240px] h-[85vh] border border-[#3e3e3e] bg-[#181818] overflow-hidden"
      >
        <GuideHeader onClose={onClose} />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[340px] shrink-0 border-r border-[#303030] flex flex-col bg-[#1c1c1c] p-6 overflow-y-auto scrollbar-tactical space-y-6 rounded-none">
            <GuideFormatChooser selectedFormat={selectedFormat} onSelectFormat={setSelectedFormat} />
            <GuideTechSpecs />
            <GuideTemplateTools copied={copied} onCopy={handleCopyHeaders} onDownload={handleDownloadSample} />
            <GuideFormatSummary selectedFormat={selectedFormat} />
          </div>
          <div className="flex-grow flex flex-col p-6 bg-[#181818] overflow-hidden">
            <GuidePreviewSheet selectedFormat={selectedFormat} />
            <GuideSpecsPanel selectedFormat={selectedFormat} />
          </div>
        </div>
        <GuideFooter selectedFormat={selectedFormat} onClose={onClose} />
      </motion.div>
    </div>
  );
}