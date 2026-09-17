/**
 * Route table.
 *
 * Every route is a real product surface backed by a deployed contract — nothing here is a
 * placeholder screen. Routes are lazily loaded so a visitor who only ever opens the landing page
 * never downloads the trading, presale and NFT code, which is what keeps the first paint small
 * on a phone.
 */

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell.js';
import { DeploymentGuard } from './components/DeploymentGuard.js';
import { Panel, Skeleton } from './components/ui/index.js';
import { HomePage } from './pages/HomePage.js';

const ExplorePage = lazy(() =>
  import('./pages/ExplorePage.js').then((m) => ({ default: m.ExplorePage })),
);
const LaunchPage = lazy(() =>
  import('./pages/LaunchPage.js').then((m) => ({ default: m.LaunchPage })),
);
const DeployPage = lazy(() =>
  import('./pages/DeployPage.js').then((m) => ({ default: m.DeployPage })),
);
const CurvePage = lazy(() =>
  import('./pages/CurvePage.js').then((m) => ({ default: m.CurvePage })),
);
const SwapPage = lazy(() => import('./pages/SwapPage.js').then((m) => ({ default: m.SwapPage })));
const PresalePage = lazy(() =>
  import('./pages/PresalePage.js').then((m) => ({ default: m.PresalePage })),
);
const PresaleDetailPage = lazy(() =>
  import('./pages/PresaleDetailPage.js').then((m) => ({ default: m.PresaleDetailPage })),
);
const NftPage = lazy(() => import('./pages/NftPage.js').then((m) => ({ default: m.NftPage })));
const NftCollectionPage = lazy(() =>
  import('./pages/NftCollectionPage.js').then((m) => ({ default: m.NftCollectionPage })),
);
const LockPage = lazy(() => import('./pages/LockPage.js').then((m) => ({ default: m.LockPage })));
const TokenPage = lazy(() =>
  import('./pages/TokenPage.js').then((m) => ({ default: m.TokenPage })),
);

export function App(): JSX.Element {
  return (
    <AppShell>
      <Suspense fallback={<RouteSkeleton />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/*
            Everything below reads a deployed contract, so each is wrapped in a guard that says so
            plainly on a chain the platform has not shipped to yet. The home page is not wrapped:
            it describes the system and needs no chain at all.
          */}
          <Route path="/explore" element={<DeploymentGuard><ExplorePage /></DeploymentGuard>} />
          <Route path="/launch" element={<DeploymentGuard><LaunchPage /></DeploymentGuard>} />
          <Route path="/deploy" element={<DeploymentGuard><DeployPage /></DeploymentGuard>} />
          <Route path="/curve/:address" element={<DeploymentGuard><CurvePage /></DeploymentGuard>} />
          <Route path="/swap" element={<DeploymentGuard><SwapPage /></DeploymentGuard>} />
          <Route path="/presale" element={<DeploymentGuard><PresalePage /></DeploymentGuard>} />
          <Route path="/presale/:address" element={<DeploymentGuard><PresaleDetailPage /></DeploymentGuard>} />
          <Route path="/nft" element={<DeploymentGuard><NftPage /></DeploymentGuard>} />
          <Route path="/nft/:address" element={<DeploymentGuard><NftCollectionPage /></DeploymentGuard>} />
          <Route path="/lock" element={<DeploymentGuard><LockPage /></DeploymentGuard>} />
          <Route path="/token" element={<DeploymentGuard><TokenPage /></DeploymentGuard>} />
          <Route path="/token/:address" element={<DeploymentGuard><TokenPage /></DeploymentGuard>} />
          {/* An unknown path lands on the home page rather than a dead end. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

/** Sized to the shape most routes settle into, so the layout does not jump when a chunk lands. */
function RouteSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel>
          <Skeleton className="h-64 w-full" />
        </Panel>
        <Panel>
          <Skeleton className="h-72 w-full" />
        </Panel>
      </div>
    </div>
  );
}
