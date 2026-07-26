// ── INICIO: tests CodePanel (7.15b) ──
// A máquina de estados sincronizado/borrador é o que se proba aquí.
// CodeEditor (o contedor de CodeMirror) MOCKÉASE cun <textarea>:
// CM6 necesita APIs de medición que jsdom non ten, e a regra de
// contención (un só ficheiro importa CodeMirror) fai o mock trivial.
// O interior real de CodeMirror (sintaxe, franxas, plegado) vai ao
// gate visual do dono + E2E do Tester (A.6.43).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  addNode,
  createEditorDocument,
  serializeDocument,
} from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock do contedor de CodeMirror: textarea que respeta o contrato
// value/onUserEdit (e expón sections/errorLine para asertar).
vi.mock('../src/panels/code/CodeEditor.js', () => ({
  CodeEditor: ({
    value,
    onUserEdit,
    errorLine,
  }: {
    value: string
    onUserEdit: (t: string) => void
    errorLine?: number
  }) => (
    <textarea
      aria-label="editor de código (mock)"
      data-error-line={errorLine ?? ''}
      value={value}
      onChange={(e) => onUserEdit(e.target.value)}
    />
  ),
}))

import { CodePanel } from '../src/panels/code/CodePanel.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'code-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Código test' },
    nodes: [{ id: 'a', type: 'small', label: { gl: 'a' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

const textareaOf = (): HTMLTextAreaElement =>
  screen.getByLabelText('editor de código (mock)') as HTMLTextAreaElement

function validTreeBText(): string {
  const tree: TreeDef = {
    id: 'code-test-b',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'B' },
    nodes: [
      { id: 'b1', type: 'small', label: { gl: 'b1' }, position: { x: 0, y: 0 } },
      { id: 'b2', type: 'small', label: { gl: 'b2' }, position: { x: 80, y: 0 } },
    ],
    edges: [{ id: 'e1', source: 'b1', target: 'b2', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
  return serializeDocument(createEditorDocument(tree))
}

describe('CodePanel — modo sincronizado', () => {
  it('amosa o documento serializado e a lenda das seccións', () => {
    render(<CodePanel editorEngine={buildEngine()} />)
    expect(textareaOf().value).toContain('"id": "code-test"')
    const legend = screen.getByLabelText('Lenda de seccións do código')
    for (const label of ['Identidade', 'Nodos', 'Arestas', 'Recursos', 'Tema/editor']) {
      expect(legend.textContent).toContain(label)
    }
    // Sen banner de borrador.
    expect(screen.queryByText(/xa non segue o canvas/)).toBeNull()
  })

  it('★ actualízase en vivo tras un commit do motor (debounce)', async () => {
    vi.useFakeTimers()
    try {
      const engine = buildEngine()
      render(<CodePanel editorEngine={engine} />)
      act(() => {
        engine.transaction({ gl: 'add' }, (tx) =>
          tx.apply(
            addNode({
              id: 'novo',
              type: 'small',
              label: { gl: 'novo' },
              position: { x: 50, y: 50 },
            } as TreeDef['nodes'][number]),
          ),
        )
      })
      // Antes do debounce aínda non; despois si.
      expect(textareaOf().value).not.toContain('"novo"')
      await act(async () => {
        vi.advanceTimersByTime(200)
      })
      expect(textareaOf().value).toContain('"novo"')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('CodePanel — borrador (teclear conxela a sync)', () => {
  it('★ teclear entra en borrador e os commits do motor XA NON pisan o texto', async () => {
    vi.useFakeTimers()
    try {
      const engine = buildEngine()
      render(<CodePanel editorEngine={engine} />)
      act(() => {
        fireEvent.change(textareaOf(), { target: { value: '{ "meu": "borrador" }' } })
      })
      // Banner visible.
      expect(screen.getByText(/xa non segue o canvas/)).toBeDefined()

      // Commit do motor mentres hai borrador → aviso, texto INTACTO.
      act(() => {
        engine.transaction({ gl: 'add' }, (tx) =>
          tx.apply(
            addNode({
              id: 'porbaixo',
              type: 'small',
              label: { gl: 'x' },
              position: { x: 9, y: 9 },
            } as TreeDef['nodes'][number]),
          ),
        )
      })
      await act(async () => {
        vi.advanceTimersByTime(300)
      })
      expect(textareaOf().value).toBe('{ "meu": "borrador" }')
      expect(screen.getByText(/o documento cambiou desde que empezaches/)).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('Validar cun JSON roto lista issues e Aplicar segue apagado', () => {
    render(<CodePanel editorEngine={buildEngine()} />)
    act(() => {
      fireEvent.change(textareaOf(), { target: { value: '{ isto non é json' } })
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Validar' }))
    })
    expect(screen.getAllByText(/erro/).length).toBeGreaterThan(0)
    expect((screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('Validar cun doc san sinala ✓ e habilita Aplicar', () => {
    render(<CodePanel editorEngine={buildEngine()} />)
    act(() => {
      fireEvent.change(textareaOf(), { target: { value: validTreeBText() } })
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Validar' }))
    })
    expect(screen.getByText(/Documento san/)).toBeDefined()
    expect((screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('editar tras Validar invalida a validación (Aplicar apágase)', () => {
    render(<CodePanel editorEngine={buildEngine()} />)
    act(() => {
      fireEvent.change(textareaOf(), { target: { value: validTreeBText() } })
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Validar' }))
    })
    act(() => {
      fireEvent.change(textareaOf(), { target: { value: '{ "cambiado": 1 }' } })
    })
    expect((screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('★ Aplicar substitúe o documento (replaceDocument), limpa selección e volve a sincronizado; un undo devolve o anterior', () => {
    const engine = buildEngine()
    engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
    render(<CodePanel editorEngine={engine} />)
    act(() => {
      fireEvent.change(textareaOf(), { target: { value: validTreeBText() } })
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Validar' }))
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    })
    // Documento substituído...
    expect(engine.getDocument().tree.id).toBe('code-test-b')
    // ...selección limpa (os ids vellos non existen no doc novo)...
    expect(engine.getSession().selection.current()).toHaveLength(0)
    // ...e o panel volve a sincronizado co texto novo.
    expect(screen.queryByText(/xa non segue o canvas/)).toBeNull()
    expect(textareaOf().value).toContain('"code-test-b"')
    // Un undo devolve o documento anterior enteiro.
    engine.undo()
    expect(engine.getDocument().tree.id).toBe('code-test')
  })

  it('Descartar tira o borrador e resincroniza', () => {
    const engine = buildEngine()
    render(<CodePanel editorEngine={engine} />)
    act(() => {
      fireEvent.change(textareaOf(), { target: { value: 'lixo calquera' } })
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    })
    expect(screen.queryByText(/xa non segue o canvas/)).toBeNull()
    expect(textareaOf().value).toContain('"id": "code-test"')
  })
})
// ── FIN: tests CodePanel ──
