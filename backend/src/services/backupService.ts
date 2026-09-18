import fs from 'node:fs';
import path from 'node:path';
import db from '../config/db';

export interface BackupResult {
  success: boolean;
  filename: string;
  masterCreated: boolean;
}

export interface BackupFileInfo {
  name: string;
  size: number;
  createdAt: Date;
}

const RETENTION_DAYS = 7;

class BackupService {
  private getBackupDir(): string {
    const baseDir = path.join(__dirname, '../../');
    return path.join(baseDir, 'backups');
  }

  private getLocalDateStr(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private getLocalMonthStr(date: Date): string {
    return this.getLocalDateStr(date).substring(0, 7);
  }

  private pruneOldBackups(backupDir: string, now: Date): void {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffStr = this.getLocalDateStr(cutoff);

    for (const file of fs.readdirSync(backupDir)) {
      const match = /^backup-(\d{4}-\d{2}-\d{2})\.db$/.exec(file);
      if (match && match[1] < cutoffStr) {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`🗑️ Pruned old backup (>${RETENTION_DAYS}d): ${file}`);
      }
    }
  }

  async createBackup(): Promise<BackupResult> {
    const backupDir = this.getBackupDir();

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();

    // Dated daily snapshot: backup-2026-09-18.db (unambiguous, self-sorting)
    const backupFileName = `backup-${this.getLocalDateStr(now)}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // better-sqlite3 native backup method
    await db.backup(backupPath);

    // Dated monthly snapshot, kept permanently: Cashflow-2026-09.db
    const monthStr = this.getLocalMonthStr(now);
    const monthlyFileName = `Cashflow-${monthStr}.db`;
    const monthlyPath = path.join(backupDir, monthlyFileName);
    let masterCreated = false;

    if (!fs.existsSync(monthlyPath)) {
      await db.backup(monthlyPath);
      masterCreated = true;
      console.log(`📦 Monthly backup created for ${monthStr}`);
    }

    // Master snapshot: no date, always overwritten with the latest state
    await db.backup(path.join(backupDir, 'Cashflow.db'));

    this.pruneOldBackups(backupDir, now);

    console.log(`📡 Backup successful: ${backupFileName}`);

    return {
      success: true,
      filename: backupFileName,
      masterCreated
    };
  }

  listBackups(): BackupFileInfo[] {
    const backupDir = this.getBackupDir();

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    return fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return {
          name: f,
          size: stat.size,
          createdAt: stat.mtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export default new BackupService();
