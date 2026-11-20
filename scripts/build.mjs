import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Publish only app files, never repository documentation, tests or private archives.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const publicFiles = [
  'index.html',
  'privacy.html',
  'manifest.webmanifest',
  'app.js',
  'art.js',
  'crypto.js',
  'db.js',
  'model.js',
  'styles.css',
  'painting.css',
  'sw.js',
  '_headers',
  'assets',
];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const filename of publicFiles) {
  await cp(join(root, filename), join(output, filename), { recursive: true });
}
console.log('Static assets staged. Bundling private transcription…');
