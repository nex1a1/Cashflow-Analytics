import type { Request, Response } from 'express';
import assetService from '../services/assetService';
import { assetSchema, manualPriceSchema, pricePreviewSchema } from '../validations/assetValidation';
import { fetchPrice, AUTO_PRICE_KINDS } from '../services/priceProviders';

export const getPortfolio = (_req: Request, res: Response) => {
  res.json(assetService.getPortfolio());
};

export const upsertAsset = (req: Request, res: Response) => {
  const id = assetService.upsert(assetSchema.parse(req.body));
  res.json({ success: true, id });
};

export const deleteAsset = (req: Request<{ id: string }>, res: Response) => {
  assetService.delete(req.params.id);
  res.json({ success: true });
};

export const setManualPrice = (req: Request<{ id: string }>, res: Response) => {
  assetService.setManualPrice(req.params.id, manualPriceSchema.parse(req.body).price);
  res.json({ success: true });
};

/** ตอบเสมอ 200 พร้อมผลรายตัว — ออฟไลน์ก็ไม่ใช่ข้อผิดพลาด UI จะใช้ราคาแคชแล้วเขียนกำกับ */
export const refreshPrices = async (_req: Request, res: Response) => {
  res.json({ results: await assetService.refreshPrices() });
};

/** ตอบ 200 เสมอ: ok=false พร้อมข้อความเมื่อสัญลักษณ์ผิดหรือแหล่งราคาล่ม (ไม่ใช่ข้อผิดพลาดของระบบ) */
export const previewPrice = async (req: Request, res: Response) => {
  const { kind, symbol } = pricePreviewSchema.parse(req.body);
  if (!AUTO_PRICE_KINDS.has(kind)) return res.json({ ok: false, manual: true, error: 'ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ' });
  try {
    res.json({ ok: true, ...(await fetchPrice(kind, symbol ?? null)) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'ดึงราคาไม่สำเร็จ';
    // 404 จากแหล่งราคา / ไม่มีราคาในผลลัพธ์ = สัญลักษณ์ผิด ไม่ใช่ระบบพัง
    res.json({ ok: false, error: /HTTP 404|ราคาไม่ถูกต้อง/.test(msg) ? 'ไม่พบสัญลักษณ์นี้' : msg });
  }
};
