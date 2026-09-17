import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { LaunchPage } from './pages/LaunchPage.js';
import { TokenPage } from './pages/TokenPage.js';
import { usePlatform } from './hooks/usePlatform.js';

type Tab = 'launch' | 'token';

export function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('launch');
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const platform = usePlatform();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e8e8e8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid #1f1f1f',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <strong style={{ fontSize: 15 }}>Web3 Ecosystem</strong>

        <nav style={{ display: 'flex', gap: 4 }}>
          <TabButton active={tab === 'launch'} onClick={() => setTab('launch')}>
            Launch
          </TabButton>
          <TabButton active={tab === 'token'} onClick={() => setTab('token')}>
            Token lookup
          </TabButton>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/*
            Surfaced on purpose. When reads come from the user's own wallet RPC the platform pays
            nothing to serve them, and a user running their own node can see that the page is not
            quietly routing their activity through a platform endpoint.
          */}
          <span style={{ fontSize: 11, opacity: 0.55 }}>
            {platform.usingWalletRpc ? 'reads via your wallet RPC' : 'reads via public RPC'}
          </span>

          {isConnected ? (
            <button type="button" onClick={() => disconnect()} style={walletButton}>
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </button>
          ) : (
            connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                onClick={() => connect({ connector })}
                style={walletButton}
              >
                Connect {connector.name}
              </button>
            ))
          )}
        </div>
      </header>

      <main style={{ padding: '28px 20px' }}>
        {tab === 'launch' ? <LaunchPage /> : <TokenPage />}
      </main>

      <footer
        style={{
          borderTop: '1px solid #1f1f1f',
          padding: '14px 20px',
          fontSize: 12,
          opacity: 0.6,
          lineHeight: 1.6,
        }}
      >
        Non-custodial. This interface never holds your funds and cannot sign on your behalf — every
        action is a transaction you approve in your own wallet. These contracts have not had a paid
        audit; see SECURITY.md for what that means.
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: '1px solid',
        borderColor: active ? '#3b82f6' : 'transparent',
        background: active ? '#12243a' : 'transparent',
        color: 'inherit',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

const walletButton: React.CSSProperties = {
  padding: '7px 13px',
  borderRadius: 6,
  border: '1px solid #3a3a3a',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: 13,
};
