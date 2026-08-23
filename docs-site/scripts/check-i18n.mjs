// ── INICIO: check-i18n (16.1) ──
// Garda: as dúas linguas completas. Cada páxina galega (locale raíz,
// src/content/docs/**) debe ter a súa tradución en src/content/docs/en/
// co MESMO camiño, e viceversa (sen orfas en inglés). Unha falta tira o
// build do site — é a decisión pinada polo Director: "nada a medias".

import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const docs = resolve(here, '..', 'src', 'content', 'docs')
const enDir = join(docs, 'en')

function walk(dir, skip) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (skip !== undefined && resolve(p) === resolve(skip)) continue
    if (statSync(p).isDirectory()) out.push(...walk(p, skip))
    else if (/\.(md|mdx)$/.test(name)) out.push(p)
  }
  return out
}

const norm = (p, base) => relative(base, p).split(sep).join('/')
const gl = new Set(walk(docs, enDir).map((p) => norm(p, docs)))
const en = new Set(walk(enDir).map((p) => norm(p, enDir)))

const missingEn = [...gl].filter((p) => !en.has(p))
const orphanEn = [...en].filter((p) => !gl.has(p))

if (missingEn.length > 0 || orphanEn.length > 0) {
  for (const p of missingEn)
    console.error(`check-i18n: falta a tradución inglesa de ${p} → en/${p}`)
  for (const p of orphanEn) console.error(`check-i18n: en/${p} non ten orixinal galego`)
  process.exit(1)
}
console.log(`check-i18n: ${gl.size} páxinas, galego e inglés completos`)
// ── FIN: check-i18n ──
