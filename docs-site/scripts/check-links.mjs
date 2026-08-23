// ── INICIO: check-links (16.1) ──
// Garda: ligazóns internas rotas tiran o build. Percorre o dist/
// xerado por Astro, extrae cada href interno (relativo ou absoluto
// baixo o `base`), resólveo contra a URL da páxina e comproba que o
// destino existe (páxina, asset ou ancla de id). Relativo ao dist,
// non ao contido: cobre MD, MDX e compoñentes por igual.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '..', 'dist')
const base = (process.env.DOCS_BASE ?? '/yggdrasil-forge').replace(/\/$/, '')

if (!existsSync(dist)) {
  console.error('check-links: falta dist/ — corre `astro build` antes')
  process.exit(1)
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.html')) out.push(p)
  }
  return out
}

/** Camiño URL (sen base) dunha páxina do dist: dist/a/b/index.html → /a/b/ */
function urlOf(file) {
  const rel = file.slice(dist.length).split(sep).join('/')
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel
}

/** Existe o destino? Páxina (dir/index.html ou .html) ou asset. */
function targetExists(urlPath) {
  const clean = urlPath.replace(/\/$/, '')
  const candidates = [
    join(dist, clean, 'index.html'),
    join(dist, `${clean}.html`),
    join(dist, clean),
  ]
  return candidates.some((c) => existsSync(c))
}

const idCache = new Map()
function hasAnchor(file, id) {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8')
    const ids = new Set()
    for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1])
    idCache.set(file, ids)
  }
  return idCache.get(file).has(id)
}

const pages = walk(dist)
const broken = []
let checked = 0
for (const file of pages) {
  const pageUrl = urlOf(file)
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1]
    if (/^(https?:|mailto:|tel:|javascript:|data:)/.test(href)) continue
    if (href === '' || href === '#') continue
    let target
    if (href.startsWith('/')) {
      if (!href.startsWith(`${base}/`) && href !== base) continue // fóra do site (p.ex. /favicon de outro base)
      target = href.slice(base.length)
    } else if (href.startsWith('#')) {
      target = `${pageUrl}${href}`
    } else {
      target =
        new URL(href, `http://x${pageUrl}`).pathname +
        (href.includes('#') ? `#${href.split('#')[1]}` : '')
    }
    const [pathPart, anchor] = target.split('#')
    checked++
    if (!targetExists(pathPart)) {
      broken.push(`${pageUrl} → ${href} (non existe ${pathPart})`)
      continue
    }
    if (anchor !== undefined && anchor !== '') {
      const clean = pathPart.replace(/\/$/, '')
      const targetFile = [join(dist, clean, 'index.html'), join(dist, `${clean}.html`)].find((c) =>
        existsSync(c),
      )
      if (targetFile !== undefined && !hasAnchor(targetFile, decodeURIComponent(anchor))) {
        broken.push(`${pageUrl} → ${href} (sen ancla #${anchor})`)
      }
    }
  }
}

if (broken.length > 0) {
  for (const b of broken) console.error(`check-links: ROTA ${b}`)
  console.error(`check-links: ${broken.length} ligazón(s) rota(s) en ${pages.length} páxinas`)
  process.exit(1)
}
console.log(`check-links: ${checked} ligazóns internas válidas en ${pages.length} páxinas`)
// ── FIN: check-links ──
