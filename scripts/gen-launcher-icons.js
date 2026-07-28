#!/usr/bin/env node
/**
 * Regenerates Android launcher icons from the source art in assets/.
 *
 * Why not `expo prebuild`: android/ carries hand-maintained native edits
 * (manifest permissions, Facebook activity, speech-recognition queries) that a
 * prebuild would clobber. This touches only the mipmap-* icon files.
 *
 *   node scripts/gen-launcher-icons.js            # write into android/
 *   node scripts/gen-launcher-icons.js --out /tmp # dry run into another dir
 *
 * Sources: assets/icon.png (square) and assets/adaptive-icon.png (adaptive
 * foreground). Both should be 1024x1024 PNG.
 */
const path = require('path');
const fs = require('fs');
const { generateImageAsync } = require('@expo/image-utils');

const ROOT = path.resolve(__dirname, '..');
const outFlag = process.argv.indexOf('--out');
const OUT_ROOT =
  outFlag !== -1
    ? path.resolve(process.argv[outFlag + 1])
    : path.join(ROOT, 'android/app/src/main/res');

// Launcher icon is 48dp; the adaptive foreground is 108dp at the same densities.
const DENSITIES = [
  { dir: 'mdpi', launcher: 48, foreground: 108 },
  { dir: 'hdpi', launcher: 72, foreground: 162 },
  { dir: 'xhdpi', launcher: 96, foreground: 216 },
  { dir: 'xxhdpi', launcher: 144, foreground: 324 },
  { dir: 'xxxhdpi', launcher: 192, foreground: 432 },
];

async function resize(srcPath, size, name) {
  const { source } = await generateImageAsync(
    { projectRoot: ROOT, cacheType: 'konnect-launcher' },
    {
      src: srcPath,
      name,
      width: size,
      height: size,
      resizeMode: 'cover',
      backgroundColor: 'transparent',
    },
  );
  return source;
}

async function main() {
  const iconSrc = path.join(ROOT, 'assets/icon.png');
  const adaptiveSrc = path.join(ROOT, 'assets/adaptive-icon.png');

  for (const src of [iconSrc, adaptiveSrc]) {
    if (!fs.existsSync(src)) {
      console.error(`ERROR: missing source image ${path.relative(ROOT, src)}`);
      process.exit(1);
    }
  }

  for (const d of DENSITIES) {
    const dir = path.join(OUT_ROOT, `mipmap-${d.dir}`);
    fs.mkdirSync(dir, { recursive: true });

    // jimp emits PNG bytes, so write .png. Android resolves resources by NAME
    // (ic_launcher), not extension — but a leftover ic_launcher.webp alongside
    // ic_launcher.png is a duplicate-resource build error, so clear those.
    for (const stale of ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp']) {
      const p = path.join(dir, stale);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    const square = await resize(iconSrc, d.launcher, `ic_launcher-${d.dir}.png`);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), square);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), square);

    const fg = await resize(adaptiveSrc, d.foreground, `ic_launcher_foreground-${d.dir}.png`);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg);

    console.log(
      `mipmap-${d.dir.padEnd(8)} launcher=${d.launcher}px foreground=${d.foreground}px`,
    );
  }
  console.log(`\nWrote launcher icons into ${path.relative(ROOT, OUT_ROOT) || OUT_ROOT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
