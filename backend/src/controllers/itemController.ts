import type { Request, Response, NextFunction } from 'express';
import itemService from '../services/itemService';
import {
  createItemSchema,
  updateItemSchema,
  updateItemStatusSchema,
  linkTransactionsSchema,
  itemCategorySchema
} from '../validations/itemValidation';

export const getItems = (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
    const includeCancelled = req.query.include_cancelled === 'true';

    const items = itemService.getAll({
      status,
      categoryId,
      includeCancelled
    });
    res.json(items);
  } catch (err: unknown) {
    next(err);
  }
};

export const getItemById = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = itemService.getById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err: unknown) {
    next(err);
  }
};

export const createItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createItemSchema.parse(req.body);
    const item = itemService.create(validatedData);
    res.status(201).json(item);
  } catch (err: unknown) {
    next(err);
  }
};

export const updateItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const validatedData = updateItemSchema.parse(req.body);
    const item = itemService.update(id, validatedData);
    res.json(item);
  } catch (err: unknown) {
    next(err);
  }
};

export const updateItemStatus = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const { status, purchased_at, broken_at } = updateItemStatusSchema.parse(req.body);
    const item = itemService.updateStatus(id, status, { purchased_at, broken_at });
    res.json(item);
  } catch (err: unknown) {
    next(err);
  }
};

export const deleteItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const success = itemService.delete(id);
    if (!success) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted' });
  } catch (err: unknown) {
    next(err);
  }
};

export const linkTransactions = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const { transaction_ids } = linkTransactionsSchema.parse(req.body);
    itemService.linkTransactions(id, transaction_ids);

    const updated = itemService.getById(id);
    res.json(updated);
  } catch (err: unknown) {
    next(err);
  }
};

export const unlinkTransaction = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { transactionId } = req.params;
    if (isNaN(id) || !transactionId) {
      return res.status(400).json({ error: 'Invalid item ID or transaction ID' });
    }

    itemService.unlinkTransaction(id, transactionId);

    const updated = itemService.getById(id);
    res.json(updated);
  } catch (err: unknown) {
    next(err);
  }
};

export const getItemCategories = (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = itemService.getCategories();
    res.json(categories);
  } catch (err: unknown) {
    next(err);
  }
};

export const createItemCategory = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = itemCategorySchema.parse(req.body);
    const category = itemService.createCategory(name);
    res.status(201).json(category);
  } catch (err: unknown) {
    next(err);
  }
};

export const deleteItemCategory = (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    itemService.deleteCategory(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err: unknown) {
    next(err);
  }
};
