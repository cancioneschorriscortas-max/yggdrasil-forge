import type { TreeDef, TreeState } from '@yggdrasil-forge/core'
import { renderToString } from 'react-dom/server'
// ── INICIO: tests SkillTreeStatic ──
import { describe, expect, it } from 'vitest'
import { SkillTreeStatic } from '../src/SkillTreeStatic.js'
import { createDefaultLayoutRegistry } from '../src/createDefaultLayoutRegistry.js'

function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
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
    ...overrides,
  }
}

describe('SkillTreeStatic', () => {
  it('renderiza SVG válido con renderToString (SSR-safe)', () => {
    const html = renderToString(<SkillTreeStatic treeDef={makeMinimalTreeDef()} />)
    expect(html).toContain('yf-skill-tree')
    expect(html).toContain('<svg')
  })

  it('con state undefined, nodos renderizan como locked', () => {
    const html = renderToString(<SkillTreeStatic treeDef={makeMinimalTreeDef()} />)
    expect(html).toContain('data-state="locked"')
  })

  it('con state cunha entrada, nodo ten data-state correspondente', () => {
    const state: TreeState = {
      nodes: {
        a: { id: 'a', state: 'unlocked', currentTier: 1, unlockedAt: 0 },
      },
      budget: { resources: {} },
    }
    const html = renderToString(<SkillTreeStatic treeDef={makeMinimalTreeDef()} state={state} />)
    expect(html).toContain('data-state="unlocked"')
    expect(html).toContain('data-state="locked"')
  })

  it('con RadialLayout produce mesh overlay', () => {
    const html = renderToString(
      <SkillTreeStatic
        treeDef={makeMinimalTreeDef({
          layout: { type: 'radial', radius: 100 },
        })}
      />,
    )
    expect(html).toContain('yf-mesh-overlay')
  })

  it('con layout descoñecido produce error mode', () => {
    const html = renderToString(
      <SkillTreeStatic
        treeDef={makeMinimalTreeDef({
          layout: { type: 'nonexistent-layout' as 'custom' },
        })}
      />,
    )
    expect(html).toContain('yf-skill-tree--error')
    expect(html).toContain('data-error')
  })

  it('acepta custom layoutRegistry', () => {
    const registry = createDefaultLayoutRegistry()
    const html = renderToString(
      <SkillTreeStatic treeDef={makeMinimalTreeDef()} layoutRegistry={registry} />,
    )
    expect(html).toContain('yf-skill-tree')
  })
})
// ── FIN: tests SkillTreeStatic ──
