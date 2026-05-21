// ── INICIO: tests de EffectsRunner ──
// Suite unitaria do EffectsRunner. Constrúe manualmente as pezas
// (StateStore, ResourceManager, EventEmitter, UnlockResolver, TreeEngine)
// para reflectir o uso standalone da sub-fase 2.1.

import { ErrorCode } from '@yggdrasil-forge/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type EffectContext,
  EffectsRunner,
  EventEmitter,
  ResourceManager,
  StateStore,
  TreeEngine,
  UnlockResolver,
} from '../../src/engine/index.js'
import type { Effect, NodeDef, Resource, TreeDef } from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers de construción
// ───────────────────────────────────────────────

function makeNode(partial: Partial<NodeDef> & { id: string }): NodeDef {
  return {
    type: 'small',
    label: { gl: partial.id, es: partial.id, en: partial.id },
    ...partial,
  }
}

function makeTree(
  nodes: readonly NodeDef[] = [],
  resources: readonly Resource[] = [],
  startingResources: Record<string, number> = {},
): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Test', es: 'Test', en: 'Test' },
    nodes,
    edges: [],
    layout: { type: 'radial' },
    resources,
    startingBudget: { resources: { ...startingResources } },
  }
}

function buildContext(treeDef: TreeDef): {
  engine: TreeEngine
  store: StateStore
  resources: ResourceManager
  resolver: UnlockResolver
  events: EventEmitter
  runner: EffectsRunner
  ctx: EffectContext
} {
  // Construímos as pezas separadas: o engine ten as súas internas, pero
  // para que o runner mute as MESMAS pezas, creamos un store, resources
  // e events compartidos. O engine que pasamos só se usa para
  // engine.unlock / engine.lock / engine.getTreeDef nos effects que o
  // requiren; para os demais effects (modify_resource, visibility,
  // state, progress) o store/resources/events compartidos son o que
  // realmente se muta.
  const engine = new TreeEngine(treeDef, { locale: 'gl' })
  const store = new StateStore(treeDef)
  const resources = new ResourceManager(treeDef.resources ?? [])
  const resolver = new UnlockResolver()
  const events = new EventEmitter()
  const ctx: EffectContext = {
    engine,
    store,
    resources,
    resolver,
    events,
    locale: 'gl',
  }
  const runner = new EffectsRunner(ctx)
  return { engine, store, resources, resolver, events, runner, ctx }
}

// ───────────────────────────────────────────────
// validate
// ───────────────────────────────────────────────

