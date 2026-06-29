// ── INICIO: Selection ──
// Selección efímera (vive na Session). Modela referencias a 4 tipos
// de elementos: nodos, arestas, grupos, rexións.
//
// **Os 4 kinds desde xa** — v1 só edita nodos, pero a modelo non se
// reescribe cando se engadan tools para mover grupos / editar rexións
// (v1.2). O preview do mover grupo, p.ex., será unha Operation que
// expande o grupo a `Set<NodeRef>` no momento do drag.
//
// SubscribeOnly: a selección cambia sen tocar o documento (cero entrada
// na history). Subscribers son notificados con cero argumentos —
// chaman a `current()` para obter o estado fresco.

export type SelectionRef =
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'edge'; readonly id: string }
  | { readonly kind: 'group'; readonly id: string }
  | { readonly kind: 'region'; readonly id: string }

export interface SelectionEngine {
  current(): readonly SelectionRef[]
  isSelected(ref: SelectionRef): boolean
  replace(refs: readonly SelectionRef[]): void
  add(ref: SelectionRef): void
  remove(ref: SelectionRef): void
  toggle(ref: SelectionRef): void
  clear(): void
  subscribe(listener: () => void): () => void
}

/** Mesma identidade discrete (kind+id) é "a mesma" SelectionRef. */
function refKey(ref: SelectionRef): string {
  return `${ref.kind}:${ref.id}`
}

/** Factory: un SelectionEngine independente con estado mutable interno. */
export function createSelectionEngine(): SelectionEngine {
  // O mapa garda a referencia exacta (kind+id) e o seu obxecto canónico
  // (a primeira referencia que se inseriu); así current() devolve unha
  // lista estable.
  let entries: Map<string, SelectionRef> = new Map()
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of listeners) listener()
  }

  return {
    current(): readonly SelectionRef[] {
      return [...entries.values()]
    },
    isSelected(ref: SelectionRef): boolean {
      return entries.has(refKey(ref))
    },
    replace(refs: readonly SelectionRef[]): void {
      // Sempre dispara para semántica clara (mesmo replace co mesmo
      // conxunto: o consumidor decide se quere optimizar).
      entries = new Map()
      for (const r of refs) entries.set(refKey(r), r)
      notify()
    },
    add(ref: SelectionRef): void {
      const key = refKey(ref)
      if (entries.has(key)) return
      entries.set(key, ref)
      notify()
    },
    remove(ref: SelectionRef): void {
      const key = refKey(ref)
      if (!entries.has(key)) return
      entries.delete(key)
      notify()
    },
    toggle(ref: SelectionRef): void {
      const key = refKey(ref)
      if (entries.has(key)) entries.delete(key)
      else entries.set(key, ref)
      notify()
    },
    clear(): void {
      if (entries.size === 0) return
      entries = new Map()
      notify()
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
// ── FIN: Selection ──
