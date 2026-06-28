// ── INICIO: sonda ClusterCards — datos e lóxica de fila ──
//
// Sonda manual fora da pipeline. Execución:
//   pnpm vitest run examples/oberon-panadeiro/src/__verify_cluster_cards.test.ts
//
// Cubre:
//   - lóxica pura (rowState, rowBadge) cos casos típicos
//   - integridade entre fixture + BAKER_NODE_ICONS + BAKER_ICONS:
//     cada grupo ten membros, cada membro ten slug, cada slug ten icona
//   - coroa rexistrada (Capa 1A + crown engadida nesta entrega)

import { TreeEngine } from '@yggdrasil-forge/core'
import { type GaiaProfession, importGaiaProfession } from '@yggdrasil-forge/importers'
import { describe, expect, it } from 'vitest'
import { BAKER_ICONS, BAKER_NODE_ICONS } from './bakerIcons.js'
import { rowBadge, rowState } from './cardLogic.js'
import panadeiro from './panadeiro.fixture.json'

describe('ClusterCards — datos e lóxica de fila', () => {
  const def = importGaiaProfession(panadeiro as unknown as GaiaProfession)

  it('rowState: locked/actual/done', () => {
    expect(rowState(0, 3)).toBe('locked')
    expect(rowState(1, 3)).toBe('actual')
    expect(rowState(2, 3)).toBe('actual')
    expect(rowState(3, 3)).toBe('done')
  })

  it('rowState: maxTier=0 nunca dá done', () => {
    expect(rowState(0, 0)).toBe('locked')
    expect(rowState(1, 0)).toBe('actual')
  })

  it('rowBadge: ct/mt en progreso, ✓ no máximo', () => {
    expect(rowBadge(0, 3)).toBe('0/3')
    expect(rowBadge(1, 3)).toBe('1/3')
    expect(rowBadge(2, 3)).toBe('2/3')
    expect(rowBadge(3, 3)).toBe('✓')
  })

  it('cada grupo do fixture ten membros e cada membro ten icona resoluble', () => {
    expect(def.groups).toBeDefined()
    for (const g of def.groups ?? []) {
      const members = def.nodes.filter((n) => n.group === g.id)
      expect(members.length, `grupo ${g.id} non ten membros`).toBeGreaterThan(0)
      for (const n of members) {
        const slug = BAKER_NODE_ICONS[n.id]
        expect(slug, `node ${n.id} non ten slug en BAKER_NODE_ICONS`).toBeDefined()
        if (slug !== undefined) {
          expect(BAKER_ICONS[slug], `slug ${slug} non está en BAKER_ICONS`).toBeDefined()
        }
      }
    }
  })

  it("a icona 'crown' está rexistrada en BAKER_ICONS", () => {
    expect(BAKER_ICONS.crown).toBeDefined()
    expect(BAKER_ICONS.crown?.paths.length).toBeGreaterThan(0)
  })

  it('engine inicializa sen erros co fixture (smoke test)', () => {
    const engine = new TreeEngine(def)
    // O root (Panadeiro/a) é desbloqueable inicialmente.
    const rootId = def.nodes.find((n) => n.type === 'root')?.id
    expect(rootId).toBeDefined()
    if (rootId === undefined) return
    expect(engine.getNodeState(rootId)?.currentTier ?? 0).toBe(0)
  })
})
// ── FIN: sonda ClusterCards ──
