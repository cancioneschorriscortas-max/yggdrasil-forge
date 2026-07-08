// ── INICIO: probe A.6.42 — documento baleiro (briefing 7.10, Cambio 3) ──
// Regra da casa: antes de escribir UI que depende dun comportamento
// (aquí, "Novo" crea unha árbore baleira), proba ese comportamento
// con probes headless. Se o punto 1 fallase (validador duro tropeza
// coa árbore baleira), NON se parchea a UI — é decisión de
// Arquitecto se se relaxa o validador ou o "baleiro" leva un nodo
// raíz semente.

import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'
import { createDefaultValidators } from '../src/validation/createDefaultValidators.js'
import { minimalTreeDef } from './_fixtures.js'

/**
 * Árbore baleira mínima que pasa `treeDefShapeSchema` — campos
 * confirmados no probe: `id`, `schemaVersion`, `version`, `label`,
 * `nodes: []`, `edges: []`, `layout.type`. `nodes`/`edges` sen
 * mínimo no schema (Zod), confirmado.
 */
function arboreBaleira(): TreeDef {
  return {
    id: 'nova-arbore',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Nova árbore' },
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

describe('★ Probe A.6.42 — documento baleiro (briefing 7.10)', () => {
  it('1. EditorEngine inicializa cunha árbore baleira SEN errors duros', () => {
    const doc = createEditorDocument(arboreBaleira())
    const engine = new EditorEngine(doc, { validators: createDefaultValidators() })
    const issues = engine.getIssues()
    const hardErrors = issues.filter((i) => i.severity === 'error')
    expect(hardErrors).toEqual([])
  })

  it('2. round-trip: serialize → deserialize da árbore baleira → ok e equivalente', () => {
    const doc = createEditorDocument(arboreBaleira())
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
  })

  it('3. round-trip completo: árbore con theme + costPerTier + resources → equivalente', () => {
    const tree: TreeDef = {
      ...minimalTreeDef(),
      resources: [{ id: 'fariña', label: { gl: 'Fariña' }, initial: 0, max: 99 }],
      nodes: [
        {
          id: 'root',
          type: 'keystone',
          label: { en: 'Root' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'child',
          type: 'small',
          label: { en: 'Child' },
          position: { x: 100, y: 0 },
          maxTier: 3,
          costPerTier: [
            [{ resourceId: 'fariña', amount: 1 }],
            [{ resourceId: 'fariña', amount: 2 }],
            [{ resourceId: 'fariña', amount: 3 }],
          ],
        },
      ],
    }
    const doc = createEditorDocument(tree, {
      theme: {
        preset: 'tintado',
        nodeFills: { locked: '#c8c4bb', unlocked: '#7cb37c' },
        textColor: '#e8e9ea',
        regions: [{ id: 'pan-region', label: 'Pan', tag: 'pan', color: '#c8875f' }],
      },
    })
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
    // Confirmación puntual dos tres eidos citados no briefing (non só
    // toEqual xenérico — se algún deles se serializase mal, isto
    // faría o test fallar de forma explicable).
    expect(restored.value.meta.theme?.textColor).toBe('#e8e9ea')
    expect(restored.value.tree.resources?.[0]?.id).toBe('fariña')
    expect(restored.value.tree.nodes[1]?.costPerTier).toHaveLength(3)
  })

  it('4a. deserializeDocument("non é json") → err con mensaxe', () => {
    const restored = deserializeDocument('non é json')
    expect(restored.ok).toBe(false)
    if (restored.ok) return
    expect(restored.error.message.length).toBeGreaterThan(0)
  })

  it('4b. deserializeDocument(\'{"tree":{}}\') → err con mensaxe', () => {
    const restored = deserializeDocument('{"tree":{}}')
    expect(restored.ok).toBe(false)
    if (restored.ok) return
    expect(restored.error.message.length).toBeGreaterThan(0)
  })
})
// ── FIN: probe A.6.42 — documento baleiro ──
