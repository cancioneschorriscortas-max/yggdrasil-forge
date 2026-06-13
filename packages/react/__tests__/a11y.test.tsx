// Tests a11y automatizados con jest-axe. Verifican cero violacións
// WCAG nos compoñentes principais de @yggdrasil-forge/react.

import { render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { axe } from 'jest-axe'
import { renderToString } from 'react-dom/server'
import { describe, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { SkillTreeStatic } from '../src/SkillTreeStatic.js'
import { SkillTree, SkillTreeAnnouncer } from '../src/index.js'

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

function expectNoViolations(results: Awaited<ReturnType<typeof axe>>): void {
  const violations = results.violations
  if (violations.length > 0) {
    const msgs = violations.map((v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`)
    throw new Error(`Axe violations found:\n${msgs.join('\n')}`)
  }
}

describe('A11y: SkillTree (client)', () => {
  it('SkillTree con árbore mínima: cero violacións axe', async () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    const { container } = render(<SkillTree engine={engine} />)
    const results = await axe(container)
    expectNoViolations(results)
  })
})

describe('A11y: SkillNode (standalone)', () => {
  it('SkillNode con onClick: cero violacións axe', async () => {
    const node = { id: 'a', type: 'small' as const, label: 'A' }
    const position = { x: 0, y: 0 }
    const onClick = (): void => undefined
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode node={node} instance={undefined} position={position} onClick={onClick} />
      </svg>,
    )
    const results = await axe(container, {
      rules: {
        // O wrapper <svg role="img"> no test crea un falso positivo
        // de nested-interactive; en uso real SkillNode vive dentro
        // de SkillTree/SVGRenderer que xestiona o role correctamente.
        'nested-interactive': { enabled: false },
      },
    })
    expectNoViolations(results)
  })
})

describe('A11y: SkillTreeStatic (SSR)', () => {
  it('SkillTreeStatic renderizado: cero violacións axe', async () => {
    const html = renderToString(<SkillTreeStatic treeDef={makeMinimalTreeDef()} />)
    const container = document.createElement('div')
    container.innerHTML = html
    const results = await axe(container)
    expectNoViolations(results)
  })
})

describe('A11y: SkillTreeAnnouncer', () => {
  it('SkillTreeAnnouncer con engine: cero violacións axe', async () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    const { container } = render(<SkillTreeAnnouncer engine={engine} />)
    const results = await axe(container)
    expectNoViolations(results)
  })
})