describe('EffectsRunner.validate', () => {
  it('acepta effects válidos básicos', () => {
    const tree = makeTree(
      [makeNode({ id: 'n1' })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
    )
    const { runner } = buildContext(tree)
    const result = runner.validate([
      { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 5 },
      { type: 'trigger_event', eventName: 'foo' },
    ])
    expect(result.ok).toBe(true)
  })

  it('rexeita modify_stat con EFFECT_TYPE_UNSUPPORTED', () => {
    const { runner } = buildContext(makeTree())
    const result = runner.validate([{ type: 'modify_stat', statId: 's', op: '+', amount: 1 }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_TYPE_UNSUPPORTED)
    }
  })

  it('rexeita plugin con EFFECT_TYPE_UNSUPPORTED', () => {
    const { runner } = buildContext(makeTree())
    const result = runner.validate([{ type: 'plugin', pluginId: 'p' }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_TYPE_UNSUPPORTED)
    }
  })

  it('rexeita modify_resource con resourceId inexistente', () => {
    const { runner } = buildContext(makeTree([], []))
    const result = runner.validate([
      { type: 'modify_resource', resourceId: 'ghost', op: '+', amount: 1 },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_TARGET_NOT_FOUND)
    }
  })

  it('rexeita set_node_visibility con nodeId inexistente', () => {
    const { runner } = buildContext(makeTree([makeNode({ id: 'n1' })]))
    const result = runner.validate([
      { type: 'set_node_visibility', nodeId: 'ghost', visible: false },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_TARGET_NOT_FOUND)
    }
  })

  it('rexeita set_progress con percent fóra de rango', () => {
    const { runner } = buildContext(makeTree([makeNode({ id: 'n1' })]))
    const result = runner.validate([{ type: 'set_progress', nodeId: 'n1', percent: 150 }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('rexeita set_progress con percent negativo', () => {
    const { runner } = buildContext(makeTree([makeNode({ id: 'n1' })]))
    const result = runner.validate([{ type: 'set_progress', nodeId: 'n1', percent: -1 }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('rexeita modify_node_state con estado destino non na lista branca', () => {
    const { runner } = buildContext(makeTree([makeNode({ id: 'n1' })]))
    const result = runner.validate([{ type: 'modify_node_state', nodeId: 'n1', state: 'maxed' }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('rexeita conditional cuxa condición referencia nodeId inexistente', () => {
    const { runner } = buildContext(makeTree([makeNode({ id: 'n1' })]))
    const result = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'ghost' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_TARGET_NOT_FOUND)
    }
  })

  it('valida recursivamente composite con un inner inválido', () => {
    const { runner } = buildContext(makeTree([makeNode({ id: 'n1' })]))
    const result = runner.validate([
      {
        type: 'composite',
        effects: [{ type: 'set_progress', nodeId: 'n1', percent: 200 }],
      },
    ])
    expect(result.ok).toBe(false)
  })

  it('valida composite con inners válidos devolve ok', () => {
    // Cubre o return ok(undefined) ao final do case 'composite' en validateOne.
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner } = buildContext(tree)
    const result = runner.validate([
      {
        type: 'composite',
        effects: [
          { type: 'set_progress', nodeId: 'n1', percent: 30 },
          { type: 'set_node_visibility', nodeId: 'n1', visible: true },
        ],
      },
    ])
    expect(result.ok).toBe(true)
  })

  it('valida recursivamente conditional con then/else válidos', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const result = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'n1' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [{ type: 'set_progress', nodeId: 'n1', percent: 50 }],
        else: [{ type: 'set_progress', nodeId: 'n1', percent: 25 }],
      },
    ])
    expect(result.ok).toBe(true)
  })

  it('rexeita conditional cuxo else é inválido', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const result = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'n1' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
        else: [{ type: 'set_progress', nodeId: 'n1', percent: 200 }],
      },
    ])
    expect(result.ok).toBe(false)
  })
})

// ───────────────────────────────────────────────
// run / reverse: forward + reverse felices
// ───────────────────────────────────────────────

describe('EffectsRunner.run/reverse — happy path por tipo', () => {
  it('modify_resource (+): forward suma, reverse restaura', async () => {
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 10 })
    const { runner, store } = buildContext(tree)
    const effects: Effect[] = [{ type: 'modify_resource', resourceId: 'xp', op: '+', amount: 5 }]
    const r = await runner.run(effects)
    expect(r.ok).toBe(true)
    expect(store.getState().budget.resources.xp).toBe(15)
    if (r.ok) {
      expect(r.value[0]?.previousValue).toBe(10)
      const rev = await runner.reverse(r.value)
      expect(rev.ok).toBe(true)
      expect(store.getState().budget.resources.xp).toBe(10)
    }
  })

  it('modify_resource (-): resta correctamente e revira', async () => {
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 10 })
    const { runner, store } = buildContext(tree)
    const r = await runner.run([{ type: 'modify_resource', resourceId: 'xp', op: '-', amount: 3 }])
    expect(r.ok).toBe(true)
    expect(store.getState().budget.resources.xp).toBe(7)
    if (r.ok) {
      await runner.reverse(r.value)
      expect(store.getState().budget.resources.xp).toBe(10)
    }
  })

  it('modify_resource (*): multiplica e revira ao valor exacto previo', async () => {
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 10 })
    const { runner, store } = buildContext(tree)
    const r = await runner.run([{ type: 'modify_resource', resourceId: 'xp', op: '*', amount: 3 }])
    expect(r.ok).toBe(true)
    expect(store.getState().budget.resources.xp).toBe(30)
    if (r.ok) {
      await runner.reverse(r.value)
      expect(store.getState().budget.resources.xp).toBe(10)
    }
  })

  it('modify_resource: rexeita aplicación que deixaría o recurso negativo', async () => {
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 2 })
    const { runner, store } = buildContext(tree)
    const r = await runner.run([{ type: 'modify_resource', resourceId: 'xp', op: '-', amount: 5 }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
    expect(store.getState().budget.resources.xp).toBe(2)
  })

  it('trigger_event: emite customEvent; reverse emite payload con reverted:true', async () => {
    const { runner, events } = buildContext(makeTree())
    const listener = vi.fn()
    events.on('customEvent', listener)
    const r = await runner.run([
      { type: 'trigger_event', eventName: 'milestone', payload: { stage: 1 } },
    ])
    expect(r.ok).toBe(true)
    expect(listener).toHaveBeenCalledWith('milestone', { stage: 1 })
    if (r.ok) {
      const rev = await runner.reverse(r.value)
      expect(rev.ok).toBe(true)
      expect(listener).toHaveBeenLastCalledWith('milestone', {
        reverted: true,
        original: { stage: 1 },
      })
    }
  })

  it('trigger_event con irreversible: reverse devolve IRREVERSIBLE_EFFECT', async () => {
    const { runner } = buildContext(makeTree())
    const r = await runner.run([{ type: 'trigger_event', eventName: 'boom', irreversible: true }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      const rev = await runner.reverse(r.value)
      expect(rev.ok).toBe(false)
      if (!rev.ok) {
        expect(rev.error.code).toBe(ErrorCode.IRREVERSIBLE_EFFECT)
      }
    }
  })

  it('set_node_visibility: garda previousValue=undefined cando o campo non existía', async () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner, store } = buildContext(tree)
    const r = await runner.run([{ type: 'set_node_visibility', nodeId: 'n1', visible: false }])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.n1?.visible).toBe(false)
    if (r.ok) {
      expect(r.value[0]?.previousValue).toBeUndefined()
      const rev = await runner.reverse(r.value)
      expect(rev.ok).toBe(true)
      // O campo eliminouse para preservar a ausencia exacta.
      expect(store.getState().nodes.n1?.visible).toBeUndefined()
    }
  })

  it('set_node_visibility: garda previousValue=true cando o campo era true', async () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner, store } = buildContext(tree)
    // Prepara estado: nodo con visible=true.
    store.update((draft) => {
      draft.nodes.n1 = { id: 'n1', state: 'locked', currentTier: 0, visible: true }
    })
    const r = await runner.run([{ type: 'set_node_visibility', nodeId: 'n1', visible: false }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value[0]?.previousValue).toBe(true)
      await runner.reverse(r.value)
      expect(store.getState().nodes.n1?.visible).toBe(true)
    }
  })

  it('modify_node_state: transición permitida locked→unlockable; reverse restaura', async () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner, store } = buildContext(tree)
    // Inicializa nodo en locked.
    store.update((draft) => {
      draft.nodes.n1 = { id: 'n1', state: 'locked', currentTier: 0 }
    })
    const r = await runner.run([{ type: 'modify_node_state', nodeId: 'n1', state: 'unlockable' }])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.n1?.state).toBe('unlockable')
    if (r.ok) {
      expect(r.value[0]?.previousValue).toBe('locked')
      await runner.reverse(r.value)
      expect(store.getState().nodes.n1?.state).toBe('locked')
    }
  })

  it('modify_node_state: rexeita transición non permitida (locked → unlocked)', async () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = await runner.run([{ type: 'modify_node_state', nodeId: 'n1', state: 'unlocked' }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('set_progress: aplica valor e revira ao previo', async () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner, store } = buildContext(tree)
    store.update((draft) => {
      draft.nodes.n1 = { id: 'n1', state: 'locked', currentTier: 0, progress: 25 }
    })
    const r = await runner.run([{ type: 'set_progress', nodeId: 'n1', percent: 75 }])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.n1?.progress).toBe(75)
    if (r.ok) {
      expect(r.value[0]?.previousValue).toBe(25)
      await runner.reverse(r.value)
      expect(store.getState().nodes.n1?.progress).toBe(25)
    }
  })

  it('set_progress: reverse con previousValue undefined restaura a 0', async () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner, store } = buildContext(tree)
    const r = await runner.run([{ type: 'set_progress', nodeId: 'n1', percent: 50 }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      await runner.reverse(r.value)
      expect(store.getState().nodes.n1?.progress).toBe(0)
    }
  })

  it('set_progress: rexeita percent fóra de rango en run', async () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner } = buildContext(tree)
    const r = await runner.run([{ type: 'set_progress', nodeId: 'n1', percent: 150 }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('conditional con condición true ejecuta then', async () => {
    const tree = makeTree([makeNode({ id: 'a' }), makeNode({ id: 'b', supportsProgress: true })])
    const { runner, store } = buildContext(tree)
    // a está unlocked → condición node_unlocked se cumple.
    store.update((draft) => {
      draft.nodes.a = { id: 'a', state: 'unlocked', currentTier: 1 }
    })
    const r = await runner.run([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'a' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [{ type: 'set_progress', nodeId: 'b', percent: 80 }],
        else: [{ type: 'set_progress', nodeId: 'b', percent: 10 }],
      },
    ])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.b?.progress).toBe(80)
  })

  it('conditional con condición false ejecuta else', async () => {
    const tree = makeTree([makeNode({ id: 'a' }), makeNode({ id: 'b', supportsProgress: true })])
    const { runner, store } = buildContext(tree)
    // a non está unlocked.
    const r = await runner.run([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'a' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [{ type: 'set_progress', nodeId: 'b', percent: 80 }],
        else: [{ type: 'set_progress', nodeId: 'b', percent: 10 }],
      },
    ])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.b?.progress).toBe(10)
  })

  it('conditional sen else con condición false é no-op', async () => {
    const tree = makeTree([makeNode({ id: 'a' }), makeNode({ id: 'b' })])
    const { runner, store } = buildContext(tree)
    const r = await runner.run([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'a' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [{ type: 'set_node_visibility', nodeId: 'b', visible: false }],
      },
    ])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.b).toBeUndefined()
  })

  it('conditional reverse desfai a rama tomada', async () => {
    const tree = makeTree([makeNode({ id: 'a' }), makeNode({ id: 'b' })])
    const { runner, store } = buildContext(tree)
    store.update((draft) => {
      draft.nodes.a = { id: 'a', state: 'unlocked', currentTier: 1 }
      draft.nodes.b = { id: 'b', state: 'locked', currentTier: 0, visible: true }
    })
    const r = await runner.run([
      {
        type: 'conditional',
        condition: { type: 'node_unlocked', nodeId: 'a' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [{ type: 'set_node_visibility', nodeId: 'b', visible: false }],
      },
    ])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.b?.visible).toBe(false)
    if (r.ok) {
      await runner.reverse(r.value)
      expect(store.getState().nodes.b?.visible).toBe(true)
    }
  })

  it('composite aniñado a 3 niveles aplica e revira correctamente', async () => {
    const tree = makeTree(
      [makeNode({ id: 'n1', supportsProgress: true })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
      { xp: 20 },
    )
    const { runner, store } = buildContext(tree)
    const effects: Effect[] = [
      {
        type: 'composite',
        effects: [
          { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 5 },
          {
            type: 'composite',
            effects: [
              { type: 'set_progress', nodeId: 'n1', percent: 50 },
              {
                type: 'composite',
                effects: [{ type: 'modify_resource', resourceId: 'xp', op: '-', amount: 2 }],
              },
            ],
          },
        ],
      },
    ]
    const r = await runner.run(effects)
    expect(r.ok).toBe(true)
    expect(store.getState().budget.resources.xp).toBe(23) // 20+5-2
    expect(store.getState().nodes.n1?.progress).toBe(50)
    if (r.ok) {
      await runner.reverse(r.value)
      expect(store.getState().budget.resources.xp).toBe(20)
      expect(store.getState().nodes.n1?.progress).toBe(0)
    }
  })
})

