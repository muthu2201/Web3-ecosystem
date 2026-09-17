import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';

import { App } from './App.js';
import { registerDeployments } from './config.js';
import { wagmiConfig } from './wagmi.js';

// Fail loudly at startup rather than letting a malformed deployment address reach a transaction.
registerDeployments();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Chain state changes constantly; a stale read shown as current is how a user ends up
      // signing against reserves that have already moved.
      staleTime: 5_000,
      retry: 2,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('root element is missing');

createRoot(root).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
