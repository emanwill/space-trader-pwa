#!/usr/bin/env node
// Converts the original game's BMP assets in reference/ to PNGs in public/.
//
// Requires ImageMagick (`convert` on PATH). The output is committed, so CI and
// other contributors don't need ImageMagick. Re-run with `npm run assets` only
// when changing this script.
//
// Transparency follows the original ImageLists' TransparentColor settings:
// most sprites (ships, equipment, chart dots, tribbles, encounter icons, arrows)
// use white, and the 160x160 scene images are opaque. The ship designer's
// custom/ images are not converted yet, because the designer is deferred.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const srcDir = join(root, 'reference', 'images');
const outDir = join(root, 'public', 'images');
const iconDir = join(root, 'public', 'icons');
const appIcon = join(root, 'reference', 'App.ico');

// Background for opaque icons (maskable, apple-touch). Matches the manifest.
const ICON_BG = '#0b0e1a';

const OPAQUE = new Set(['splash', 'moon', 'moongirl', 'destroyed', 'retire', 'find']);
const SKIP_EXT = new Set(['.psp', '.jbf', '.jpg']); // splash.jpg duplicates splash.bmp

function im(...args) {
  execFileSync('convert', args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

function convertImages() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const file of readdirSync(srcDir).sort()) {
    const ext = extname(file).toLowerCase();
    if (file.startsWith('.') || SKIP_EXT.has(ext)) continue;

    const name = basename(file, extname(file));
    const src = join(srcDir, file);
    const dest = join(outDir, `${name}.png`);

    // Shipyard logos (sy-*) used black as transparent, but their edges are
    // anti-aliased against black, so keying it out leaves a ragged fringe.
    // Keep them opaque and display them on a black background.
    if (ext === '.gif' || OPAQUE.has(name) || name.startsWith('sy-')) im(src, '-strip', dest);
    else im(src, '-transparent', 'white', '-strip', dest);
    count++;
  }
  console.log(`images: ${count} files -> ${outDir}`);
}

// Scales the 32x32 app icon by the largest integer factor that fits `fraction`
// of `size`, centred on a `size`x`size` canvas.
function icon(dest, size, { fraction, background }) {
  const trimmed = execFileSync('convert', [`${appIcon}[0]`, '-trim', '-format', '%w %h', 'info:'])
    .toString()
    .trim()
    .split(' ')
    .map(Number);
  const factor = Math.max(1, Math.floor((size * fraction) / Math.max(...trimmed)));
  im(
    `${appIcon}[0]`,
    '-trim',
    '+repage',
    '-filter',
    'point',
    '-resize',
    `${factor * 100}%`,
    '-background',
    background,
    '-gravity',
    'center',
    '-extent',
    `${size}x${size}`,
    '-strip',
    dest,
  );
}

function convertIcons() {
  rmSync(iconDir, { recursive: true, force: true });
  mkdirSync(iconDir, { recursive: true });

  icon(join(iconDir, 'favicon-32.png'), 32, { fraction: 1, background: 'none' });
  icon(join(iconDir, 'icon-192.png'), 192, { fraction: 0.9, background: 'none' });
  icon(join(iconDir, 'icon-512.png'), 512, { fraction: 0.9, background: 'none' });
  // Maskable icons must keep content inside the central 80% circle.
  icon(join(iconDir, 'icon-maskable-512.png'), 512, { fraction: 0.6, background: ICON_BG });
  icon(join(iconDir, 'apple-touch-icon-180.png'), 180, { fraction: 0.75, background: ICON_BG });
  console.log(`icons -> ${iconDir}`);
}

convertImages();
convertIcons();
