import type { Request, Response, NextFunction } from 'express';
import { ApiError } from './ApiError';

/** Zod v4 has no `.errors` (it was removed) — `.issues` is the list. */
const isZodError = (err: unknown): err is { issues: unknown[] } =>
  !!err && typeof err === 'object' && (err as { name?: unknown }).name === 'ZodError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isZodError(err)) {
    return res.status(400).json({ error: 'Validation Error', details: err.issues });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  const { code, status, message } = (err ?? {}) as { code?: unknown; status?: unknown; message?: unknown };
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(409).json({ error: 'ลบหรือแก้ไขไม่ได้ ข้อมูลนี้ยังถูกใช้งานอยู่ ลบหรือย้ายรายการที่เกี่ยวข้องก่อน' });
  }
  if (code === 'SQLITE_CONSTRAINT_TRIGGER' && typeof message === 'string') {
    return res.status(400).json({ error: message }); // RAISE(ABORT, ...) texts are written for the user
  }
  // body-parser / http-errors: malformed JSON (400), body over the limit (413), ...
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? 'ข้อมูลที่ส่งมาใหญ่เกินไป' : 'รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง' });
  }

  console.error('[API Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
}
