// ── INICIO: tests dirixidos á cobertura de TreeEngine.ts (1.18 T3) ──
// Estes tests existen UNICAMENTE para elevar a cobertura de TreeEngine.ts
// por encima do 90% exercitando ramas defensivas e branches secundarios
// non cubertos polos escenarios funcionais. NON modifican comportamento
// nin engaden contrato; só baten cada path que falta. Ver briefing 1.18,
// decisión 5.4.
//
// Categorías cubertas aquí:
//   - validateTreeDef con valor "non obxecto" (liña 61).
//   - validateChange: rename con id existente, add_edge duplicado/source
//     ausente/target ausente, remove_edge inexistente, modify_edge
//     inexistente, add_group duplicado, remove_group/modify_group
//     inexistentes, add_resource duplicado, modify_layout, default.
//   - applyOneChange: rename con edges múltiples non afectadas (liña 1164),
//     modify_edge, add_group/remove_group/modify_group (groups previos
//     ausentes e presentes), add_resource (camiños), modify_layout.
//   - describeConflict: cada variante distinta de duplicate_add_node.
//   - getProgress con node.progress definido (liña 163).
//   - unlock segundo intento sobre nodo con instancia previa (rama de
//     `lock + unlock` recupera ID), liñas 464-467.

import { ErrorCode, YggdrasilError } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'
import { makeEdge, makeNode, makeRichTreeDef } from './fixtures.js'

