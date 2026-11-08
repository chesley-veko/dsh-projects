import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // Emit lib/index.js (not .mjs) to match package.json exports/main.
  // (Same setting as dsh-superagent; without it the build emits .mjs
  // and the declared entry point does not exist.)
  fixedExtension: false,
  dts: true,
  outDir: 'lib',
  clean: true,
})
