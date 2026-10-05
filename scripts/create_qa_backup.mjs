// scripts/create_qa_backup.mjs
import fs from 'node:fs';
import path from 'node:path';

const now = new Date();
const pad = n => String(n).padStart(2, '0');
const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
const backupDir = `backup_before_qa_fix_${ts}`;
console.log('Target backup dir:', backupDir);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const items = ['src', 'public', 'migrations', 'scripts', 'package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json', '.env.example', 'CLAUDE.md', 'BACKUP_MANIFEST.md'];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const item of items) {
  if (fs.existsSync(item)) {
    console.log('Backing up:', item);
    copyRecursive(item, path.join(backupDir, item));
  }
}
console.log('Backup created successfully:', backupDir);
