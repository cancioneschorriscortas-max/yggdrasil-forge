// ── INICIO: tests adversarialFixture (briefing 7.13 Cambio 4) ──
// A fixture NON pode ser ela mesma inválida — as dúas portas A.6.42:
// 1) safeParse (validateTreeDef) ok.
// 2) round-trip serialize→deserialize equivalente.

import { TreeEngine, validateTreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'
import {
  adversarialDocument,
  adversarialResources,
  adversarialTreeDef,
} from '../src/testing/adversarialFixture.js'
import { createDefaultValidators } from '../src/validation/createDefaultValidators.js'

describe('★ 7.13 — fixture adversarial: porta 1 (safeParse)', () => {
  it('validateTreeDef acepta a árbore adversarial', () => {
    const result = validateTreeDef(adversarialTreeDef())
    expect(result.ok).toBe(true)
  })
})

describe('★ 7.13 — fixture adversarial: porta 2 (round-trip)', () => {
  it('serialize → deserialize é equivalente (tree + meta, incl. regions)', () => {
    const doc = adversarialDocument()
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
    expect(restored.value.meta.theme?.regions).toHaveLength(2)
  })
})

describe('★ 7.13 — fixture adversarial: usable de verdade', () => {
  it('EditorEngine inicializa sen errors duros', () => {
    const engine = new EditorEngine(adversarialDocument(), {
      validators: createDefaultValidators(),
    })
    const hardErrors = engine.getIssues().filter((i) => i.severity === 'error')
    expect(hardErrors).toEqual([])
  })

  it('TreeEngine constrúese e computa layout sen throw', () => {
    const tree = adversarialTreeDef()
    expect(() => new TreeEngine(tree)).not.toThrow()
  })

  it('confirma os elementos adversariais presentes (documenta a intención)', () => {
    const tree = adversarialTreeDef()
    // Sen coordinateBounds no meta.
    expect(adversarialDocument().meta.coordinateBounds).toBeUndefined()
    // Labels bilingües.
    expect(tree.label).toEqual({ gl: 'Árbore adversarial', en: 'Adversarial Tree' })
    // 2 recursos, un refundable.
    expect(adversarialResources()).toHaveLength(2)
    expect(adversarialResources().find((r) => r.refundable === true)?.id).toBe('cristal')
    // maxTier + costPerTier.
    const conTier = tree.nodes.find((n) => n.id === 'con-tier')
    expect(conTier?.maxTier).toBe(3)
    expect(conTier?.costPerTier).toHaveLength(3)
    // Exclusions simétricas.
    expect(tree.nodes.find((n) => n.id === 'con-tier')?.exclusions).toContain('exclusivo-a')
    expect(tree.nodes.find((n) => n.id === 'exclusivo-a')?.exclusions).toContain('con-tier')
    // Grupos any e none.
    expect(tree.nodes.find((n) => n.id === 'grupo-any')?.prerequisites?.type).toBe('any')
    expect(tree.nodes.find((n) => n.id === 'grupo-none')?.prerequisites?.type).toBe('none')
    // tags + regions.
    expect(tree.nodes.find((n) => n.id === 'con-cor')?.tags).toEqual(['guerreiro', 'sur'])
    expect(adversarialDocument().meta.theme?.regions).toHaveLength(2)
    // color propio.
    expect(tree.nodes.find((n) => n.id === 'con-cor')?.color).toBe('#ff00ff')
    // nodo sen position.
    expect(tree.nodes.find((n) => n.id === 'sen-posicion')?.position).toBeUndefined()
  })
})
// ── FIN: tests adversarialFixture ──
