const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const https = require('https');

const rootDir = path.join(__dirname, '../../');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const outputDir = path.join(rootDir, 'CashflowShark-Portable');

console.log('====================================================================');
console.log('🦈 BUILD SCRIPT: Cashflow Shark Standalone Windows Executable (.exe)');
console.log('====================================================================\n');

function downloadFile(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function runBuild() {
  try {
    // 1. Build Frontend
    console.log('📦 Step 1/5: Building React Frontend...');
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

    // 2. Build Backend TypeScript
    console.log('\n📦 Step 2/5: Building Backend TypeScript...');
    execSync('npm run build', { cwd: backendDir, stdio: 'inherit' });

    // 3. Copy Frontend Dist to Backend Dist
    console.log('\n📂 Step 3/5: Embedding Frontend assets into Backend distribution...');
    const frontendDist = path.join(frontendDir, 'dist');
    const backendFrontendDist = path.join(backendDir, 'dist', 'frontend_dist');
    fs.emptyDirSync(backendFrontendDist);
    fs.copySync(frontendDist, backendFrontendDist);

    // 4. Run PKG Bundler
    console.log('\n🔨 Step 4/5: Bundling into Standalone Executable with pkg@5.8.1...');
    const pkgCmd = 'npx -y pkg@5.8.1 dist/server.js --targets node18-win-x64 --output CashflowShark.exe';
    execSync(pkgCmd, { cwd: backendDir, stdio: 'inherit' });

    // 5. Assemble Isolated Portable Folder
    console.log('\n🚚 Step 5/5: Assembling isolated release directory: CashflowShark-Portable/...');
    fs.emptyDirSync(outputDir);

    // Copy Executable
    const exeSource = path.join(backendDir, 'CashflowShark.exe');
    const exeDest = path.join(outputDir, 'CashflowShark.exe');
    if (fs.existsSync(exeSource)) {
      fs.moveSync(exeSource, exeDest, { overwrite: true });
      console.log('  ✅ Copied: CashflowShark.exe');
    } else {
      throw new Error('CashflowShark.exe was not created properly by pkg.');
    }

    // Copy frontend static assets to Portable directory
    const outputFrontendDist = path.join(outputDir, 'frontend_dist');
    fs.emptyDirSync(outputFrontendDist);
    fs.copySync(frontendDist, outputFrontendDist);
    console.log('  ✅ Copied: frontend_dist/ (Web UI Static Assets)');

    // Fetch matching Node 18 (ABI 108) better_sqlite3.node binary
    console.log('  📥 Fetching Node 18 (ABI 108) better_sqlite3.node binary...');
    const tarUrl = 'https://github.com/WiseLibs/better-sqlite3/releases/download/v9.4.3/better-sqlite3-v9.4.3-node-v108-win32-x64.tar.gz';
    const tarPath = path.join(outputDir, 'node108.tar.gz');
    await downloadFile(tarUrl, tarPath);

    execSync(`tar -xzf "${tarPath}" -C "${outputDir}"`);
    const extractedBinding = path.join(outputDir, 'build/Release/better_sqlite3.node');
    const targetBinding = path.join(outputDir, 'better_sqlite3.node');

    if (fs.existsSync(extractedBinding)) {
      fs.copyFileSync(extractedBinding, targetBinding);
      fs.rmSync(path.join(outputDir, 'build'), { recursive: true, force: true });
      fs.unlinkSync(tarPath);
      console.log('  ✅ Installed: better_sqlite3.node (Node 18 ABI 108 compatible)');
    } else {
      throw new Error('Failed to extract better_sqlite3.node binary.');
    }

    // Create data directory
    const dataDir = path.join(outputDir, 'data');
    fs.ensureDirSync(dataDir);
    fs.writeFileSync(
      path.join(dataDir, 'README_DATA.txt'),
      'This directory contains your SQLite database (cashflow.db).\nKeep this folder safe when upgrading or backing up your data.\n'
    );
    console.log('  ✅ Created: data/ directory for SQLite database persistence');

    // Create User README.txt
    const readmeContent = `====================================================================
🦈 CASHFLOW SHARK - PORTABLE EDITION
====================================================================

วิธีใช้งานง่ายๆ:
1. ดับเบิ้ลคลิกไฟล์ "CashflowShark.exe" เพื่อเริ่มใช้งาน
2. ระบบจะเปิดหน้าต่าง Terminal แสดงสถานะ และเปิด Web Browser ไปยัง http://localhost:3000 ให้อัตโนมัติทันที!
3. ข้อมูลการเงินของคุณทั้งหมดจะถูกบันทึกไว้ในโฟลเดอร์ "data/cashflow.db" อย่างปลอดภัย

การสำรองข้อมูล (Backup):
- เพียงแค่ก๊อปปี้โฟลเดอร์ "data" ไปเก็บไว้ใน Flashdrive หรือ Cloud

คีย์ลัดใน Terminal:
- กด [O] : เปิด Web Browser อีกครั้ง
- กด [B] : สั่งสร้างไฟล์สำรองข้อมูล (Backup) ทันที
- กด [Q] : ปิดโปรแกรม

====================================================================
`;
    fs.writeFileSync(path.join(outputDir, 'README.txt'), readmeContent, 'utf8');
    console.log('  ✅ Created: README.txt user guide');

    console.log('\n====================================================================');
    console.log('🎉 BUILD SUCCESSFUL! All files packaged inside isolated directory:');
    console.log(`📁 ${outputDir}`);
    console.log('====================================================================');
  } catch (error) {
    console.error('\n❌ BUILD FAILED:', error.message);
    process.exit(1);
  }
}

runBuild();
