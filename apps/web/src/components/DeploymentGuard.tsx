/**
 * Guard for routes that read or write platform contracts.
 *
 * The registry holds addresses per chain, registered at startup from build configuration. On a
 * chain the platform has not been deployed to, every contract read fails — and failing with a
 * developer's error string ("no contract deployment registered for chain eip155:8453") tells a
 * visitor nothing about what to do next.
 *
 * This states the situation plainly instead, and offers the chains that do work. The alternative,
 * quietly rendering an empty listing, would be worse: "nothing has launched here" and "this page
 * cannot see anything" must not look the same.
 */

import type { JSX } from 'react';
import { allChains, hasDeployment } from '@web3eco/chain-registry';
import { PlugZap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { usePlatform } from '../hooks/usePlatform.js';
import { buttonClass } from './ui/Button.js';
import { EmptyState } from './ui/Feedback.js';
import { Panel } from './ui/Panel.js';
import { cn } from '../lib/cn.js';

export function DeploymentGuard({ children }: { children: React.ReactNode }): JSX.Element {
  const platform = usePlatform();

  if (hasDeployment(platform.chain)) return <>{children}</>;

  const available = allChains().filter((c) => hasDeployment(c.id));

  return (
    <Panel className="mx-auto max-w-xl">
      <EmptyState icon={PlugZap} title={`Not deployed on ${platform.config.name} yet`}>
        The platform's contracts have no registered address on this chain, so there is nothing for
        this page to read. This is a deployment gap, not an empty market.
      </EmptyState>

      {available.length > 0 ? (
        <div className="border-t border-ink-900 pt-4 text-center">
          <div className="text-[12.5px] text-ink-500">Switch your wallet to a chain that is live:</div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {available.map((c) => (
              <span
                key={c.id}
                className="rounded-[var(--radius-pill)] border border-ink-800 px-3 py-1 text-[12.5px] text-ink-300"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-ink-900 pt-4 text-center text-[12.5px] leading-relaxed text-ink-500">
          No chain has contract addresses registered in this build. Everything that does not touch
          a contract still works.
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Link to="/" className={cn(buttonClass({ variant: 'glass', size: 'md' }))}>
          Back to the overview
        </Link>
      </div>
    </Panel>
  );
}
