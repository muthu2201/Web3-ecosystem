/**
 * Token risk scanning through GoPlus, layered on top of the on-chain flags the contracts publish.
 *
 * FAILURE MUST NOT READ AS SAFETY. If GoPlus is unreachable, rate-limited or returns something
 * unparseable, this returns a report whose `sources` list is empty and which carries an explicit
 * "could not be checked" finding. It never returns an empty finding list, because an empty list
 * renders as a green tick and a silent failure that looks like an all-clear is worse than no
 * check at all.
 */

import type { Caip19, RiskReport, RiskFinding } from '@web3eco/core';
import { evmChainId, parseCaip19 } from '@web3eco/core';
import type { RiskScannerPort } from '@web3eco/ports';

import { HttpClient } from './http.js';

export interface GoPlusOptions {
  /** Edge proxy base URL. Keeps any key server-side and lets the platform cache responses. */
  readonly baseUrl: string;
  readonly http?: HttpClient;
}

interface GoPlusResult {
  readonly code?: number;
  readonly message?: string;
  readonly result?: Record<string, GoPlusToken | undefined>;
}

interface GoPlusToken {
  readonly is_honeypot?: string;
  readonly cannot_sell_all?: string;
  readonly is_blacklisted?: string;
  readonly is_whitelisted?: string;
  readonly is_mintable?: string;
  readonly is_proxy?: string;
  readonly can_take_back_ownership?: string;
  readonly owner_change_balance?: string;
  readonly hidden_owner?: string;
  readonly selfdestruct?: string;
  readonly transfer_pausable?: string;
  readonly trading_cooldown?: string;
  readonly is_anti_whale?: string;
  readonly slippage_modifiable?: string;
  readonly personal_slippage_modifiable?: string;
  readonly buy_tax?: string;
  readonly sell_tax?: string;
  readonly is_open_source?: string;
  readonly holder_count?: string;
  readonly lp_holder_count?: string;
}

/** A GoPlus boolean field: "1" means yes, anything else means no or unknown. */
function flagged(value: string | undefined): boolean {
  return value === '1';
}

function taxBps(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  return Math.round(asNumber * 10_000);
}

export class GoPlusRiskAdapter implements RiskScannerPort {
  readonly id = 'goplus';
  private readonly http: HttpClient;

  constructor(private readonly options: GoPlusOptions) {
    this.http = options.http ?? new HttpClient({ timeoutMs: 6_000, maxRetries: 2 });
  }

  async scan(asset: Caip19): Promise<RiskReport> {
    const now = Date.now();
    let parsed;
    try {
      parsed = parseCaip19(asset);
    } catch {
      return unavailable(asset, now, 'asset identifier could not be parsed');
    }

    let chainId: number;
    try {
      chainId = evmChainId(parsed.chain);
    } catch {
      return unavailable(asset, now, 'GoPlus covers EVM chains only');
    }

    const address = parsed.assetReference.toLowerCase();
    const url =
      `${this.options.baseUrl.replace(/\/$/, '')}/token_security/${chainId}` +
      `?contract_addresses=${address}`;

    let payload: GoPlusResult;
    try {
      payload = await this.http.getJson<GoPlusResult>(url);
    } catch (err) {
      return unavailable(
        asset,
        now,
        err instanceof Error ? err.message : 'the scanner could not be reached',
      );
    }

    const token = payload.result?.[address];
    if (!token) {
      return unavailable(asset, now, 'the scanner returned no data for this token');
    }

    return { asset, findings: interpret(token), checkedAt: now, sources: ['goplus'] };
  }
}

/**
 * A report meaning "we do not know", which must never be confused with "this is fine".
 * The finding is deliberately `warning` rather than `info` so it renders visibly.
 */
function unavailable(asset: Caip19, checkedAt: number, reason: string): RiskReport {
  return {
    asset,
    findings: [
      {
        code: 'SCAN_UNAVAILABLE',
        severity: 'warning',
        title: 'Automated risk checks did not run',
        detail:
          `This token could not be checked against the external scanner (${reason}). ` +
          'That is not a clean bill of health - it means nothing is known either way.',
      },
    ],
    checkedAt,
    sources: [],
  };
}

