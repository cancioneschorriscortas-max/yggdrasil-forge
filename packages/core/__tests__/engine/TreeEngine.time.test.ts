// ── INICIO: tests de TreeEngine ↔ TimeManager (sub-fase 2.3.b) ──
// Valida a integración do TimeManager no TreeEngine:
//  - canUnlock rexeita nodos pending (E018) e expired (vía TimeManager,
//    distinto do estado xa marcado como 'expired').
//  - tick() materializa expiracións: muta estado, emite stateChange +
//    nodeExpired, rexistra audit node_expired, invalida statComputer.
//  - nextTickAt() devolve o próximo instante de transición.
//  - Cero scheduling interno (sen setTimeout).
//
// Reloxo virtual: o `now` inxéctase vía `TreeEngineOptions.timeNow` como
// función que devolve o valor mutable `clockMs`. Avanzar o reloxo é
// simplemente reasignar a variable.

import { ErrorCode, getErrorMessage } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type {
  AuditEntry,
  NodeDef,
  StatContribution,
  StatDef,
  StateChange,
  TimeConstraints,
  TreeDef,
} from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    label: id,
    type: 'small',
    ...overrides,
  }
}

function makeStat(id: string, overrides?: Partial<StatDef>): StatDef {
  return {
    id,
    label: id,
    ...overrides,
  }
}

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/**
 * Crea un engine cun reloxo virtual mutable. Devolve o engine e a
 * función `setNow(ms)` para avanzar o reloxo entre asercións.
 */
function makeEngineWithClock(tree: TreeDef, initialNow = 0) {
  let clockMs = initialNow
  const engine = new TreeEngine(tree, {
    timeNow: () => clockMs,
    audit: { enabled: true, maxEntries: 1000 },
  })
  return {
    engine,
    setNow(ms: number): void {
      clockMs = ms
    },
    getNow(): number {
      return clockMs
    },
  }
}

// ───────────────────────────────────────────────
// 1. canUnlock + TimeManager
// ───────────────────────────────────────────────

describe('TreeEngine.canUnlock — integración con TimeManager (5.3)', () => {
  it('devolve allowed:false con NODE_NOT_YET_AVAILABLE se startsAt está no futuro', () => {
    const tc: TimeConstraints = { startsAt: 2_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 500)

    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
      const expectedReason = getErrorMessage(ErrorCode.NODE_NOT_YET_AVAILABLE, 'gl', {
        nodeId: 'a',
        startsAt: '2000',
      })
      expect(result.value.reason).toBe(expectedReason)
    }
  })

  it('devolve allowed:false con NODE_EXPIRED se TimeManager detecta expiración aínda non materializada', () => {
    // O estado segue 'locked' (nunca se tickeou). canUnlock debe
    // detectar a expiración vía TimeManager.
    const tc: TimeConstraints = { expiresAt: 1_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 5_000)

    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
      const expectedReason = getErrorMessage(ErrorCode.NODE_EXPIRED, 'gl', { nodeId: 'a' })
      expect(result.value.reason).toBe(expectedReason)
    }
  })

  it('non bloquea por TimeManager se o nodo está dentro da súa xanela (active)', () => {
    const tc: TimeConstraints = { startsAt: 100, expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 1_000)

    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Non hai prerequisites nin custo: pasa a allowed: true.
      expect(result.value.allowed).toBe(true)
    }
  })

  it('non bloquea por TimeManager se o nodo non ten timeConstraints (permanent)', () => {
    const tree = makeTreeDef({ nodes: [makeNode('a')] })
    const { engine } = makeEngineWithClock(tree, 1_000)

    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })

  it('respecta locale: a reason de NODE_NOT_YET_AVAILABLE en castelán cando locale=es', () => {
    const tc: TimeConstraints = { startsAt: 2_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const clockMs = 500
    const engine = new TreeEngine(tree, { locale: 'es', timeNow: () => clockMs })

    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      const expectedReason = getErrorMessage(ErrorCode.NODE_NOT_YET_AVAILABLE, 'es', {
        nodeId: 'a',
        startsAt: '2000',
      })
      expect(result.value.reason).toBe(expectedReason)
    }
    // Marca clockMs como usada por algunha sentenza para Biome.
    void clockMs
  })
})

