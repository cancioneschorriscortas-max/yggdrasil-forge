// ── INICIO: tests serialize / deserialize ──
import { describe, expect, it } from 'vitest'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'
import { minimalTreeDef } from './_fixtures.js'

describe('serializeDocument / deserializeDocument — round-trip', () => {
  it('round-trip simple: tree + meta default volve igual', () => {
    const doc = createEditorDocument(minimalTreeDef())
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
  })

  it('round-trip con todos os opcionais de meta', () => {
    const doc = createEditorDocument(minimalTreeDef(), {
      formatVersion: '1.0.0',
      background: { src: '/cyber.png', opacity: 0.5, contrast: 1.1 },
      coordinateBounds: { minX: 0, minY: 0, maxX: 1402, maxY: 1122 },
      thumbnail: 'data:image/png;base64,abc',
      imports: ['./other.tree.json'],
    })
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
  })
})

describe('serializeDocument — formato namespaced', () => {
  it('o JSON top-level ten claves `tree` e `editor`', () => {
    const doc = createEditorDocument(minimalTreeDef(), {
      background: { src: '/x.png' },
    })
    const json = serializeDocument(doc)
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(['editor', 'tree'])
    expect(parsed.tree).toBeTypeOf('object')
    expect(parsed.editor).toBeTypeOf('object')
  })
})

describe('deserializeDocument — compatibilidade cara atrás', () => {
  it('TreeDef pelado (sin envelope) carga con meta = default', () => {
    const treeOnly = JSON.stringify(minimalTreeDef())
    const restored = deserializeDocument(treeOnly)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree.id).toBe('editor-core-test')
    expect(restored.value.meta.formatVersion).toBe('1.0.0')
    expect('background' in restored.value.meta).toBe(false)
  })
})

describe('deserializeDocument — validación', () => {
  it('JSON inválido: devolve Result.err (non lanza)', () => {
    const restored = deserializeDocument('{ this is not json')
    expect(restored.ok).toBe(false)
  })

  it('tree inválido: devolve Result.err (non lanza)', () => {
    // Sin id, sin nodes → validateTreeDef rexeita.
    const broken = JSON.stringify({ tree: { totally: 'wrong' } })
    const restored = deserializeDocument(broken)
    expect(restored.ok).toBe(false)
  })

  it('JSON é a string "null": devolve Result.err', () => {
    const restored = deserializeDocument('null')
    expect(restored.ok).toBe(false)
  })
})

// ── 7.14-B: blindaxe do import (informe 05) ──
// deserializeDocument corre os validadores DUROS
// (structural/uniqueIds/referentialIntegrity) sobre o doc parseado.
// Contrato: se devolve `ok`, o documento é cargable (o motor non
// lanzará ao construírse) — sen isto, ids duplicados pasaban o schema
// Zod e crasheaban ao renderizar o canvas, perdendo o documento.
describe('deserializeDocument — validadores duros (blindaxe do import)', () => {
  const base = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'x' },
    nodes: [] as unknown[],
    edges: [] as unknown[],
    layout: { type: 'custom' },
  }
  const node = (id: string, x: number) => ({
    id,
    type: 'small',
    label: { gl: id },
    position: { x, y: 0 },
  })

  it('ids de nodo duplicados → err (sen throw)', () => {
    const json = JSON.stringify({ ...base, nodes: [node('dup', 0), node('dup', 50)] })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/dup/i)
  })

  it('ids de aresta duplicados → err', () => {
    const json = JSON.stringify({
      ...base,
      nodes: [node('a', 0), node('b', 50)],
      edges: [
        { id: 'e', source: 'a', target: 'b', type: 'dependency' },
        { id: 'e', source: 'b', target: 'a', type: 'dependency' },
      ],
    })
    expect(deserializeDocument(json).ok).toBe(false)
  })

  it('aresta a nodo inexistente → err', () => {
    const json = JSON.stringify({
      ...base,
      nodes: [node('a', 0)],
      edges: [{ id: 'e', source: 'a', target: 'fantasma', type: 'dependency' }],
    })
    expect(deserializeDocument(json).ok).toBe(false)
  })

  it('happy-path: árbore válida → ok', () => {
    const json = JSON.stringify({
      ...base,
      nodes: [node('a', 0), node('b', 50)],
      edges: [{ id: 'e', source: 'a', target: 'b', type: 'dependency' }],
    })
    expect(deserializeDocument(json).ok).toBe(true)
  })
})
// ── FIN: tests serialize ──
