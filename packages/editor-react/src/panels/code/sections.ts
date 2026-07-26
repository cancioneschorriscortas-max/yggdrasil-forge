// ── INICIO: sections (7.15b, Decisión 3b) ──
// Cálculo dos RANGOS DE SECCIÓN do documento para as franxas de cor
// do gutter e a lenda: a que parte do ficheiro pertence cada liña.
//
// Usa `jsonc-parser` (pequeno, sen árbore de deps, tolerante a erros)
// sobre o TEXTO actual — non sobre o documento do motor, porque en
// modo borrador o texto pode divergir. Con JSON roto devolve o que
// poida (ou nada): as franxas apáganse, NUNCA crashea.
//
// Cero CodeMirror aquí: este módulo é puro texto → rangos de liña.

import { type Node as JsoncNode, parseTree } from 'jsonc-parser'

/** Seccións con cor propia (tokens --editor-code-sec-*). */
export type SectionKind = 'identity' | 'nodes' | 'edges' | 'resources' | 'editor'

export interface SectionRange {
  readonly kind: SectionKind
  /** Primeira liña do rango (1-based, inclusiva). */
  readonly fromLine: number
  /** Última liña do rango (1-based, inclusiva). */
  readonly toLine: number
}

/** Etiquetas da lenda, na orde canónica do ficheiro. */
export const SECTION_LEGEND: readonly { kind: SectionKind; label: string }[] = [
  { kind: 'identity', label: 'Identidade' },
  { kind: 'nodes', label: 'Nodos' },
  { kind: 'edges', label: 'Arestas' },
  { kind: 'resources', label: 'Recursos' },
  { kind: 'editor', label: 'Tema/editor' },
]

/** offset → liña 1-based, precomputando os inicios de liña unha vez. */
function buildLineIndex(text: string): (offset: number) => number {
  const starts: number[] = [0]
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) starts.push(i + 1)
  }
  return (offset: number): number => {
    // Busca binaria do último inicio <= offset.
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if ((starts[mid] as number) <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

function findProperty(objectNode: JsoncNode, name: string): JsoncNode | undefined {
  if (objectNode.type !== 'object' || objectNode.children === undefined) return undefined
  for (const prop of objectNode.children) {
    // Cada child dun object é un `property` con [keyNode, valueNode].
    const key = prop.children?.[0]
    if (key?.value === name) return prop
  }
  return undefined
}

/**
 * Calcula os rangos de sección do texto dun documento.
 *
 * Forma esperada: `{ tree: {...}, editor?: {...} }` (canónica) ou un
 * TreeDef pelado (compat). Dentro de `tree`: `nodes`/`edges`/`resources`
 * levan cor propia; o RESTO das claves da árbore son "identidade".
 * O namespace `editor` enteiro leva a súa cor.
 *
 * Con texto non parseable devolve `[]` (franxas apagadas).
 */
export function computeSectionRanges(text: string): readonly SectionRange[] {
  let root: JsoncNode | undefined
  try {
    root = parseTree(text)
  } catch {
    return []
  }
  if (root === undefined || root.type !== 'object') return []

  const toLine = buildLineIndex(text)
  const ranges: SectionRange[] = []

  const treeProp = findProperty(root, 'tree')
  // Compat TreeDef pelado: sen clave `tree`, o obxecto raíz É a árbore.
  const treeValue = treeProp?.children?.[1] ?? (findProperty(root, 'nodes') ? root : undefined)

  const pushRange = (kind: SectionKind, node: JsoncNode): void => {
    ranges.push({
      kind,
      fromLine: toLine(node.offset),
      toLine: toLine(node.offset + node.length),
    })
  }

  if (treeValue !== undefined && treeValue.type === 'object' && treeValue.children !== undefined) {
    const SECTION_BY_KEY: Record<string, SectionKind> = {
      nodes: 'nodes',
      edges: 'edges',
      resources: 'resources',
    }
    for (const prop of treeValue.children) {
      const key = prop.children?.[0]?.value
      if (typeof key !== 'string') continue
      pushRange(SECTION_BY_KEY[key] ?? 'identity', prop)
    }
  }

  const editorProp = findProperty(root, 'editor')
  if (editorProp !== undefined) pushRange('editor', editorProp)

  return ranges
}
// ── FIN: sections ──
