import { Request, Response } from 'express';
import transactionService from '../services/transactionService';
import db from '../config/db';
import { upsertTransactionSchema } from '../validations/transactionValidation';

export const getAllTransactions = (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  try {
    const rows = transactionService.getAll(startDate, endDate);
    res.json(rows.map(row => ({
      id:          row.id,
      date:        row.date,
      category:    row.category,
      category_id: row.category_id,
      description: row.description,
      amount:      row.amount / 100, // Convert Satang to Baht
      group_type:  row.group_type,
      allocation_type: row.allocation_type
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const upsertTransactions = (req: Request, res: Response) => {
  try {
    const validatedData = upsertTransactionSchema.parse(req.body);
    const items = Array.isArray(validatedData) ? validatedData : [validatedData];

    transactionService.upsertMany(items);

    res.json({ success: true, count: items.length });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteTransaction = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    transactionService.delete(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteMonth = (req: Request, res: Response) => {
  const { isoMonth } = req.params; // Expecting YYYY-MM
  try {
    transactionService.deleteByMonth(isoMonth);
    res.json({ success: true, message: `Deleted data for ${isoMonth}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resetAllData = (req: Request, res: Response) => {
  try {
    transactionService.deleteAll();
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAvailablePeriods = (req: Request, res: Response) => {
  try {
    const periods = transactionService.getAvailablePeriods();
    res.json(periods);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const searchTransactions = (req: Request, res: Response) => {
  const { q } = req.query as { q?: string };
  try {
    const rows = transactionService.search(q || '');
    res.json(rows.map(row => ({
      id:          row.id,
      date:        row.date,
      category:    row.category,
      category_id: row.category_id,
      description: row.description,
      amount:      row.amount / 100, // Convert Satang to Baht
      group_type:  row.group_type,
      allocation_type: row.allocation_type
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getFrequentItems = (req: Request, res: Response) => {
  try {
    const items = transactionService.getFrequentItems();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const predictCategories = (req: Request, res: Response) => {
  const { descriptions } = req.body;
  if (!Array.isArray(descriptions)) {
    return res.status(400).json({ error: 'descriptions must be an array' });
  }

  try {
    const predictions: Record<string, any> = {};
    for (const desc of descriptions) {
      const categoryId = transactionService.suggestCategory(desc);
      if (categoryId) {
        // Find category details
        const cat = db.prepare("SELECT name, id FROM categories WHERE id = ?").get(categoryId) as { id: string; name: string } | undefined;
        predictions[desc] = cat ? { id: cat.id, name: cat.name } : null;
      } else {
        predictions[desc] = null;
      }
    }
    res.json(predictions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
