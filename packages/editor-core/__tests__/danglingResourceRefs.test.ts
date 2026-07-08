// ── INICIO: tests danglingResourceRefsValidator (briefing 7.12) ──

import type { NodeDef, Resource, TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { setNodeField, setTreeField } from '../src/command/commands/index.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { createDefaultValidators } from '../src/validation/createDefaultValidators.js'
import { danglingResourceRefsValidator } from '../src/validation/soft/danglingResourceRefsValidator.js'
import { minimalTreeDef } from './_fixtures.js'

function docWith(patch: (tree: TreeDef) => void): ReturnType<typeof createEditorDocument> {
  const tree = minimalTreeDef()
  patch(tree)
  return createEditorDocument(tree)
}

describe('★ 7.12 — danglingResourceRefsValidator', () => {
  it('★ severity é "warning", NON "error" (a decisión de deseño: permitir + avisar)', () => {
    const doc = docWith((tree) => {
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { cost?: unknown }).cost = [{ resourceId: 'fantasma', amount: 1 }]
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('warning')
  })

  it('colgante en cost → 1 issue con nodeId correcto', () => {
    const doc = docWith((tree) => {
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { cost?: unknown }).cost = [{ resourceId: 'fantasma', amount: 1 }]
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.code).toBe('RES_DANGLING_COST')
    expect(issues[0]?.nodeId).toBe('child')
  })

  it('colgante en costPerTier → 1 issue', () => {
    const doc = docWith((tree) => {
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { costPerTier?: unknown }).costPerTier = [[{ resourceId: 'fantasma', amount: 1 }]]
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.code).toBe('RES_DANGLING_COST_PER_TIER')
  })

  it('colgante en resource_min ANIÑADO (grupo all) → 1 issue', () => {
    const doc = docWith((tree) => {
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { prerequisites?: unknown }).prerequisites = {
        type: 'all',
        conditions: [{ type: 'resource_min', resourceId: 'fantasma', amount: 10 }],
      }
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.code).toBe('RES_DANGLING_PREREQ')
  })

  it('colgante en resource_min simple (sen grupo) → 1 issue', () => {
    const doc = docWith((tree) => {
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { prerequisites?: unknown }).prerequisites = {
        type: 'resource_min',
        resourceId: 'fantasma',
        amount: 10,
      }
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toHaveLength(1)
  })

  it('recurso presente (declarado en tree.resources) → cero issues', () => {
    const doc = docWith((tree) => {
      tree.resources = [{ id: 'ouro', label: { gl: 'Ouro' } }] as Resource[]
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { cost?: unknown }).cost = [{ resourceId: 'ouro', amount: 1 }]
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toEqual([])
  })

  it('varios colgantes (cost + costPerTier + prereq) → varios issues, un por cada un', () => {
    const doc = docWith((tree) => {
      const child = tree.nodes.find((n) => n.id === 'child') as NodeDef
      ;(child as { cost?: unknown }).cost = [{ resourceId: 'a', amount: 1 }]
      ;(child as { costPerTier?: unknown }).costPerTier = [[{ resourceId: 'b', amount: 1 }]]
      ;(child as { prerequisites?: unknown }).prerequisites = {
        type: 'resource_min',
        resourceId: 'c',
        amount: 1,
      }
    })
    const issues = danglingResourceRefsValidator(doc)
    expect(issues).toHaveLength(3)
  })

  it('sen resources declarados e sen referencias → cero issues', () => {
    const doc = docWith(() => {
      // Sen patch: fixture tal cal, sen resources nin referencias.
    })
    expect(danglingResourceRefsValidator(doc)).toEqual([])
  })
})

describe('★ 7.12 — sonda de fluxo: engadir recurso → custo → borrar recurso → issue → undo', () => {
  it('fluxo completo con asserts intermedios', () => {
    const tree: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '0.1.0',
      label: { en: 'T' },
      nodes: [{ id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } }],
      edges: [],
      layout: { type: 'custom' },
    } as TreeDef
    const engine = new EditorEngine(createEditorDocument(tree), {
      validators: createDefaultValidators(),
    })

    // 1) Engadir recurso.
    const ouro: Resource = { id: 'recurso-1', label: { gl: 'Ouro' }, initial: 0 }
    let r = engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [ouro])))
    expect(r.ok).toBe(true)
    expect(engine.getIssues().filter((i) => i.code === 'RES_DANGLING_COST')).toEqual([])

    // 2) Asignalo como custo do nodo 'a'.
    r = engine.transaction(undefined, (tx) =>
      tx.apply(setNodeField('a', 'cost', [{ resourceId: 'recurso-1', amount: 3 }])),
    )
    expect(r.ok).toBe(true)
    expect(engine.getIssues().filter((i) => i.severity === 'error')).toEqual([])

    // 3) Borrar o recurso — PERMITIDO (non bloquea).
    r = engine.transaction(undefined, (tx) => tx.apply(setTreeField('resources', [])))
    expect(r.ok).toBe(true)

    // 4) getIssues() contén o colgante co nodeId correcto.
    const danglingIssues = engine.getIssues().filter((i) => i.code === 'RES_DANGLING_COST')
    expect(danglingIssues).toHaveLength(1)
    expect(danglingIssues[0]?.nodeId).toBe('a')
    expect(danglingIssues[0]?.severity).toBe('warning')

    // 5) undo → limpo outra vez.
    engine.undo()
    expect(engine.getDocument().tree.resources).toEqual([ouro])
    expect(engine.getIssues().filter((i) => i.code === 'RES_DANGLING_COST')).toEqual([])
  })
})
// ── FIN: tests danglingResourceRefsValidator ──
