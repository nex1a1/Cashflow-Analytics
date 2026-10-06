import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import backupService from '../services/backupService';
import transactionService from '../services/transactionService';
import { resetAllData } from '../controllers/transactionController';

// BACKUP_DIR keeps these tests away from the real backups folder (pruning deletes files there).
let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
  process.env.BACKUP_DIR = dir;
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKUP_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const touch = (name: string) => fs.writeFileSync(path.join(dir, name), '');

describe('backupService', () => {
  it('writes daily + monthly + master copies and prunes only daily files older than 7 days', async () => {
    touch('backup-2000-01-01.db');     // old daily → pruned
    touch('Cashflow-2000-01.db');      // monthly → kept forever
    touch('pre-reset-2000-01-01-120000.db'); // pre-reset → never pruned

    const r = await backupService.createBackup();

    const files = fs.readdirSync(dir);
    expect(files).toContain(r.filename);
    expect(files).toContain('Cashflow.db');
    expect(files).toContain('Cashflow-2000-01.db');
    expect(files).toContain('pre-reset-2000-01-01-120000.db');
    expect(files).not.toContain('backup-2000-01-01.db');
  });

  it('pre-reset backup gets its own file that a later backup does not touch', async () => {
    const name = await backupService.createPreResetBackup();
    expect(name).toMatch(/^pre-reset-\d{4}-\d{2}-\d{2}-\d{6}\.db$/);
    await backupService.createBackup();
    expect(fs.existsSync(path.join(dir, name))).toBe(true);
  });
});

describe('reset-all', () => {
  const res = () => {
    const r: any = { statusCode: 200 };
    r.status = (s: number) => { r.statusCode = s; return r; };
    r.json = (b: unknown) => { r.body = b; return r; };
    return r;
  };

  it('never wipes when the safety backup fails', async () => {
    vi.spyOn(backupService, 'createPreResetBackup').mockRejectedValue(new Error('disk full'));
    const wipe = vi.spyOn(transactionService, 'deleteAll');
    const next = vi.fn();
    await resetAllData({ headers: { 'x-confirm-reset': 'true' } } as any, res(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(wipe).not.toHaveBeenCalled();
  });

  it('refuses without the confirmation header', async () => {
    const wipe = vi.spyOn(transactionService, 'deleteAll');
    const r = res();
    await resetAllData({ headers: {} } as any, r, vi.fn());
    expect(r.statusCode).toBe(400);
    expect(wipe).not.toHaveBeenCalled();
  });
});
