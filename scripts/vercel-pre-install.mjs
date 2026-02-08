/**
 * Vercel ビルド時のみ実行するインストール前スクリプト
 * devDependencies から supabase CLI を一時的に除外し、
 * bin 作成失敗の WARN (ENOENT) を防ぐ
 * ローカルでは実行しない（VERCEL 環境変数のみ）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkgPath = join(root, 'package.json');

if (process.env.VERCEL !== '1') {
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (!pkg.devDependencies?.supabase) {
  process.exit(0);
}

delete pkg.devDependencies.supabase;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('[vercel-pre-install] supabase をインストール対象から除外しました');
