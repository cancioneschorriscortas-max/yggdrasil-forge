// ── INICIO: sonda baker icons wiring (Opción A) ──
//
// **Sonda manual** — este ficheiro vive no exemplo, e o exemplo NON está
// na pipeline de test do workspace (sen script `test` nin vitest config
// local). Polo tanto este test NON se corre con `pnpm turbo run test`.
//
// Para correr á man (desde a raíz do repo):
//
//   pnpm vitest run examples/oberon-panadeiro/src/__verify_baker_icons.test.ts
//
// Garda o que os gates estáticos non ven: que o mapeo cobre exactamente
// os 19 microskills do fixture e que cada slug está rexistrado. Se algún
// día o exemplo se move a un paquete coa pipeline activa, este test
// engánchase automaticamente sen modificacións.

import { getIcon, registerIcons } from '@yggdrasil-forge/react'
import { describe, expect, it } from 'vitest'
import { BAKER_ICONS, BAKER_NODE_ICONS } from './bakerIcons.js'
import panadeiro from './panadeiro.fixture.json'

describe('baker icons wiring (Opción A)', () => {
  const fixtureIds = (panadeiro as { microskills: { id: string }[] }).microskills.map((m) => m.id)

  it('hai 19 microskills e 19 entradas no mapa', () => {
    expect(fixtureIds).toHaveLength(19)
    expect(Object.keys(BAKER_NODE_ICONS)).toHaveLength(19)
  })

  it('o mapa cobre EXACTAMENTE os ids do fixture (sen orfos nin faltas)', () => {
    expect(new Set(Object.keys(BAKER_NODE_ICONS))).toEqual(new Set(fixtureIds))
  })

  it('cada slug do mapa existe en BAKER_ICONS', () => {
    for (const slug of Object.values(BAKER_NODE_ICONS)) {
      expect(BAKER_ICONS[slug], `slug sen icona: ${slug}`).toBeDefined()
    }
  })

  it('tras registerIcons, getIcon resolve os 19 slugs cunha icona stroke', () => {
    registerIcons(BAKER_ICONS)
    for (const slug of Object.values(BAKER_NODE_ICONS)) {
      const def = getIcon(slug)
      expect(def, `non rexistrada: ${slug}`).toBeDefined()
      expect(def?.paths.length, `sen paths: ${slug}`).toBeGreaterThan(0)
      expect(
        def?.paths.some((p) => p.mode === 'stroke'),
        `sen path stroke: ${slug}`,
      ).toBe(true)
    }
  })
})
// ── FIN: sonda baker icons wiring ──
