import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile } from 'sass-embedded'
import { build } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))

await build({
  root,
  configFile: false,
  envDir: false,
  build: {
    outDir: 'dist/esm',
    target: 'es2022',
    minify: false,
    sourcemap: true,
    lib: { entry: `${root}src/ts/index.ts`, formats: ['es'], fileName: () => 'index.js' },
    rolldownOptions: { external: ['@arts/utilities'] },
  },
})
const css = compile(`${root}src/styles/fixed-reveal.sass`, { style: 'compressed' })
writeFileSync(`${root}dist/esm/styles.css`, css.css)
rmSync(`${root}dist/types`, { recursive: true, force: true })
execFileSync(`${root}node_modules/.bin/tsc`, ['-p', 'tsconfig.library.json'], {
  cwd: root,
  stdio: 'inherit',
})
