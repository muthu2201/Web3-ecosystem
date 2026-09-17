/*
 * Vitest owns the whole workspace suite from here; individual packages have no test script.
 *
 * The .mts extension is deliberate: Vite's native config loader treats a .ts config in a CommonJS
 * package as CJS and warns on ESM syntax. .mts states the module system rather than relying on a
 * default that is scheduled to change.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
