import { ArrowRight, Coins, FileLock2, Images, Lock, Repeat, Rocket } from 'lucide-react';
import type { JSX } from 'react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';

import { Badge, buttonClass, Panel, PulseDot } from '../components/ui/index.js';
import { neon, type Neon } from '../lib/neon.js';

// three.js stays out of the initial bundle: the page is interactive before the graphics arrive,
// and a visitor on a slow connection is not paying 600 KB to read the first line.
const CurveField = lazy(() => import('../components/CurveField.js'));

/**
 * One line each, in the words someone would use before they knew how any of it worked.
 *
 * The previous copy explained the mechanism — ownerless templates, aggregator fallbacks, atomic
 * settlement. That is true, and it belongs in the docs. On the way in, a person is deciding which
 * of six things they want, and every extra clause makes that decision slower.
 */
const PRODUCTS: readonly {
  to: string;
  icon: typeof Rocket;
  title: string;
  body: string;
  tone: Neon;
}[] = [
  {
    to: '/launch',
    icon: Rocket,
    title: 'Launch a coin',
    body: 'Start trading instantly on a price curve. Moves to a real exchange once it fills.',
    tone: 'pulse',
  },
  {
    to: '/deploy',
    icon: Coins,
    title: 'Create a token',
    body: 'Six ready-made kinds, from the simplest fixed supply to one you can pause and control.',
    tone: 'pulse',
  },
  {
    to: '/swap',
    icon: Repeat,
    title: 'Swap',
    body: 'Trade any two tokens at the best price we can find, with the cost shown before you sign.',
    tone: 'flux',
  },
  {
    to: '/presale',
    icon: FileLock2,
    title: 'Run a presale',
    body: 'Raise first, launch after. If the raise misses its target, everyone gets their money back.',
    tone: 'nova',
  },
  {
    to: '/nft',
    icon: Images,
    title: 'NFT collection',
    body: 'Set up a mint with phases and an allowlist, and sell without listing fees.',
    tone: 'nova',
  },
  {
    to: '/lock',
    icon: Lock,
    title: 'Lock & vest',
    body: 'Lock liquidity or release tokens on a schedule. Nobody can pull them out early.',
    tone: 'volt',
  },
];

export function HomePage(): JSX.Element {
  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <Hero />
      <Products />
      <Footnote />
    </div>
  );
}

function Hero(): JSX.Element {
  return (
    <section className="relative -mt-4">
      {/* The 3D surface sits behind the copy and is masked at the bottom so text stays readable */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-[min(70vh,540px)] [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
        <Suspense fallback={null}>
          <CurveField className="h-full w-full" />
        </Suspense>
      </div>

      {/* Ground plane under the hero. CSS rather than another canvas, so it costs nothing. */}
      <div className="grid-floor pointer-events-none absolute inset-x-0 -top-10 h-[min(60vh,460px)]" />

      <div className="relative pt-10 sm:pt-16">
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <Badge tone="volt">
            <PulseDot tone="volt" />
            Live on Base
          </Badge>
          <Badge tone="flux">0% fees</Badge>
        </div>

        {/*
          Not centred: a long line of centred display text is harder to read and is the single
          most recognisable tell of a generated landing page.
        */}
        <h1 className="max-w-4xl font-display text-[clamp(2.6rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.045em] text-ink-100">
          Launch a coin
          <br />
          <span style={neon('pulse')} className="neon-text">
            in one minute
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-300 sm:text-[18px]">
          Create tokens, run presales, mint NFTs and trade — from your own wallet. We never hold
          your funds.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/launch"
            style={neon('pulse')}
            className={`group ${buttonClass({ variant: 'primary', size: 'lg' })}`}
          >
            Launch a coin
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link to="/explore" className={buttonClass({ variant: 'outline', size: 'lg' })}>
            Browse live coins
          </Link>
        </div>

        {/*
          Numbers a person can act on. The previous set counted tests and static-analysis findings,
          which are reasons to trust the build rather than reasons to use it - and which mean
          nothing to someone who has never run a test suite.
        */}
        <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-ink-850 pt-7">
          {[
            ['$0.06', 'to launch', 'flux'],
            ['0%', 'platform fee', 'volt'],
            ['~2s', 'to confirm', 'nova'],
          ].map(([value, label, tone]) => (
            <div key={label}>
              <dt
                style={neon(tone as Neon)}
                className="neon-text font-display text-[clamp(1.5rem,5vw,2.1rem)] font-bold leading-none tracking-tight tabular"
              >
                {value}
              </dt>
              <dd className="mt-2 text-[12.5px] leading-snug text-ink-400">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Products(): JSX.Element {
  return (
    <section>
      <h2 className="mb-7 text-[clamp(1.6rem,4.4vw,2.4rem)]">Pick what you want to do</h2>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map(({ to, icon: Icon, title, body, tone }) => (
          <Link key={to} to={to} style={neon(tone)} className="group min-w-0">
            <Panel
              className="h-full transition-all duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:border-[color-mix(in_oklch,var(--neon)_45%,transparent)] group-hover:shadow-[0_0_38px_-14px_var(--neon)]"
            >
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-[12px] border border-ink-800 bg-ink-900/70 transition-all group-hover:border-[color-mix(in_oklch,var(--neon)_50%,transparent)] group-hover:bg-[color-mix(in_oklch,var(--neon)_14%,transparent)]">
                <Icon className="h-5 w-5 text-ink-300 transition-colors group-hover:text-[var(--neon)]" />
              </span>
              <h3 className="text-[17px] font-bold text-ink-100">{title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-400">{body}</p>
            </Panel>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Footnote(): JSX.Element {
  return (
    <section className="rounded-[var(--radius-shell)] border border-ink-850 bg-ink-925/60 px-5 py-6 sm:px-7">
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
        <div>
          <h3 className="text-[15px] font-bold text-ink-100">Your keys, your coins</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-400">
            Every action is a transaction you approve in your own wallet. Nothing here can move your
            funds or sign for you.
          </p>
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-warn-400">Not audited yet</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-400">
            These contracts are new and have not had a paid security review. Start small.{' '}
            <a
              href="https://github.com/muthu2201/Web3-ecosystem/blob/main/SECURITY.md"
              target="_blank"
              rel="noreferrer"
              className="text-ink-200 underline decoration-ink-700 underline-offset-2 hover:decoration-warn-400"
            >
              Details
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
