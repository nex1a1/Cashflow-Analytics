import type { Request, Response, NextFunction } from 'express';
import categoryService from '../services/categoryService';
import { categorySchema } from '../validations/categoryValidation';

export const getAllCategories = (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = categoryService.getAll();
    res.json(rows);
  } catch (err: unknown) {
    next(err);
  }
};

export const upsertCategory = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    categoryService.upsert(validatedData as any);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
};

export const deleteCategory = (req: Request, res: Response, next: NextFunction) => {
  try {
    categoryService.delete(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
};
