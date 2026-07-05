// ── INICIO: tests ProbaPanel (7.6) ──
// Cobre:
//   - useProbaSession: crea/descarta según modo; reset()
//   - Panel renderiza recursos, +/- chama grantResource
//   - Ficha do nodo con condicións e custo
//   - Botón unlock gated e habilitado cando corresponde
//   - Sonda de fluxo multi-rango (masa_dulce ×3)
//   - Modo Autoría→Proba→Autoría→Proba dá sesión fresca

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { NodeDef, TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProbaPanel } from '../src/proba/ProbaPanel.js'
import { useProbaSession } from '../src/proba/useProbaSession.js'
import type { EditorMode } from '../src/shell/useEditorMode.js'

afterEach(() => cleanup())

// ── Fixture: árbore panadeiro simplificada ──
function buildTree(): TreeDef {
  const nodes: NodeDef[] = [
    {
      id: 'farina',
      type: 'small',
      label: { en: 'Flour', gl: 'Fariña' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'masa_dulce',
      type: 'small',
      label: { en: 'Sweet dough', gl: 'Masa doce' },
      position: { x: 100, y: 0 },
      maxTier: 3,
      costPerTier: [
        [{ resourceId: 'farina', amount: 1 }],
        [{ resourceId: 'farina', amount: 2 }],
        [{ resourceId: 'farina', amount: 3 }],
      ],
    },
  ]
  return {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    resources: [{ id: 'farina', label: { en: 'Flour', gl: 'Fariña' }, initial: 0 }],
    nodes,
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

function buildEngine(): EditorEngine {
  return new EditorEngine(createEditorDocument(buildTree()))
}

// ── Harness: usa o hook fóra do componente para poder probar ciclos ──
function ProbaHarness({
  engine,
  sessionRef,
}: {
  engine: EditorEngine
  sessionRef?: { current: unknown }
}): JSX.Element {
  const [mode, setMode] = useState<EditorMode>('preview')
  const session = useProbaSession(engine, mode)
  if (sessionRef !== undefined) sessionRef.current = session
  return (
    <div>
      <button
        type="button"
        data-testid="toggle-mode"
        onClick={() => setMode(mode === 'preview' ? 'authoring' : 'preview')}
      >
        toggle
      </button>
      <span data-testid="mode">{mode}</span>
      <span data-testid="has-session">{session !== null ? 'yes' : 'no'}</span>
      {session !== null && <ProbaPanel editorEngine={engine} session={session} />}
    </div>
  )
}

describe('★ useProbaSession — ciclo de vida', () => {
  it('mode=authoring → sesión null', () => {
    const engine = buildEngine()
    function Harness(): JSX.Element {
      const session = useProbaSession(engine, 'authoring')
      return <span data-testid="s">{session === null ? 'null' : 'yes'}</span>
    }
    render(<Harness />)
    expect(screen.getByTestId('s').textContent).toBe('null')
  })

  it('mode=preview → sesión con TreeEngine', () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    expect(screen.getByTestId('has-session').textContent).toBe('yes')
  })

  it('★ Autoría→Proba→Autoría→Proba dá sesión fresca cada vez', async () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    // Comeza en preview. Concede recurso e desbloquea farina.
    const plusBtn = screen.getByRole('button', { name: /^\+ Fariña$/i })
    act(() => fireEvent.click(plusBtn))
    // Selecciona farina no motor de edición para poder verlle o botón.
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'farina' }]))
    const unlockBtn = await screen.findByRole('button', { name: /Desbloquear/i })
    act(() => fireEvent.click(unlockBtn))
    // Alterna a Autoría → sesión desaparece.
    act(() => fireEvent.click(screen.getByTestId('toggle-mode')))
    expect(screen.getByTestId('has-session').textContent).toBe('no')
    // Volve a Proba → sesión nova, farina bloqueada de novo, budget 0.
    act(() => fireEvent.click(screen.getByTestId('toggle-mode')))
    expect(screen.getByTestId('has-session').textContent).toBe('yes')
    // Amount de farina volveu a 0 (nova sesión, initial=0).
    const amounts = document.querySelectorAll('.editor-proba__resource-amount')
    expect(amounts[0]?.textContent).toBe('0')
  })
})

describe('★ ProbaPanel — recursos +/-', () => {
  it('renderiza filas de recursos con cantidade inicial 0', () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    // A label "Fariña" (gl) aparece na fila de recurso.
    const label = screen.getByText(/^Fariña$/)
    expect(label).toBeDefined()
    const amount = document.querySelector('.editor-proba__resource-amount')
    expect(amount?.textContent).toBe('0')
  })

  it('+ incrementa a cantidade', async () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    const plusBtn = screen.getByRole('button', { name: /^\+ Fariña$/i })
    act(() => fireEvent.click(plusBtn))
    await waitFor(() => {
      const amount = document.querySelector('.editor-proba__resource-amount')
      expect(amount?.textContent).toBe('1')
    })
  })

  it('− decrementa e clampa a 0', async () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    const minusBtn = screen.getByRole('button', { name: /^− Fariña$/i })
    // Sen fariña, − mantén en 0 (clamp).
    act(() => fireEvent.click(minusBtn))
    await waitFor(() => {
      const amount = document.querySelector('.editor-proba__resource-amount')
      expect(amount?.textContent).toBe('0')
    })
  })
})

