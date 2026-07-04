// ── INICIO: tests setMetaField (7.5e §2) ──
// Cobre:
//   - Basic: setMetaField('theme', spec) actualiza doc.meta.theme.
//   - Undo/redo do theme.
//   - Round-trip JSON co theme completo (serialize → parse → igual).
//   - ★ Sonda de fluxo: simula a UI con asserts intermedios.

import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { setMetaField } from '../src/command/commands/index.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import type { ThemeSpec } from '../src/document/ThemeSpec.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    nodes: [
      {
        id: 'foo',
        type: 'notable',
        label: { en: 'Foo' },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('setMetaField — basic', () => {
  it('★ setMetaField(theme, spec) actualiza doc.meta.theme', () => {
    const engine = buildEngine()
    const spec: ThemeSpec = { nodeFills: { locked: '#aaaaaa' }, preset: 'test' }
    engine.dispatch(setMetaField('theme', spec))
    expect(engine.getDocument().meta.theme).toEqual(spec)
  })

  it('setMetaField(background, ref) actualiza doc.meta.background', () => {
    const engine = buildEngine()
    engine.dispatch(setMetaField('background', { src: 'https://example/bg.png' }))
    expect(engine.getDocument().meta.background?.src).toBe('https://example/bg.png')
  })

  it('setMetaField(theme, undefined) elimina o tema', () => {
    const engine = buildEngine()
    const spec: ThemeSpec = { preset: 'x' }
    engine.dispatch(setMetaField('theme', spec))
    expect(engine.getDocument().meta.theme).toBeDefined()
    // undefined explícito = quitar. Cast necesario porque theme? => undefined non
    // é asignable directamente co exactOptionalPropertyTypes.
    engine.dispatch(setMetaField('theme', undefined as unknown as ThemeSpec))
    expect(engine.getDocument().meta.theme).toBeUndefined()
  })
})

describe('★ Undo/redo do theme', () => {
  it('undo tras dispatch → tema anterior recuperado', () => {
    const engine = buildEngine()
    // Estado inicial: cero tema.
    expect(engine.getDocument().meta.theme).toBeUndefined()
    // Dispatch primeiro tema.
    const spec1: ThemeSpec = { nodeFills: { locked: '#111' }, preset: 'p1' }
    engine.dispatch(setMetaField('theme', spec1))
    expect(engine.getDocument().meta.theme).toEqual(spec1)
    // Dispatch outro tema.
    const spec2: ThemeSpec = { nodeFills: { locked: '#222' }, preset: 'p2' }
    engine.dispatch(setMetaField('theme', spec2))
    expect(engine.getDocument().meta.theme).toEqual(spec2)
    // Undo → spec1.
    engine.undo()
    expect(engine.getDocument().meta.theme).toEqual(spec1)
    // Redo → spec2.
    engine.redo()
    expect(engine.getDocument().meta.theme).toEqual(spec2)
  })

  it('undo desde primeiro dispatch → tema undefined (estado inicial)', () => {
    const engine = buildEngine()
    engine.dispatch(setMetaField('theme', { preset: 'x' }))
    expect(engine.getDocument().meta.theme).toBeDefined()
    engine.undo()
    expect(engine.getDocument().meta.theme).toBeUndefined()
  })
})

describe('★ Round-trip JSON co meta.theme', () => {
  it('serialize → parse preserva o tema completo', () => {
    const spec: ThemeSpec = {
      nodeFills: {
        locked: '#111',
        unlockable: '#222',
        unlocked: '#333',
        maxed: '#444',
        inProgress: '#555',
      },
      regions: [
        { id: 'r1', label: 'R1', tag: 't1', color: '#f00' },
        { id: 'r2', label: 'R2', tag: 't2', color: '#0f0' },
      ],
      preset: 'panadeiro',
    }
    const tree: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '0.1.0',
      label: { en: 'T' },
      groups: [],
      nodes: [{ id: 'foo', type: 'notable', label: { en: 'Foo' }, position: { x: 0, y: 0 } }],
      edges: [],
      layout: { type: 'custom' },
    } as TreeDef
    const doc = createEditorDocument(tree, { theme: spec })
    const json = serializeDocument(doc)
    const parsed = deserializeDocument(json)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.meta.theme).toEqual(spec)
    }
  })

  it('round-trip cun tema parcial (só preset)', () => {
    const tree: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '0.1.0',
      label: { en: 'T' },
      groups: [],
      nodes: [{ id: 'foo', type: 'notable', label: { en: 'Foo' }, position: { x: 0, y: 0 } }],
      edges: [],
      layout: { type: 'custom' },
    } as TreeDef
    const doc = createEditorDocument(tree, { theme: { preset: 'x' } })
    const parsed = deserializeDocument(serializeDocument(doc))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.meta.theme?.preset).toBe('x')
    }
  })
})

describe('★ Sonda de fluxo (simula UI con asserts intermedios)', () => {
  it('secuencia UI: nodeFills.locked → +rexión → +background → undo ×2 → estado inicial paso a paso', () => {
    const engine = buildEngine()
    // Estado 0: nada.
    expect(engine.getDocument().meta.theme).toBeUndefined()
    expect(engine.getDocument().meta.background).toBeUndefined()

    // Paso 1: usuario edita nodeFills.locked.
    const s1: ThemeSpec = { nodeFills: { locked: '#111' } }
    engine.dispatch(setMetaField('theme', s1))
    expect(engine.getDocument().meta.theme?.nodeFills?.locked).toBe('#111')
    expect(engine.getIssues()).toEqual([]) // Issues estables — o comando non introduce warnings

    // Paso 2: usuario engade unha rexión tintada (mesmo tema, con regions).
    const s2: ThemeSpec = {
      nodeFills: { locked: '#111' },
      regions: [{ id: 'r1', label: 'R1', tag: 't1', color: '#f00' }],
    }
    engine.dispatch(setMetaField('theme', s2))
    expect(engine.getDocument().meta.theme?.regions?.length).toBe(1)
    expect(engine.getDocument().meta.theme?.regions?.[0]?.color).toBe('#f00')

    // Paso 3: usuario pon URL de fondo.
    engine.dispatch(setMetaField('background', { src: 'https://example/bg.png' }))
    expect(engine.getDocument().meta.background?.src).toBe('https://example/bg.png')
    // O tema NON se perdeu (é un campo distinto).
    expect(engine.getDocument().meta.theme?.regions?.length).toBe(1)

    // Paso 4: undo do background.
    engine.undo()
    expect(engine.getDocument().meta.background).toBeUndefined()
    // Tema segue intacto tras undo do background (só afecta ao seu campo).
    expect(engine.getDocument().meta.theme?.regions?.length).toBe(1)

    // Paso 5: undo da rexión → volta a s1 (só locked).
    engine.undo()
    expect(engine.getDocument().meta.theme?.regions).toBeUndefined()
    expect(engine.getDocument().meta.theme?.nodeFills?.locked).toBe('#111')

    // Paso 6: undo do primeiro dispatch → tema undefined de novo.
    engine.undo()
    expect(engine.getDocument().meta.theme).toBeUndefined()
  })
})
// ── FIN: tests setMetaField ──
