import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { Panel } from '../components/ui/index.js';
import { neon, type Neon } from '../lib/neon.js';

/**
 * The one place that explains things.
 *
 * Every product page used to carry its own paragraphs about what the contracts do and why. That
 * reading is real, but it belongs somewhere a person goes when they want it, not in front of
 * someone who has already decided to launch a coin and is looking for the button.
 *
 * What is described here is what each thing *does* for the person using it. How the platform picks
 * a venue, what it reads, and what it settles against are implementation, and implementation is in
 * the repository for anyone who wants to check it.
 */
interface Section {
  readonly id: string;
  readonly tone: Neon;
  readonly title: string;
  readonly lead: string;
  readonly points: readonly { readonly q: string; readonly a: string }[];
}

const SECTIONS: readonly Section[] = [
  {
    id: 'launch',
    tone: 'pulse',
    title: 'Launching a coin',
    lead: 'The fastest way to start. Your coin is tradeable the moment it exists — no need to find buyers or put up money first.',
    points: [
      {
        q: 'How the price works',
        a: 'The price starts low and rises as people buy. Early buyers pay less than late ones. Nobody sets the price by hand and it cannot be nudged.',
      },
      {
        q: 'What "graduation" means',
        a: 'Once everyone has bought the coins set aside for sale, the coin moves to a normal exchange and trades there like any other. Nothing you do triggers it and nobody can hold it back.',
      },
      {
        q: 'What happens to the money raised',
        a: 'It goes into the exchange as the pool that lets people trade, and is then put permanently beyond reach — nobody can withdraw it, including you and us.',
      },
      {
        q: 'What kind of coin you get',
        a: 'A fixed amount, no owner, no way to create more, no fees on transfers, and no way to freeze anyone. Those abilities are not switched off — they do not exist.',
      },
      {
        q: 'The honest part',
        a: 'Most coins launched this way never graduate. On comparable platforms, somewhere between 0.4% and 3% do. Do not spend money here that you need.',
      },
    ],
  },
  {
    id: 'tokens',
    tone: 'pulse',
    title: 'Creating a token',
    lead: 'Six ready-made kinds. Pick by what it lets someone do to a holder — that is the only difference that matters.',
    points: [
      { q: 'Standard', a: 'Fixed amount, nobody in charge, nothing anyone can do to a holder. The only kind a coin launch accepts.' },
      { q: 'Mintable', a: 'More can be created later, up to a limit you set. You can permanently give up that ability afterwards.' },
      { q: 'Pausable', a: 'Transfers can be stopped. Useful for a regulated product, alarming in anything else.' },
      { q: 'Governance', a: 'Holders can vote. Balances are recorded over time so a vote counts who held what and when.' },
      { q: 'Tax', a: 'A cut is taken on buys and sells. The rate can only ever be lowered, never raised, and is capped.' },
      { q: 'Compliance', a: 'Only approved addresses can hold or trade it. For cases where that is a legal requirement.' },
      {
        q: 'Why you cannot mix them',
        a: 'Each kind is a known, fixed piece of code. Letting people combine features would produce something nobody has checked.',
      },
    ],
  },
  {
    id: 'presale',
    tone: 'nova',
    title: 'Presales and fair launches',
    lead: 'Raise money first, launch after. For when you want a known amount of funding before trading starts.',
    points: [
      {
        q: 'If it hits the target',
        a: 'Buyers claim their tokens and part of the money becomes trading liquidity automatically.',
      },
      {
        q: 'If it misses',
        a: 'Everyone gets their money back. That is the only place the money can go — there is no path that sends it anywhere else.',
      },
      {
        q: 'Why it cannot be underfunded',
        a: 'A presale will not open until the tokens promised to buyers are already sitting in it. You cannot sell what you have not put in.',
      },
      {
        q: 'Fair launch',
        a: 'Same thing without a fixed price: everyone contributes, and the tokens are split by share of the total raised.',
      },
    ],
  },
  {
    id: 'nft',
    tone: 'nova',
    title: 'NFT collections',
    lead: 'Set up a mint and sell without listing fees.',
    points: [
      { q: 'Phases', a: 'Run an allowlist round before a public one, each with its own price and limits.' },
      { q: 'Freezing', a: 'You can permanently lock the artwork and details so they can never be swapped out later.' },
      { q: 'Selling', a: 'Buyers and sellers trade directly. Your collection can pay you a royalty on every resale.' },
    ],
  },
  {
    id: 'lock',
    tone: 'volt',
    title: 'Locks and vesting',
    lead: 'Prove tokens are not going anywhere.',
    points: [
      {
        q: 'Liquidity locks',
        a: 'Lock trading liquidity for a period you choose. It cannot be released early — there is no emergency button, for anyone.',
      },
      {
        q: 'Vesting',
        a: 'Release tokens to someone gradually. You can cancel what has not yet been released; you can never take back what has.',
      },
      { q: 'Cost', a: 'Free. This one has no fee and never will.' },
    ],
  },
  {
    id: 'swap',
    tone: 'flux',
    title: 'Swapping',
    lead: 'Trade any two tokens. You see the price and the cost before you sign.',
    points: [
      { q: 'Price', a: 'We look for the best available price and show it, including every cost, before you commit.' },
      { q: 'Slippage', a: 'Prices move between quoting and confirming. You set how much movement you will accept, and the trade fails rather than filling at a worse price.' },
    ],
  },
  {
    id: 'money',
    tone: 'volt',
    title: 'Fees and your money',
    lead: 'Currently zero, everywhere.',
    points: [
      {
        q: 'What it costs today',
        a: 'Nothing beyond the network fee — a few cents on Base, paid to the network and not to us.',
      },
      {
        q: 'If that changes',
        a: 'Any fee has a hard maximum built into the contracts that cannot be raised by anyone, and every increase is announced two days before it can take effect.',
      },
      {
        q: 'Who holds your funds',
        a: 'Nobody. Every action is a transaction you approve in your own wallet, and there is no account here that could hold or move your money.',
      },
    ],
  },
  {
    id: 'safety',
    tone: 'flux',
    title: 'What to know before spending real money',
    lead: 'The parts worth reading twice.',
    points: [
      {
        q: 'These contracts have not been audited',
        a: 'They are heavily tested, but that is not the same as a professional security review. Two of them hold user money during a launch or presale. Start small.',
      },
      {
        q: 'Most launches fail',
        a: 'That is the nature of the thing, not a flaw in it. Assume any coin you buy here may go to zero.',
      },
      {
        q: 'Check before you sign',
        a: 'Your wallet shows what a transaction actually does. Read it. That is true here and everywhere else.',
      },
    ],
  },
];

