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
  // Keep @deepseek-ai/* as runtime imports: bundling a second copy of
  // dsh-scope/dsh-tools creates a second module instance whose Symbol
  // differs from the host's, so scopeOf() returns undefined inside the
  // host's tools service (live 2026-11-08: tools.restrict() threw
  // "requires a scoped context"). S3 live fix, see ../README.md.
  external: [/^@deepseek-ai\//],
})
