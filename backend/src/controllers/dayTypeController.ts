import { Request, Response } from 'express';
import dayTypeService from '../services/dayTypeService';
import { dayTypeSchema } from '../validations/dayTypeValidation';
import { DayType } from '../types';

export const getAllDayTypes = (req: Request, res: Response) => {
  try {
    const rows = dayTypeService.getAll();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const upsertDayType = (req: Request, res: Response) => {
  try {
    const validatedData = dayTypeSchema.parse(req.body) as DayType;
    dayTypeService.upsert(validatedData);
    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteDayType = (req: Request, res: Response) => {
  try {
    dayTypeService.delete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
