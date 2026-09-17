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
         * Keep three.js in its own chunk.
         *
         * It is by far the largest dependency and only the landing page's hero needs it. Split
         * out, it loads after first paint instead of blocking it, and every other route never
         * fetches it at all.
         */
        manualChunks: {
          three: ['three'],
          // React changes far less often than application code, so a separate chunk stays in a
          // returning visitor's cache across deploys.
          react: ['react', 'react-dom', 'react-router-dom'],
          // The wallet stack is the other large, slow-moving dependency.
          wallet: ['viem', 'wagmi', '@tanstack/react-query'],
        },
      },
    },
    sourcemap: true,
  },
});
