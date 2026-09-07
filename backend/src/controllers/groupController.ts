import type { Request, Response, NextFunction } from 'express';
import groupService from '../services/groupService';
import { groupSchema } from '../validations/groupValidation';

export const getAllGroups = (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = groupService.getAll();
    res.json(rows);
  } catch (err: unknown) {
    next(err);
  }
};

export const upsertGroup = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = groupSchema.parse(req.body);
    groupService.upsert(validatedData as any);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
};

export const deleteGroup = (req: Request, res: Response, next: NextFunction) => {
  try {
    groupService.delete(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
};
