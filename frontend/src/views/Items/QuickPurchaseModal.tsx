import React, { useState } from 'react';
import { X, CheckCircle2, Link as LinkIcon, Calendar } from 'lucide-react';
import { ItemWithDetails } from '../../types';
import DatePicker from '../../components/ui/DatePicker';

interface QuickPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemWithDetails | null;
  onConfirm: (itemId: number, purchasedAt: string, openLinkModalAfter: boolean) => Promise<void>;
}

export default function QuickPurchaseModal({
  isOpen,
  onClose,
  item,
  onConfirm
}: QuickPurchaseModalProps) {
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleAction = async (openLinkModalAfter: boolean) => {
    setIsSubmitting(true);
    try {
      await onConfirm(item.id, purchasedAt, openLinkModalAfter);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#141414] border border-[#2e2e2e] shadow-2xl rounded-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e] bg-[#181818]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ยืนยันการซื้อสิ่งของ</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-[#181818] p-3 border border-[#252525]">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">สิ่งของ</span>
            <span className="text-sm font-bold text-slate-100">{item.name}</span>
            {item.brand_model && (
              <span className="text-neutral-400 ml-1.5">({item.brand_model})</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
              วันที่ซื้อ
            </label>
            <DatePicker
              value={purchasedAt}
              onChange={setPurchasedAt}
              allowAll={false}
              isMulti={false}
              placeholder="เลือกวันที่ซื้อ"
              className="w-full h-10 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-mono font-bold transition-colors outline-none bg-[#1b1b1b] border-[#333] text-slate-100 hover:border-[#da291c] focus:border-[#da291c]"
            />
          </div>

          <p className="text-neutral-400">
            ระบบจะย้ายสิ่งของนี้ไปยังคอลัมน์ <strong>"ใช้งานอยู่"</strong> คุณต้องการค้นหาและผูกรายการบัญชีกับสิ่งของนี้ทันทีเลยหรือไม่?
          </p>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction(true)}
              className="w-full py-2.5 px-3 bg-[#da291c] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <LinkIcon className="w-4 h-4" />
              บันทึกและไปผูก Transaction ทันที
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction(false)}
              className="w-full py-2.5 px-3 bg-[#222] hover:bg-[#2c2c2c] text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-none border border-[#333] transition-colors disabled:opacity-50"
            >
              บันทึกซื้อแล้วอย่างเดียว (ยังไม่ผูกรายการ)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2e2e2e] bg-[#181818] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
