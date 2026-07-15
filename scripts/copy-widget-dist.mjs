// Copies the built widget IIFE + loader from widget/dist into demo/public so the
// demo host page loads them exactly like an external site would (real artifact,
// real bundle size).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'widget', 'dist');
const publicDir = join(root, 'demo', 'public');

const files = ['call-widget.js', 'loader.js', 'call-widget.css'];

if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

let copied = 0;
for (const file of files) {
  const from = join(distDir, file);
  if (existsSync(from)) {
    cpSync(from, join(publicDir, file));
    copied += 1;
    console.log(`copied ${file} -> demo/public/${file}`);
  }
}

if (copied === 0) {
  console.error(
    'No widget build output in widget/dist. Run "npm run build:widget" first.',
  );
  process.exit(1);
}
