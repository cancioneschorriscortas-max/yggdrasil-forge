// ── INICIO: tests ygg render (7.17, Cambio 2) ──
// O bucle péchase: unha IA pode VERSE. SVG autocontido, determinista.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderDocumentText } from '../src/renderCmd.js'

const GALLERY = join(__dirname, '..', '..', '..', 'examples', 'gallery')
const galleryText = (f: string) => readFileSync(join(GALLERY, f), 'utf8')

describe('ygg render — cada ficheiro da galería → SVG autocontido', () => {
  for (const file of readdirSync(GALLERY).filter((f) => f.endsWith('.json'))) {
    it(`${file} → SVG con xmlns, nodos correctos, cero var(--`, () => {
      const text = galleryText(file)
      const doc = JSON.parse(text) as { tree?: { nodes: unknown[] }; nodes?: unknown[] }
      const nodeCount = (doc.tree?.nodes ?? doc.nodes ?? []).length
      const result = renderDocumentText(text)
      expect(result.ok, result.error).toBe(true)
      if (!result.ok || result.output === undefined) return
      const svg = result.output
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect((svg.match(/data-node-id=/g) ?? []).length).toBe(nodeCount)
      expect(svg.includes('var(--')).toBe(false)
      expect(svg).toMatch(/width="\d+" height="\d+"/)
      // O ficheiro non depende do tamaño do panel (width:100% fóra).
      expect(svg.includes('width:100%')).toBe(false)
    })
  }
})

describe('ygg render — opcións', () => {
  it('★ determinista: dous renders → byte a byte idénticos', () => {
    const text = galleryText('gaia-cards.json')
    const a = renderDocumentText(text, { dark: true, width: 1200 })
    const b = renderDocumentText(text, { dark: true, width: 1200 })
    expect(a.output).toBe(b.output)
    expect(a.output).toBeDefined()
  })

  it('--dark cambia as cores (base escura + fondo escuro)', () => {
    const text = galleryText('minimal.json')
    const light = renderDocumentText(text)
    const dark = renderDocumentText(text, { dark: true })
    expect(light.output).not.toBe(dark.output)
    expect(dark.output).toContain('#16171b') // fondo sólido escuro por defecto
  })

  it('--locale cambia as labels (pre-resolución no dato)', () => {
    const text = galleryText('minimal.json') // labels {gl, en}
    const gl = renderDocumentText(text, { locale: 'gl' })
    const en = renderDocumentText(text, { locale: 'en' })
    expect(gl.output).toContain('Raíz')
    expect(en.output).toContain('Root')
    expect(en.output).not.toContain('Raíz')
  })

  it('--width escala mantendo o aspecto', () => {
    const text = galleryText('minimal.json')
    const result = renderDocumentText(text, { width: 1000 })
    expect(result.output).toMatch(/width="1000" height="\d+"/)
  })

  it('JSON inválido → erro honesto', () => {
    const result = renderDocumentText('{ non')
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })
})
// ── FIN: tests ygg render ──
