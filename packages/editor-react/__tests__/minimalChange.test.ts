// ── INICIO: tests minimalChange (Fase 16.4 perf, panel Código) ──
import { describe, expect, it } from 'vitest'
import { minimalChange } from '../src/panels/code/CodeEditor.js'

type Change = { readonly from: number; readonly to: number; readonly insert: string }

/** Aplica un cambio a un texto (oráculo independente de CodeMirror). */
function apply(text: string, c: Change): string {
  return text.slice(0, c.from) + c.insert + text.slice(c.to)
}

/** Cambio que DEBE existir (falla o test se é null, sen non-null assertion). */
function change(a: string, b: string): Change {
  const c = minimalChange(a, b)
  if (c === null) throw new Error('agardábase un cambio')
  return c
}

describe('minimalChange', () => {
  it('iguais → null (nada que despachar)', () => {
    expect(minimalChange('abc', 'abc')).toBeNull()
  })

  it('cambio no medio: só o tramo distinto, con magnitudes exactas', () => {
    const a = '{"x": 10, "y": 20}'
    const b = '{"x": 10, "y": 250}'
    const c = change(a, b)
    // 20 → 250: o mínimo é INSERIR '5' entre o '2' e o '0' (nada que borrar).
    expect(c).toEqual({ from: 16, to: 16, insert: '5' })
    expect(apply(a, c)).toBe(b)
  })

  it('inserción pura e borrado puro', () => {
    expect(minimalChange('ab', 'aXb')).toEqual({ from: 1, to: 1, insert: 'X' })
    expect(minimalChange('aXb', 'ab')).toEqual({ from: 1, to: 2, insert: '' })
  })

  it('texto baleiro nos dous sentidos', () => {
    expect(minimalChange('', 'abc')).toEqual({ from: 0, to: 0, insert: 'abc' })
    expect(minimalChange('abc', '')).toEqual({ from: 0, to: 3, insert: '' })
  })

  it('prefixo e sufixo solapados (aaa → aa) non se cruzan', () => {
    const c = change('aaa', 'aa')
    expect(apply('aaa', c)).toBe('aa')
    expect(c.from).toBeLessThanOrEqual(c.to)
  })

  it('★ drag simulado nun doc de 1500 nodos: o cambio é minúsculo', () => {
    const nodes = Array.from(
      { length: 1500 },
      (_, i) => `  {"id": "n${i}", "position": {"x": ${i}, "y": 0}}`,
    )
    const a = `[\n${nodes.join(',\n')}\n]`
    const moved = nodes.map((l, i) => (i === 750 ? l.replace('"x": 750', '"x": 790') : l))
    const b = `[\n${moved.join(',\n')}\n]`
    const c = change(a, b)
    expect(c.to - c.from).toBeLessThanOrEqual(2)
    expect(c.insert.length).toBeLessThanOrEqual(2)
    expect(apply(a, c)).toBe(b)
  })
})
// ── FIN: tests minimalChange ──