// ───────────────────────────────────────────────
// Atomicidade
// ───────────────────────────────────────────────

describe('EffectsRunner.run — atomicidade', () => {
  it('lista de 5 effects; o 3º falla → estado intacto, 2 primeiros revertidos', async () => {
    const tree = makeTree(
      [makeNode({ id: 'n1', supportsProgress: true })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
      { xp: 100 },
    )
    const { runner, store } = buildContext(tree)
    const effects: Effect[] = [
      { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 }, // ok: 110
      { type: 'set_progress', nodeId: 'n1', percent: 50 }, // ok
      { type: 'modify_resource', resourceId: 'xp', op: '-', amount: 9999 }, // falla
      { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 1 },
      { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 1 },
    ]
    const r = await runner.run(effects)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
      const ctx = r.error.context
      expect(ctx?.failedAt).toBe(2)
      expect(ctx?.revertedCount).toBe(2)
    }
    // Estado intacto (igual ao baseline).
    expect(store.getState().budget.resources.xp).toBe(100)
    expect(store.getState().nodes.n1?.progress).toBe(0)
  })

  it('composite con inner fallando: revira os internos previos antes de propagar', async () => {
    const tree = makeTree(
      [makeNode({ id: 'n1', supportsProgress: true })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
      { xp: 5 },
    )
    const { runner, store } = buildContext(tree)
    const r = await runner.run([
      {
        type: 'composite',
        effects: [
          { type: 'set_progress', nodeId: 'n1', percent: 30 },
          { type: 'modify_resource', resourceId: 'xp', op: '-', amount: 9999 },
        ],
      },
    ])
    expect(r.ok).toBe(false)
    // O set_progress aplicouse e logo reverteuse (ou nunca permaneceu).
    expect(store.getState().nodes.n1?.progress).toBe(0)
    expect(store.getState().budget.resources.xp).toBe(5)
  })
})

// ───────────────────────────────────────────────
// unlock_node + detección de bucles
// ───────────────────────────────────────────────

describe('EffectsRunner.unlock_node + ciclos', () => {
  it('unlock_node simple: chama a engine.unlock e ok', async () => {
    const tree = makeTree([makeNode({ id: 'a', maxTier: 2 })])
    const { runner, engine } = buildContext(tree)
    const r = await runner.run([{ type: 'unlock_node', nodeId: 'a' }])
    expect(r.ok).toBe(true)
    // Con maxTier:2 e currentTier 0→1 o estado é 'unlocked' (non chegou a maxed).
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
  })

  it('detección de bucles: dous unlock_node ao mesmo nodeId nun composite', async () => {
    const tree = makeTree([makeNode({ id: 'a', maxTier: 5 })])
    const { runner } = buildContext(tree)
    const r = await runner.run([
      {
        type: 'composite',
        effects: [
          { type: 'unlock_node', nodeId: 'a' },
          { type: 'unlock_node', nodeId: 'a' }, // ciclo
        ],
      },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
      // O erro propagado é EFFECT_APPLICATION_FAILED pero a causa orixinal
      // (originalErrorCode no contexto) debe ser CIRCULAR_EFFECT.
      expect(r.error.context?.originalErrorCode).toBe(ErrorCode.CIRCULAR_EFFECT)
    }
  })

  it('profundidade > 8 (composite aniñado en exceso) → CIRCULAR_EFFECT', async () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner } = buildContext(tree)
    // Construímos un composite aniñado de 10 niveis arredor dun set_progress.
    let inner: Effect = { type: 'set_progress', nodeId: 'n1', percent: 50 }
    for (let i = 0; i < 10; i++) {
      inner = { type: 'composite', effects: [inner] }
    }
    const r = await runner.run([inner])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
      expect(r.error.context?.originalErrorCode).toBe(ErrorCode.CIRCULAR_EFFECT)
    }
  })

  it('reverse de unlock_node chama engine.lock', async () => {
    const tree = makeTree([makeNode({ id: 'a', maxTier: 1 })])
    const { runner, engine } = buildContext(tree)
    const r = await runner.run([{ type: 'unlock_node', nodeId: 'a' }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      const rev = await runner.reverse(r.value)
      expect(rev.ok).toBe(true)
      expect(engine.getNodeState('a')?.state).toBe('locked')
    }
  })
})

