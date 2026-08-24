// ── INICIO: gen-pwa-icons (15.6) ──
// Xera UNHA vez as iconas 192/512 da PWA desde a icona `logic-seedling`
// do set oficial (a plántula: o editor é onde nace a árbore). Os PNG
// commitéanse; este script só se volve correr se cambia a arte.
//
// Uso:  node scripts/gen-pwa-icons.mjs
// Require: sharp (devDep) e o paquete @react no workspace (lemos o
// path da icona da FONTE ÚNICA, non dunha copia).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const logicSource = resolve(here, '..', '..', '..', 'packages', 'react', 'src', 'icons', 'logic.ts')

// Extraer o path de logic-seedling da fonte (sen executar TS).
const src = readFileSync(logicSource, 'utf8')
const block = src.split("'logic-seedling'")[1]
const match = block === undefined ? null : /d: '([^']+)'/.exec(block)
if (match === null || match[1] === undefined) {
  console.error('gen-pwa-icons: non se atopou o path de logic-seedling na fonte')
  process.exit(1)
}
const d = match[1]

// SVG da icona da app: fondo marfil do chrome + plántula en verde.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="5" fill="#f4f4f1"/>
  <path d="${d}" fill="none" stroke="#2e7d4f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.2 1.2) scale(0.9)"/>
</svg>`

const outDir = resolve(here, '..', 'public', 'icons')
for (const size of [192, 512]) {
  const out = join(outDir, `pwa-${size}.png`)
  await sharp(Buffer.from(svg), { density: (72 * size) / 24 })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`gen-pwa-icons: ${out}`)
}
writeFileSync(
  join(outDir, 'SOURCE.md'),
  'Xeradas por scripts/gen-pwa-icons.mjs desde logic-seedling (@yggdrasil-forge/react). Non editar á man.\n',
)
// ── FIN: gen-pwa-icons ──
