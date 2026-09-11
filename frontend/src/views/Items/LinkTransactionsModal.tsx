import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Link as LinkIcon, Unlink, Search,
  CheckCircle2, Check, Clock, Calendar
} from 'lucide-react';
import { ItemWithDetails, LinkedTransactionInfo, TransactionDisplay } from '../../types';
import { itemService, transactionService } from '../../services/api';
import { formatMoney } from '../../utils/formatters';
import DatePicker from '../../components/ui/DatePicker';

interface LinkTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemWithDetails | null;
  mode?: 'manage' | 'purchase';
  onLinkSuccess: (updatedItem: ItemWithDetails) => void;
  onConfirmPurchase?: (itemId: number, purchasedAt: string, selectedTxIds: string[]) => Promise<void>;
}

export default function LinkTransactionsModal({
  isOpen,
  onClose,
  item,
  mode = 'manage',
  onLinkSuccess,
  onConfirmPurchase
}: LinkTransactionsModalProps) {
  const isPurchaseMode = mode === 'purchase' || item?.status === 'planned';

  const [detailedItem, setDetailedItem] = useState<(ItemWithDetails & { linked_transactions: LinkedTransactionInfo[] }) | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  
  // Purchase mode state
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateTransactions, setCandidateTransactions] = useState<TransactionDisplay[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isLinking, setIsLinking] = useState(false);
  const [actionError, setActionError] = useState('');

  // Load detailed item with current linked transactions
  const loadItemDetails = async (itemId: number) => {
    setIsLoadingItem(true);
    setActionError('');
    try {
      const data = await itemService.getById(itemId);
      setDetailedItem(data);
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถโหลดข้อมูลสิ่งของได้');
    } finally {
      setIsLoadingItem(false);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      loadItemDetails(item.id);
      setSelectedTxIds(new Set());
      setPurchasedAt(item.purchased_at || new Date().toISOString().split('T')[0]);
      // Pre-fill search query with item name or brand if available
      const initialQuery = item.brand_model || item.name;
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    } else {
      setDetailedItem(null);
      setCandidateTransactions([]);
      setSelectedTxIds(new Set());
    }
  }, [isOpen, item]);

  // Perform transaction search
  const performSearch = async (queryText: string) => {
    setIsSearching(true);
    setActionError('');
    try {
      let results: TransactionDisplay[] = [];
      if (queryText.trim()) {
        results = await transactionService.search(queryText.trim());
      } else {
        // If query is empty, fetch recent transactions
        results = await transactionService.getAll();
        results = results.slice(-50).reverse();
      }
      setCandidateTransactions(results);
    } catch (err: any) {
      setActionError(err.message || 'ค้นหาธุรกรรมไม่สำเร็จ');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  // Toggle selection of candidate transaction
  const toggleSelectTx = (txId: string, txDate?: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
        // Auto-sync purchase date with selected transaction date if selecting the first tx
        if (isPurchaseMode && txDate && next.size === 1) {
          setPurchasedAt(txDate);
        }
      }
      return next;
    });
  };

  // Link selected transactions (in Manage mode)
  const handleLinkSelected = async () => {
    if (!item || selectedTxIds.size === 0) return;
    setIsLinking(true);
    setActionError('');
    try {
      const updated = await itemService.linkTransactions(item.id, Array.from(selectedTxIds));
      setDetailedItem(updated);
      setSelectedTxIds(new Set());
      onLinkSuccess(updated);
    } catch (err: any) {
      setActionError(err.message || 'ผูกรายการไม่สำเร็จ');
    } finally {
      setIsLinking(false);
    }
  };

  // Confirm purchase action (in Purchase mode)
  const handleConfirmPurchaseAction = async (withLinks: boolean) => {
    if (!item) return;
    setIsSubmitting(true);
    setActionError('');
    try {
      const txsToLink = withLinks ? Array.from(selectedTxIds) : [];
      if (onConfirmPurchase) {
        await onConfirmPurchase(item.id, purchasedAt, txsToLink);
      } else {
        await itemService.updateStatus(item.id, 'purchased', { purchased_at: purchasedAt });
        if (txsToLink.length > 0) {
          const updated = await itemService.linkTransactions(item.id, txsToLink);
          onLinkSuccess(updated);
        }
      }
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'บันทึกการซื้อไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unlink single transaction
  const handleUnlink = async (txId: string) => {
    if (!item) return;
    setActionError('');
    try {
      const updated = await itemService.unlinkTransaction(item.id, txId);
      setDetailedItem(updated);
      onLinkSuccess(updated);
    } catch (err: any) {
      setActionError(err.message || 'ยกเลิกการผูกไม่สำเร็จ');
    }
  };

  // Set of IDs that are already linked to this item
  const linkedTxIds = useMemo(() => {
    if (!detailedItem?.linked_transactions) return new Set<string>();
    return new Set(detailedItem.linked_transactions.map(t => t.id));
  }, [detailedItem]);

  // Projected new total price if selected items are linked
  const projectedTotal = useMemo(() => {
    const currentSum = isPurchaseMode ? 0 : (detailedItem?.display_price || 0);
    const addedSum = candidateTransactions
      .filter(t => selectedTxIds.has(t.id) && !linkedTxIds.has(t.id))
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    return currentSum + addedSum;
  }, [detailedItem, candidateTransactions, selectedTxIds, linkedTxIds, isPurchaseMode]);

  // Date Synchronization with Linked Transactions (Manage Mode)
  const [isSyncingDate, setIsSyncingDate] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  // Helper to calculate target warranty date from baseDate + years
  const calcWarrantyDate = (baseDateStr: string, years: number): string => {
    if (!baseDateStr) return '';
    const [y, m, d] = baseDateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const target = new Date(y, m - 1, d);
    target.setFullYear(target.getFullYear() + years);
    const cy = target.getFullYear();
    const cm = String(target.getMonth() + 1).padStart(2, '0');
    const cd = String(target.getDate()).padStart(2, '0');
    return `${cy}-${cm}-${cd}`;
  };

  // Sorted linked transaction dates (earliest to latest)
  const txDatesSorted = useMemo(() => {
    if (!detailedItem?.linked_transactions || detailedItem.linked_transactions.length === 0) {
      return [];
    }
    return [...detailedItem.linked_transactions].sort((a, b) => a.date.localeCompare(b.date));
  }, [detailedItem]);

  const earliestTx = txDatesSorted[0];
  const latestTx = txDatesSorted[txDatesSorted.length - 1];
  const hasMultipleDates = earliestTx && latestTx && earliestTx.date !== latestTx.date;

  // Handle syncing purchase date with a specific transaction date
  const handleSyncPurchaseDate = async (targetDate: string) => {
    if (!detailedItem) return;
    setIsSyncingDate(true);
    setActionError('');
    setSyncSuccessMsg('');
    try {
      let newWarranty = detailedItem.warranty_until;
      if (detailedItem.purchased_at && detailedItem.warranty_until) {
        const matchedYears = [1, 2, 3, 5].find(y => calcWarrantyDate(detailedItem.purchased_at!, y) === detailedItem.warranty_until);
        if (matchedYears) {
          newWarranty = calcWarrantyDate(targetDate, matchedYears);
        }
      }

      const updated = await itemService.update(detailedItem.id, {
        purchased_at: targetDate,
        warranty_until: newWarranty,
      });
      setDetailedItem(prev => prev ? { ...prev, purchased_at: targetDate, warranty_until: newWarranty } : null);
      onLinkSuccess(updated);
      setSyncSuccessMsg(`ซิงค์วันที่ซื้อเป็น ${targetDate} สำเร็จ`);
      setTimeout(() => setSyncSuccessMsg(''), 3500);
    } catch (err: any) {
      setActionError(err.message || 'ไม่สามารถอัปเดตวันที่ซื้อได้');
    } finally {
      setIsSyncingDate(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-[#141414] border border-[#2e2e2e] shadow-2xl rounded-none flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e] bg-[#181818]">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 truncate">
              {isPurchaseMode ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <LinkIcon className="w-4 h-4 text-[#da291c] shrink-0" />
              )}
              <span>{isPurchaseMode ? 'บันทึกการซื้อ & ผูกรายการบัญชี:' : 'ผูกรายการบัญชีกับสิ่งของ:'}</span>
              <span className="text-[#da291c]">{item.name}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isPurchaseMode
                ? 'ระบุวันที่ซื้อ และเลือกรายการธุรกรรมในบัญชีที่จ่ายเงินเพื่อผูกกับสิ่งของนี้ หรือบันทึกซื้อแล้วโดยยังไม่ผูกรายการ'
                : 'ราคาจริงจะถูกคำนวณอัตโนมัติจากผลรวมของรายการธุรกรรมที่ผูกไว้ (Single Source of Truth)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-5">
          {actionError && (
            <div className="p-3 text-xs bg-red-950/40 text-red-300 border border-red-800/60 rounded-none">
              {actionError}
            </div>
          )}

          {/* Section 1: Purchase Details (in Purchase Mode) OR Currently Linked Transactions (in Manage Mode) */}
          {isPurchaseMode ? (
            <div className="border border-[#282828] bg-[#111] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">สิ่งของ</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{item.name}</span>
                    {item.brand_model && (
                      <span className="text-xs text-neutral-400">({item.brand_model})</span>
                    )}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">ราคาประมาณการ Wishlist</span>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                    ฿{formatMoney(item.display_price)}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#222]">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>วันที่ซื้อ</span>
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
            </div>
          ) : (
            <div className="border border-[#282828] bg-[#111] p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    รายการที่ผูกอยู่ปัจจุบัน ({detailedItem?.linked_transactions?.length || 0})
                  </h4>
                  {detailedItem && detailedItem.linked_count > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-950/50 text-amber-300 border-amber-500/40">
                      ผ่อน {detailedItem.linked_count} งวด
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 mr-2">ราคารวมจริง</span>
                  <span className="text-base font-black text-emerald-400 font-mono tabular-nums">
                    ฿{formatMoney(detailedItem?.display_price || 0)}
                  </span>
                </div>
              </div>

              {/* Tactical Purchase Date Sync HUD */}
              {txDatesSorted.length > 0 && (
                <div className="mb-3 p-3 bg-[#161616] border border-[#2a2a2a] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-neutral-300 font-bold">วันที่ซื้อ / ได้มาในระบบ:</span>
                      <span className="font-mono font-bold text-white bg-[#101010] px-2 py-0.5 border border-[#333]">
                        {detailedItem?.purchased_at || 'ยังไม่ได้ระบุ'}
                      </span>
                    </div>

                    {syncSuccessMsg && (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {syncSuccessMsg}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222] flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      ดึงวันที่จากธุรกรรมที่ผูกไว้:
                    </span>
                    
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasMultipleDates ? (
                        <>
                          <button
                            type="button"
                            disabled={isSyncingDate}
                            onClick={() => handleSyncPurchaseDate(earliestTx.date)}
                            className={`px-2.5 py-1 text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                              detailedItem?.purchased_at === earliestTx.date
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500 shadow-sm'
                                : 'bg-[#121212] hover:bg-[#202020] text-neutral-300 hover:text-white border-[#333]'
                            }`}
                            title="เริ่มนับประกันตั้งแต่งวดแรกที่ซื้อ (เหมาะกับแบบผ่อนชำระหลายงวด)"
                          >
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>งวดแรก: {earliestTx.date}</span>
                            <span className="text-[9px] text-neutral-400 font-normal">(ผ่อนชำระ)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isSyncingDate}
                            onClick={() => handleSyncPurchaseDate(latestTx.date)}
                            className={`px-2.5 py-1 text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                              detailedItem?.purchased_at === latestTx.date
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500 shadow-sm'
                                : 'bg-[#121212] hover:bg-[#202020] text-neutral-300 hover:text-white border-[#333]'
                            }`}
                            title="เริ่มนับประกัน ณ วันที่จ่ายส่วนที่เหลือและรับของ (เหมาะกับจอง/มัดจำก่อนแล้วรับของ)"
                          >
                            <Calendar className="w-3 h-3 text-sky-400" />
                            <span>วันรับของ/ล่าสุด: {latestTx.date}</span>
                            <span className="text-[9px] text-neutral-400 font-normal">(มัดจำ/รับของ)</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isSyncingDate || detailedItem?.purchased_at === earliestTx.date}
                          onClick={() => handleSyncPurchaseDate(earliestTx.date)}
                          className={`px-2.5 py-1 text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                            detailedItem?.purchased_at === earliestTx.date
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500'
                              : 'bg-[#121212] hover:bg-[#202020] text-neutral-300 hover:text-white border-[#333]'
                          }`}
                        >
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>ใช้วันที่ของรายการนี้ ({earliestTx.date})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isLoadingItem ? (
                <div className="py-6 text-center text-xs text-neutral-500">กำลังโหลดรายการที่ผูกอยู่...</div>
              ) : detailedItem?.linked_transactions && detailedItem.linked_transactions.length > 0 ? (
                <div className="divide-y divide-[#222] max-h-48 overflow-y-auto custom-scrollbar">
                  {detailedItem.linked_transactions.map((tx) => (
                    <div key={tx.id} className="py-2 px-1 flex items-center justify-between gap-3 text-xs hover:bg-[#161616]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 text-[11px]">{tx.date}</span>
                          <span className="font-bold text-slate-200 truncate">{tx.description || 'ไม่มีรายละเอียด'}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded-none bg-neutral-800 text-neutral-300 text-[10px]">
                            {tx.category_name}
                          </span>
                          <span>{tx.group_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {tx.date === detailedItem?.purchased_at ? (
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>วันที่ซื้อ</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSyncingDate}
                            onClick={() => handleSyncPurchaseDate(tx.date)}
                            className="text-[10px] font-bold text-neutral-400 hover:text-white bg-[#181818] hover:bg-[#252525] border border-[#333] hover:border-emerald-500/50 px-2 py-0.5 rounded-none transition-colors"
                            title={`ใช้วันที่ ${tx.date} เป็นวันที่ซื้อของสิ่งนี้`}
                          >
                            ใช้วันนี้
                          </button>
                        )}

                        <span className="font-mono font-black text-slate-100 tabular-nums ml-1">
                          ฿{formatMoney(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleUnlink(tx.id)}
                          className="p-1 text-neutral-400 hover:text-[#da291c] hover:bg-red-950/20 border border-transparent hover:border-red-800/40 transition-all"
                          title="ถอดการผูกรายการนี้ออก"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-neutral-500">
                  ยังไม่มีการผูกรายการบัญชีกับสิ่งของชิ้นนี้ (ใช้ราคาจดเอง ฿{formatMoney(item.price || 0)})
                </div>
              )}
            </div>
          )}

          {/* Section 2: Search & Select Transactions */}
          <div className="border border-[#282828] bg-[#111] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                {isPurchaseMode
                  ? 'ค้นหาและเลือกรายการในบัญชีที่จ่ายเพื่อซื้อสิ่งของนี้'
                  : 'ค้นหารายการในบัญชีเพื่อนำมาผูก'}
              </h4>
              {isPurchaseMode && (
                <span className="text-[10px] text-neutral-400">
                  (ไม่บังคับผูก · สามารถกดบันทึกโดยไม่ผูกได้)
                </span>
              )}
            </div>

            {/* Search Bar Form */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อรายการ, ร้านค้า, หรือคำอธิบาย..."
                  className="w-full pl-9 pr-3 py-2 bg-[#181818] border border-[#333] text-slate-100 placeholder-neutral-500 rounded-sm text-xs focus:outline-none focus:border-[#da291c]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#222] text-slate-200 hover:bg-[#2a2a2a] border border-[#3e3e3e] transition-colors shrink-0"
              >
                {isSearching ? 'ค้นหา...' : 'ค้นหา'}
              </button>
            </form>

            {/* Candidate List */}
            <div className="border border-[#222] bg-[#141414] max-h-60 overflow-y-auto custom-scrollbar divide-y divide-[#222]">
              {isSearching ? (
                <div className="py-8 text-center text-xs text-neutral-500">กำลังค้นหารายการ...</div>
              ) : candidateTransactions.length > 0 ? (
                candidateTransactions.map((tx) => {
                  const isAlreadyLinked = linkedTxIds.has(tx.id);
                  const isSelected = selectedTxIds.has(tx.id);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => !isAlreadyLinked && toggleSelectTx(tx.id, tx.date)}
                      className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                        isAlreadyLinked
                          ? 'bg-neutral-900/40 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-red-950/20 border-l-2 border-[#da291c]'
                          : 'hover:bg-[#181818]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected || isAlreadyLinked}
                          disabled={isAlreadyLinked}
                          onChange={() => !isAlreadyLinked && toggleSelectTx(tx.id, tx.date)}
                          className="accent-[#da291c] w-3.5 h-3.5 rounded-sm cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-neutral-500 text-[11px]">{tx.date}</span>
                            <span className="font-bold text-slate-200 truncate">{tx.description || 'ไม่มีรายละเอียด'}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded-none bg-neutral-800 text-neutral-300 text-[10px]">
                              {tx.category}
                            </span>
                            {isAlreadyLinked && (
                              <span className="text-[10px] text-emerald-400 font-bold inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                ผูกอยู่แล้ว
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-black text-slate-100 tabular-nums shrink-0">
                        ฿{formatMoney(tx.amount)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-neutral-500">
                  ไม่พบรายการธุรกรรมที่ตรงกับคำค้นหา
                </div>
              )}
            </div>

            {/* Selection Summary & Link Action (Manage Mode only) */}
            {!isPurchaseMode && selectedTxIds.size > 0 && (
              <div className="p-3 bg-[#181818] border border-[#333] flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs">
                  <span className="text-slate-300 font-bold">
                    เลือกไว้ {selectedTxIds.size} รายการ
                  </span>
                  <span className="text-neutral-500 ml-2">
                    (ยอดรวมใหม่หลังผูก: <strong className="text-emerald-400 font-mono">฿{formatMoney(projectedTotal)}</strong>)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLinkSelected}
                  disabled={isLinking}
                  className="px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-[#da291c] text-white rounded-none hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isLinking ? 'กำลังผูกรายการ...' : `ผูก ${selectedTxIds.size} รายการนี้`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-5 py-3.5 border-t border-[#2e2e2e] bg-[#181818] flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] text-neutral-500 font-mono">
            Item ID: #{item.id} · หมวดหมู่: {item.category_name}
          </div>

          {isPurchaseMode ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleConfirmPurchaseAction(false)}
                className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#222] hover:bg-[#2c2c2c] text-neutral-200 border border-[#383838] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="บันทึกวันที่ซื้อ ย้ายเข้าคลังสิ่งของ โดยไม่ผูกกับ Transaction"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>บันทึกซื้อแล้ว (ยังไม่ผูกรายการ)</span>
              </button>

              {selectedTxIds.size > 0 && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmPurchaseAction(true)}
                  className="px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-[#da291c] hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>ยืนยันซื้อและผูก {selectedTxIds.size} รายการ (฿{formatMoney(projectedTotal)})</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white border border-[#333] rounded-none hover:bg-[#222] transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
