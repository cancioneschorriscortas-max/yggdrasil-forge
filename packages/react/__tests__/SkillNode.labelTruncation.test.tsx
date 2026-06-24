// ── INICIO: tests SkillNode — truncado opt-in de labels (maxLabelChars) ──
//
// Cobre o token de tema `theme.sizes.maxLabelChars` (opt-in). Default
// off → comportamento byte-idéntico ao previo. Cando se define (>0) e a
// etiqueta o excede, trúncase + engádese <title> co texto completo.

import { render } from '@testing-library/react'
import type { NodeDef, NodeInstance } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'

function makeTheme(maxLabelChars?: number): Theme {
  return {
    colors: {
      background: 'transparent',
      text: '#222222',
      nodeLocked: '#AAAAAA',
      nodeUnlockable: '#AAAAAA',
      nodeUnlocked: '#AAAAAA',
      nodeMaxed: '#AAAAAA',
      nodeInProgress: '#AAAAAA',
      nodeStroke: '#AAAAAA',
      edge: '#AAAAAA',
      mesh: '#AAAAAA',
      nodeFill: '#FFFFFF',
    },
    sizes: {
      strokeWidth: 2,
      fontSize: 14,
      fontSizeSmall: 11,
      ringWidth: 3,
      ...(maxLabelChars !== undefined ? { maxLabelChars } : {}),
    },
  }
}

function renderNode(node: NodeDef, theme: Theme): HTMLElement {
  // Instance interactivo para forzar aria-label.
  const instance: NodeInstance = {
    state: 'unlockable',
    currentTier: 0,
  } as NodeInstance
  const onClick = (): void => {
    /* noop: só para forzar handler aria-label/tabIndex */
  }
  const { container } = render(
    <ThemeProvider theme={theme}>
      <svg role="img" aria-label="t">
        <SkillNode node={node} instance={instance} position={{ x: 0, y: 0 }} onClick={onClick} />
      </svg>
    </ThemeProvider>,
  )
  return container
}

const LONG_LABEL = 'Capstone project'
const SHORT_LABEL = 'Web'

describe('SkillNode — maxLabelChars (opt-in)', () => {
  it('default (token undefined) + etiqueta longa: sen truncar, sen <title>', () => {
    const c = renderNode({ id: 'n1', type: 'keystone', label: LONG_LABEL }, makeTheme())
    const labelText = c.querySelector('text.yf-skill-node__label')
    expect(labelText?.textContent).toBe(LONG_LABEL)
    expect(c.querySelector('g.yf-skill-node > title')).toBeNull()
  })

  it('maxLabelChars=8 + etiqueta longa: trunca a 8 + "…" e engade <title> co texto completo', () => {
    const c = renderNode({ id: 'n1', type: 'keystone', label: LONG_LABEL }, makeTheme(8))
    const labelText = c.querySelector('text.yf-skill-node__label')
    const visible = labelText?.textContent ?? ''
    // "Capstone" + "…" = 9 chars; remata en "…"; length ≤ 9.
    expect(visible.endsWith('…')).toBe(true)
    expect(visible.length).toBeLessThanOrEqual(9)
    // <title> co texto completo, fillo do <g> principal.
    const titleEl = c.querySelector('g.yf-skill-node > title')
    expect(titleEl).not.toBeNull()
    expect(titleEl?.textContent).toBe(LONG_LABEL)
    // aria-label conserva o texto completo (formatAriaLabel non se tocou).
    const g = c.querySelector('g.yf-skill-node')
    expect(g?.getAttribute('aria-label')).toContain(LONG_LABEL)
  })

  it('maxLabelChars=8 + etiqueta CURTA: sen truncar, sen <title>', () => {
    const c = renderNode({ id: 'n2', type: 'small', label: SHORT_LABEL }, makeTheme(8))
    const labelText = c.querySelector('text.yf-skill-node__label')
    expect(labelText?.textContent).toBe(SHORT_LABEL)
    expect(c.querySelector('g.yf-skill-node > title')).toBeNull()
  })

  it('maxLabelChars=0 + etiqueta longa: tratado como apagado (sen truncar, sen <title>)', () => {
    const c = renderNode({ id: 'n1', type: 'keystone', label: LONG_LABEL }, makeTheme(0))
    const labelText = c.querySelector('text.yf-skill-node__label')
    expect(labelText?.textContent).toBe(LONG_LABEL)
    expect(c.querySelector('g.yf-skill-node > title')).toBeNull()
  })
})
// ── FIN: tests SkillNode — maxLabelChars ──
