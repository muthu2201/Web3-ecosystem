/**
 * Token profile page.
 *
 * Everything here is read from chain state, not from a database. That is what lets the platform
 * serve listing pages with no backend, and it means the risk badges reflect what the contract
 * currently permits — including after an owner renounces, which a cached record would miss.
 */

import type { RiskFinding, TokenProfile } from '@web3eco/core';
import { decodeRiskFlags, formatUnits, worstSeverity } from '@web3eco/core';
import { useState } from 'react';

import { RiskBadge, RiskFindings } from '../components/RiskBadge.js';
import { usePlatform } from '../hooks/usePlatform.js';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; profile: TokenProfile; findings: RiskFinding[] }
  | { status: 'error'; message: string };

export function TokenPage(): JSX.Element {
  const platform = usePlatform();
  const [address, setAddress] = useState('');
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  async function load(): Promise<void> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setState({ status: 'error', message: 'That is not a valid contract address.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const profile = await platform.tokens.readProfile(platform.chain, address as `0x${string}`);
      setState({ status: 'loaded', profile, findings: decodeRiskFlags(profile.riskFlags) });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'could not read this token',
      });
    }
  }

  return (
    <section style={{ display: 'grid', gap: 18, maxWidth: 680 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 22 }}>Token profile</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: 14 }}>
          Read directly from the contract. Nothing here comes from a database that could be stale
          or edited.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="0x…"
          style={{ ...input, flex: 1, fontFamily: 'ui-monospace, monospace' }}
        />
        <button type="button" onClick={load} style={primaryButton}>
          Look up
        </button>
      </div>

      {state.status === 'loading' && <p style={{ opacity: 0.7 }}>Reading contract state…</p>}

      {state.status === 'error' && (
        <div
          style={{
            border: '1px solid #b9382f',
            background: '#3a0d0d',
            color: '#ffb4ad',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
          }}
        >
          {state.message}
        </div>
      )}

      {state.status === 'loaded' && <Profile profile={state.profile} findings={state.findings} />}
    </section>
  );
}

function Profile({
  profile,
  findings,
}: {
  profile: TokenProfile;
  findings: RiskFinding[];
}): JSX.Element {
  const unknownOrigin = profile.template === 'unknown';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          {profile.name} <span style={{ opacity: 0.6 }}>({profile.symbol})</span>
        </h2>
        <RiskBadge severity={worstSeverity(findings)} />
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', margin: 0, fontSize: 13 }}>
        <dt style={{ opacity: 0.7 }}>Contract</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
          {profile.address}
        </dd>

        <dt style={{ opacity: 0.7 }}>Total supply</dt>
        <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          {formatUnits(profile.totalSupply, profile.decimals, 4)} {profile.symbol}
        </dd>

        <dt style={{ opacity: 0.7 }}>Template</dt>
        <dd style={{ margin: 0 }}>
          {unknownOrigin ? 'Not deployed by this platform' : profile.template}
        </dd>

        {profile.deployer && (
          <>
            <dt style={{ opacity: 0.7 }}>Deployed by</dt>
            <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {profile.deployer}
            </dd>
          </>
        )}
      </dl>

      {unknownOrigin && (
        // The distinction that matters: nothing found is not the same as nothing there.
        <div
          style={{
            border: '1px solid #b98d2f',
            background: '#3a2c0d',
            color: '#ffddad',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>This token was not deployed by this platform.</strong> Its risk flags could not
          be read from a known template, so an empty findings list below means{' '}
          <em>we do not know</em>, not that the token is safe. Read the contract yourself before
          trading it.
        </div>
      )}

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Administrative powers</h3>
        <RiskFindings findings={findings} />
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: '9px 11px',
  borderRadius: 6,
  border: '1px solid #3a3a3a',
  background: '#111',
  color: 'inherit',
  fontSize: 14,
};
const primaryButton: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 6,
  border: '1px solid #3b82f6',
  background: '#1d4ed8',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};
