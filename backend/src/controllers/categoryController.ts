import type { Request, Response } from 'express';
import categoryService from '../services/categoryService';
import { categorySchema } from '../validations/categoryValidation';

export const getAllCategories = (req: Request, res: Response) => {
  const rows = categoryService.getAll();
  res.json(rows);
};

export const upsertCategory = (req: Request, res: Response) => {
  const validatedData = categorySchema.parse(req.body);
  categoryService.upsert(validatedData as any);
  res.json({ success: true });
};

export const deleteCategory = (req: Request<{ id: string }>, res: Response) => {
  categoryService.delete(req.params.id);
  res.json({ success: true });
};
