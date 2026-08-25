// Test mínimo do tutorial (os tutoriais tamén podrecen — este non).
import { resolveLocalized } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'
import { TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { createFocoPlugin } from '../src/focoPlugin.js'

function buildEngine(): TreeEngine {
  const tree: TreeDef = {
    id: 'aula',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'A aula' },
    nodes: [
      {
        id: 'letras',
        type: 'small',
        label: { gl: 'Letras' },
        position: { x: 0, y: 0 },
        supportsProgress: true,
        progressSource: { type: 'manual' },
      },
      { id: 'numeros', type: 'small', label: { gl: 'Números' }, position: { x: 120, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  }
  return new TreeEngine(tree, { locale: 'gl' })
}

describe('plugin foco — «remata o que empezaches»', () => {
  it('sen nodo a medias, todo segue igual', async () => {
    const engine = buildEngine()
    await engine.registerPlugin(createFocoPlugin())
    const check = engine.canUnlock('numeros')
    expect(check.ok && check.value.allowed).toBe(true)
  })

  it('con "letras" a medias: canUnlock EXPLICA e unlock VETA', async () => {
    const engine = buildEngine()
    await engine.registerPlugin(createFocoPlugin())
    engine.setProgress('letras', 60)
    // O dato de verdade é progress; o state gardado NON cambia (2.4.b).
    expect(engine.getProgress('letras')).toBe(60)

    const check = engine.canUnlock('numeros')
    expect(check.ok).toBe(true)
    if (check.ok) {
      expect(check.value.allowed).toBe(false)
      expect(resolveLocalized(check.value.reason ?? '', 'gl')).toContain('letras')
    }

    const intento = await engine.unlock('numeros')
    expect(intento.ok).toBe(false)
  })

  it('o propio nodo a medias non queda vetado, e ao rematar libérase o foco', async () => {
    const engine = buildEngine()
    await engine.registerPlugin(createFocoPlugin())
    engine.setProgress('letras', 60)

    // O nodo en curso pode seguir: o plugin exceptúao.
    const propio = engine.canUnlock('letras')
    expect(propio.ok && propio.value.allowed).toBe(true)

    engine.setProgress('letras', 100)
    const despois = await engine.unlock('numeros')
    expect(despois.ok).toBe(true)
  })
})