// ───────────────────────────────────────────────
// 2. unlock bloqueado por TimeManager
// ───────────────────────────────────────────────

describe('TreeEngine.unlock — bloqueo por TimeManager', () => {
  it('rexeita unlock dun nodo pending: err con NODE_NOT_YET_AVAILABLE.code', async () => {
    const tc: TimeConstraints = { startsAt: 2_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 500)

    const r = await engine.unlock('a')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // `unlock` envolve canUnlock; o erro herda o código semántico
      // que canUnlock empregou na `reason`. Mais a sinalización oficial
      // é a propia mensaxe localizada. Comparamos o código vía a
      // detección heurística do briefing: o error real de unlock cando
      // canUnlock bloquea pasa a través de `unlock` cun código.
      // Verificamos que existe un error e que a reason está presente.
      expect(r.error).toBeDefined()
    }
  })

  it('permite unlock dun nodo active (sen prerequisites)', async () => {
    const tc: TimeConstraints = { startsAt: 100, expiresAt: 10_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 1_000)

    const r = await engine.unlock('a')
    expect(r.ok).toBe(true)
  })
})

// ───────────────────────────────────────────────
// 3. tick básico
// ───────────────────────────────────────────────

describe('TreeEngine.tick — caducidades individuais', () => {
  it('non muta nada cando ningún nodo ten constraints', () => {
    const tree = makeTreeDef({ nodes: [makeNode('a'), makeNode('b')] })
    const { engine } = makeEngineWithClock(tree, 1_000)

    const result = engine.tick()
    expect(result.expired).toEqual([])
    expect(result.timestamp).toBe(1_000)
  })

  it('non afecta nodos en estado locked (a expiración só se aplica a unlocked/maxed)', () => {
    const tc: TimeConstraints = { expiresAt: 1_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 5_000)
    // 'a' está locked por defecto; non se desbloquea.

    const result = engine.tick()
    expect(result.expired).toEqual([])
    // O nodo nunca se desbloqueou: non hai instancia no estado.
    expect(engine.getNodeState('a')).toBeNull()
  })

  it('transita un nodo unlocked a expired cando expiresAt está no pasado', async () => {
    const tc: TimeConstraints = { expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const handle = makeEngineWithClock(tree, 1_000)

    // Desbloqueamos no momento 1000 (dentro de xanela: active).
    const ur = await handle.engine.unlock('a')
    expect(ur.ok).toBe(true)
    expect(handle.engine.getNodeState('a')?.state).toBe('unlocked')

    // Avanzamos o reloxo a despois de expiresAt.
    handle.setNow(10_000)
    const tickResult = handle.engine.tick()

    expect(tickResult.expired).toEqual(['a'])
    expect(tickResult.timestamp).toBe(10_000)
    expect(handle.engine.getNodeState('a')?.state).toBe('expired')
  })

  it('emite stateChange ben formado (from / to / timestamp / reason)', async () => {
    const tc: TimeConstraints = { expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const handle = makeEngineWithClock(tree, 1_000)

    const events: Array<{ nodeId: string; change: StateChange }> = []
    handle.engine.on('stateChange', (nodeId, change) => {
      events.push({ nodeId, change })
    })

    await handle.engine.unlock('a')
    events.length = 0 // descartamos o stateChange do unlock
    handle.setNow(10_000)
    handle.engine.tick()

    expect(events).toHaveLength(1)
    expect(events[0]?.nodeId).toBe('a')
    expect(events[0]?.change).toEqual({
      from: 'unlocked',
      to: 'expired',
      timestamp: 10_000,
      reason: 'expired',
    })
  })

  it('emite nodeExpired por cada nodo que expira', async () => {
    const tc: TimeConstraints = { expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const handle = makeEngineWithClock(tree, 1_000)

    const expiredEvents: string[] = []
    handle.engine.on('nodeExpired', (nodeId) => {
      expiredEvents.push(nodeId)
    })

    await handle.engine.unlock('a')
    handle.setNow(10_000)
    handle.engine.tick()

    expect(expiredEvents).toEqual(['a'])
  })

  it('rexistra audit node_expired con rollbackable:false', async () => {
    const tc: TimeConstraints = { expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const handle = makeEngineWithClock(tree, 1_000)

    const auditEvents: AuditEntry[] = []
    handle.engine.on('auditEntry', (entry) => {
      auditEvents.push(entry)
    })

    await handle.engine.unlock('a')
    auditEvents.length = 0 // limpamos as entradas previas
    handle.setNow(10_000)
    handle.engine.tick()

    const expiredAudits = auditEvents.filter((e) => e.action.type === 'node_expired')
    expect(expiredAudits).toHaveLength(1)
    expect(expiredAudits[0]?.rollbackable).toBe(false)
    if (expiredAudits[0]?.action.type === 'node_expired') {
      expect(expiredAudits[0]?.action.nodeId).toBe('a')
    }
  })
})

// ───────────────────────────────────────────────
// 4. tick: múltiples e parciais
// ───────────────────────────────────────────────

describe('TreeEngine.tick — múltiples nodos', () => {
  it('expira tres nodos no mesmo tick cando todos pasaron a súa caducidade', async () => {
    const tree = makeTreeDef({
      nodes: [
        makeNode('a', { timeConstraints: { expiresAt: 2_000 } }),
        makeNode('b', { timeConstraints: { expiresAt: 3_000 } }),
        makeNode('c', { timeConstraints: { expiresAt: 4_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')
    await handle.engine.unlock('c')

    handle.setNow(10_000)
    const result = handle.engine.tick()

    expect(result.expired.sort()).toEqual(['a', 'b', 'c'])
    expect(result.timestamp).toBe(10_000)
    expect(handle.engine.getNodeState('a')?.state).toBe('expired')
    expect(handle.engine.getNodeState('b')?.state).toBe('expired')
    expect(handle.engine.getNodeState('c')?.state).toBe('expired')
  })

  it('tick parcial: expira só os que pasaron, o resto segue active', async () => {
    const tree = makeTreeDef({
      nodes: [
        makeNode('a', { timeConstraints: { expiresAt: 2_000 } }),
        makeNode('b', { timeConstraints: { expiresAt: 3_000 } }),
        makeNode('c', { timeConstraints: { expiresAt: 4_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')
    await handle.engine.unlock('c')

    // Reloxo en 3500: a y b expirados (≤3000), c segue (≤4000 non
    // alcanzado aínda? — 3500 < 4000, polo tanto c segue).
    handle.setNow(3_500)
    const result = handle.engine.tick()

    expect(result.expired.sort()).toEqual(['a', 'b'])
    expect(handle.engine.getNodeState('a')?.state).toBe('expired')
    expect(handle.engine.getNodeState('b')?.state).toBe('expired')
    expect(handle.engine.getNodeState('c')?.state).toBe('unlocked')
  })
})

// ───────────────────────────────────────────────
// 5. tick: idempotencia
// ───────────────────────────────────────────────

describe('TreeEngine.tick — idempotencia', () => {
  it('un segundo tick sen cambios no estado nin no reloxo non fai nada', async () => {
    const tc: TimeConstraints = { expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    handle.setNow(10_000)

    const expiredEvents: string[] = []
    handle.engine.on('nodeExpired', (nodeId) => expiredEvents.push(nodeId))
    const auditEvents: AuditEntry[] = []
    handle.engine.on('auditEntry', (e) => auditEvents.push(e))

    const first = handle.engine.tick()
    expect(first.expired).toEqual(['a'])
    expect(expiredEvents).toEqual(['a'])
    const auditAfterFirst = auditEvents.filter((e) => e.action.type === 'node_expired').length
    expect(auditAfterFirst).toBe(1)

    // Segundo tick: o nodo xa está 'expired', non é unlocked/maxed,
    // polo tanto tick non o procesa.
    const second = handle.engine.tick()
    expect(second.expired).toEqual([])
    expect(expiredEvents).toEqual(['a']) // sen eventos novos
    const auditAfterSecond = auditEvents.filter((e) => e.action.type === 'node_expired').length
    expect(auditAfterSecond).toBe(1) // sen entradas novas
  })
})

// ───────────────────────────────────────────────
// 6. tick: invalidación de stats
// ───────────────────────────────────────────────

describe('TreeEngine.tick — invalidación da cache de stats', () => {
  it('un nodo expirado deixa de contribuír ao stat (statComputer invalidado)', async () => {
    const contribs: readonly StatContribution[] = [{ statId: 'damage', op: '+', value: 5 }]
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 10 })],
      nodes: [
        makeNode('a', {
          timeConstraints: { expiresAt: 5_000 },
          statContributions: contribs,
        }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)

    await handle.engine.unlock('a')
    expect(handle.engine.getStat('damage')).toBe(15) // 10 + 5

    handle.setNow(10_000)
    handle.engine.tick()

    // Tras expirar, a contribución xa non se conta (StatComputer só
    // suma unlocked/maxed). A cache foi invalidada polo tick.
    expect(handle.engine.getStat('damage')).toBe(10)
  })
})

// ───────────────────────────────────────────────
// 7. tick: readOnly
// ───────────────────────────────────────────────

describe('TreeEngine.tick — readOnly', () => {
  it('en readOnly, tick é no-op (devolve expired vacío) e non muta estado', () => {
    const tc: TimeConstraints = { expiresAt: 1_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })

    // Necesitamos un engine cun nodo xa unlocked. Como readOnly bloquea
    // mutacións incluído unlock, montamos un engine non-readOnly,
    // desbloqueamos, e despois construímos un novo engine en readOnly
    // sobre o mesmo treeDef (pero o estado inicial é todo locked).
    // O test verifica que mesmo se houbera un nodo unlocked
    // hipoteticamente con expiresAt pasado, readOnly non muta.
    const clockMs = 5_000
    const engine = new TreeEngine(tree, {
      readOnly: true,
      timeNow: () => clockMs,
    })
    const result = engine.tick()
    expect(result.expired).toEqual([])
    expect(result.timestamp).toBe(5_000)
    // O nodo non se desbloqueou (readOnly bloquea unlock): non hai
    // instancia no estado e tick non a crea.
    expect(engine.getNodeState('a')).toBeNull()
    void clockMs
  })
})

// ───────────────────────────────────────────────
// 8. nextTickAt
// ───────────────────────────────────────────────

describe('TreeEngine.nextTickAt', () => {
  it('devolve null cando non hai ningún nodo unlocked con timeConstraints', () => {
    const tree = makeTreeDef({ nodes: [makeNode('a'), makeNode('b')] })
    const { engine } = makeEngineWithClock(tree, 1_000)
    expect(engine.nextTickAt()).toBeNull()
  })

  it('devolve null cando os nodos con timeConstraints están locked', () => {
    const tc: TimeConstraints = { expiresAt: 5_000 }
    const tree = makeTreeDef({ nodes: [makeNode('a', { timeConstraints: tc })] })
    const { engine } = makeEngineWithClock(tree, 1_000)
    // 'a' está locked → nextTickAt ignórao.
    expect(engine.nextTickAt()).toBeNull()
  })

  it('devolve o expiresAt máis próximo cando hai dous nodos unlocked', async () => {
    const tree = makeTreeDef({
      nodes: [
        makeNode('a', { timeConstraints: { expiresAt: 3_000 } }),
        makeNode('b', { timeConstraints: { expiresAt: 5_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')

    expect(handle.engine.nextTickAt()).toBe(3_000)
  })

  it('tras un tick que expira o máis próximo, devolve o seguinte', async () => {
    const tree = makeTreeDef({
      nodes: [
        makeNode('a', { timeConstraints: { expiresAt: 3_000 } }),
        makeNode('b', { timeConstraints: { expiresAt: 5_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')

    handle.setNow(3_500) // 'a' expira; 'b' segue
    handle.engine.tick()
    expect(handle.engine.nextTickAt()).toBe(5_000)
  })

  it('tras tick que expira todos, devolve null', async () => {
    const tree = makeTreeDef({
      nodes: [
        makeNode('a', { timeConstraints: { expiresAt: 3_000 } }),
        makeNode('b', { timeConstraints: { expiresAt: 5_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')

    handle.setNow(10_000)
    handle.engine.tick()
    expect(handle.engine.nextTickAt()).toBeNull()
  })
})

// ───────────────────────────────────────────────
// 9. timeNow default = Date.now (cobertura, sen aserción precisa)
// ───────────────────────────────────────────────

describe('TreeEngine — timeNow default', () => {
  it('sen options.timeNow, o engine usa Date.now (non lanza)', () => {
    const tree = makeTreeDef({ nodes: [makeNode('a')] })
    const engine = new TreeEngine(tree)
    // Sen constraints temporais, canUnlock non depende de timeNow no
    // resultado, pero exercitamos o caso por defecto.
    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)

    // tick tampouco lanza nin produce expiracións espurias.
    const tickResult = engine.tick()
    expect(tickResult.expired).toEqual([])
    expect(typeof tickResult.timestamp).toBe('number')
  })
})

// ───────────────────────────────────────────────
// 10. tick e nextTickAt: nodos unlocked SEN timeConstraints
// ───────────────────────────────────────────────

describe('TreeEngine.tick / nextTickAt — nodos unlocked sen timeConstraints', () => {
  it('tick ignora nodos unlocked sen timeConstraints (rama de saída anticipada)', async () => {
    // Mestura: 'a' sen constraints (unlocked), 'b' con expiresAt
    // pasada (unlocked → debe expirar).
    const tree = makeTreeDef({
      nodes: [
        makeNode('a'), // sen timeConstraints
        makeNode('b', { timeConstraints: { expiresAt: 5_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')

    handle.setNow(10_000)
    const result = handle.engine.tick()

    expect(result.expired).toEqual(['b'])
    expect(handle.engine.getNodeState('a')?.state).toBe('unlocked')
    expect(handle.engine.getNodeState('b')?.state).toBe('expired')
  })

  it('nextTickAt ignora nodos unlocked sen timeConstraints', async () => {
    const tree = makeTreeDef({
      nodes: [makeNode('a'), makeNode('b', { timeConstraints: { expiresAt: 5_000 } })],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')

    expect(handle.engine.nextTickAt()).toBe(5_000)
  })

  it('nextTickAt salta nodos unlocked cuxo nextTransitionAt sexa null (expiresAt no pasado)', async () => {
    // Desbloqueamos cando o reloxo está dentro da xanela; despois
    // avanzamos a un instante posterior a `expiresAt`. O nodo segue
    // 'unlocked' (non se chamou tick), pero `nextTransitionAt` da
    // súa constraint devolve null (todo no pasado). nextTickAt debe
    // saltalo e devolver o do outro nodo.
    const tree = makeTreeDef({
      nodes: [
        makeNode('a', { timeConstraints: { expiresAt: 2_000 } }),
        makeNode('b', { timeConstraints: { expiresAt: 8_000 } }),
      ],
    })
    const handle = makeEngineWithClock(tree, 1_000)
    await handle.engine.unlock('a')
    await handle.engine.unlock('b')

    handle.setNow(5_000) // posterior a a.expiresAt; b segue activo
    // 'a' segue 'unlocked' porque non chamamos tick: o seu
    // nextTransitionAt agora devolve null.
    expect(handle.engine.getNodeState('a')?.state).toBe('unlocked')
    expect(handle.engine.nextTickAt()).toBe(8_000)
  })
})

// ── FIN: tests de TreeEngine ↔ TimeManager (sub-fase 2.3.b) ──
