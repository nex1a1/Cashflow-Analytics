import type { Request, Response } from 'express';
import dayTypeService from '../services/dayTypeService';
import { dayTypeSchema } from '../validations/dayTypeValidation';
import { DayType } from '../types';

export const getAllDayTypes = (req: Request, res: Response) => {
  const rows = dayTypeService.getAll();
  res.json(rows);
};

export const upsertDayType = (req: Request, res: Response) => {
  const validatedData = dayTypeSchema.parse(req.body) as DayType;
  dayTypeService.upsert(validatedData);
  res.json({ success: true });
};

export const deleteDayType = (req: Request<{ id: string }>, res: Response) => {
  dayTypeService.delete(req.params.id);
  res.json({ success: true });
};
