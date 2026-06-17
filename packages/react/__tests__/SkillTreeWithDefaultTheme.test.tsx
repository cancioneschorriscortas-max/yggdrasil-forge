import { render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillTreeWithDefaultTheme } from '../src/SkillTreeWithDefaultTheme.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { minimal } from '../src/themes/minimal.js'

function makeEngine(): TreeEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'T',
    nodes: [{ id: 'a', type: 'small', label: 'A' }],
    edges: [],
    layout: { type: 'custom' },
  }
  return new TreeEngine(tree)
}

function svgStyle(container: HTMLElement): string {
  const svg = container.querySelector('svg')
  if (svg === null) throw new Error('Esperábase un <svg>')
  return svg.getAttribute('style') ?? ''
}

describe('SkillTreeWithDefaultTheme', () => {
  it('sen ThemeProvider ascendente: aplica o tema minimal', () => {
    const { container } = render(<SkillTreeWithDefaultTheme engine={makeEngine()} />)
    expect(svgStyle(container)).toContain(minimal.colors.text)
  })

  it('con ThemeProvider ascendente: respecta o tema do consumidor', () => {
    const custom = {
      ...minimal,
      colors: { ...minimal.colors, text: '#123456' },
      sizes: minimal.sizes,
    }
    const { container } = render(
      <ThemeProvider theme={custom}>
        <SkillTreeWithDefaultTheme engine={makeEngine()} />
      </ThemeProvider>,
    )
    // O tema custom aplícase (proba de que NON o pisa minimal).
    expect(svgStyle(container)).toContain('#123456')
  })
})