export function HowItWorksPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-2xl">
        <h1 className="text-[clamp(2rem,6vw,3rem)]">How it works</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-300">
          What each part does, in plain terms. Nothing here is required reading — every page works
          without it.
        </p>
      </header>

      <nav aria-label="Sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={neon(s.tone)}
            className="rounded-[var(--radius-pill)] border border-ink-800 px-3 py-1.5 text-[13px] font-semibold text-ink-300 transition-colors hover:border-[color-mix(in_oklch,var(--neon)_50%,transparent)] hover:text-[var(--neon)]"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} style={neon(s.tone)} className="scroll-mt-24">
          <Panel tone="lit">
            <h2 className="text-[clamp(1.4rem,4vw,1.9rem)]">{s.title}</h2>
            <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-300">{s.lead}</p>

            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {s.points.map((p) => (
                <div key={p.q} className="min-w-0">
                  <dt className="text-[14px] font-bold text-ink-100">{p.q}</dt>
                  <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-400">{p.a}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </section>
      ))}

      <p className="text-[13.5px] text-ink-500">
        Want the technical account — the contracts, the guarantees and how they are enforced? It is
        all in{' '}
        <a
          href="https://github.com/muthu2201/Web3-ecosystem"
          target="_blank"
          rel="noreferrer"
          className="text-ink-300 underline decoration-ink-700 underline-offset-2 hover:decoration-flux-500"
        >
          the repository
        </a>
        . Otherwise,{' '}
        <Link to="/launch" className="text-flux-400 underline decoration-flux-500/40 underline-offset-2">
          launch something
        </Link>
        .
      </p>
    </div>
  );
}
