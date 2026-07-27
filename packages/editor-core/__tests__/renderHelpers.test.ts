// ── INICIO: tests helpers de render (7.17, Cambios 0 e utilidade SVG) ──
import { describe, expect, it } from 'vitest'
import { standaloneSvg } from '../src/svg/standaloneSvg.js'
import { themeOverridesFromSpec } from '../src/theme/themeOverridesFromSpec.js'

describe('7.17-C0 — themeOverridesFromSpec', () => {
  it('nodeFills parciais mapean aos campos nodeFill<Estado>', () => {
    const overrides = themeOverridesFromSpec(
      { nodeFills: { locked: '#111111', maxed: '#222222' } },
      false,
    )
    expect(overrides).toEqual({ nodeFillLocked: '#111111', nodeFillMaxed: '#222222' })
  })

  it('textColor ten prioridade e mapea a text', () => {
    const overrides = themeOverridesFromSpec({ textColor: '#e8dcc0' }, false)
    expect(overrides).toEqual({ text: '#e8dcc0' })
  })

  it('spec undefined → sen overrides (a base manda)', () => {
    expect(themeOverridesFromSpec(undefined, false)).toEqual({})
  })

  it('base escura: os overrides do documento son os MESMOS (gañan sempre)', () => {
    const spec = { textColor: '#fff', nodeFills: { unlocked: '#c9a24b' } }
    expect(themeOverridesFromSpec(spec, true)).toEqual(themeOverridesFromSpec(spec, false))
  })
})

describe('7.17 — standaloneSvg', () => {
  const base = '<svg viewBox="-10 -20 100 50"><g><circle r="5" fill="#123456"/></g></svg>'

  it('engade xmlns, width/height do viewBox, fonte e fondo', () => {
    const result = standaloneSvg(base, { background: '#0a0d14' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const svg = result.value
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="100"')
    expect(svg).toContain('height="50"')
    expect(svg).toContain('font-family:')
    // O rect de fondo cobre o viewBox e vai PRIMEIRO.
    expect(svg).toMatch(
      /<svg [^>]*><rect x="-10" y="-20" width="100" height="50" fill="#0a0d14"\/>/,
    )
  })

  it('width pedido escala mantendo o aspecto', () => {
    const result = standaloneSvg(base, { width: 400 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toContain('width="400"')
    expect(result.value).toContain('height="200"')
  })

  it('respecta un xmlns xa presente (non duplica)', () => {
    const withNs = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'
    const result = standaloneSvg(withNs)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.match(/xmlns=/g)).toHaveLength(1)
  })

  it('★ var(-- sen resolver → erro honesto (nunca un ficheiro roto)', () => {
    const dirty = '<svg viewBox="0 0 10 10"><text fill="var(--editor-code-key)">x</text></svg>'
    const result = standaloneSvg(dirty)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch(/autocontido/)
  })

  it('sen viewBox → erro honesto', () => {
    expect(standaloneSvg('<svg width="10"></svg>').ok).toBe(false)
  })

  it('determinista: mesma entrada → mesma saída', () => {
    const a = standaloneSvg(base, { background: '#fff', width: 300 })
    const b = standaloneSvg(base, { background: '#fff', width: 300 })
    expect(a).toEqual(b)
  })
})
// ── FIN: tests helpers de render ──
