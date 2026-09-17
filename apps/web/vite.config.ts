import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    target: 'es2022',
    /**
     * Never inline a font as a `data:` URI.
     *
     * Vite inlines small assets by default, which turns a subset woff2 into a `data:font/woff2`
     * source. The CSP in index.html allows `font-src 'self'` only, so an inlined font is refused
     * at runtime and that subset's glyphs silently fall back. Widening the CSP to permit `data:`
     * fonts would be the wrong trade: it weakens the policy to fix a size optimisation worth a
     * couple of kilobytes.
     */
    assetsInlineLimit: (filePath: string) =>
      !/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? undefined : false,
    // Every asset is content-hashed so a stale bundle can never be served from cache after a
    // security update. Combined with SRI in index.html, a swapped file fails closed.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        /**
         * Split the three large, slow-moving dependency groups out of the app chunk.
         *
         * three.js only the landing hero needs, so splitting it means it loads after first paint
         * and no other route fetches it at all. React and the wallet stack change far less often
         * than application code, so separate chunks stay in a returning visitor's cache across
         * deploys instead of being invalidated by every copy edit.
         *
         * Written as a function rather than the object form because Vite 8 builds on Rolldown,
         * which accepts only the function signature. Matching is anchored to the package
         * directory so "react" cannot also swallow "react-router-dom".
         */
        manualChunks(id: string) {
          const match = /node_modules\/(?:\.pnpm\/)?(?:([^@/]+)|(@[^/]+\/[^/]+))/.exec(id);
          if (!match) return undefined;
          // Under pnpm the first path segment is the mangled store name (react@19.3.0), so take
          // the package name up to the version separator.
          const pkg = (match[1] ?? match[2] ?? '').split('@')[0] || match[2] || '';

          if (id.includes('/three/')) return 'three';
          if (['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'].includes(pkg)) {
            return 'react';
          }
          if (pkg === 'viem' || pkg === 'wagmi' || id.includes('/@tanstack/')) return 'wallet';
          return undefined;
        },
      },
    },
    sourcemap: true,
  },
});
