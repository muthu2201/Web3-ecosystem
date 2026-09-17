/**
 * Edge Worker: API-key custodian, rate limiter and cache.
 *
 * WHY THIS EXISTS. The front-end is a static bundle served from a CDN. Anything it holds is
 * public - a 0x or Pinata key shipped in a bundle is a published key, and it will be scraped and
 * spent. So the browser talks to this Worker, and only this Worker holds the credentials.
 *
 * It is deliberately a thin, allowlisted proxy. It forwards a fixed set of parameters to a fixed
 * set of upstream hosts and nothing else: no client-supplied URLs, no pass-through of arbitrary
 * query strings, no path traversal. A proxy that forwards whatever it is given is an SSRF engine
 * with a friendly name.
 *
 * It holds no user funds, signs nothing, and stores no personal data. If it is compromised, the
 * damage is a burned API quota and bad market data - not lost funds, because every value-moving
 * operation is a transaction the user signs in their own wallet.
 */

import { callerKey, checkRateLimit } from './ratelimit.js';
import {
  buildUpstreamUrl,
  corsHeaders,
  errorResponse,
  isOriginAllowed,
  jsonResponse,
  parseAllowedOrigins,
  requireAddress,
  requireBounded,
  requireChainId,
  requireUint,
  SECURITY_HEADERS,
  ValidationError,
} from './security.js';

export interface Env {
  readonly RATE_LIMIT: KVNamespace;
  readonly CACHE: KVNamespace;
  readonly ALLOWED_ORIGINS?: string;
  readonly ZEROEX_API_KEY?: string;
  readonly GOPLUS_APP_KEY?: string;
  readonly ETHERSCAN_API_KEY?: string;
  readonly PINATA_JWT?: string;
}

/** Fixed upstream hosts. Never derived from anything the client sends. */
const UPSTREAM = {
  zeroEx: 'https://api.0x.org/',
  goPlus: 'https://api.gopluslabs.io/api/v1/',
  geckoTerminal: 'https://api.geckoterminal.com/api/v2/',
  etherscan: 'https://api.etherscan.io/v2/',
  pinata: 'https://api.pinata.cloud/',
} as const;

/** Per-route limits, tuned to the upstream quotas they protect. */
const LIMITS = {
  quote: { limit: 60, windowSeconds: 60 },
  risk: { limit: 30, windowSeconds: 60 },
  charts: { limit: 60, windowSeconds: 60 },
  verify: { limit: 10, windowSeconds: 60 },
  pin: { limit: 10, windowSeconds: 60 },
} as const;

/** Cache TTLs. Market data ages fast; a risk verdict does not. */
const CACHE_TTL = {
  risk: 300,
  charts: 60,
} as const;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, ...SECURITY_HEADERS } });
    }

    if (!isOriginAllowed(origin, allowed)) {
      return jsonResponse({ error: 'origin not allowed' }, 403, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      switch (path) {
        case '/health':
          return jsonResponse({ ok: true, service: 'web3eco-edge' }, 200, cors);
        case '/swap/quote':
          return await handleSwapQuote(request, env, url, cors);
        case '/risk/token':
          return await handleRisk(request, env, url, cors, ctx);
        case '/charts/ohlc':
          return await handleCharts(request, env, url, cors, ctx);
        case '/verify/status':
          return await handleVerifyStatus(request, env, url, cors);
        default:
          return jsonResponse({ error: 'not found' }, 404, cors);
      }
    } catch (err) {
      return errorResponse(err, cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function limit(
  request: Request,
  env: Env,
  route: keyof typeof LIMITS,
  cors: HeadersInit,
): Promise<Response | null> {
  const result = await checkRateLimit({
    kv: env.RATE_LIMIT,
    key: `${route}:${callerKey(request)}`,
    ...LIMITS[route],
  });

  if (!result.allowed) {
    return jsonResponse({ error: 'rate limit exceeded' }, 429, {
      ...cors,
      'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1_000)),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': '0',
    });
  }
  return null;
}

/**
 * Proxy a 0x quote.
 *
 * Every forwarded parameter is validated first, and the fee parameters in particular are checked
 * against the platform's published 1% ceiling. Without that check a caller could craft a request
 * routing a 50% "integrator fee" to an address of their choosing, using the platform's API key
 * and, to anyone watching, its name.
 */
async function handleSwapQuote(
  request: Request,
  env: Env,
  url: URL,
  cors: HeadersInit,
): Promise<Response> {
  const limited = await limit(request, env, 'quote', cors);
  if (limited) return limited;

  const p = url.searchParams;
  requireChainId(p.get('chainId'));
  requireAddress(p.get('sellToken'), 'sellToken');
  requireAddress(p.get('buyToken'), 'buyToken');
  requireUint(p.get('sellAmount'), 'sellAmount');
  requireAddress(p.get('taker'), 'taker');
  requireBounded(p.get('slippageBps') ?? '100', 'slippageBps', 0, 10_000);

  if (p.has('swapFeeBps')) {
    requireBounded(p.get('swapFeeBps'), 'swapFeeBps', 0, 100);
    requireAddress(p.get('swapFeeRecipient'), 'swapFeeRecipient');
    requireAddress(p.get('swapFeeToken'), 'swapFeeToken');
  }

  const upstream = buildUpstreamUrl(UPSTREAM.zeroEx, 'swap/permit2/quote', p, [
    'chainId',
    'sellToken',
    'buyToken',
    'sellAmount',
    'taker',
    'slippageBps',
    'swapFeeBps',
    'swapFeeRecipient',
    'swapFeeToken',
  ]);

  const response = await fetch(upstream, {
    headers: {
      '0x-api-key': env.ZEROEX_API_KEY ?? '',
      '0x-version': 'v2',
      accept: 'application/json',
    },
  });

  return passThrough(response, cors);
}

async function handleRisk(
  request: Request,
  env: Env,
  url: URL,
  cors: HeadersInit,
  ctx: ExecutionContext,
): Promise<Response> {
  const limited = await limit(request, env, 'risk', cors);
  if (limited) return limited;

  const chainId = requireChainId(url.searchParams.get('chainId'));
  const address = requireAddress(url.searchParams.get('address'), 'address');
  const cacheKey = `risk:${chainId}:${address}`;

  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'content-type': 'application/json', 'X-Cache': 'HIT', ...SECURITY_HEADERS, ...cors },
    });
  }

  const upstream = `${UPSTREAM.goPlus}token_security/${chainId}?contract_addresses=${address}`;
  const response = await fetch(upstream, {
    headers: env.GOPLUS_APP_KEY ? { Authorization: env.GOPLUS_APP_KEY } : {},
  });

  const body = await response.text();
  if (response.ok) {
    ctx.waitUntil(env.CACHE.put(cacheKey, body, { expirationTtl: CACHE_TTL.risk }));
  }

  return new Response(body, {
    status: response.status,
    headers: { 'content-type': 'application/json', 'X-Cache': 'MISS', ...SECURITY_HEADERS, ...cors },
  });
}

