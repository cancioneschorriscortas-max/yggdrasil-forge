// ── INICIO: tests rexións — CRUD + sonda de fluxo (briefing 7.13) ──

import type { ThemeRegionTint, TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { setMetaField, setNodeField } from '../src/command/commands/index.js'
import { toggleTag } from '../src/command/composites.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'rexions-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('★ 7.13 — rexións: CRUD via setMetaField(theme, …)', () => {
  it('engadir unha rexión', () => {
    const engine = buildEngine()
    const rexion: ThemeRegionTint = {
      id: 'rexion-1',
      label: 'Nova rexión',
      tag: 'rexion-1',
      color: '#c8875f',
    }
    engine.dispatch(setMetaField('theme', { regions: [rexion] }))
    expect(engine.getDocument().meta.theme?.regions).toEqual([rexion])
  })

  it('renomear (editar label) unha rexión existente', () => {
    const engine = buildEngine()
    const rexion: ThemeRegionTint = {
      id: 'rexion-1',
      label: 'Nova rexión',
      tag: 'rexion-1',
      color: '#c8875f',
    }
    engine.dispatch(setMetaField('theme', { regions: [rexion] }))
    engine.dispatch(setMetaField('theme', { regions: [{ ...rexion, label: 'Guerreiro' }] }))
    expect(engine.getDocument().meta.theme?.regions?.[0]?.label).toBe('Guerreiro')
  })

  it('★ borrar rexión quita SÓ o tinte — non toca tags dos nodos', () => {
    const engine = buildEngine()
    const rexion: ThemeRegionTint = { id: 'rexion-1', label: 'Rexión', tag: 'r1', color: '#fff' }
    engine.dispatch(setMetaField('theme', { regions: [rexion] }))
    engine.dispatch(setNodeField('a', 'tags', ['r1']))
    // Borrar a rexión (array baleiro).
    engine.dispatch(setMetaField('theme', { regions: [] }))
    expect(engine.getDocument().meta.theme?.regions).toEqual([])
    // O tag do nodo segue intacto.
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'a')?.tags).toEqual(['r1'])
  })

  it('undo restaura o theme anterior', () => {
    const engine = buildEngine()
    const rexion: ThemeRegionTint = { id: 'rexion-1', label: 'Rexión', tag: 'r1', color: '#fff' }
    engine.dispatch(setMetaField('theme', { regions: [rexion] }))
    engine.undo()
    expect(engine.getDocument().meta.theme).toBeUndefined()
  })
})

describe('★ 7.13 — sonda de fluxo: crear rexión → asignar a 2 nodos → borrar → tags intactos → undo ×2', () => {
  it('fluxo completo con asserts paso a paso', () => {
    const engine = buildEngine()
    const rexion: ThemeRegionTint = {
      id: 'rexion-1',
      label: 'Guerreiro',
      tag: 'guerreiro',
      color: '#c8875f',
    }

    // 1) Crear rexión.
    let r = engine.dispatch(setMetaField('theme', { regions: [rexion] }))
    expect(r.ok).toBe(true)
    expect(engine.getDocument().meta.theme?.regions).toEqual([rexion])

    // 2) Asignar aos nodos 'a' e 'b' NUNHA soa transacción.
    r = engine.transaction({ en: 'Assign region', gl: 'Asignar rexión' }, (tx) => {
      const doc = engine.getDocument()
      const nodeA = doc.tree.nodes.find((n) => n.id === 'a')
      const nodeB = doc.tree.nodes.find((n) => n.id === 'b')
      tx.apply(setNodeField('a', 'tags', toggleTag(nodeA?.tags, 'guerreiro', true)))
      tx.apply(setNodeField('b', 'tags', toggleTag(nodeB?.tags, 'guerreiro', true)))
    })
    expect(r.ok).toBe(true)
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'a')?.tags).toEqual(['guerreiro'])
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'b')?.tags).toEqual(['guerreiro'])

    // 3) Borrar a rexión — só o tinte desaparece.
    r = engine.dispatch(setMetaField('theme', { regions: [] }))
    expect(r.ok).toBe(true)
    expect(engine.getDocument().meta.theme?.regions).toEqual([])
    // 4) Tags intactos nos dous nodos.
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'a')?.tags).toEqual(['guerreiro'])
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'b')?.tags).toEqual(['guerreiro'])

    // 5) undo ×2 → estado inicial paso a paso.
    expect(engine.undo().ok).toBe(true) // desfai o borrado da rexión
    expect(engine.getDocument().meta.theme?.regions).toEqual([rexion])

    expect(engine.undo().ok).toBe(true) // desfai a asignación (as DÚAS mutacións, un só undo)
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'a')?.tags).toBeUndefined()
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'b')?.tags).toBeUndefined()

    expect(engine.undo().ok).toBe(true) // desfai a creación da rexión
    expect(engine.getDocument().meta.theme).toBeUndefined()
  })
})
// ── FIN: tests rexións ──
