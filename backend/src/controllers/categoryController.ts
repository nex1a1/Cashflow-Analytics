import { Request, Response } from 'express';
import categoryService from '../services/categoryService';
import { categorySchema } from '../validations/categoryValidation';

export const getAllCategories = (req: Request, res: Response) => {
  try {
    const rows = categoryService.getAll();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const upsertCategory = (req: Request, res: Response) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    categoryService.upsert(validatedData as any);
    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteCategory = (req: Request, res: Response) => {
  try {
    categoryService.delete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
