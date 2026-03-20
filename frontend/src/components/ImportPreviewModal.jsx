// src/components/ImportPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight, CheckCircle, Zap } from 'lucide-react';

export default function ImportPreviewModal({
  importPreview,
  setImportPreview,
  confirmImport,
  isProcessing,
  isDarkMode,
  categories // เอาไว้เป็น fallback เผื่อไม่มี updatedCategories
}) {
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PER_PAGE = 30;

  // รีเซ็ตกลับไปหน้า 1 เสมอเมื่อเปิดไฟล์ใหม่
  useEffect(() => {
    if (importPreview) {
      setPreviewPage(1);
    }
  }, [importPreview]);

  if (!importPreview) return null;

  // ─── LOGIC FUNCTIONS ────────────────────────────────────────────────────────
  const updatePreviewItem = (id, field, value) => {
    setImportPreview(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const deletePreviewItem = (id) => {
    setImportPreview(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  // ─── PAGINATION LOGIC ───────────────────────────────────────────────────────
  const allItems = importPreview.items;
  const dateGroups = [];
  
  allItems.forEach(item => {
    const last = dateGroups[dateGroups.length - 1];
    if (!last || last[0].date !== item.date) dateGroups.push([item]);
    else last.push(item);
  });
  
  const pages = [[]];
  dateGroups.forEach(group => {
    const cur = pages[pages.length - 1];
    const curCount = cur.reduce((s, g) => s + g.length, 0);
    if (curCount > 0 && curCount + group.length > PREVIEW_PER_PAGE) pages.push([group]);
    else cur.push(group);
  });
  
  const totalPages = pages.length || 1;
  const pageGroups = pages[previewPage - 1] || [];
  const pageItems = pageGroups.flat();
  const allCats = importPreview.updatedCategories || categories;

  // ─── UI RENDERING ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>📋 ตรวจสอบก่อน Import</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                พบ <strong className={isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}>{allItems.length} รายการ</strong>
              </span>
              {importPreview.isCategoryChanged && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">จะสร้างหมวดหมู่ใหม่</span>}
              <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>แก้ไขได้ก่อน import</span>
            </div>
          </div>
          <button onClick={() => setImportPreview(null)} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-5 h-5"/></button>
        </div>

        {/* Table header */}
        <div className={`grid grid-cols-[55px_120px_1fr_80px_36px] gap-2 px-4 py-2 text-[11px] font-bold border-b shrink-0 ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          <span>ประเภท</span><span>หมวดหมู่</span><span>รายละเอียด</span><span className="text-right">จำนวนเงิน</span><span/>
        </div>

        {/* Rows — grouped by date */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {pageItems.map((item, idx) => {
            const catObj = allCats.find(c => c.name === item.category);
            const isInc = catObj?.type === 'income';
            const isNewDate = idx === 0 || item.date !== pageItems[idx - 1].date;
            const inputCls = `w-full bg-transparent outline-none text-xs px-1.5 py-1 rounded border focus:ring-1 transition-colors ${isDarkMode ? 'border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500 hover:bg-slate-800' : 'border-slate-200 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E] hover:bg-slate-100'}`;
            return (
              <div key={item.id}>
                {isNewDate && (
                  <div className={`px-4 py-1.5 text-xs font-black sticky top-0 z-10 border-b ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {item.date}
                  </div>
                )}
                <div className={`grid grid-cols-[55px_120px_1fr_80px_36px] gap-2 px-4 py-1.5 items-center border-b transition-colors ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50/80'}`}>
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center truncate ${isInc ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>
                    {isInc ? 'รายรับ' : 'รายจ่าย'}
                  </span>
                  <select
                    value={item.category}
                    onChange={e => updatePreviewItem(item.id, 'category', e.target.value)}
                    className={`text-[11px] font-bold py-1 px-1 rounded border outline-none cursor-pointer transition-colors w-full ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    {allCats.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <input type="text" value={item.description} onChange={e => updatePreviewItem(item.id, 'description', e.target.value)} className={inputCls} />
                  <input type="number" value={item.amount} onChange={e => updatePreviewItem(item.id, 'amount', parseFloat(e.target.value) || 0)} className={`${inputCls} text-right font-bold`} />
                  <button onClick={() => deletePreviewItem(item.id)} className={`p-1 rounded transition-colors ${isDarkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}>
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination + Footer */}
        <div className={`px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewPage(p => Math.max(1, p-1))} disabled={previewPage === 1} className={`p-1.5 rounded-lg border disabled:opacity-40 transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4"/></button>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>หน้า {previewPage}/{totalPages} ({allItems.length} รายการ)</span>
            <button onClick={() => setPreviewPage(p => Math.min(totalPages, p+1))} disabled={previewPage === totalPages} className={`p-1.5 rounded-lg border disabled:opacity-40 transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4"/></button>
          </div>
          {/* Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setImportPreview(null)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold border transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>ยกเลิก</button>
            <button onClick={confirmImport} disabled={isProcessing || allItems.length === 0} className="flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {isProcessing ? <Zap className="w-4 h-4 animate-pulse"/> : <CheckCircle className="w-4 h-4"/>}
              {isProcessing ? 'กำลัง Import...' : `Import ${allItems.length} รายการ`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}