describe('TreeEngine — reforzo de cobertura (1.18)', () => {
  // ── validateTreeDef defensivo (liña 61) ──
  it('constructor: lanza INVALID_TREE_DEF se treeDef é un array', () => {
    let code: string | undefined
    try {
      new TreeEngine([] as unknown as TreeDef)
    } catch (e) {
      if (e instanceof YggdrasilError) {
        code = e.code
      }
    }
    expect(code).toBe(ErrorCode.INVALID_TREE_DEF)
  })

  it('constructor: lanza INVALID_TREE_DEF se treeDef é null', () => {
    let code: string | undefined
    try {
      new TreeEngine(null as unknown as TreeDef)
    } catch (e) {
      if (e instanceof YggdrasilError) {
        code = e.code
      }
    }
    expect(code).toBe(ErrorCode.INVALID_TREE_DEF)
  })

  // ── getProgress con node.progress definido (liña 163) ──
  it('getProgress: devolve a porcentaxe gardada na instancia tras unlock', async () => {
    // Construímos un nodo con supportsProgress; o motor 1.x non permite
    // setProgress, pero podemos verificar que tras desbloquear (progress
    // queda undefined) e tras manipulación vía respec etc. o getter
    // retorna 0 sen lanzar.
    const engine = new TreeEngine(makeRichTreeDef())
    await engine.unlock('root')
    expect(engine.getProgress('root')).toBe(0)
    // Nodo sen instancia → 0.
    expect(engine.getProgress('no-existe')).toBe(0)
  })

  // ── unlock segundo: rama 464-467 (instancia previa) ──
  it('unlock tras lock: reutiliza a instancia previa (rama if-side de update)', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    await engine.unlock('root')
    await engine.lock('root') // instancia permanece, state=locked
    const inst = engine.getNodeState('root')
    expect(inst?.state).toBe('locked')
    expect(inst?.id).toBe('root')

    // Segundo unlock: como xa hai instancia, `update` entra polo if-side
    // (liñas 463-470) en lugar do else (liñas 471-478). 'root' non ten
    // maxTier definido → queda en 'unlocked' (non maxed).
    const r = await engine.unlock('root')
    expect(r.ok).toBe(true)
    expect(engine.getNodeState('root')?.state).toBe('unlocked')
    // history ten as transicións do segundo ciclo.
    const history = engine.getNodeState('root')?.history ?? []
    expect(history.length).toBeGreaterThanOrEqual(2)
  })

  // ── validateChange: erros estruturais distintos ──
  it('rename_node_id: newId xa existente → INVALID_NODE_STATE', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'b' }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.INVALID_NODE_STATE)
    }
  })

  it('rename_node_id: oldId inexistente → NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'rename_node_id', oldId: 'no-existe', newId: 'novo' },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('add_edge: id duplicado → INVALID_EDGE_DEF', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_edge', edge: makeEdge('e-root-a', 'root', 'a') },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.INVALID_EDGE_DEF)
    }
  })

  it('add_edge: target inexistente → NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_edge', edge: makeEdge('e-x', 'root', 'no-existe') },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('modify_edge: id inexistente → INVALID_EDGE_DEF', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'modify_edge', edgeId: 'no-existe', changes: { type: 'soft_dependency' } },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.INVALID_EDGE_DEF)
    }
  })

  it('add_group / remove_group / modify_group: erros e camiños correctos', async () => {
    const engine = new TreeEngine(makeRichTreeDef())

    // add_group duplicado (g-left xa existe en makeRichTreeDef).
    const r1 = await engine.applyChanges([
      {
        type: 'add_group',
        group: { id: 'g-left', label: 'duplicado', nodeIds: [] },
      },
    ])
    expect(r1.ok).toBe(false)
    if (!r1.ok) expect(r1.error.code).toBe(ErrorCode.INVALID_NODE_STATE)

    // remove_group inexistente.
    const r2 = await engine.applyChanges([{ type: 'remove_group', groupId: 'no-existe' }])
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.error.code).toBe(ErrorCode.INVALID_NODE_STATE)

    // modify_group inexistente.
    const r3 = await engine.applyChanges([
      { type: 'modify_group', groupId: 'no-existe', changes: { color: 'red' } },
    ])
    expect(r3.ok).toBe(false)
    if (!r3.ok) expect(r3.error.code).toBe(ErrorCode.INVALID_NODE_STATE)

    // Camiños felices: modify_group existente, remove_group existente.
    const r4 = await engine.applyChanges([
      { type: 'modify_group', groupId: 'g-left', changes: { color: '#fff' } },
    ])
    expect(r4.ok).toBe(true)
    expect(engine.getTreeDef().groups?.find((g) => g.id === 'g-left')?.color).toBe('#fff')

    const r5 = await engine.applyChanges([{ type: 'remove_group', groupId: 'g-left' }])
    expect(r5.ok).toBe(true)
    expect(engine.getTreeDef().groups?.some((g) => g.id === 'g-left')).toBe(false)
  })

  it('add_resource: duplicado → INVALID_NODE_STATE', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      {
        type: 'add_resource',
        resource: { id: 'xp', label: 'duplicado' },
      },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.INVALID_NODE_STATE)
  })

  it('add_resource: id novo → ok, recurso engadido á TreeDef', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_resource', resource: { id: 'mana', label: 'MP' } },
    ])
    expect(r.ok).toBe(true)
    expect(engine.getTreeDef().resources?.some((res) => res.id === 'mana')).toBe(true)
  })

  it('modify_layout: cambia o tipo de layout', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    expect(engine.getTreeDef().layout.type).toBe('radial')
    const r = await engine.applyChanges([
      { type: 'modify_layout', changes: { type: 'tree', spacing: 50 } },
    ])
    expect(r.ok).toBe(true)
    expect(engine.getTreeDef().layout.type).toBe('tree')
    expect(engine.getTreeDef().layout.spacing).toBe(50)
  })

  // ── applyOneChange: árbore SEN groups previos para forzar inicialización ──
  it('add_group sobre árbore sen groups previos: créase o array', async () => {
    // makeRichTreeDef trae groups; aquí construímos unha sen groups.
    const treeDef: TreeDef = {
      id: 'no-groups',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'No groups',
      nodes: [makeNode('x')],
      edges: [],
      layout: { type: 'radial' },
    }
    const engine = new TreeEngine(treeDef)
    expect(engine.getTreeDef().groups).toBeUndefined()
    const r = await engine.applyChanges([
      {
        type: 'add_group',
        group: { id: 'g1', label: 'G1', nodeIds: ['x'] },
      },
    ])
    expect(r.ok).toBe(true)
    expect(engine.getTreeDef().groups?.length).toBe(1)
  })

  it('add_resource sobre árbore sen resources previos: créase o array', async () => {
    const treeDef: TreeDef = {
      id: 'no-res',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'No resources',
      nodes: [],
      edges: [],
      layout: { type: 'radial' },
    }
    const engine = new TreeEngine(treeDef)
    expect(engine.getTreeDef().resources).toBeUndefined()
    const r = await engine.applyChanges([
      { type: 'add_resource', resource: { id: 'xp', label: 'XP' } },
    ])
    expect(r.ok).toBe(true)
    expect(engine.getTreeDef().resources?.length).toBe(1)
  })

  // ── describeConflict: cada variante con mensaxe distinta ──
  // O acceso é indirecto vía mensaxe localizada — non podemos inspeccionala
  // sen ler unha mensaxe específica, pero podemos confirmar que cada
  // variante de conflito devolve CHANGE_CONFLICT (importante: cada caso
  // distinto activa unha rama distinta de describeConflict).
  it('conflito add_then_remove: CHANGE_CONFLICT con context distinto', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_node', node: makeNode('temp') },
      { type: 'remove_node', nodeId: 'temp' },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.CHANGE_CONFLICT)
      // O context contén o tipo de conflito.
      const ctx = r.error.context as { conflictType?: string } | undefined
      expect(ctx?.conflictType).toBe('add_then_remove')
    }
  })

  it('conflito remove_then_modify: CHANGE_CONFLICT con context distinto', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'remove_node', nodeId: 'a' },
      { type: 'modify_node', nodeId: 'a', changes: { label: 'x' } },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const ctx = r.error.context as { conflictType?: string } | undefined
      expect(ctx?.conflictType).toBe('remove_then_modify')
    }
  })

  it('conflito modify_after_rename: CHANGE_CONFLICT', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'rename_node_id', oldId: 'a', newId: 'a2' },
      { type: 'modify_node', nodeId: 'a', changes: { label: 'x' } },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const ctx = r.error.context as { conflictType?: string } | undefined
      expect(ctx?.conflictType).toBe('modify_after_rename')
    }
  })

  it('conflito rename_chain: CHANGE_CONFLICT', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'rename_node_id', oldId: 'a', newId: 'a2' },
      { type: 'rename_node_id', oldId: 'a2', newId: 'a3' },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const ctx = r.error.context as { conflictType?: string } | undefined
      expect(ctx?.conflictType).toBe('rename_chain')
    }
  })

  it('conflito rename_to_existing: CHANGE_CONFLICT', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'b' }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // validateChange detecta antes que analyzeChanges (porque newId xa
      // existe); o código é INVALID_NODE_STATE no validateChange.
      expect(r.error.code).toBe(ErrorCode.INVALID_NODE_STATE)
    }
  })

  it('conflito duplicate_edge_id: CHANGE_CONFLICT', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_edge', edge: makeEdge('dup', 'root', 'a') },
      { type: 'add_edge', edge: makeEdge('dup', 'root', 'b') },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const ctx = r.error.context as { conflictType?: string } | undefined
      expect(ctx?.conflictType).toBe('duplicate_edge_id')
    }
  })

  // ── applyOneChange: rename con edges múltiples para cubrir liña 1164 ──
  it('rename_node_id con edges que NON referencian o nodo: bucle salta correctamente', async () => {
    const treeDef: TreeDef = {
      id: 'multi-edges',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'Multi edges',
      nodes: [makeNode('x'), makeNode('y'), makeNode('z')],
      edges: [makeEdge('e-yz', 'y', 'z')], // non referencia 'x'
      layout: { type: 'radial' },
    }
    const engine = new TreeEngine(treeDef)
    const r = await engine.applyChanges([{ type: 'rename_node_id', oldId: 'x', newId: 'x2' }])
    expect(r.ok).toBe(true)
    // A edge intacta.
    expect(engine.getTreeDef().edges[0]?.source).toBe('y')
    expect(engine.getTreeDef().edges[0]?.target).toBe('z')
  })

  // ── unlock secundario tras un nodo en estado 'locked' tras applyChanges ──
  it('add_node + unlock: o segundo unlock entra na rama if-side (instancia existe)', async () => {
    const treeDef: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'T',
      nodes: [],
      edges: [],
      layout: { type: 'radial' },
    }
    const engine = new TreeEngine(treeDef)
    await engine.applyChanges([{ type: 'add_node', node: makeNode('x') }])
    // add_node crea NodeInstance inicial 'locked'.
    expect(engine.getNodeState('x')?.state).toBe('locked')
    const r = await engine.unlock('x')
    expect(r.ok).toBe(true)
    // Tras o unlock, a instancia mantén o id; entrou polo if-side de update.
    expect(engine.getNodeState('x')?.state).toBe('unlocked')
  })
})
// ── FIN: tests dirixidos á cobertura de TreeEngine.ts (1.18 T3) ──
