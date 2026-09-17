import { RISK_FLAGS, type TokenTemplate } from '@web3eco/core';

/**
 * The six audited templates, described in terms of what they let someone DO to a holder.
 *
 * `declaredFlags` mirrors what each contract's `riskFlags()` reports at deployment, so the
 * interface can warn before a user commits rather than after they read the profile page. The
 * contract remains the source of truth; this is the preview.
 */
export interface TemplateSpec {
  readonly id: TokenTemplate;
  readonly name: string;
  readonly summary: string;
  readonly detail: string;
  readonly declaredFlags: bigint;
  readonly needsAdmin: boolean;
  readonly needsCap: boolean;
  readonly needsTax: boolean;
  readonly curveEligible: boolean;
  readonly routability: 'full' | 'limited';
}

export const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 'standard',
    name: 'Standard',
    summary: 'Fixed supply, no owner, no privileged functions at all.',
    detail:
      'Supply is minted once and can only ever decrease, by a holder burning their own balance. ' +
      'There is no owner, no admin role, no mint path, no tax, no pause and no blocklist — not ' +
      'as settings switched off, but because that code does not exist in the contract. This is ' +
      'the only template a bonding curve will accept.',
    declaredFlags: RISK_FLAGS.NONE,
    needsAdmin: false,
    needsCap: false,
    needsTax: false,
    curveEligible: true,
    routability: 'full',
  },
  {
    id: 'mintable',
    name: 'Mintable',
    summary: 'Capped supply with role-gated minting that can be sealed permanently.',
    detail:
      'The supply cap is immutable, so the maximum dilution a holder can suffer is fixed at ' +
      'deployment and independently verifiable. Minting can be sealed one-way, after which the ' +
      'token reports no mint power at all.',
    declaredFlags: RISK_FLAGS.CAPPED | RISK_FLAGS.MINTABLE | RISK_FLAGS.OWNED,
    needsAdmin: true,
    needsCap: true,
    needsTax: false,
    curveEligible: false,
    routability: 'full',
  },
  {
    id: 'pausable',
    name: 'Pausable',
    summary: 'Fixed supply with an incident switch that can be surrendered forever.',
    detail:
      'While paused, nobody can sell at any price. That is a genuine freeze power and is shown ' +
      'as critical. Renouncing it unpauses first, so a token can never be left frozen with the ' +
      'power gone.',
    declaredFlags: RISK_FLAGS.PAUSABLE | RISK_FLAGS.OWNED,
    needsAdmin: true,
    needsCap: false,
    needsTax: false,
    curveEligible: false,
    routability: 'full',
  },
  {
    id: 'governance',
    name: 'Governance',
    summary: 'Capped supply with checkpointed voting power.',
    detail:
      'Uses a timestamp clock rather than block numbers, so voting windows behave identically ' +
      'across L2s with differing block times — a real correctness issue on Base and BNB Chain.',
    declaredFlags: RISK_FLAGS.CAPPED | RISK_FLAGS.VOTES | RISK_FLAGS.MINTABLE | RISK_FLAGS.OWNED,
    needsAdmin: true,
    needsCap: true,
    needsTax: false,
    curveEligible: false,
    routability: 'full',
  },
  {
    id: 'tax',
    name: 'Tax',
    summary: 'A buy/sell fee whose rate can only ever be lowered.',
    detail:
      'The classic honeypot is to launch at 3% and quietly raise the sell tax to 99% once ' +
      'liquidity arrives. That is impossible here: the per-deployment ceiling is immutable, the ' +
      'absolute ceiling is 10% in the bytecode, and setTaxes reverts if either rate would rise. ' +
      'Wallet-to-wallet transfers are never taxed.',
    declaredFlags: RISK_FLAGS.TAXED | RISK_FLAGS.OWNED,
    needsAdmin: true,
    needsCap: false,
    needsTax: true,
    curveEligible: false,
    routability: 'limited',
  },
  {
    id: 'compliance',
    name: 'Compliance',
    summary: 'Allowlist, blocklist, pause and clawback. Custodial in effect.',
    detail:
      'A custodian can seize any holder’s balance and an admin can freeze all transfers. This ' +
      'exists because regulated issuers are legally required to hold those powers — not because ' +
      'it is safe for a retail holder. It is permanently barred from bonding-curve mode.',
    declaredFlags:
      RISK_FLAGS.CLAWBACK |
      RISK_FLAGS.BLOCKLIST |
      RISK_FLAGS.PAUSABLE |
      RISK_FLAGS.MINTABLE |
      RISK_FLAGS.OWNED,
    needsAdmin: true,
    needsCap: false,
    needsTax: false,
    curveEligible: false,
    routability: 'full',
  },
];

export function templateById(id: TokenTemplate): TemplateSpec {
  const spec = TEMPLATES.find((t) => t.id === id);
  if (!spec) throw new Error(`unknown template "${id}"`);
  return spec;
}

/** Cryptographically random CREATE2 salt. */
export function randomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
