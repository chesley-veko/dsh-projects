import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // Emit lib/index.js (not .mjs) to match package.json exports/main.
  // (Same setting as the S3 fence plugin; without it the build emits .mjs
  // and the declared entry point does not exist — the fence plugin failed
  // live on exactly this, 2026-11-08.)
  fixedExtension: false,
  dts: true,
  outDir: 'lib',
  clean: true,
  external: [/^@deepseek-ai\//],
})
