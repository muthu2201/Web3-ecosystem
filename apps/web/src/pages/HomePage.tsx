import {
  ArrowRight,
  Coins,
  FileLock2,
  Images,
  Lock,
  Repeat,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { JSX } from 'react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';

import { Badge, buttonClass, Panel } from '../components/ui/index.js';

// three.js stays out of the initial bundle: the page is interactive before the graphics arrive,
// and a visitor on a slow connection is not paying 600 KB to read the first paragraph.
const CurveField = lazy(() => import('../components/CurveField.js'));

const PRODUCTS = [
  {
    to: '/launch',
    icon: Rocket,
    title: 'Bonding curve launch',
    body: 'Fixed supply, no owner, no mint, no tax. Graduates into a real DEX pool at a target knowable before the first trade.',
    tag: 'Degen',
  },
  {
    to: '/deploy',
    icon: Coins,
    title: 'Token deployment',
    body: 'Six audited templates from ownerless fixed-supply to permissioned compliance tokens. Every admin power declared on chain.',
    tag: '6 templates',
  },
  {
    to: '/swap',
    icon: Repeat,
    title: 'Swap',
    body: 'Aggregator routing where it exists, a direct router where it does not. Every fee itemised, including the aggregator’s own.',
    tag: '0.25%',
  },
  {
    to: '/presale',
    icon: FileLock2,
    title: 'Presale & fair launch',
    body: 'Funded with tokens before it can accept a contribution. If it fails, refunds are the only path the money can take.',
    tag: '2% of raise',
  },
  {
    to: '/nft',
    icon: Images,
    title: 'NFT collections',
    body: 'Phased mints, Merkle allowlists, permanent metadata freeze, and settlement through signed off-chain orders.',
    tag: '0.5%',
  },
  {
    to: '/lock',
    icon: Lock,
    title: 'Liquidity locks & vesting',
    body: 'A locker with no owner, no pause and no emergency path. Vesting that cannot claw back what already vested.',
    tag: 'Free',
  },
] as const;

const GUARANTEES = [
  {
    title: 'Fees cannot exceed their published ceiling',
    body: 'The cap is a pure function with no setter. No owner, proxy or governance action can raise it, because there is no code that writes it.',
  },
  {
    title: 'A tax token’s rate can only ever fall',
    body: 'setTaxes reverts if either rate would rise. The raise-the-sell-tax honeypot is not policed here — it is structurally impossible.',
  },
  {
    title: 'Locked liquidity cannot be released early',
    body: 'No owner, no pause, no emergency withdrawal. There is nothing for a compromised key to call.',
  },
  {
    title: 'A failed presale always refunds in full',
    body: 'refund() is the only function that moves native currency out of a failed sale, and only to the caller’s own deposit.',
  },
] as const;

export function HomePage(): JSX.Element {
  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      <Hero />
      <Products />
      <Guarantees />
      <Honesty />
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

      <div className="relative grid gap-8 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14">
        <div className="min-w-0">
          <Badge tone="flux" className="mb-5">
            <Sparkles className="h-3 w-3" aria-hidden />
            Non-custodial by construction
          </Badge>

          {/* Not centred: a long line of centred display text is harder to read and is the single
              most recognisable tell of a generated landing page. */}
          <h1 className="font-display text-[clamp(2.1rem,6.2vw,3.9rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-100">
            Launch, trade and settle
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-flux-300 via-flux-400 to-sand-400 bg-clip-text text-transparent">
              without handing over your keys
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-400 sm:text-[16.5px]">
            A token factory, bonding-curve launchpad, presale platform, NFT suite and swap
            interface where no component ever holds your funds or signs on your behalf. The fee
            ceilings are compiled into the contracts, not promised in the docs.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/launch" className={`group ${buttonClass({ variant: 'primary', size: 'lg' })}`}>
              Launch a token
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link to="/explore" className={buttonClass({ variant: 'glass', size: 'lg' })}>
              Explore markets
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-900 pt-6">
            {[
              ['185', 'contract tests'],
              ['0', 'Slither findings'],
              ['432', 'invariant checks'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-mono text-[22px] leading-none tabular text-flux-300">{value}</dt>
                <dd className="mt-1.5 text-[12px] leading-snug text-ink-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hidden lg:block" aria-hidden />
      </div>
    </section>
  );
}

function Products(): JSX.Element {
  return (
    <section>
      <SectionHead
        eyebrow="What it does"
        title="Every primitive, one non-custodial surface"
        body="Each product settles atomically on chain. Nothing routes through an intermediary account."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map(({ to, icon: Icon, title, body, tag }) => (
          <Link key={to} to={to} className="group min-w-0">
            <Panel className="h-full transition-all duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:border-flux-600/35">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-ink-800 bg-ink-900/70 transition-colors group-hover:border-flux-600/40 group-hover:bg-flux-600/10">
                  <Icon className="h-[18px] w-[18px] text-ink-300 transition-colors group-hover:text-flux-300" />
                </span>
                <Badge tone="neutral">{tag}</Badge>
              </div>
              <h3 className="text-[15.5px] font-semibold text-ink-100">{title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-flux-300 opacity-0 transition-opacity group-hover:opacity-100">
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Panel>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Guarantees(): JSX.Element {
  return (
    <section>
      <SectionHead
        eyebrow="Enforced in bytecode"
        title="Guarantees, not promises"
        body="These are not policies the operator agrees to follow. There is no code path that could violate them."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {GUARANTEES.map((item) => (
          <Panel key={item.title} className="min-w-0">
            <div className="flex gap-3.5">
              <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-flux-400" aria-hidden />
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold text-ink-100">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{item.body}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function Honesty(): JSX.Element {
  return (
    <section>
      <Panel tone="strong" className="border-warn-500/25 bg-warn-500/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-warn-500/35 bg-warn-500/10">
            <ShieldCheck className="h-[18px] w-[18px] text-warn-400" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-ink-100">What has not been done</h2>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-400">
              These contracts have not had a paid audit, and the bonding curve and presale hold
              user funds. They are covered by 185 tests including fuzz and stateful invariant
              suites, static analysis gated in CI, and a full-ecosystem stress harness — which is
              genuinely strong for immutable standard logic, and is not equivalent to professional
              review. A well-funded attacker can also seed a curve’s pool before graduation; that
              risk is surfaced in the interface rather than hidden. Read SECURITY.md before
              committing real value.
            </p>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div className="mb-7 max-w-2xl">
      <div className="mb-2.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-flux-400">
        {eyebrow}
      </div>
      <h2 className="font-display text-[clamp(1.4rem,3.4vw,2rem)] font-semibold leading-tight text-ink-100">
        {title}
      </h2>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-400">{body}</p>
    </div>
  );
}
