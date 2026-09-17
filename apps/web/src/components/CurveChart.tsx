/**
 * Live bonding-curve chart, drawn entirely from on-chain reserves.
 *
 * No indexer, no database, no historical API. The price along a bonding curve is a pure function
 * of its reserves, so the whole curve can be computed client-side from a single read. That is not
 * a shortcut — it is the reason the platform can serve charts to a large number of users without
 * an indexing bill, and it keeps working when a third-party data API is down.
 *
 * Drawn on a canvas rather than pulled in as a charting dependency: this is one line and a
 * progress marker, and a charting library would be more bytes than the entire feature.
 */

import { sampleCurve } from '@web3eco/core';
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

/**
 * Read a design token's computed value.
 *
 * The canvas cannot use CSS variables directly, so the accent colour is pulled from the same
 * custom property the rest of the interface uses. Hard-coding a hex here would mean the chart
 * silently drifts away from the palette the next time it changes.
 */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

export interface CurveChartProps {
  readonly virtualNativeStart: bigint;
  readonly virtualTokenStart: bigint;
  readonly curveSupply: bigint;
  readonly tokensSold: bigint;
  readonly height?: number;
}

export function CurveChart({
  virtualNativeStart,
  virtualTokenStart,
  curveSupply,
  tokensSold,
  height = 180,
}: CurveChartProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render at device resolution so the line is not blurry on a high-DPI display.
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    let points;
    try {
      points = sampleCurve(virtualNativeStart, virtualTokenStart, curveSupply, 120);
    } catch {
      return; // degenerate parameters; draw nothing rather than a misleading line
    }

    const prices = points.map((p) => Number(p.priceX18) / 1e18);
    const maxPrice = Math.max(...prices);
    if (!Number.isFinite(maxPrice) || maxPrice <= 0) return;

    const padding = 8;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const x = (i: number) => padding + (i / (points.length - 1)) * plotWidth;
    const y = (price: number) => padding + plotHeight - (price / maxPrice) * plotHeight;

    // Filled area under the curve.
    ctx.beginPath();
    ctx.moveTo(x(0), y(prices[0] ?? 0));
    prices.forEach((price, i) => ctx.lineTo(x(i), y(price)));
    ctx.lineTo(x(points.length - 1), padding + plotHeight);
    ctx.lineTo(x(0), padding + plotHeight);
    ctx.closePath();
    const accent = token('--color-flux-500', 'oklch(0.72 0.16 195)');
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + plotHeight);
    gradient.addColorStop(0, `color-mix(in oklch, ${accent} 34%, transparent)`);
    gradient.addColorStop(1, `color-mix(in oklch, ${accent} 2%, transparent)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // The curve itself.
    ctx.beginPath();
    prices.forEach((price, i) => (i === 0 ? ctx.moveTo(x(i), y(price)) : ctx.lineTo(x(i), y(price))));
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Progress marker at the current position along the curve.
    if (curveSupply > 0n) {
      const progress = Number((tokensSold * 10_000n) / curveSupply) / 10_000;
      const index = Math.min(points.length - 1, Math.round(progress * (points.length - 1)));
      const markerX = x(index);
      const markerY = y(prices[index] ?? 0);

      ctx.beginPath();
      ctx.moveTo(markerX, padding);
      ctx.lineTo(markerX, padding + plotHeight);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // A halo under the dot so it stays readable wherever it lands on the filled area.
      ctx.beginPath();
      ctx.arc(markerX, markerY, 7, 0, Math.PI * 2);
      ctx.fillStyle = `color-mix(in oklch, ${accent} 30%, transparent)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }, [virtualNativeStart, virtualTokenStart, curveSupply, tokensSold, height]);

  const progressBps = curveSupply > 0n ? Number((tokensSold * 10_000n) / curveSupply) : 0;

  return (
    <div className="min-w-0">
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ height }}
        role="img"
        aria-label={`Bonding curve price, ${(progressBps / 100).toFixed(2)}% of the way to graduation`}
      />
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2 text-[12px] text-ink-500">
        <span>Price rises as supply is bought</span>
        <span className="font-mono tabular text-ink-400">
          {(progressBps / 100).toFixed(2)}% to graduation
        </span>
      </div>
    </div>
  );
}
