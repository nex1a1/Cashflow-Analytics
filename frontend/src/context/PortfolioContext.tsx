import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AssetInput, Portfolio } from '../types';
import { portfolioService } from '../services/api';
import { useAppData } from './AppDataContext';
import { useToast } from './ToastContext';

/** idle = ยังไม่มีสินทรัพย์ให้ดึงราคา · ok = ดึงครบ · partial = บางตัวดึงไม่ได้ · offline = ดึงไม่ได้เลย (ใช้ราคาที่แคชไว้) */
export type PriceStatus = 'idle' | 'ok' | 'partial' | 'offline';

export interface PortfolioContextValue {
  portfolio: Portfolio | null;
  isRefreshing: boolean;
  priceStatus: PriceStatus;
  reload: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  saveAsset: (asset: AssetInput) => Promise<string | undefined>;
  deleteAsset: (id: string) => Promise<boolean>;
  setManualPrice: (id: string, price: number) => Promise<boolean>;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { transactions } = useAppData();
  const { showToast } = useToast();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('idle');
  const portfolioRef = useRef<Portfolio | null>(null);
  portfolioRef.current = portfolio;

  const reload = useCallback(async () => {
    try {
      setPortfolio(await portfolioService.get());
    } catch (err) {
      console.error('Failed to load portfolio:', err); // คงข้อมูลเดิมไว้ ไม่ล้มทั้งแอป
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    // เบราว์เซอร์รู้อยู่แล้วว่าออฟไลน์ → ไม่ต้องรอ timeout ของแหล่งราคา ใช้ราคาที่แคชไว้ทันที
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setPriceStatus('offline');
      return;
    }
    setIsRefreshing(true);
    try {
      const { results } = await portfolioService.refreshPrices();
      if (results.length === 0) setPriceStatus('idle');
      else if (results.every(r => r.ok)) setPriceStatus('ok');
      else if (results.some(r => r.ok)) setPriceStatus('partial');
      else setPriceStatus('offline');
    } catch {
      setPriceStatus('offline');
    } finally {
      await reload();
      setIsRefreshing(false);
    }
  }, [reload]);

  // โหลดพอร์ตทุกครั้งที่รายการธุรกรรมเปลี่ยน (ซื้อ/ขาย/แก้/ลบ) และดึงราคาใหม่ครั้งเดียวตอนเปิดแอป
  const didInitialRefresh = useRef(false);
  useEffect(() => {
    reload();
  }, [transactions, reload]);
  useEffect(() => {
    if (didInitialRefresh.current) return;
    didInitialRefresh.current = true;
    refreshPrices();
  }, [refreshPrices]);

  // เน็ตกลับมา → ดึงราคาใหม่เองโดยไม่ต้องกดปุ่ม
  useEffect(() => {
    window.addEventListener('online', refreshPrices);
    return () => window.removeEventListener('online', refreshPrices);
  }, [refreshPrices]);

  const saveAsset = useCallback(async (asset: AssetInput) => {
    try {
      const prev = asset.id ? portfolioRef.current?.assets.find(a => a.id === asset.id) : undefined;
      const { id } = await portfolioService.saveAsset(asset);
      await reload();
      // สินทรัพย์ใหม่ หรือเปลี่ยนประเภท/สัญลักษณ์ → ราคาเดิมใช้ไม่ได้ ดึงใหม่ทันทีโดยไม่บล็อก UI
      if (!prev || prev.kind !== asset.kind || (prev.symbol ?? null) !== (asset.symbol?.trim() || null)) refreshPrices();
      return id;
    } catch (err: any) {
      showToast('บันทึกสินทรัพย์ไม่สำเร็จ: ' + err.message, 'error');
      return undefined;
    }
  }, [reload, refreshPrices, showToast]);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      await portfolioService.deleteAsset(id);
      await reload();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  }, [reload, showToast]);

  const setManualPrice = useCallback(async (id: string, price: number) => {
    try {
      await portfolioService.setManualPrice(id, price);
      await reload();
      return true;
    } catch (err: any) {
      showToast('บันทึกราคาไม่สำเร็จ: ' + err.message, 'error');
      return false;
    }
  }, [reload, showToast]);

  const value: PortfolioContextValue = {
    portfolio, isRefreshing, priceStatus, reload, refreshPrices, saveAsset, deleteAsset, setManualPrice,
  };
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolio = (): PortfolioContextValue => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
};
