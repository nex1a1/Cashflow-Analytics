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

class BackupService {
  private getBackupDir(): string {
    const isPkg = Boolean((process as any).pkg);
    const baseDir = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '../../');
    return path.join(baseDir, 'backups');
  }

  async createBackup(): Promise<BackupResult> {
    const backupDir = this.getBackupDir();

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const dayName = days[now.getDay()];

    // Pro Rotation: backup-Mon.db, backup-Tue.db, etc.
    const backupFileName = `backup-${dayName}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // better-sqlite3 native backup method
    await db.backup(backupPath);

    // Also keep one timestamped "Master" backup per month
    const monthStr = now.toISOString().substring(0, 7);
    const masterFileName = `master-${monthStr}.db`;
    const masterPath = path.join(backupDir, masterFileName);
    let masterCreated = false;

    if (!fs.existsSync(masterPath)) {
      await db.backup(masterPath);
      masterCreated = true;
      console.log(`📦 Master backup created for ${monthStr}`);
    }

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
