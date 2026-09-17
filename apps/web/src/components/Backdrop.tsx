/**
 * Ambient background.
 *
 * Two soft light sources rather than the usual full-bleed purple gradient: a teal wash top-left
 * and a much weaker sand wash bottom-right, both far below the content in contrast so they never
 * compete with text. Fixed and pointer-events-none so they cost nothing at scroll time.
 */

import type { JSX } from 'react';

export function Backdrop(): JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-ink-950" />

      <div
        className="absolute -left-[18%] -top-[28%] h-[62vh] w-[62vh] rounded-full opacity-[0.16] blur-[110px]"
        style={{ background: 'radial-gradient(circle, var(--color-flux-500), transparent 68%)' }}
      />
      <div
        className="absolute -bottom-[26%] -right-[14%] h-[52vh] w-[52vh] rounded-full opacity-[0.09] blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--color-sand-500), transparent 68%)' }}
      />

      {/* Faint grid, anchored to the top so it reads as a horizon rather than wallpaper */}
      <div
        className="absolute inset-x-0 top-0 h-[70vh] opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-ink-100) 1px, transparent 1px),' +
            'linear-gradient(to bottom, var(--color-ink-100) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />
    </div>
  );
}
