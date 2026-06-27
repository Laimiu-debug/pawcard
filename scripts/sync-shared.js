// scripts/sync-shared.js
// 把 shared/*.ts 编译为 JS 并拷进指定云函数目录。
// 用法: npm run sync:shared -- catchPet recoverBalls getCardDetail ...
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHARED_FILES = ['types.ts', 'rarity-engine.ts', 'balls-recovery.ts', 'art-provider.ts'];
const ROOT = path.resolve(__dirname, '..');
const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('用法: node scripts/sync-shared.js <cloudfn> [cloudfn...]');
  process.exit(1);
}

for (const fn of targets) {
  const dir = path.join(ROOT, 'cloudfunctions', fn);
  if (!fs.existsSync(dir)) { console.warn('跳过不存在的:', dir); continue; }
  for (const f of SHARED_FILES) {
    const src = path.join(ROOT, 'shared', f);
    if (!fs.existsSync(src)) continue;
    execSync(`npx tsc "${src}" --outDir "${dir}" --target ES2018 --module commonjs --skipLibCheck --esModuleInterop`, { stdio: 'inherit' });
    console.log(`synced ${f} -> ${fn}/`);
  }
}
