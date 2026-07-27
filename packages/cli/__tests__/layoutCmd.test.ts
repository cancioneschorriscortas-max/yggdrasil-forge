// ── INICIO: tests ygg layout (7.16, Cambio 3) ──
// O pipeline IA sen GUI: xerar → validate → layout → importar.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type CliIO, run } from '../src/cli.js'
import { layoutDocumentText } from '../src/layoutCmd.js'
import { validateDocumentText } from '../src/validate.js'

const GALLERY = join(__dirname, '..', '..', '..', 'examples', 'gallery')

interface FakeIO extends CliIO {
  readonly out: () => string
  readonly err: () => string
}
function makeIO(stdin = ''): FakeIO {
  let out = ''
  let err = ''
  return {
    readStdin: () => Promise.resolve(stdin),
    stdout: (t) => {
      out += t
    },
    stderr: (t) => {
      err += t
    },
    out: () => out,
    err: () => err,
  }
}

/** Árbore SEN posicións (o caso que motivou o arco enteiro). */
function treeSenPosicions(): string {
  return JSON.stringify({
    tree: {
      id: 'ia-sen-pos',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: { gl: 'Sen posicións' },
      groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['a', 'b'] }],
      nodes: [
        { id: 'a', type: 'small', label: { gl: 'a' } },
        { id: 'b', type: 'small', label: { gl: 'b' } },
        { id: 'c', type: 'keystone', label: { gl: 'c' } },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
      ],
      layout: { type: 'custom' },
    },
    editor: { formatVersion: '1.0.0' },
  })
}

describe('ygg layout — exit codes e gramática', () => {
  it('sen --algo → exit 2', async () => {
    const io = makeIO(treeSenPosicions())
    expect(await run(['layout', '-'], io)).toBe(2)
    expect(io.err()).toMatch(/--algo/)
  })

  it('--algo descoñecido → exit 2', async () => {
    const io = makeIO(treeSenPosicions())
    expect(await run(['layout', '-', '--algo', 'force-directed'], io)).toBe(2)
  })

  it('JSON roto → exit 1 con mensaxe', async () => {
    const io = makeIO('{ isto non')
    expect(await run(['layout', '-', '--algo', 'tree'], io)).toBe(1)
    expect(io.err()).toMatch(/non se puido dispor/)
  })

  it('★ árbore sen posicións → TODAS postas → ygg validate verde', async () => {
    const io = makeIO(treeSenPosicions())
    expect(await run(['layout', '-', '--algo', 'tree'], io)).toBe(0)
    const output = io.out()
    const doc = JSON.parse(output) as {
      tree: { nodes: readonly { id: string; position?: unknown }[] }
    }
    for (const node of doc.tree.nodes) {
      expect(node.position, `nodo ${node.id} debe quedar colocado`).toBeDefined()
    }
    // O resultado pasa a validación completa.
    expect(validateDocumentText(output).ok).toBe(true)
  })
})

describe('ygg layout — determinismo e galería', () => {
  it('★ determinista: dúas execucións → mesmo JSON byte a byte', () => {
    const text = readFileSync(join(GALLERY, 'gaia-cards.json'), 'utf8')
    const a = layoutDocumentText(text, 'clustered-radial')
    const b = layoutDocumentText(text, 'clustered-radial')
    expect(a.ok).toBe(true)
    expect(a.output).toBe(b.output)
  })

  it('cada algoritmo × panadeiro.json → ok e validate verde (sonda A.6.9)', () => {
    const text = readFileSync(join(GALLERY, 'panadeiro.json'), 'utf8')
    for (const algo of ['radial', 'tree', 'clustered-radial', 'constellation'] as const) {
      const result = layoutDocumentText(text, algo)
      expect(result.ok, `${algo}: ${result.error ?? ''}`).toBe(true)
      expect(validateDocumentText(result.output ?? '').ok).toBe(true)
    }
  })

  it('--out escribe a ficheiro (via run)', async () => {
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(join(tmpdir(), 'ygg-layout-'))
    const outFile = join(dir, 'colocada.json')
    const io = makeIO(treeSenPosicions())
    expect(await run(['layout', '-', '--algo', 'radial', '--out', outFile], io)).toBe(0)
    const written = readFileSync(outFile, 'utf8')
    expect(validateDocumentText(written).ok).toBe(true)
  })
})
// ── FIN: tests ygg layout ──