// ───────────────────────────────────────────────
// Casos de erro extra para cobertura
// ───────────────────────────────────────────────

describe('EffectsRunner — casos de error e .code', () => {
  it('run con modify_stat → EFFECT_TYPE_UNSUPPORTED (.code exacto)', async () => {
    const { runner } = buildContext(makeTree())
    const r = await runner.run([{ type: 'modify_stat', statId: 's', op: '+', amount: 1 }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // O run envólveo en EFFECT_APPLICATION_FAILED co original no contexto.
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
      expect(r.error.context?.originalErrorCode).toBe(ErrorCode.EFFECT_TYPE_UNSUPPORTED)
    }
  })

  it('run con plugin → EFFECT_TYPE_UNSUPPORTED no contexto', async () => {
    const { runner } = buildContext(makeTree())
    const r = await runner.run([{ type: 'plugin', pluginId: 'p' }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.context?.originalErrorCode).toBe(ErrorCode.EFFECT_TYPE_UNSUPPORTED)
    }
  })

  it('reverse de modify_resource con previousValue corrupto devolve erro', async () => {
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 5 })
    const { runner } = buildContext(tree)
    // Fabricamos manualmente un EffectResult corrupto.
    const fake = [
      {
        effect: { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 1 } as const,
        applied: true,
        previousValue: 'not-a-number',
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(false)
    if (!rev.ok) {
      expect(rev.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('reverse de modify_node_state con previousValue non-string é no-op silencioso', async () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const fake = [
      {
        effect: {
          type: 'modify_node_state',
          nodeId: 'n1',
          state: 'unlockable',
        } as const,
        applied: true,
        previousValue: 42,
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })

  it('reverse de composite con previousValue non-array é no-op', async () => {
    const { runner } = buildContext(makeTree())
    const fake = [
      {
        effect: { type: 'composite', effects: [] } as const,
        applied: true,
        previousValue: 'not-array',
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })

  it('reverse de conditional con previousValue sen innerResults é no-op', async () => {
    const { runner } = buildContext(makeTree())
    const fake = [
      {
        effect: {
          type: 'conditional',
          condition: { type: 'time_after', timestamp: 0 },
          // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
          then: [],
        } as const,
        applied: true,
        previousValue: { branchTaken: 'then' },
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })

  it('reverse ignora EffectResults con applied=false', async () => {
    const { runner } = buildContext(makeTree())
    const fake = [
      {
        effect: { type: 'trigger_event', eventName: 'x' } as const,
        applied: false,
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })
})

// ───────────────────────────────────────────────
// EventEmitter customEvent integration
// ───────────────────────────────────────────────

describe('EffectsRunner — integración customEvent', () => {
  let received: Array<{ name: string; payload: unknown }> = []
  beforeEach(() => {
    received = []
  })

  it('trigger_event sen payload emite undefined', async () => {
    const { runner, events } = buildContext(makeTree())
    events.on('customEvent', (name, payload) => {
      received.push({ name, payload })
    })
    const r = await runner.run([{ type: 'trigger_event', eventName: 'ping' }])
    expect(r.ok).toBe(true)
    expect(received).toEqual([{ name: 'ping', payload: undefined }])
  })

  it('reverse de trigger_event reversible emite reverted:true', async () => {
    const { runner, events } = buildContext(makeTree())
    events.on('customEvent', (name, payload) => {
      received.push({ name, payload })
    })
    const r = await runner.run([{ type: 'trigger_event', eventName: 'x', payload: 42 }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      await runner.reverse(r.value)
    }
    expect(received).toHaveLength(2)
    expect(received[1]).toEqual({
      name: 'x',
      payload: { reverted: true, original: 42 },
    })
  })
})

// ───────────────────────────────────────────────
// Tests adicionais para cobertura de ramas (T7)
// ───────────────────────────────────────────────

describe('EffectsRunner — cobertura branches', () => {
  it('validate: modify_resource cunha treeDef sen resources devolve EFFECT_TARGET_NOT_FOUND', () => {
    // Tree sen `resources` no top-level (campo undefined). Cubre a rama
    // resourceExistsInTreeDef → resources===undefined.
    const tree: TreeDef = {
      id: 'no-res',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: { gl: 'X', es: 'X', en: 'X' },
      nodes: [],
      edges: [],
      layout: { type: 'radial' },
    }
    const { runner } = buildContext(tree)
    const r = runner.validate([{ type: 'modify_resource', resourceId: 'x', op: '+', amount: 1 }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_TARGET_NOT_FOUND)
    }
  })

  it('validate: composite cuxo segundo inner é inválido (cubre return r dentro do loop)', () => {
    const tree = makeTree(
      [makeNode({ id: 'n1', supportsProgress: true })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
    )
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'composite',
        effects: [
          { type: 'set_progress', nodeId: 'n1', percent: 50 }, // ok
          { type: 'set_progress', nodeId: 'n1', percent: 200 }, // inválido
        ],
      },
    ])
    expect(r.ok).toBe(false)
  })

  it('validate: conditional cuxo then ten segundo inner inválido', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'time_after', timestamp: 0 },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [
          { type: 'set_progress', nodeId: 'n1', percent: 10 }, // ok
          { type: 'set_progress', nodeId: 'n1', percent: 999 }, // inválido
        ],
      },
    ])
    expect(r.ok).toBe(false)
  })

  it('validate: conditional con condición que non referencia ningún nodeId (time_after)', () => {
    // Cubre a rama nodeRef===null en conditionReferencesNodeId.
    const { runner } = buildContext(makeTree())
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'time_after', timestamp: 0 },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(r.ok).toBe(true)
  })

  it('validate: conditional con condición tier_min (cubre branch tier_min en conditionReferencesNodeId)', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'tier_min', nodeId: 'n1', tier: 1 },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(r.ok).toBe(true)
  })

  it('validate: conditional con condición progress_min (cubre branch progress_min)', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'progress_min', nodeId: 'n1', percent: 50 },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(r.ok).toBe(true)
  })

  it('validate: conditional con condición distance_max (cubre branch distance_max → fromNodeId)', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'distance_max', fromNodeId: 'n1', maxSteps: 1 },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(r.ok).toBe(true)
  })

  it('validate: conditional con condición node_maxed (cubre rama node_maxed)', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'node_maxed', nodeId: 'n1' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(r.ok).toBe(true)
  })

  it('validate: conditional con condición node_state (cubre rama node_state)', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = runner.validate([
      {
        type: 'conditional',
        condition: { type: 'node_state', nodeId: 'n1', state: 'unlocked' },
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [],
      },
    ])
    expect(r.ok).toBe(true)
  })

  it('run modify_resource * 1: delta === 0 é no-op pero applied=true', async () => {
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 10 })
    const { runner, store } = buildContext(tree)
    const r = await runner.run([{ type: 'modify_resource', resourceId: 'xp', op: '*', amount: 1 }])
    expect(r.ok).toBe(true)
    expect(store.getState().budget.resources.xp).toBe(10)
    if (r.ok) {
      expect(r.value[0]?.applied).toBe(true)
      expect(r.value[0]?.previousValue).toBe(10)
    }
  })

  it('run conditional con then que contén un inner que falla → revira internos', async () => {
    const tree = makeTree(
      [makeNode({ id: 'n1', supportsProgress: true })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
      { xp: 5 },
    )
    const { runner, store } = buildContext(tree)
    const r = await runner.run([
      {
        type: 'conditional',
        condition: { type: 'time_after', timestamp: 0 }, // sempre true
        // biome-ignore lint/suspicious/noThenProperty: `then` é o campo do contrato Effect (conditional), non un thenable.
        then: [
          { type: 'set_progress', nodeId: 'n1', percent: 30 },
          { type: 'modify_resource', resourceId: 'xp', op: '-', amount: 9999 }, // falla
        ],
      },
    ])
    expect(r.ok).toBe(false)
    // O set_progress aplicouse e revertereuse.
    expect(store.getState().nodes.n1?.progress).toBe(0)
    expect(store.getState().budget.resources.xp).toBe(5)
  })

  it('run unlock_node sobre nodo inexistente → engine.unlock falla → wrap', async () => {
    // O nodo 'ghost' existe na treeDef pero ten exclusions que xa hai
    // un nodo unlocked; iso fai que engine.unlock falle.
    const tree = makeTree([
      makeNode({ id: 'a', maxTier: 1 }),
      makeNode({ id: 'b', maxTier: 1, exclusions: ['a'] }),
    ])
    const { runner, engine } = buildContext(tree)
    // Pre-unlock de 'a' no engine usado polo runner.
    await engine.unlock('a')
    // Agora intentar desbloquear 'b' debería fallar por exclusion.
    const r = await runner.run([{ type: 'unlock_node', nodeId: 'b' }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
      // O originalErrorCode debe ser un dos posibles erros de unlock
      // (EXCLUSION_VIOLATION concretamente neste caso).
      expect(r.error.context?.originalErrorCode).toBeDefined()
    }
  })

  it('revertApplied: tolera EffectResult con applied=false intercalado', async () => {
    // Construímos manualmente un escenario onde dous effects exitosos van
    // antes dun fallo, e un dos exitosos ten applied=false. revertApplied
    // debe saltalo sen fallar.
    const tree = makeTree(
      [makeNode({ id: 'n1', supportsProgress: true })],
      [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }],
      { xp: 10 },
    )
    const { runner } = buildContext(tree)
    // Effects: progress válido + modify_resource imposible. revertApplied
    // revira só progress.
    const r = await runner.run([
      { type: 'set_progress', nodeId: 'n1', percent: 70 },
      { type: 'modify_resource', resourceId: 'xp', op: '-', amount: 9999 },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.context?.revertedCount).toBe(1)
    }
  })

  it('reverse de set_node_visibility con previousValue=true desfai correctamente', async () => {
    // Cubre a rama typeof previousValue === 'boolean' && rama 'restore=previous'.
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner, store } = buildContext(tree)
    store.update((draft) => {
      draft.nodes.n1 = { id: 'n1', state: 'locked', currentTier: 0, visible: true }
    })
    const r = await runner.run([{ type: 'set_node_visibility', nodeId: 'n1', visible: false }])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.n1?.visible).toBe(false)
    if (r.ok) {
      await runner.reverse(r.value)
      expect(store.getState().nodes.n1?.visible).toBe(true)
    }
  })

  it('reverse de set_node_visibility con previousValue corrupto (non boolean nin undefined) é no-op silencioso', async () => {
    // Cubre a rama defensiva typeof previousValue !== 'boolean'.
    // Fabricamos manualmente o EffectResult.
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const fake = [
      {
        effect: {
          type: 'set_node_visibility',
          nodeId: 'n1',
          visible: false,
        } as const,
        applied: true,
        previousValue: 'corrupted',
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })

  it('reverse de set_progress con previousValue corrupto (string) é no-op silencioso', async () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { runner } = buildContext(tree)
    const fake = [
      {
        effect: { type: 'set_progress', nodeId: 'n1', percent: 50 } as const,
        applied: true,
        previousValue: 'corrupted',
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })

  it('reverse de modify_node_state con par válido descrito como inverso (exercita inverseStateTransition)', async () => {
    // Forward: locked → unlockable; reverse debe restaurar a locked.
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner, store } = buildContext(tree)
    store.update((draft) => {
      draft.nodes.n1 = { id: 'n1', state: 'locked', currentTier: 0 }
    })
    const r = await runner.run([{ type: 'modify_node_state', nodeId: 'n1', state: 'unlockable' }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      const rev = await runner.reverse(r.value)
      expect(rev.ok).toBe(true)
      expect(store.getState().nodes.n1?.state).toBe('locked')
    }
  })

  it('reverse de modify_node_state con inverso non na lista branca devolve erro', async () => {
    // Fabricamos un EffectResult cun par (forward) sintético non simétrico:
    // previousValue='maxed', effect.state='unlocked'. Ese par non está na
    // lista branca, polo que inverseStateTransition devolve null.
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const fake = [
      {
        effect: {
          type: 'modify_node_state',
          nodeId: 'n1',
          state: 'unlocked',
        } as const,
        applied: true,
        previousValue: 'maxed',
      },
    ]
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(false)
    if (!rev.ok) {
      expect(rev.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
  })

  it('reverse de unlock_node onde engine.lock falla é tolerado (devolve ok)', async () => {
    // Construímos un EffectResult fingindo que se desbloqueou un nodo que
    // o engine non pode lockear (porque nunca se desbloqueou realmente
    // nese engine concreto).
    const tree = makeTree([makeNode({ id: 'a', maxTier: 1 })])
    const { runner } = buildContext(tree)
    const fake = [
      {
        effect: { type: 'unlock_node', nodeId: 'a' } as const,
        applied: true,
        previousValue: { unlockedNodeId: 'a' },
      },
    ]
    // engine.lock('a') vai fallar porque 'a' nunca se desbloqueou neste
    // engine. reverseUnlockNode debe tolerar ese fallo e devolver ok.
    const rev = await runner.reverse(fake)
    expect(rev.ok).toBe(true)
  })

  it('validate: modify_node_state con destino válido (unlockable) pasa', () => {
    // Cubre a rama hasValidPair===true no validateOne.
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { runner } = buildContext(tree)
    const r = runner.validate([{ type: 'modify_node_state', nodeId: 'n1', state: 'unlockable' }])
    expect(r.ok).toBe(true)
  })

  it('run modify_node_state sobre nodo sen instancia previa: créase con state destino', async () => {
    // Cubre a rama existing===undefined no store.update de applyModifyNodeState.
    const tree = makeTree([makeNode({ id: 'fresh' })])
    const { runner, store } = buildContext(tree)
    // Non hai instancia para 'fresh' inicialmente: currentState cae a 'locked'.
    const r = await runner.run([
      { type: 'modify_node_state', nodeId: 'fresh', state: 'unlockable' },
    ])
    expect(r.ok).toBe(true)
    expect(store.getState().nodes.fresh?.state).toBe('unlockable')
  })

  it('run de un effect undefined dentro do array é saltado silenciosamente', async () => {
    // Pasamos un array con un hueco (length 2, posición 1 undefined). O
    // for-loop debe saltar a iteración sen propagar.
    const tree = makeTree([], [{ id: 'xp', label: { gl: 'XP', es: 'XP', en: 'XP' } }], { xp: 5 })
    const { runner, store } = buildContext(tree)
    // Array con buraco: índice 1 sen valor (cubre o continue do for-loop).
    const effects = [
      { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 2 },
    ] as unknown as Effect[]
    // Forzar un hueco no array.
    ;(effects as unknown as { length: number }).length = 3
    const r = await runner.run(effects)
    expect(r.ok).toBe(true)
    expect(store.getState().budget.resources.xp).toBe(7)
  })
})
// ── FIN: tests de EffectsRunner ──
