#!/usr/bin/env node
// Generate responsive cover-image variants from posts/covers/*.webp.
// Requires ffmpeg on PATH (uses libwebp).
//
// For each /posts/covers/<slug>.webp (without a -NNNw suffix), this writes
// <slug>-720w.webp and <slug>-1440w.webp. The renderer uses these in a srcset
// so mobile clients don't have to download the full-resolution cover.

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const COVERS_DIR = path.join(ROOT, 'posts', 'covers');
const SIZES = [720, 1440];
const QUALITY = 78;
const VARIANT_RE = /-(\d+)w\.webp$/i;

function hasFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasFfmpeg()) {
  console.error('ffmpeg not found on PATH. Install ffmpeg (with libwebp) and rerun.');
  process.exit(1);
}

if (!fs.existsSync(COVERS_DIR)) {
  console.error('No posts/covers/ directory. Nothing to do.');
  process.exit(0);
}

const files = fs.readdirSync(COVERS_DIR)
  .filter(f => f.toLowerCase().endsWith('.webp'))
  .filter(f => !VARIANT_RE.test(f));

let total = 0;
for (const file of files) {
  const slug = file.replace(/\.webp$/i, '');
  const src = path.join(COVERS_DIR, file);
  for (const w of SIZES) {
    const out = path.join(COVERS_DIR, `${slug}-${w}w.webp`);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) {
      continue; // up-to-date
    }
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', src,
      '-vf', `scale=${w}:-1`,
      '-c:v', 'libwebp',
      '-quality', String(QUALITY),
      '-y', out,
    ], { stdio: 'inherit' });
    const bytes = fs.statSync(out).size;
    console.log(`  ${path.relative(ROOT, out)}  ${(bytes / 1024).toFixed(1)} KB`);
    total++;
  }
}

console.log(total ? `Wrote ${total} variant(s).` : 'All variants up to date.');
