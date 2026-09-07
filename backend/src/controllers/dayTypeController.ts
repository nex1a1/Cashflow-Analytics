import type { Request, Response, NextFunction } from 'express';
import dayTypeService from '../services/dayTypeService';
import { dayTypeSchema } from '../validations/dayTypeValidation';
import { DayType } from '../types';

export const getAllDayTypes = (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = dayTypeService.getAll();
    res.json(rows);
  } catch (err: unknown) {
    next(err);
  }
};

export const upsertDayType = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = dayTypeSchema.parse(req.body) as DayType;
    dayTypeService.upsert(validatedData);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
};

export const deleteDayType = (req: Request, res: Response, next: NextFunction) => {
  try {
    dayTypeService.delete(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
};
