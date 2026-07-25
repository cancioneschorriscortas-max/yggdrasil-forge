// ── INICIO: tests de fontanería Proba↔Canvas (regresión 7.14-A) ──
// A regresión (informes 03/04): o panel Canvas persistente conservaba
// unha probaSession obsoleta e nunca reflectía a sesión de Proba.
// Estes tests bloquean o contrato de 7.6 a nivel de paso de props
// (jsdom vale — non é xeometría de canvas):
//
//   1. EditorCanvas cunha sesión activa renderiza os nodos co ESTADO
//      DA SESIÓN (recheos vivos), non co engine de render (todo
//      bloqueado). Cambiar de sesión (reset) fai que o canvas acompañe.
//   2. ShellRuntimeContext entrega a sesión aos consumidores E
//      actualízase cando cambia (é a canle que substitúe o closure
//      obsoleto de dockview).
//
// A integración completa (dockview + portais) verifícaa a spec E2E do
// Tester (informe 03) en navegador real.

import { fireEvent, render, screen } from '@testing-library/react'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { type JSX, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import type { ProbaSession } from '../src/proba/useProbaSession.js'
import { ShellRuntimeProvider, useShellRuntime } from '../src/shell/ShellRuntimeContext.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'proba-wiring',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    nodes: [
      // 'a' é raíz (sen prerequisitos nin custo) → desbloqueable de vez.
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
  const doc = createEditorDocument(tree, {
    coordinateBounds: { minX: -50, minY: -50, maxX: 150, maxY: 50 },
  })
  return new EditorEngine(doc)
}

function makeSession(engine: EditorEngine): ProbaSession {
  return { treeEngine: new TreeEngine(engine.getDocument().tree), reset: () => undefined }
}

function stateOf(container: HTMLElement, nodeId: string): string | null {
  return container.querySelector(`[data-node-id="${nodeId}"]`)?.getAttribute('data-state') ?? null
}

describe('7.14-A — EditorCanvas reflicte a sesión de Proba', () => {
  it('sen sesión: o nodo raíz está bloqueado (engine de render)', () => {
    const engine = buildEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} />)
    expect(stateOf(container, 'a')).toBe('locked')
  })

  it('★ con sesión: o canvas usa o engine DA SESIÓN (recheo vivo tras desbloquear)', async () => {
    const engine = buildEngine()
    const session = makeSession(engine)
    await session.treeEngine.unlock('a')
    // Sanidade: a sesión ten 'a' desbloqueado.
    expect(session.treeEngine.getSnapshot().nodes.a?.state).not.toBe('locked')

    const { container } = render(<EditorCanvas editorEngine={engine} probaSession={session} />)
    // O canvas debe pintar 'a' co estado da sesión, non 'locked'.
    expect(stateOf(container, 'a')).not.toBe('locked')
  })

  it('★ reset: cambiar a instancia de sesión fai que o canvas acompañe', async () => {
    const engine = buildEngine()
    const s1 = makeSession(engine)
    await s1.treeEngine.unlock('a')
    const { container, rerender } = render(<EditorCanvas editorEngine={engine} probaSession={s1} />)
    expect(stateOf(container, 'a')).not.toBe('locked')

    // Sesión fresca (como fai reset()) → 'a' volve bloqueado no canvas.
    const s2 = makeSession(engine)
    rerender(<EditorCanvas editorEngine={engine} probaSession={s2} />)
    expect(stateOf(container, 'a')).toBe('locked')
  })
})

describe('7.14-A — ShellRuntimeContext entrega e actualiza a sesión', () => {
  function Probe(): JSX.Element {
    const { probaSession } = useShellRuntime()
    return <div data-testid="probe">{probaSession === null ? 'sen-sesion' : 'con-sesion'}</div>
  }

  function Harness({ engine }: { engine: EditorEngine }): JSX.Element {
    const [session, setSession] = useState<ProbaSession | null>(null)
    return (
      <>
        <button type="button" onClick={() => setSession(makeSession(engine))}>
          activar
        </button>
        <ShellRuntimeProvider value={{ probaSession: session }}>
          <Probe />
        </ShellRuntimeProvider>
      </>
    )
  }

  it('propaga o cambio de sesión aos consumidores (portal-safe por deseño)', () => {
    const engine = buildEngine()
    render(<Harness engine={engine} />)
    expect(screen.getByTestId('probe').textContent).toBe('sen-sesion')
    fireEvent.click(screen.getByRole('button', { name: 'activar' }))
    expect(screen.getByTestId('probe').textContent).toBe('con-sesion')
  })
})
// ── FIN ──
