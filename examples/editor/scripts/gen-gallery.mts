// ── INICIO: gen-gallery (7.15, Cambio 3) ──
// Xera os ficheiros NON-manuais da galería de ouro (examples/gallery/)
// coa MESMA serialización que usa o editor (`serializeDocument`) —
// nunca á man, para que a galería non poida divergir do produto.
//
//   - panadeiro.json    ← fixture panadeiro (a de referencia "amable")
//   - adversarial.json  ← adversarialDocument() de @editor-core
//
// (minimal.json é manual a propósito: é o exemplo didáctico mínimo e
// está gardado polo test anti-podrecemento coma os demais.)
//
// Uso (require @editor-core compilado; corre `turbo run build` antes):
//   HUSKY=0 corepack pnpm --filter @yggdrasil-forge-examples/editor run gen:gallery
//
// Node >=22.6 con type-stripping (en 23.6+ é o comportamento por
// defecto; o flag --experimental-strip-types mantense por compat).

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  adversarialDocument,
  createEditorDocument,
  serializeDocument,
} from '@yggdrasil-forge/editor-core'
import { panadeiroDocumentMeta, panadeiroTree } from '../src/fixtures/panadeiro.ts'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', '..', 'gallery')
mkdirSync(outDir, { recursive: true })

/** Pretty-print estable (2 espazos) do JSON canónico de serializeDocument. */
function pretty(json: string): string {
  return `${JSON.stringify(JSON.parse(json), null, 2)}\n`
}

const panadeiro = createEditorDocument(panadeiroTree, panadeiroDocumentMeta)
writeFileSync(join(outDir, 'panadeiro.json'), pretty(serializeDocument(panadeiro)), 'utf8')
console.log('escrito gallery/panadeiro.json')

const adversarial = adversarialDocument()
writeFileSync(join(outDir, 'adversarial.json'), pretty(serializeDocument(adversarial)), 'utf8')
console.log('escrito gallery/adversarial.json')
// ── FIN: gen-gallery ──
