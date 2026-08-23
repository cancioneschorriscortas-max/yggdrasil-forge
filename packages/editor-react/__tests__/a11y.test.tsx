// ── INICIO: a11y do chrome do editor (auto-2, Fase 16.4) ──
// Garda permanente: cero violacións axe en cada panel e no shell
// enteiro. jsdom non mide contraste nin foco real — iso é gate visual
// (A.6.43); aquí vai o que si se pode automatizar: roles, nomes
// accesibles, labels de formulario, estrutura.

import { cleanup, render } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it } from 'vitest'
import { EditorShell } from '../src/EditorShell.js'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'
import { OutlinerPanel } from '../src/panels/OutlinerPanel.js'
import { ProblemsPanel } from '../src/panels/ProblemsPanel.js'
import { ThemePanel } from '../src/panels/ThemePanel.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'a11y',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'A11y' },
    groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['a'] }],
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'keystone', label: { gl: 'B' }, position: { x: 100, y: 0 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
  const engine = new EditorEngine(createEditorDocument(tree))
  // Con selección: o Inspector renderiza os seus campos (o caso denso).
  engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
  return engine
}

async function expectNoViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container)
  const msgs = results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`,
  )
  expect(msgs, msgs.join('\n')).toEqual([])
}

describe('A11y — cero violacións axe no chrome do editor', () => {
  it('EditorShell completo (TopBar con tema e Ficheiro, paneis, StatusBar)', async () => {
    const { container } = render(
      <EditorShell
        engine={buildEngine()}
        theme="light"
        onThemeChange={() => undefined}
        documentActions={{
          onNew: () => undefined,
          onImport: () => undefined,
          onExport: () => undefined,
        }}
      />,
    )
    await expectNoViolations(container)
  })

  it('EditorCanvas en grafo (toolbar, Dispor, toggle de vista)', async () => {
    const { container } = render(<EditorCanvas editorEngine={buildEngine()} />)
    await expectNoViolations(container)
  })

  it('EditorCanvas en tarxetas', async () => {
    const { container } = render(<EditorCanvas editorEngine={buildEngine()} view="cards" />)
    await expectNoViolations(container)
  })

  it('InspectorPanel cun nodo seleccionado', async () => {
    const { container } = render(<InspectorPanel editorEngine={buildEngine()} />)
    await expectNoViolations(container)
  })

  it('ThemePanel (fichas, recheos, rexións, fondo)', async () => {
    const { container } = render(<ThemePanel editorEngine={buildEngine()} />)
    await expectNoViolations(container)
  })

  it('Estrutura + Problemas', async () => {
    const engine = buildEngine()
    const { container } = render(
      <>
        <OutlinerPanel engine={engine} />
        <ProblemsPanel engine={engine} />
      </>,
    )
    await expectNoViolations(container)
  })
})
// ── FIN: a11y do chrome do editor ──
