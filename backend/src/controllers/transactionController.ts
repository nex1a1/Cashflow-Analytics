import type { Request, Response } from 'express';
import transactionService from '../services/transactionService';
import categoryService from '../services/categoryService';
import backupService from '../services/backupService';
import { upsertTransactionSchema } from '../validations/transactionValidation';
import { dateRangeQuerySchema, searchQuerySchema, monthParamSchema } from '../validations/queryValidation';

/** แถว "ขาย" ของหมวดลงทุน/ออมคืนค่าเป็นลบ ทำให้ผลรวมทุกที่ = ออมสุทธิ */
const signedBaht = (row: { amount: number; trade_side?: string | null }) =>
  (row.trade_side === 'sell' ? -row.amount : row.amount) / 100;

export const getAllTransactions = (req: Request, res: Response) => {
  const { startDate, endDate } = dateRangeQuerySchema.parse(req.query);
  const rows = transactionService.getAll(startDate, endDate);
  res.json(rows.map(row => ({
    id:          row.id,
    date:        row.date,
    category:    row.category,
    category_id: row.category_id,
    description: row.description,
    amount:      signedBaht(row), // Convert Satang to Baht (ขาย = ลบ)
    group_type:  row.group_type,
    allocation_type: row.allocation_type,
    asset_id:    row.asset_id ?? null,
    units:       row.units ?? null
  })));
};

export const upsertTransactions = (req: Request, res: Response) => {
  const validatedData = upsertTransactionSchema.parse(req.body);
  const items = Array.isArray(validatedData) ? validatedData : [validatedData];

  transactionService.upsertMany(items);

  res.json({ success: true, count: items.length });
};

export const deleteTransaction = (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const result = transactionService.delete(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json({ success: true });
};

export const deleteMonth = (req: Request, res: Response) => {
  const { isoMonth } = monthParamSchema.parse(req.params);
  const result = transactionService.deleteByMonth(isoMonth);
  res.json({ success: true, message: `Deleted data for ${isoMonth}`, affected: result.changes });
};

export const resetAllData = async (req: Request, res: Response) => {
  if (req.headers['x-confirm-reset'] !== 'true') {
    return res.status(400).json({ error: 'Confirmation required. Send X-Confirm-Reset: true header.' });
  }
  // If the backup fails, the rejection goes to errorHandler (Express 5) — never wipe without a safety copy.
  const backup = await backupService.createPreResetBackup();
  transactionService.deleteAll();
  res.json({ success: true, message: 'All data cleared successfully', backup });
};

export const getTransactionCount = (req: Request, res: Response) => {
  res.json({ count: transactionService.count() });
};

export const getAvailablePeriods = (req: Request, res: Response) => {
  const periods = transactionService.getAvailablePeriods();
  res.json(periods);
};

export const searchTransactions = (req: Request, res: Response) => {
  const { q } = searchQuerySchema.parse(req.query);
  const rows = transactionService.search(q || '');
  res.json(rows.map(row => ({
    id:          row.id,
    date:        row.date,
    category:    row.category,
    category_id: row.category_id,
    description: row.description,
    amount:      signedBaht(row), // Convert Satang to Baht (ขาย = ลบ)
    group_type:  row.group_type,
    allocation_type: row.allocation_type,
    asset_id:    row.asset_id ?? null,
    units:       row.units ?? null
  })));
};

export const getFrequentItems = (req: Request, res: Response) => {
  const items = transactionService.getFrequentItems();
  res.json(items);
};

export const predictCategories = (req: Request, res: Response) => {
  const { descriptions } = req.body ?? {};
  if (!Array.isArray(descriptions) || descriptions.some(d => typeof d !== 'string')) {
    return res.status(400).json({ error: 'descriptions must be an array of strings' });
  }

  const predictions: Record<string, any> = {};
  for (const desc of descriptions) {
    const categoryId = transactionService.suggestCategory(desc);
    if (categoryId) {
      // Find category details via service
      const cat = categoryService.getById(categoryId);
      predictions[desc] = cat ? { id: cat.id, name: cat.name } : null;
    } else {
      predictions[desc] = null;
    }
  }
  res.json(predictions);
};
