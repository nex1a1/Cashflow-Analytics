import type { Request, Response } from 'express';
import groupService from '../services/groupService';
import { groupSchema } from '../validations/groupValidation';

export const getAllGroups = (req: Request, res: Response) => {
  const rows = groupService.getAll();
  res.json(rows);
};

export const upsertGroup = (req: Request, res: Response) => {
  const validatedData = groupSchema.parse(req.body);
  groupService.upsert(validatedData as any);
  res.json({ success: true });
};

export const deleteGroup = (req: Request<{ id: string }>, res: Response) => {
  groupService.delete(req.params.id);
  res.json({ success: true });
};