async function handleCharts(
  request: Request,
  env: Env,
  url: URL,
  cors: HeadersInit,
  ctx: ExecutionContext,
): Promise<Response> {
  const limited = await limit(request, env, 'charts', cors);
  if (limited) return limited;

  const network = url.searchParams.get('network') ?? '';
  // Allowlisted rather than pattern-matched: a permissive pattern in a path segment is a path
  // traversal waiting to happen.
  if (!/^[a-z0-9_]{1,32}$/.test(network)) {
    throw new ValidationError('"network" is not a recognised network slug');
  }
  const pool = requireAddress(url.searchParams.get('pool'), 'pool');
  const timeframe = url.searchParams.get('timeframe') ?? 'hour';
  if (!['minute', 'hour', 'day'].includes(timeframe)) {
    throw new ValidationError('"timeframe" must be minute, hour or day');
  }
  const aggregate = requireBounded(url.searchParams.get('aggregate') ?? '1', 'aggregate', 1, 60);
  const limitParam = requireBounded(url.searchParams.get('limit') ?? '100', 'limit', 1, 1_000);

  const cacheKey = `ohlc:${network}:${pool}:${timeframe}:${aggregate}:${limitParam}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'content-type': 'application/json', 'X-Cache': 'HIT', ...SECURITY_HEADERS, ...cors },
    });
  }

  const upstream =
    `${UPSTREAM.geckoTerminal}networks/${network}/pools/${pool}/ohlcv/${timeframe}` +
    `?aggregate=${aggregate}&limit=${limitParam}`;
  const response = await fetch(upstream, { headers: { accept: 'application/json' } });

  const body = await response.text();
  if (response.ok) {
    ctx.waitUntil(env.CACHE.put(cacheKey, body, { expirationTtl: CACHE_TTL.charts }));
  }

  return new Response(body, {
    status: response.status,
    headers: { 'content-type': 'application/json', 'X-Cache': 'MISS', ...SECURITY_HEADERS, ...cors },
  });
}

async function handleVerifyStatus(
  request: Request,
  env: Env,
  url: URL,
  cors: HeadersInit,
): Promise<Response> {
  const limited = await limit(request, env, 'verify', cors);
  if (limited) return limited;

  const chainId = requireChainId(url.searchParams.get('chainId'));
  const address = requireAddress(url.searchParams.get('address'), 'address');

  const upstream =
    `${UPSTREAM.etherscan}api?chainid=${chainId}&module=contract&action=getsourcecode` +
    `&address=${address}&apikey=${env.ETHERSCAN_API_KEY ?? ''}`;

  const response = await fetch(upstream, { headers: { accept: 'application/json' } });
  return passThrough(response, cors);
}

/**
 * Relay an upstream response without forwarding its headers.
 *
 * Upstream responses carry `Set-Cookie`, rate-limit counters keyed to the platform's account, and
 * occasionally debugging headers naming internal hosts. Only the body and status cross this
 * boundary; everything else is replaced with the Worker's own headers.
 */
async function passThrough(response: Response, cors: HeadersInit): Promise<Response> {
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { 'content-type': 'application/json', ...SECURITY_HEADERS, ...cors },
  });
}
