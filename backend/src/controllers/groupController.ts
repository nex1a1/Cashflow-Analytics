import { Request, Response } from 'express';
import groupService from '../services/groupService';
import { groupSchema } from '../validations/groupValidation';

export const getAllGroups = (req: Request, res: Response) => {
  try {
    const rows = groupService.getAll();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const upsertGroup = (req: Request, res: Response) => {
  try {
    const validatedData = groupSchema.parse(req.body);
    groupService.upsert(validatedData as any);
    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteGroup = (req: Request, res: Response) => {
  try {
    groupService.delete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
