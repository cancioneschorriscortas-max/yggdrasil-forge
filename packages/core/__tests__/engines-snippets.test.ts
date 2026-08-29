// ── INICIO: sentinela dos snippets de motores (17.7) ──
// A CI non corre Godot nin Unity (honestidade A.6.43) — pero o que SI
// é testable, téstase: os camiños de campos que usan
// examples/engines/{godot-gdscript,unity-csharp} teñen que existir no
// schema publicado E no documento real da galería. Se o contrato
// renomea ou quita un campo, isto berra e os snippets revísanse.
// Cero cobertura finxida: isto NON proba que os scripts corran nos
// motores (iso vai á man, README de cada exemplo).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = path.resolve(__dirname, '../../..')
const schema = JSON.parse(
  readFileSync(path.join(raiz, 'schema/yggdrasil-document.schema.json'), 'utf8'),
)
const panadeiro = JSON.parse(
  readFileSync(path.join(raiz, 'examples/gallery/panadeiro.json'), 'utf8'),
)

// Os campos que os DOUS snippets len (mantido en sync á man cos
// exemplos — é unha lista curta a propósito).
const CAMPOS_USADOS = [
  'tree',
  'schemaVersion',
  'label',
  'resources',
  'initial',
  'nodes',
  'id',
  'costPerTier',
  'resourceId',
  'amount',
  'maxTier',
  'edges',
  'source',
  'target',
]

/** Recolle recursivamente todos os nomes de propiedade do schema. */
function propiedades(node: unknown, out: Set<string>): Set<string> {
  if (node === null || typeof node !== 'object') return out
  const obj = node as Record<string, unknown>
  if (typeof obj.properties === 'object' && obj.properties !== null) {
    for (const key of Object.keys(obj.properties)) out.add(key)
  }
  for (const value of Object.values(obj)) propiedades(value, out)
  return out
}

describe('snippets de motores — sentinela do contrato (17.7)', () => {
  it('cada campo que usan os snippets existe no schema publicado', () => {
    const declaradas = propiedades(schema, new Set<string>())
    for (const campo of CAMPOS_USADOS) {
      expect(declaradas.has(campo), `o schema xa non declara "${campo}"`).toBe(true)
    }
  })

  it('a estrutura que percorren os snippets aguanta no documento real', () => {
    // O mesmo percorrido que fan le_arbore.gd e LectorArbore.cs.
    const tree = panadeiro.tree
    expect(typeof tree.schemaVersion).toBe('string')
    expect(Array.isArray(tree.nodes)).toBe(true)
    expect(Array.isArray(tree.edges)).toBe(true)
    for (const recurso of tree.resources ?? []) {
      expect(recurso.id).toBeDefined()
      expect(recurso.label).toBeDefined()
    }
    const conCusto = tree.nodes.find(
      (n: { costPerTier?: unknown[] }) => n.costPerTier !== undefined,
    )
    expect(conCusto, 'a galería debe ter un nodo con costPerTier (úsano os snippets)').toBeDefined()
    const primeiroCusto = conCusto.costPerTier[0][0]
    expect(primeiroCusto.resourceId).toBeDefined()
    expect(primeiroCusto.amount).toBeDefined()
    for (const aresta of tree.edges) {
      expect(aresta.source).toBeDefined()
      expect(aresta.target).toBeDefined()
    }
  })
})
// ── FIN: sentinela dos snippets de motores ──
