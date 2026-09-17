/**
 * Turning a raw `riskFlags` bitmask into something a person can act on.
 *
 * The contracts publish which administrative powers a token grants. This module decides how
 * loudly to say so, and — more importantly — which combinations are disqualifying rather than
 * merely worth a warning.
 */

import { RISK_FLAGS, type RiskFinding, type RiskSeverity, type TokenTemplate } from './types.js';

interface FlagDescriptor {
  readonly flag: bigint;
  readonly code: string;
  readonly severity: RiskSeverity;
  readonly title: string;
  readonly detail: string;
}

/**
 * Severity is assigned by what the power lets someone DO to a holder, not by how unusual it is.
 * Anything that can take a holder's tokens or stop them selling is critical; anything that only
 * dilutes or complicates is a warning.
 */
const DESCRIPTORS: readonly FlagDescriptor[] = [
  {
    flag: RISK_FLAGS.CLAWBACK,
    code: 'CLAWBACK',
    severity: 'critical',
    title: 'Tokens can be seized',
    detail:
      'A privileged account can move tokens out of any holder’s wallet without their consent. ' +
      'Holding this token means trusting that account completely.',
  },
  {
    flag: RISK_FLAGS.BLOCKLIST,
    code: 'BLOCKLIST',
    severity: 'critical',
    title: 'Your address can be blocked',
    detail:
      'A privileged account can stop a specific address sending or receiving, which prevents you ' +
      'from selling.',
  },
  {
    flag: RISK_FLAGS.PAUSABLE,
    code: 'PAUSABLE',
    severity: 'critical',
    title: 'Transfers can be frozen',
    detail:
      'A privileged account can halt all transfers. While paused, nobody can sell at any price.',
  },
  {
    flag: RISK_FLAGS.ALLOWLIST,
    code: 'ALLOWLIST',
    severity: 'critical',
    title: 'Only approved addresses can trade',
    detail:
      'Transfers are restricted to an approved list. If you are removed from it, you cannot sell.',
  },
  {
    flag: RISK_FLAGS.UPGRADEABLE,
    code: 'UPGRADEABLE',
    severity: 'critical',
    title: 'The token’s code can be replaced',
    detail:
      'This contract can be upgraded, so the rules you are reading now can be changed later. ' +
      'Nothing verified today is guaranteed to hold tomorrow.',
  },
  {
    flag: RISK_FLAGS.MINTABLE,
    code: 'MINTABLE',
    severity: 'warning',
    title: 'More tokens can be created',
    detail:
      'A privileged account can mint additional supply, diluting existing holders. Check whether ' +
      'a supply cap applies and whether minting has been sealed.',
  },
  {
    flag: RISK_FLAGS.TAXED,
    code: 'TAXED',
    severity: 'warning',
    title: 'Trades are taxed',
    detail:
      'A percentage is taken on buys and sells. On this platform the rate can only ever be ' +
      'lowered, never raised, and it is capped at 10% — but you are still paying it on every trade.',
  },
  {
    flag: RISK_FLAGS.OWNED,
    code: 'OWNED',
    severity: 'info',
    title: 'The token has an owner',
    detail:
      'An owner account still holds administrative rights. Ownership has not been renounced.',
  },
  {
    flag: RISK_FLAGS.CAPPED,
    code: 'CAPPED',
    severity: 'info',
    title: 'Supply is capped',
    detail: 'A hard maximum supply is enforced by the contract and cannot be raised.',
  },
  {
    flag: RISK_FLAGS.VOTES,
    code: 'VOTES',
    severity: 'info',
    title: 'Governance token',
    detail: 'Balances are checkpointed for on-chain voting.',
  },
];

/** Decode a bitmask into findings, ordered most severe first. */
export function decodeRiskFlags(flags: bigint): RiskFinding[] {
  const order: Record<RiskSeverity, number> = { critical: 0, warning: 1, info: 2, none: 3 };
  return DESCRIPTORS.filter((d) => (flags & d.flag) !== 0n)
    .map(({ code, severity, title, detail }) => ({ code, severity, title, detail }))
    .sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Highest severity present in a set of findings. */
export function worstSeverity(findings: readonly RiskFinding[]): RiskSeverity {
  if (findings.some((f) => f.severity === 'critical')) return 'critical';
  if (findings.some((f) => f.severity === 'warning')) return 'warning';
  if (findings.some((f) => f.severity === 'info')) return 'info';
  return 'none';
}

/**
 * Whether a template may be launched on a bonding curve.
 *
 * Only `standard` qualifies, and this is a hard rule rather than a default. The reason a
 * permissionless one-click launcher is safe to offer at all is that every degen-mode token is
 * byte-identical: a buyer verifies the template once instead of auditing each new token. Allowing
 * a tax, a blocklist or a mint function into that flow would turn the launcher into a rug factory,
 * so the UI, the SDK and the contracts each enforce it independently.
 */
export function isBondingCurveEligible(template: TokenTemplate): boolean {
  return template === 'standard';
}

/**
 * Whether a token can be routed by aggregators and paired into concentrated-liquidity pools.
 *
 * Fee-on-transfer breaks Uniswap v3/v4 and most aggregator routes, so a taxed token is limited to
 * v2-style pools. Surfacing this at launch time is kinder than letting a project discover it once
 * their pool will not route.
 */
export function routabilityOf(flags: bigint): {
  full: boolean;
  reason: string | null;
  allowedPoolTypes: readonly string[];
} {
  if ((flags & RISK_FLAGS.TAXED) !== 0n) {
    return {
      full: false,
      reason:
        'Fee-on-transfer tokens are not cleanly supported by Uniswap v3/v4 or by most aggregator ' +
        'routes. Pair into a v2-style pool and expect limited routability.',
      allowedPoolTypes: ['uniswap-v2', 'pancakeswap-v2'],
    };
  }
  return {
    full: true,
    reason: null,
    allowedPoolTypes: ['uniswap-v2', 'uniswap-v3', 'uniswap-v4', 'pancakeswap-v2', 'aerodrome'],
  };
}

/**
 * Findings that must be acknowledged explicitly before the UI will let a trade proceed.
 * Warnings inform; these block.
 */
export function blockingFindings(findings: readonly RiskFinding[]): RiskFinding[] {
  return findings.filter((f) => f.severity === 'critical');
}
