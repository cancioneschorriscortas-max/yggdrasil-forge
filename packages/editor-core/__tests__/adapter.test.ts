// ── INICIO: tests JsonDocumentAdapter ──
import { describe, expect, it } from 'vitest'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { JsonDocumentAdapter, toJson } from '../src/document/JsonDocumentAdapter.js'
import { minimalTreeDef } from './_fixtures.js'

describe('JsonDocumentAdapter', () => {
  it('save + load (vía toJson) round-trips o documento', async () => {
    const adapter = new JsonDocumentAdapter()
    const doc = createEditorDocument(minimalTreeDef(), {
      coordinateBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    })
    const saveRes = await adapter.save(doc, '')
    expect(saveRes.ok).toBe(true)
    const json = toJson(doc) // o adapter `save` é no-op; toJson é a vía real
    const loadRes = await adapter.load(json)
    expect(loadRes.ok).toBe(true)
    if (!loadRes.ok) return
    expect(loadRes.value.tree).toEqual(doc.tree)
    expect(loadRes.value.meta).toEqual(doc.meta)
  })

  it('load dun JSON inválido: Result.err', async () => {
    const adapter = new JsonDocumentAdapter()
    const res = await adapter.load('not json')
    expect(res.ok).toBe(false)
  })

  it('load dun TreeDef pelado: carga con meta default', async () => {
    const adapter = new JsonDocumentAdapter()
    const treeJson = JSON.stringify(minimalTreeDef())
    const res = await adapter.load(treeJson)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.meta.formatVersion).toBe('1.0.0')
  })
})
// ── FIN: tests adapter ──
