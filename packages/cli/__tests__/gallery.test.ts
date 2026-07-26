// ── INICIO: anti-podrecemento da galería (7.15, Cambio 3) ──
// Cada *.json de examples/gallery/ DEBE pasar deserializeDocument.
// A galería de ouro non pode mentir: se un cambio de schema a rompe,
// este test dío antes de que o descubra un consumidor externo.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { deserializeDocument } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'

const GALLERY = join(__dirname, '..', '..', '..', 'examples', 'gallery')

describe('7.15-C3 — galería de ouro: todo ficheiro é importable', () => {
  const files = readdirSync(GALLERY).filter((f) => f.endsWith('.json'))

  it('a galería ten os tres exemplos canónicos', () => {
    expect(files).toEqual(
      expect.arrayContaining(['minimal.json', 'panadeiro.json', 'adversarial.json']),
    )
  })

  for (const file of files) {
    it(`${file} pasa deserializeDocument → ok`, () => {
      const text = readFileSync(join(GALLERY, file), 'utf8')
      const result = deserializeDocument(text)
      expect(
        result.ok,
        result.ok ? undefined : `(${file}) ${(result as { error: Error }).error.message}`,
      ).toBe(true)
    })
  }
})
// ── FIN: anti-podrecemento ──
