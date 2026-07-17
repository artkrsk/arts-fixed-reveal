import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

const LIBRARY_DIR = 'src/php/libraries/arts-fixed-reveal'

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

function buildBanner(): string {
  const hash = getGitHash()
  const date = new Date().toISOString()
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'

  return [
    `/**`,
    ` * @arts/fixed-reveal v${pkg.version}`,
    ` * Built: ${date}`,
    ` * Hash: ${hash}`,
    ` * Mode: ${mode}`,
    ` */`,
  ].join('\n')
}

/** Copy IIFE + CSS to src/php/libraries/ and prepend banner after each build */
function copyToLibraries() {
  return {
    name: 'copy-iife-to-libraries',
    closeBundle() {
      const iifeFile = resolve('dist', 'index.iife.js')
      if (!existsSync(iifeFile)) {
        return
      }

      const dest = resolve(LIBRARY_DIR, 'index.iife.js')
      mkdirSync(resolve(LIBRARY_DIR), { recursive: true })

      // Prepend banner to IIFE (rolldown strips banner during minification)
      const banner = buildBanner() + '\n'
      const content = readFileSync(iifeFile, 'utf-8')
      writeFileSync(iifeFile, banner + content)

      cpSync(iifeFile, dest)

      // The stylesheet is a first-class asset now (runway + footer
      // keyframes contract) — same banner + copy treatment.
      const cssFile = resolve('dist', 'index.css')
      if (existsSync(cssFile)) {
        writeFileSync(cssFile, banner + readFileSync(cssFile, 'utf-8'))
        cpSync(cssFile, resolve(LIBRARY_DIR, 'index.css'))
      }
    },
  }
}

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    lib: {
      entry: 'src/ts/index.ts',
      name: 'ArtsFixedReveal',
      formats: ['es', 'iife'],
      fileName: (format) => format === 'es' ? 'index.mjs' : `index.${format}.js`,
      cssFileName: 'index',
    },
    rollupOptions: {
      output: {
        exports: 'default',
      },
    },
  },
  plugins: [copyToLibraries()],
})