describe('★ ProbaPanel — ficha do nodo', () => {
  it('sen selección → hint "clic nun nodo"', () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    expect(screen.getByText(/clic nun nodo/i)).toBeDefined()
  })

  it('con selección → mostra label + estado', () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'farina' }]))
    // Label "Fariña" aparece na ficha (ademais da fila de recurso).
    // A ficha ten unha clase específica, buscamos por dentro dela.
    const card = document.querySelector('.editor-proba__node-card')
    expect(card).not.toBeNull()
    expect(card?.textContent).toContain('Fariña')
    // Estado localizado.
    expect(card?.textContent).toMatch(/Desbloqueable|Bloqueado/i)
  })

  it('★★ sonda multi-rango: unlock ×3 sobre masa_dulce', async () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)

    // Primeiro desbloquea farina (raíz, sen custo).
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'farina' }]))
    const unlockFarina = await screen.findByRole('button', { name: /Desbloquear/i })
    act(() => fireEvent.click(unlockFarina))
    await act(async () => {
      await Promise.resolve()
    })

    // Selecciona masa_dulce.
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'masa_dulce' }]))

    // Iteración: dar fariña suficiente (1, 2, 3) e desbloquear rango a rango.
    const grantAndUnlock = async (rank: number): Promise<void> => {
      const plusBtn = screen.getByRole('button', { name: /^\+ Fariña$/i })
      for (let i = 0; i < rank; i++) {
        act(() => fireEvent.click(plusBtn))
      }
      // Flush microtasks: grantResource é async, e o `.catch` do
      // fire-and-forget non se resolve ata que o tick continúe. Sen
      // este flush, waitFor pode ver o botón aínda disabled porque
      // canUnlock aínda le budget vello. Coa promesa resolta, o
      // subscribe do treeEngine dispara e useSyncExternalStore
      // re-renderiza a ficha.
      await act(async () => {
        await Promise.resolve()
      })
      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Desbloquear|Subir rango/i })
        expect((btn as HTMLButtonElement).disabled).toBe(false)
      })
      const btn = screen.getByRole('button', { name: /Desbloquear|Subir rango/i })
      act(() => fireEvent.click(btn))
      await act(async () => {
        await Promise.resolve()
      })
    }

    await grantAndUnlock(1) // rango 1
    // O estado do nodo agora é in_progress (ou unlocked) — instance.currentTier=1.
    await waitFor(() => {
      const card = document.querySelector('.editor-proba__node-card')
      expect(card?.textContent).toContain('Rango 1 de 3')
    })
    await grantAndUnlock(2) // rango 2
    await waitFor(() => {
      const card = document.querySelector('.editor-proba__node-card')
      expect(card?.textContent).toContain('Rango 2 de 3')
    })
    await grantAndUnlock(3) // rango 3 = maxed
    await waitFor(() => {
      const card = document.querySelector('.editor-proba__node-card')
      expect(card?.textContent).toContain('Rango 3 de 3')
    })
  })
})

describe('★ ProbaPanel — reset', () => {
  it('tras conceder e desbloquear, reset volve a estado inicial', async () => {
    const engine = buildEngine()
    render(<ProbaHarness engine={engine} />)
    // Da fariña.
    const plusBtn = screen.getByRole('button', { name: /^\+ Fariña$/i })
    act(() => fireEvent.click(plusBtn))
    await waitFor(() => {
      expect(document.querySelector('.editor-proba__resource-amount')?.textContent).toBe('1')
    })
    // Reset.
    const resetBtn = screen.getByRole('button', { name: /Reiniciar proba/i })
    act(() => fireEvent.click(resetBtn))
    await waitFor(() => {
      expect(document.querySelector('.editor-proba__resource-amount')?.textContent).toBe('0')
    })
  })
})

describe('★ Documento intacto tras Proba', () => {
  it('sesión ×N + unlock non muta o EditorDocument', async () => {
    const engine = buildEngine()
    const docBefore = engine.getDocument()
    const nodesBefore = docBefore.tree.nodes.length
    const edgesBefore = docBefore.tree.edges.length

    render(<ProbaHarness engine={engine} />)
    // Desbloquea farina.
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'farina' }]))
    const unlockBtn = await screen.findByRole('button', { name: /Desbloquear/i })
    act(() => fireEvent.click(unlockBtn))

    const docAfter = engine.getDocument()
    // Referencia PODE cambiar por commits internos do EditorEngine
    // (selección non muta), pero non hai que confiar niso. O que si
    // debe manterse: conta de nodos/arestas e integridade estrutural.
    expect(docAfter.tree.nodes.length).toBe(nodesBefore)
    expect(docAfter.tree.edges.length).toBe(edgesBefore)
    // Ningún nodo do documento leva estado (o TreeEngine da sesión
    // é aparte; o doc só ten defs).
    for (const n of docAfter.tree.nodes) {
      expect((n as { currentTier?: number }).currentTier).toBeUndefined()
    }
  })
})
// ── FIN: tests ProbaPanel ──
