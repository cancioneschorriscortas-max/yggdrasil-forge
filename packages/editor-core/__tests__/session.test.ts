// ── INICIO: tests EditorSession ──
import { describe, expect, it } from 'vitest'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { createSession } from '../src/session/EditorSession.js'
import { minimalTreeDef } from './_fixtures.js'

describe('createSession', () => {
  it('dirty arranca en false', () => {
    const doc = createEditorDocument(minimalTreeDef())
    const session = createSession(doc)
    expect(session.dirty).toBe(false)
  })

  it('document é a mesma referencia que se pasou', () => {
    const doc = createEditorDocument(minimalTreeDef())
    const session = createSession(doc)
    expect(session.document).toBe(doc)
  })

  it('session é mutable (futuros pipelines van facer dirty=true)', () => {
    const doc = createEditorDocument(minimalTreeDef())
    const session = createSession(doc)
    // Aínda que `EditorDocument` é readonly, a Session non — é o
    // contedor mutable. Verificamos que se pode tocar `dirty`.
    session.dirty = true
    expect(session.dirty).toBe(true)
  })
})
// ── FIN: tests session ──
