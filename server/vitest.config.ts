import { defineConfig } from 'vitest/config';

export default defineConfig({
  // graphql ships both CJS and ESM. Without deduping, a test that imports the
  // executor gets the .mjs copy while @graphql-tools builds the schema with
  // the CJS one, and graphql's instanceOf check rejects the cross-copy schema.
  resolve: {
    dedupe: ['graphql'],
    alias: { graphql: 'graphql/index.js' },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    // `pnpm build` emits compiled copies of the tests into dist/; without this
    // a build followed by a test run executes every suite twice.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['src/__tests__/global-setup.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
