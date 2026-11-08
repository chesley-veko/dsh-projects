/** Build the S1 spike plugin: one ESM node entry and one CJS browser entry. */
import { defineConfig } from 'tsdown'

const moduleLoaderBanner = (id: string) =>
  `window.__ModuleLoader__.load({ id: "${id}", factory: (require) => {`
const moduleLoaderFooter = 'return module.exports; } });'
const moduleIntro = 'var module = { exports: {} }; var exports = module.exports;'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    platform: 'node',
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    external: [/^@deepseek-ai\//],
  },
  {
    entry: ['src/client/index.tsx'],
    format: 'cjs',
    dts: false,
    clean: false,
    platform: 'browser',
    outExtensions: () => ({ js: '.js' }),
    external: [/^@deepseek-ai\//, 'react', 'react-dom'],
    banner: { js: moduleLoaderBanner('dsh-spike-s1') },
    footer: { js: moduleLoaderFooter },
    outputOptions: { intro: moduleIntro },
  },
])
