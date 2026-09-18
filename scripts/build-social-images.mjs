#!/usr/bin/env node
/*
 * Render the site's social and home-screen images from the design tokens.
 *
 * These are the images a person sees before they ever reach the site: the card a link produces in
 * a chat app, and the tile an installed shortcut gets on a phone. The site declared
 * `twitter:card=summary_large_image` with no image behind it, which is worse than declaring
 * nothing - every shared link rendered a blank slot.
 *
 * Generated rather than drawn, so the palette here cannot drift from globals.css: change a hue
 * there, re-run this, and the card follows.
 *
 * Usage: node scripts/build-social-images.mjs
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/public');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const FONT = join(
  ROOT,
  'node_modules/.pnpm/@fontsource-variable+space-grotesk@5.3.0/node_modules',
  '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
);

/** The four product hues, copied from globals.css by way of the same oklch values. */
const NEON = {
  flux: 'oklch(0.782 0.172 194)',
  pulse: 'oklch(0.722 0.238 346)',
  volt: 'oklch(0.842 0.212 130)',
  nova: 'oklch(0.688 0.226 294)',
};
const INK_950 = '#0a0d12';

/** The favicon mark, at an arbitrary size. */
function mark(size, stroke = NEON.flux) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
    <path d="M3.5 18.5c5.2 0 8.5-2.1 10.4-6.2C15.4 9 16.9 6.5 20.5 5.3"
          stroke="${stroke}" stroke-width="2.1" stroke-linecap="round"/>
    <circle cx="20.5" cy="5.3" r="2" fill="${stroke}"/>
  </svg>`;
}

function shell(fontDataUrl, body, extraCss = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face {
      font-family: 'Space Grotesk Variable';
      src: url('${fontDataUrl}') format('woff2-variations');
      font-weight: 300 700;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: ${INK_950};
      font-family: 'Space Grotesk Variable', sans-serif;
      color: #f7f8fa;
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }
    ${extraCss}
  </style></head><body>${body}</body></html>`;
}

/* The 1200x630 card. Wordmark, one line of what it is, and the four hues doing their job. */
function ogCard(font) {
  const chips = [
    ['LAUNCH', NEON.pulse],
    ['PRESALE', NEON.nova],
    ['SWAP', NEON.flux],
    ['LOCK', NEON.volt],
  ]
    .map(
      ([label, c]) => `<span class="chip" style="--c:${c}">
         <i style="background:${c}"></i>${label}</span>`,
    )
    .join('');

  return shell(
    font,
    `<div class="card">
       <div class="grid"></div>
       <div class="glow glow-a"></div>
       <div class="glow glow-b"></div>
       <div class="content">
         <div class="brand">${mark(46)}<span>WEB3 ECOSYSTEM</span></div>
         <h1>Launch a coin.<br><em>Keep your keys.</em></h1>
         <p>Token factory, bonding-curve launchpad, presale, NFT suite and swap.
            Every action is a transaction you sign yourself.</p>
         <div class="chips">${chips}</div>
       </div>
       <div class="rule"></div>
     </div>`,
    `
    .card { position: relative; width: 1200px; height: 630px; overflow: hidden; }
    /* A floor rather than a wallpaper: perspective keeps it from reading as generic grid noise. */
    .grid {
      position: absolute; inset: -40% -20% -10% -20%;
      background-image:
        linear-gradient(to right, rgba(255,255,255,.055) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,.055) 1px, transparent 1px);
      background-size: 56px 56px;
      transform: perspective(620px) rotateX(58deg);
      transform-origin: 50% 100%;
      mask-image: linear-gradient(to top, #000 8%, transparent 62%);
    }
    .glow { position: absolute; border-radius: 999px; filter: blur(94px); opacity: .5; }
    .glow-a { width: 620px; height: 420px; left: -180px; top: -190px; background: ${NEON.flux}; }
    .glow-b { width: 560px; height: 380px; right: -150px; bottom: -180px; background: ${NEON.pulse}; opacity: .38; }
    .content { position: relative; padding: 68px 74px; }
    .brand {
      display: flex; align-items: center; gap: 16px;
      font-size: 21px; font-weight: 700; letter-spacing: .2em; color: #b6c0cd;
    }
    h1 {
      margin-top: 44px;
      font-size: 88px; font-weight: 700; line-height: .98; letter-spacing: -.042em;
    }
    h1 em {
      font-style: normal; color: ${NEON.flux};
      text-shadow: 0 0 46px color-mix(in oklch, ${NEON.flux} 55%, transparent);
    }
    p {
      margin-top: 30px; max-width: 730px;
      font-size: 24px; line-height: 1.42; color: #9aa5b4; font-weight: 400;
    }
    .chips { display: flex; gap: 12px; margin-top: 46px; }
    .chip {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 11px 20px 12px; border-radius: 999px;
      border: 1px solid color-mix(in oklch, var(--c) 42%, transparent);
      background: color-mix(in oklch, var(--c) 9%, transparent);
      font-size: 17px; font-weight: 700; letter-spacing: .1em; color: #e6eaf0;
    }
    .chip i { width: 8px; height: 8px; border-radius: 999px; display: block; }
    .rule {
      position: absolute; left: 0; right: 0; bottom: 0; height: 6px;
      background: linear-gradient(90deg, ${NEON.flux}, ${NEON.pulse}, ${NEON.nova}, ${NEON.volt});
    }
  `,
  );
}

/* A square tile. No wording: at 180px a word is a smudge, and the mark is the thing people learn. */
function tile(font, size) {
  const pad = Math.round(size * 0.21);
  return shell(
    font,
    `<div class="t">
       <div class="g"></div>
       ${mark(size - pad * 2)}
     </div>`,
    `
    .t {
      position: relative; width: ${size}px; height: ${size}px;
      display: flex; align-items: center; justify-content: center;
      background: ${INK_950};
    }
    .g {
      position: absolute; inset: 0;
      background: radial-gradient(120% 120% at 24% 18%,
        color-mix(in oklch, ${NEON.flux} 22%, transparent), transparent 62%);
    }
    svg { position: relative; }
  `,
  );
}

async function shoot(browser, html, size, file) {
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png' });
  await writeFile(join(OUT, file), buf);
  await page.close();
  console.log(`${file.padEnd(22)} ${size.width}x${size.height}  ${(buf.length / 1024).toFixed(1)} KB`);
}

async function main() {
  const font = `data:font/woff2;base64,${(await readFile(FONT)).toString('base64')}`;
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROME });
  await shoot(browser, ogCard(font), { width: 1200, height: 630 }, 'og.png');
  await shoot(browser, tile(font, 180), { width: 180, height: 180 }, 'apple-touch-icon.png');
  await shoot(browser, tile(font, 192), { width: 192, height: 192 }, 'icon-192.png');
  await shoot(browser, tile(font, 512), { width: 512, height: 512 }, 'icon-512.png');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
