import type { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

/** POSTs that only read (called while the user types / fills a form) — logged like reads. */
const READ_ONLY_POSTS = ['/api/transactions/predict', '/api/prices/preview'];

/** A short label for requests whose path alone doesn't say what happened. */
function actionOf(req: Request, path: string): string {
  if (req.method === 'POST' && path === '/api/transactions') {
    return `บันทึกธุรกรรม ${Array.isArray(req.body) ? req.body.length : 1} รายการ`;
  }
  if (req.method === 'POST' && path === '/api/prices/refresh') return 'ดึงราคาใหม่';
  if (req.method === 'POST' && path === '/api/backup') return 'สำรองข้อมูล';
  if (req.method === 'DELETE') {
    if (path.startsWith('/api/transactions/month/')) return `ลบทั้งเดือน ${path.split('/').pop()}`;
    if (path === '/api/reset-all') return 'ล้างข้อมูลทั้งหมด';
  }
  return '';
}

/** `{ error, details }` from errorHandler → "ข้อความ (field: เหตุผล)". */
function errorOf(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const { error, details } = body as { error?: unknown; details?: unknown };
  const first = Array.isArray(details) ? details[0] as { path?: unknown[]; message?: unknown } | undefined : undefined;
  const where = first ? ` (${Array.isArray(first.path) && first.path.length ? `${first.path.join('.')}: ` : ''}${first.message})` : '';
  return typeof error === 'string' ? `${error}${where}` : '';
}

/** Loopback and Docker/LAN addresses are the user's own browser — not worth a column. */
const isLocal = (ip: string) => /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/.test(ip);

/**
 * One `api` line per mutation or failed request: method, path, status, duration, what it did, why it failed.
 * The `db` lines written by the services just before it say which rows changed.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  if (!req.originalUrl.startsWith('/api')) return next();

  const startTime = Date.now();
  const path = req.originalUrl.split('?')[0];

  let body: unknown;
  const json = res.json.bind(res);
  res.json = (b: unknown) => { body = b; return json(b); };

  res.on('finish', () => {
    const status = res.statusCode;
    const isMutation = req.method !== 'GET' && !READ_ONLY_POSTS.includes(path);
    if (status < 400 && !isMutation && process.env.LOG_READS !== '1') return; // ~10 reads per page load

    const forwarded = req.headers['x-forwarded-for'];
    const ip = ((typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.socket.remoteAddress || '')
      .replace(/^::ffff:/, '');

    const parts = [`${req.method} ${req.originalUrl} → ${status}`, `${Date.now() - startTime}ms`];
    const detail = status >= 400 ? errorOf(body) : actionOf(req, path);
    if (detail) parts.push(detail);
    if (ip && !isLocal(ip)) parts.push(`จาก ${ip}`);

    const line = parts.join(' · ');
    if (status >= 500) log.error('api', line);
    else if (status >= 400) log.warn('api', line);
    else log.info('api', line);
  });

  next();
}
