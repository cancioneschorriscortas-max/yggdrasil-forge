// ── INICIO: gate de drift do JSON Schema (7.15, Cambio 2) ──
// Doutrina de manifestos: o artefacto commiteado
// (schema/yggdrasil-document.schema.json) DEBE ser idéntico ao que
// xeran os schemas Zod vivos. Se alguén toca un schema Zod (en @core
// ou @editor-core) sen rexenerar, este test falla e di como arranxalo.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildDocumentJsonSchema } from '../src/documentSchema.js'

const ARTIFACT = join(__dirname, '..', '..', '..', 'schema', 'yggdrasil-document.schema.json')

const REGEN_HINT =
  'O schema commiteado diverxe dos schemas Zod. Rexenera con:\n' +
  '  HUSKY=0 corepack pnpm turbo run build --filter @yggdrasil-forge/cli\n' +
  '  HUSKY=0 corepack pnpm --filter @yggdrasil-forge/cli run gen:schema\n' +
  'e commitea schema/yggdrasil-document.schema.json xunto co cambio de schema.'

describe('7.15-C2 — gate de drift do JSON Schema publicado', () => {
  it('o artefacto commiteado coincide co xerado en memoria', () => {
    const committed = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as Record<string, unknown>
    const generated = buildDocumentJsonSchema()
    expect(generated, REGEN_HINT).toEqual(committed)
  })

  it('o artefacto ten $id/title/description estables', () => {
    const committed = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as Record<string, unknown>
    expect(committed.$id).toMatch(/^https:\/\/raw\.githubusercontent\.com\/.+\.schema\.json$/)
    expect(committed.title).toBe('Yggdrasil Forge document')
    expect(typeof committed.description).toBe('string')
  })
})
// ── FIN: gate de drift ──
