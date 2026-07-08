// ── INICIO: tests setTreeField (briefing 7.12 Cambio 1) ──
// Cobre:
//   - set de label/description/version + undo/redo.
//   - set de resources (engadir/editar/quitar) + undo.
//   - round-trip JSON dun doc con recursos editados.
//   - issues estables tras cada commit.

import type { Resource, TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { setTreeField } from '../src/command/commands/index.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    nodes: [{ id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('★ 7.12 — setTreeField: identidade', () => {
  it('setTreeField(label, ...) actualiza doc.tree.label', () => {
    const engine = buildEngine()
    const r = engine.transaction(undefined, (tx) =>
      tx.apply(setTreeField('label', { gl: 'A miña árbore' })),
    )
    expect(r.ok).toBe(true)
    expect(engine.getDocument().tree.label).toEqual({ gl: 'A miña árbore' })
  })

  it('setTreeField(description, ...) actualiza doc.tree.description', () => {
    const engine = buildEngine()
    engine.transaction(undefined, (tx) =>
      tx.apply(setTreeField('description', { gl: 'Unha descrición' })),
    )
    expect(engine.getDocument().tree.description).toEqual({ gl: 'Unha descrición' })
  })

  it('setTreeField(version, ...) actualiza doc.tree.version', () => {
    const engine = buildEngine()
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('version', '2.0.0')))
    expect(engine.getDocument().tree.version).toBe('2.0.0')
  })

  it('setTreeField(author, ...) actualiza doc.tree.author', () => {
    const engine = buildEngine()
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('author', 'Agarfal')))
    expect(engine.getDocument().tree.author).toBe('Agarfal')
  })

  it('★ undo/redo restaura o valor anterior', () => {
    const engine = buildEngine()
    const before = engine.getDocument()
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('version', '2.0.0')))
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getDocument()).toBe(before)
    expect(engine.getDocument().tree.version).toBe('0.1.0')
    engine.redo()
    expect(engine.getDocument().tree.version).toBe('2.0.0')
  })

  it('setTreeField(description, undefined) quita a descrición', () => {
    const engine = buildEngine()
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('description', { gl: 'temporal' })))
    expect(engine.getDocument().tree.description).toBeDefined()
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('description', undefined)))
    expect(engine.getDocument().tree.description).toBeUndefined()
  })
})

describe('★ 7.12 — setTreeField: resources', () => {
  it('engadir un recurso', () => {
    const engine = buildEngine()
    const ouro: Resource = { id: 'recurso-1', label: { gl: 'Ouro' }, initial: 5 }
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouro])))
    expect(engine.getDocument().tree.resources).toEqual([ouro])
  })

  it('editar un recurso existente (array novo, non mutación)', () => {
    const engine = buildEngine()
    const ouro: Resource = { id: 'recurso-1', label: { gl: 'Ouro' }, initial: 5 }
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouro])))
    const before = engine.getDocument().tree.resources
    const ouroEditado: Resource = { ...ouro, initial: 10 }
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouroEditado])))
    const after = engine.getDocument().tree.resources
    expect(after).not.toBe(before)
    expect(after?.[0]?.initial).toBe(10)
  })

  it('quitar un recurso (array máis curto)', () => {
    const engine = buildEngine()
    const ouro: Resource = { id: 'recurso-1', label: { gl: 'Ouro' } }
    const prata: Resource = { id: 'recurso-2', label: { gl: 'Prata' } }
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouro, prata])))
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [prata])))
    expect(engine.getDocument().tree.resources).toEqual([prata])
  })

  it('★ undo restaura o array de resources anterior', () => {
    const engine = buildEngine()
    const ouro: Resource = { id: 'recurso-1', label: { gl: 'Ouro' } }
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouro])))
    engine.undo()
    expect(engine.getDocument().tree.resources).toBeUndefined()
  })
})

describe('★ 7.12 — round-trip JSON con recursos editados', () => {
  it('serialize → deserialize preserva identidade + resources', () => {
    const engine = buildEngine()
    const ouro: Resource = {
      id: 'recurso-1',
      label: { gl: 'Ouro' },
      initial: 5,
      max: 99,
      icon: '🪙',
      color: '#ffd700',
      refundable: true,
      refundPercent: 50,
    }
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('label', { gl: 'A árbore' })))
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouro])))
    const doc = engine.getDocument()
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree.label).toEqual({ gl: 'A árbore' })
    expect(restored.value.tree.resources).toEqual([ouro])
  })
})

describe('★ 7.12 — issues estables tras setTreeField', () => {
  it('editar identidade/resources non introduce issues novos', () => {
    const engine = buildEngine()
    const issuesBefore = engine.getIssues()
    engine.transaction(undefined, (tx) => tx.apply(setTreeField('version', '2.0.0')))
    engine.transaction(undefined, (tx) =>
      tx.apply(setTreeField('resources', [{ id: 'recurso-1', label: { gl: 'Ouro' } }])),
    )
    const issuesAfter = engine.getIssues()
    expect(issuesAfter.filter((i) => i.severity === 'error')).toEqual(
      issuesBefore.filter((i) => i.severity === 'error'),
    )
  })
})
// ── FIN: tests setTreeField ──