function interpret(token: GoPlusToken): RiskFinding[] {
  const findings: RiskFinding[] = [];

  const add = (
    code: string,
    severity: RiskFinding['severity'],
    title: string,
    detail: string,
  ): void => {
    findings.push({ code, severity, title, detail });
  };

  if (flagged(token.is_honeypot)) {
    add(
      'HONEYPOT',
      'critical',
      'Detected as a honeypot',
      'The scanner believes this token cannot be sold after purchase. Do not trade it.',
    );
  }
  if (flagged(token.cannot_sell_all)) {
    add(
      'CANNOT_SELL_ALL',
      'critical',
      'You may not be able to sell your whole balance',
      'The contract restricts selling the full position, a common way to trap holders.',
    );
  }
  if (flagged(token.selfdestruct)) {
    add(
      'SELFDESTRUCT',
      'critical',
      'The contract can destroy itself',
      'A self-destruct path exists, which would render every holder’s balance worthless.',
    );
  }
  if (flagged(token.hidden_owner)) {
    add(
      'HIDDEN_OWNER',
      'critical',
      'Ownership is concealed',
      'Control is held through an address the contract does not disclose as its owner.',
    );
  }
  if (flagged(token.can_take_back_ownership)) {
    add(
      'OWNERSHIP_RECLAIMABLE',
      'critical',
      'Renounced ownership can be reclaimed',
      'Ownership appears renounced but can be taken back, so the renouncement means nothing.',
    );
  }
  if (flagged(token.owner_change_balance)) {
    add(
      'OWNER_CAN_CHANGE_BALANCE',
      'critical',
      'The owner can rewrite balances',
      'A privileged account can change holder balances directly.',
    );
  }
  if (flagged(token.transfer_pausable)) {
    add(
      'PAUSABLE',
      'critical',
      'Transfers can be frozen',
      'A privileged account can halt transfers, preventing anyone from selling.',
    );
  }
  if (flagged(token.is_blacklisted)) {
    add(
      'BLOCKLIST',
      'critical',
      'Addresses can be blocked',
      'The contract can block specific addresses from trading.',
    );
  }
  if (flagged(token.is_proxy)) {
    add(
      'UPGRADEABLE',
      'critical',
      'The contract is upgradeable',
      'Its code can be replaced, so nothing verified today is guaranteed to hold tomorrow.',
    );
  }
  if (flagged(token.slippage_modifiable) || flagged(token.personal_slippage_modifiable)) {
    add(
      'TAX_MODIFIABLE',
      'critical',
      'The trading tax can be changed',
      'The owner can raise the buy or sell tax after you buy - the classic honeypot mechanism.',
    );
  }
  if (flagged(token.is_whitelisted)) {
    add(
      'ALLOWLIST',
      'warning',
      'An allowlist is in force',
      'Only approved addresses may trade freely.',
    );
  }
  if (flagged(token.is_mintable)) {
    add(
      'MINTABLE',
      'warning',
      'More tokens can be minted',
      'Supply can be increased, diluting existing holders.',
    );
  }
  if (flagged(token.trading_cooldown)) {
    add(
      'TRADING_COOLDOWN',
      'warning',
      'A trading cooldown applies',
      'The contract limits how frequently an address can trade.',
    );
  }

  const buy = taxBps(token.buy_tax);
  const sell = taxBps(token.sell_tax);
  if ((buy ?? 0) > 0 || (sell ?? 0) > 0) {
    add(
      'TAXED',
      (sell ?? 0) >= 1_000 ? 'critical' : 'warning',
      'Trades are taxed',
      `Buy tax ${((buy ?? 0) / 100).toFixed(2)}%, sell tax ${((sell ?? 0) / 100).toFixed(2)}%.`,
    );
  }

  if (token.is_open_source !== undefined && !flagged(token.is_open_source)) {
    add(
      'UNVERIFIED_SOURCE',
      'critical',
      'Source code is not verified',
      'Nobody can read what this contract actually does. Treat it as hostile.',
    );
  }

  return findings;
}

/**
 * Combine several risk reports, preferring the most severe finding for any duplicated code.
 *
 * Used to merge on-chain `riskFlags` with an external scan. Where both mention the same power,
 * the harsher reading wins — a disagreement about severity should never resolve downward.
 */
export function mergeRiskReports(asset: Caip19, reports: readonly RiskReport[]): RiskReport {
  const order = { critical: 0, warning: 1, info: 2, none: 3 } as const;
  const byCode = new Map<string, RiskFinding>();

  for (const report of reports) {
    for (const finding of report.findings) {
      const existing = byCode.get(finding.code);
      if (!existing || order[finding.severity] < order[existing.severity]) {
        byCode.set(finding.code, finding);
      }
    }
  }

  return {
    asset,
    findings: [...byCode.values()].sort((a, b) => order[a.severity] - order[b.severity]),
    checkedAt: Date.now(),
    sources: [...new Set(reports.flatMap((r) => r.sources))],
  };
}
