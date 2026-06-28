// ── INICIO: sonda DetailPanel — fluxo de selección/tier ──
//
// **Sonda manual** — corre fora da pipeline do workspace (o exemplo
// non ten script `test`). Execución manual:
//
//   pnpm vitest run examples/oberon-panadeiro/src/__verify_detailpanel.test.ts
//
// Principio A.6.32 (tests = fluxo, non só tipos): simulamos selección
// e avance de tier, con asertos intermedios sobre o estado real do
// engine. Importa `tierRowsFor`/`badgeText` desde `detailLogic.ts`
// (sen React) para probar o código real que renderiza o panel.

import { TreeEngine } from '@yggdrasil-forge/core'
import { type GaiaProfession, importGaiaProfession } from '@yggdrasil-forge/importers'
import { badgeText, tierRowsFor } from '@yggdrasil-forge/react'
import { describe, expect, it } from 'vitest'
import panadeiro from './panadeiro.fixture.json'

describe('F12 DetailPanel — fluxo de selección/tier', () => {
  const def = importGaiaProfession(panadeiro as unknown as GaiaProfession)

  it('un microskill trae os campos que o panel necesita', () => {
    const n = def.nodes.find((x) => x.id === 'pan_amasado')
    expect(n).toBeDefined()
    expect(n?.label, 'label').toBeDefined()
    expect(n?.description, 'description (que_significa)').toBeDefined()
    expect(n?.content?.flavor, 'content.flavor (accion_clave)').toBeDefined()
    expect(n?.maxTier, 'maxTier').toBe(3)
  })

  it('tierRowsFor(0, 3): NIVEL 1 actual, 2-3 bloqueados', () => {
    expect(tierRowsFor(0, 3)).toEqual([
      { tier: 1, state: 'actual' },
      { tier: 2, state: 'bloqueado' },
      { tier: 3, state: 'bloqueado' },
    ])
  })

  it('tierRowsFor(1, 3): NIVEL 1 completado, 2 actual, 3 bloqueado (coma Imaxe 1)', () => {
    expect(tierRowsFor(1, 3)).toEqual([
      { tier: 1, state: 'completado' },
      { tier: 2, state: 'actual' },
      { tier: 3, state: 'bloqueado' },
    ])
  })

  it('tierRowsFor(2, 3): NIVEL 1-2 completados, 3 actual', () => {
    expect(tierRowsFor(2, 3)).toEqual([
      { tier: 1, state: 'completado' },
      { tier: 2, state: 'completado' },
      { tier: 3, state: 'actual' },
    ])
  })

  it('tierRowsFor(maxTier, maxTier): todas completado', () => {
    expect(tierRowsFor(3, 3).every((r) => r.state === 'completado')).toBe(true)
  })

  it('badgeText cambia ao chegar a máximo', () => {
    expect(badgeText(0, 3)).toBe('NIVEL 1 DE 3')
    expect(badgeText(1, 3)).toBe('NIVEL 2 DE 3')
    expect(badgeText(2, 3)).toBe('NIVEL 3 DE 3')
    expect(badgeText(3, 3)).toBe('NIVEL 3 DE 3 · MÁXIMO')
  })

  it('avanzar tier dun nodo desbloqueable reflíctese en getNodeState', async () => {
    // Cada test crea o seu engine para evitar contaminación de estado.
    const engine = new TreeEngine(def)
    const target = def.nodes.find((n) => engine.canUnlock(n.id).ok === true)
    expect(target, 'debe existir algún nodo desbloqueable inicialmente').toBeDefined()
    if (target === undefined) return

    const before = engine.getNodeState(target.id)?.currentTier ?? 0
    const result = await engine.unlock(target.id)
    expect(result.ok, `unlock devolveu err: ${result.ok ? '' : result.error.message}`).toBe(true)
    const after = engine.getNodeState(target.id)?.currentTier ?? 0
    expect(after).toBe(before + 1)
  })
})
// ── FIN: sonda DetailPanel ──
