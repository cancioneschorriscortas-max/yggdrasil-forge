// ── INICIO: render-gallery (16.1) ──
// Renderiza cada documento de examples/gallery/*.json a SVG (claro e
// escuro) con `ygg render` — o MESMO camiño que usa calquera pipeline —
// e escribe:
//   - public/gallery/<nome>.svg e <nome>.dark.svg   (gitignored)
//   - src/data/gallery.json                          (gitignored)
// Os SVGs NON se commitean nin se retocan á man: se o render rompe, o
// build do site falla (garda de podrecemento natural).
//
// Require o CLI compilado: `corepack pnpm turbo run build --filter @yggdrasil-forge/cli`.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const galleryDir = join(root, 'examples', 'gallery')
const cliBin = join(root, 'packages', 'cli', 'dist', 'bin.js')
const outDir = join(here, '..', 'public', 'gallery')
const dataDir = join(here, '..', 'src', 'data')

if (!existsSync(cliBin)) {
  console.error(
    `render-gallery: falta ${cliBin}
  Compila o CLI antes: corepack pnpm turbo run build --filter @yggdrasil-forge/cli`,
  )
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
mkdirSync(dataDir, { recursive: true })

/** Texto dunha LocalizedString para a locale dada (con fallback). */
function pick(loc, locale) {
  if (loc === undefined) return ''
  if (typeof loc === 'string') return loc
  return loc[locale] ?? loc.gl ?? loc.en ?? Object.values(loc)[0] ?? ''
}

const files = readdirSync(galleryDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
const entries = []
for (const file of files) {
  const id = file.replace(/\.json$/, '')
  const src = join(galleryDir, file)
  const doc = JSON.parse(readFileSync(src, 'utf8'))
  const tree = doc.tree
  for (const [suffix, extra] of [
    ['.svg', []],
    ['.dark.svg', ['--dark']],
  ]) {
    const out = join(outDir, `${id}${suffix}`)
    // Falla con stack se o render non sae: é o gate.
    execFileSync(process.execPath, [cliBin, 'render', src, '--out', out, ...extra], {
      stdio: ['ignore', 'ignore', 'inherit'],
    })
  }
  entries.push({
    id,
    file,
    nodes: tree.nodes.length,
    edges: tree.edges.length,
    layout: tree.layout?.type ?? 'custom',
    preset: doc.editor?.theme?.preset ?? null,
    label: { gl: pick(tree.label, 'gl'), en: pick(tree.label, 'en') },
    description: { gl: pick(tree.description, 'gl'), en: pick(tree.description, 'en') },
    light: `gallery/${id}.svg`,
    dark: `gallery/${id}.dark.svg`,
  })
  console.log(`render-gallery: ${id} (${tree.nodes.length} nodos) → claro + escuro`)
}
writeFileSync(join(dataDir, 'gallery.json'), `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
console.log(`render-gallery: ${entries.length} documentos, src/data/gallery.json escrito`)
// ── FIN: render-gallery ──
