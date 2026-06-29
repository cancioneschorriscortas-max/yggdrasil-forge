// ── INICIO: tests EditorDocument ──
import { describe, expect, it } from 'vitest'
import { DEFAULT_DOCUMENT_META, createEditorDocument } from '../src/document/EditorDocument.js'
import { minimalTreeDef } from './_fixtures.js'

describe('createEditorDocument', () => {
  it('sen meta: aplica DEFAULT_DOCUMENT_META', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree)
    expect(doc.tree).toBe(tree)
    expect(doc.meta).toEqual(DEFAULT_DOCUMENT_META)
  })

  it('formatVersion explícito: respéctase', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree, { formatVersion: '2.5.0' })
    expect(doc.meta.formatVersion).toBe('2.5.0')
  })

  it('background presente: copíase', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree, {
      background: { src: '/cyber.png', opacity: 0.5 },
    })
    expect(doc.meta.background?.src).toBe('/cyber.png')
    expect(doc.meta.background?.opacity).toBe(0.5)
  })

  it('coordinateBounds presente: copíase', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree, {
      coordinateBounds: { minX: 0, minY: 0, maxX: 1402, maxY: 1122 },
    })
    expect(doc.meta.coordinateBounds).toEqual({ minX: 0, minY: 0, maxX: 1402, maxY: 1122 })
  })

  it('exactOptionalPropertyTypes: opcionais ausentes NON aparecen como undefined', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree)
    // O cliché de exactOptionalPropertyTypes: as keys ausentes non
    // están no obxecto (en vez de = undefined). Iso permite que
    // `'background' in doc.meta` sexa false.
    expect('background' in doc.meta).toBe(false)
    expect('coordinateBounds' in doc.meta).toBe(false)
    expect('thumbnail' in doc.meta).toBe(false)
    expect('imports' in doc.meta).toBe(false)
  })
})
// ── FIN: tests EditorDocument ──
