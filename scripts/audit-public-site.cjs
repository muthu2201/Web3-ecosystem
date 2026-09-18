#!/usr/bin/env node
/*
 * Walk every public route and fail on what a user would actually notice.
 *
 * Written after an audit that reported 14/14 clean while every contract-backed page was rendering
 * the same "not deployed" placeholder. The checks were too shallow: no crash and no overflow, so
 * everything passed. A page can be perfectly healthy and still show nothing, which is why the
 * substantive check here is the guard text - if a page says the contracts are unregistered, it is
 * not reading the chain, whatever else it does.
 *
 * Usage:
 *   pnpm --filter "@web3eco/web..." build          # the ... matters; see below
 *   npx http-server apps/web/dist -p 4174 --proxy "http://127.0.0.1:4174?"
 *   node scripts/audit-public-site.cjs [baseUrl]
 *
 * Build the whole chain, not just the app. `--filter @web3eco/web` alone leaves the workspace
 * packages stale, and a stale chain-registry is exactly how a live deployment renders as
 * undeployed.
 */

const BASE = process.argv[2] ?? 'http://127.0.0.1:4174';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

/** A live token and curve on Base, so the detail routes are exercised against real state. */
const LIVE_CURVE = '0x2689e589305FeBE1a69c0223bfc807D47543b59C';
const LIVE_TOKEN = '0x7A5e1d1e63B6dD577433cB2165e941CA3bAa89a2';

const ROUTES = [
  '/', '/explore', '/launch', '/deploy', '/swap', '/presale', '/nft', '/lock', '/token',
  '/how-it-works',
  `/curve/${LIVE_CURVE}`, `/token/${LIVE_TOKEN}`,
  '/no-such-page', // must fall back to the overview rather than a blank screen
];

/*
 * Files the served site promises in its own <head>, and the type each must come back as.
 *
 * The site declared a large summary card with no image behind it, so every shared link rendered a
 * blank slot - invisible to every check here, because no page renders these. They are also the
 * files most at risk from the SPA rewrite: get that regex wrong and a missing PNG comes back as
 * 200 text/html, which a naive status check happily passes.
 */
const ASSETS = [
  ['/og.png', /^image\/png/],
  ['/apple-touch-icon.png', /^image\/png/],
  ['/icon-192.png', /^image\/png/],
  ['/icon-512.png', /^image\/png/],
  ['/favicon.svg', /^image\/svg/],
  ['/site.webmanifest', /json/],
];

/** Every URL the head points at must exist, and none may be swallowed by the SPA fallback. */
async function checkAssets(page) {
  let bad = 0;
  const declared = await page.evaluate(() =>
    [...document.querySelectorAll('link[href], meta[content]')]
      .map((el) => el.getAttribute('href') ?? el.getAttribute('content') ?? '')
      .filter((v) => /^\/[^/]|^https?:/.test(v) && /\.(png|svg|ico|webmanifest|jpe?g|webp)$/i.test(v)),
  );

  for (const [path, type] of ASSETS) {
    const res = await page.request.get(BASE + path).catch(() => null);
    const ct = res ? String(res.headers()['content-type'] ?? '') : '';
    const ok = res && res.status() === 200 && type.test(ct);
    if (!ok) bad += 1;
    console.log(
      `${ok ? 'ok   ' : 'FAIL '}      ${path.padEnd(46)}${String(res ? res.status() : '---').padStart(6)}    ${ct || '(no response)'}`,
    );
  }

  // A file referenced in the head but absent from ASSETS is one nothing above would have checked.
  const unchecked = declared.filter(
    (v) => !ASSETS.some(([p]) => v === p || v.endsWith(p)),
  );
  if (unchecked.length) {
    console.log(`       head references nothing checks: ${unchecked.join(' ')}`);
    bad += unchecked.length;
  }
  return bad;
}

const WIDTHS = [390, 1280];

/** Noise that is not the application's fault. */
const IGNORABLE = /fonts|preload|favicon|ERR_CERT/i;

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    // Local harness only. A sandboxed runner may intercept TLS with a CA this browser does not
    // trust; without this the RPC reads fail and every page is judged on its offline fallback.
    args: ['--ignore-certificate-errors'],
  });

  let problems = 0;

  const probe = await browser.newPage();
  await probe.goto(BASE + '/', { waitUntil: 'load', timeout: 30000 }).catch(() => {});
  problems += await checkAssets(probe);
  await probe.close();

  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(`PAGEERROR ${String(e.message).slice(0, 110)}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text().slice(0, 110));
      });

      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2600);

      const seen = await page
        .evaluate(() => {
          const de = document.documentElement;
          const text = document.body.innerText.trim();
          return {
            chars: text.length,
            overflow: de.scrollWidth > de.clientWidth,
            guarded: /Not deployed on|no contract addresses registered/i.test(text),
            // Proof this is our app and not the browser's own error page. A dead server renders
            // "This site can't be reached", which has plenty of text and no guard wording, so the
            // earlier checks passed it and the run reported ALL CLEAN against nothing at all.
            mounted: Boolean(document.querySelector('#root')?.firstElementChild),
            heading: (document.querySelector('h1,h2')?.innerText ?? '(none)').slice(0, 34),
          };
        })
        .catch(() => ({
          chars: 0, overflow: false, guarded: false, mounted: false, heading: '(eval failed)',
        }));

      const real = errors.filter((e) => !IGNORABLE.test(e));
      const flags = [];
      if (!seen.mounted) flags.push('APP DID NOT MOUNT — is the server up?');
      if (seen.guarded) flags.push('GUARDED — not reading the chain');
      if (seen.chars < 120) flags.push('NEARLY BLANK');
      if (seen.overflow) flags.push('HORIZONTAL OVERFLOW');
      if (real.length) flags.push(`${real.length} console error(s)`);
      if (flags.length) problems += 1;

      console.log(
        `${flags.length ? 'FAIL ' : 'ok   '}${String(width).padStart(4)} ${route.padEnd(46)}` +
          `${String(seen.chars).padStart(6)}ch  ${seen.heading.replace(/\n/g, ' ').padEnd(32)}` +
          (flags.length ? `<< ${flags.join(' | ')}` : ''),
      );
      real.slice(0, 2).forEach((e) => console.log(`       ${e}`));
      await page.close();
    }
  }

  console.log(
    `\n${problems === 0 ? 'ALL CLEAN' : `${problems} problem(s)`} across ` +
      `${ROUTES.length} routes x ${WIDTHS.length} widths`,
  );
  await browser.close();
  process.exit(problems ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
