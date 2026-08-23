// ── INICIO: garda de memoización (Fase 16.4 perf) ──
// A medición a 1500 nodos (tools/e2e/tests/perf/scale.spec.ts) daba
// drag ~1,7 s e pan ~24 fps porque cada interacción reconciliaba os
// 6.000 fillos do SkillTree. Memoizar SkillNode/SkillEdge e as listas
// de elementos baixou o drag a ~0,6 s e subiu o pan a ~41 fps. Esta
// garda impide que un refactor retire o `memo` sen que a suite o diga;
// os números reais séguense medindo no spec de escala.

import { describe, expect, it } from 'vitest'
import { SkillEdge } from '../src/SkillEdge.js'
import { SkillNode } from '../src/SkillNode.js'

const REACT_MEMO = Symbol.for('react.memo')

describe('Fase 16.4 — compoñentes por-elemento memoizados', () => {
  it('SkillNode é un compoñente memo', () => {
    expect((SkillNode as unknown as { $$typeof: symbol }).$$typeof).toBe(REACT_MEMO)
    expect(SkillNode.displayName).toBe('SkillNode')
  })

  it('SkillEdge é un compoñente memo', () => {
    expect((SkillEdge as unknown as { $$typeof: symbol }).$$typeof).toBe(REACT_MEMO)
    expect(SkillEdge.displayName).toBe('SkillEdge')
  })
})
// ── FIN: garda de memoización ──
