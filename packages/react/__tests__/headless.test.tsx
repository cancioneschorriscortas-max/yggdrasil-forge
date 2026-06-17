import { render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
// ── INICIO: tests headless entry point ──
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { SkillTree } from '../src/headless.js'
import { minimal } from '../src/themes/minimal.js'

function makeMinimalTreeDef(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  }
}

describe('headless entry point', () => {
  it('SkillTree do headless renderiza sen <style> interno (cero autoload)', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    const { container } = render(<SkillTree engine={engine} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('class')).toBe('yf-skill-tree')
    // Sen ThemeProvider, cero <style> interno
    expect(container.querySelector('style')).toBeNull()
    expect(svg?.getAttribute('data-theme-id')).toBeNull()
  })

  it('headless non exporta ThemeProvider, minimal nin Theme', async () => {
    const headless = await import('../src/headless.js')
    expect('ThemeProvider' in headless).toBe(false)
    expect('minimal' in headless).toBe(false)
    expect('Theme' in headless).toBe(false)
  })

  it('headless + ThemeProvider explícito aplica o tema', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SkillTree engine={engine} />
      </ThemeProvider>,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // F10.3.fix: con ThemeProvider, segue habendo <style> (animacións)
    // + data-theme-id (áncora). O `style` do <svg> xa NON leva CSS vars.
    expect(container.querySelector('style')).not.toBeNull()
    expect(svg?.getAttribute('data-theme-id')).toBeTruthy()
    // F10.3.fix: a cor do tema chega inline a un <text class="...__label">.
    const label = container.querySelector('.yf-skill-node__label')
    expect(label?.getAttribute('style') ?? '').toContain(minimal.colors.text)
  })
})
// ── FIN: tests headless entry point ──
