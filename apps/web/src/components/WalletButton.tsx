import type { JSX } from 'react';
import { Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { Button } from './ui/index.js';

/**
 * Wallet connection.
 *
 * Shows the connected address truncated in mono, which is what a user compares against their
 * wallet. Disconnecting is one tap rather than hidden behind a menu, because a user who wants to
 * disconnect usually wants to do it now.
 */
export function WalletButton(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button variant="glass" size="pill" onClick={() => disconnect()} title="Disconnect wallet">
        <span className="h-1.5 w-1.5 rounded-full bg-good-500" aria-hidden />
        <span className="font-mono text-[12.5px]">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </Button>
    );
  }

  const connector = connectors[0];

  return (
    <Button
      variant="primary"
      size="pill"
      disabled={!connector || isPending}
      onClick={() => connector && connect({ connector })}
    >
      <Wallet className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{isPending ? 'Connecting…' : 'Connect wallet'}</span>
      <span className="sm:hidden">{isPending ? '…' : 'Connect'}</span>
    </Button>
  );
}
