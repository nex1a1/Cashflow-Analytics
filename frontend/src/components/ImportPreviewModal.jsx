// src/components/ImportPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight, CheckCircle, Zap } from 'lucide-react';

export default function ImportPreviewModal({ importPreview, setImportPreview, confirmImport, isProcessing, isDarkMode, categories }) {
  const dm = isDarkMode;
  const [previewPage, setPreviewPage] = useState(1);
  const PER_PAGE = 30;

  useEffect(() => { if (importPreview) setPreviewPage(1); }, [importPreview]);
  if (!importPreview) return null;

  const updateItem  = (id, field, value) => setImportPreview(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  const deleteItem  = (id) => setImportPreview(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));

  const allItems    = importPreview.items;
  const dateGroups  = [];
  allItems.forEach(item => {
    const last = dateGroups[dateGroups.length - 1];
    if (!last || last[0].date !== item.date) dateGroups.push([item]);
    else last.push(item);
  });
  const pages = [[]];
  dateGroups.forEach(grp => {
    const cur = pages[pages.length - 1];
    const cnt = cur.reduce((s, g) => s + g.length, 0);
    if (cnt > 0 && cnt + grp.length > PER_PAGE) pages.push([grp]);
    else cur.push(grp);
  });
  const totalPages = pages.length || 1;
  const pageItems  = (pages[previewPage - 1] || []).flat();
  const allCats    = importPreview.updatedCategories || categories;

  const inputCls = `w-full bg-transparent outline-none text-xs px-1.5 py-1 rounded-sm border focus:ring-1 transition-colors ${dm ? 'border-slate-600 text-slate-200 focus:border-blue-500 hover:bg-slate-800' : 'border-slate-200 text-slate-800 focus:border-[#00509E] hover:bg-slate-100'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`rounded-sm shadow-2xl flex flex-col w-full max-w-3xl animate-in zoom-in-95 duration-200 border ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
        style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          <div>
            <h3 className={`text-base font-bold ${dm ? 'text-slate-100' : 'text-slate-800'}`}>📋 ตรวจสอบก่อน Import</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                พบ <strong className={dm ? 'text-blue-400' : 'text-[#00509E]'}>{allItems.length} รายการ</strong>
              </span>
              {importPreview.isCategoryChanged && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-500">จะสร้างหมวดหมู่ใหม่</span>}
              <span className={`text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>แก้ไขได้ก่อน import</span>
            </div>
          </div>
          <button onClick={() => setImportPreview(null)} className={`p-1.5 rounded-sm ${dm ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}><X className="w-4 h-4" /></button>
        </div>

        {/* Table header */}
        <div className={`grid grid-cols-[55px_120px_1fr_80px_36px] gap-2 px-4 py-2 text-[10px] font-bold border-b shrink-0 ${dm ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          <span>ประเภท</span><span>หมวดหมู่</span><span>รายละเอียด</span><span className="text-right">จำนวนเงิน</span><span />
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>
          {pageItems.map((item, idx) => {
            const catObj = allCats.find(c => c.name === item.category);
            const isInc  = catObj?.type === 'income';
            const isNewDate = idx === 0 || item.date !== pageItems[idx - 1].date;
            return (
              <div key={item.id}>
                {isNewDate && (
                  <div className={`px-4 py-1.5 text-[10px] font-black sticky top-0 z-10 border-b ${dm ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {item.date}
                  </div>
                )}
                <div className={`grid grid-cols-[55px_120px_1fr_80px_36px] gap-2 px-4 py-1.5 items-center border-b transition-colors ${dm ? 'border-slate-800 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50/80'}`}>
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm text-center truncate ${isInc ? (dm ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dm ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>
                    {isInc ? 'รายรับ' : 'รายจ่าย'}
                  </span>
                  <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)}
                    className={`text-[10px] font-bold py-1 px-1 rounded-sm border outline-none cursor-pointer w-full ${dm ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                    {allCats.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className={inputCls} />
                  <input type="number" value={item.amount} onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)} className={`${inputCls} text-right font-bold`} />
                  <button onClick={() => deleteItem(item.id)} className={`p-1 rounded-sm transition-colors ${dm ? 'text-slate-600 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={previewPage === 1}
              className={`p-1.5 rounded-sm border disabled:opacity-40 transition-all active:scale-95 ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /></button>
            <span className={`text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>หน้า {previewPage}/{totalPages} ({allItems.length} รายการ)</span>
            <button onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} disabled={previewPage === totalPages}
              className={`p-1.5 rounded-sm border disabled:opacity-40 transition-all active:scale-95 ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setImportPreview(null)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-sm font-bold text-xs border transition-all active:scale-95 ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
              ยกเลิก
            </button>
            <button onClick={confirmImport} disabled={isProcessing || allItems.length === 0}
              className="flex-1 sm:flex-none px-5 py-2 rounded-sm font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {isProcessing ? <Zap className="w-3.5 h-3.5 animate-pulse" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {isProcessing ? 'กำลัง Import...' : `Import ${allItems.length} รายการ`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}