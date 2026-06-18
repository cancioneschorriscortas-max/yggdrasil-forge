// ── INICIO: icons/registry ──
// Rexistro de iconos SVG recoloreables (F10.5).
//
// Patrón: singleton `Symbol.for(globalThis)`, idéntico a `ThemeContext`
// (A.6.17). Razón: este paquete ten múltiples entry points (/index e
// /headless). Cada entry compílase como bundle independente; un Map a
// nivel de módulo crearía dous rexistros distintos, e os iconos
// rexistrados nun bundle non se verían dende o outro. O Symbol.for
// resolve a unha única instancia global compartida (MASTER A.6.21).
//
// F10.5 fix-tree-shake: o auto-rexistro de BUILTIN_ICONS vive aquí
// mesmo, en top-level, en lugar de en `builtin.ts` cun side-effect
// import. Con `package.json` `"sideEffects": false`, esbuild/tsup
// eliminan os bare imports, polo que un `import './builtin.js'`
// dende o barrel sería tree-shaken (e os builtins non se rexistraban
// en runtime). Como `SkillNode` importa `getIcon` deste módulo, o
// módulo cárgase sempre que se usa o paquete; o top-level execútase;
// os builtins rexistráns idempotentemente.

/**
 * Un path SVG dunha icona. Cada path pode pintarse en modo fill
 * (relleno coa cor actual) ou stroke (trazado coa cor actual, sen
 * relleno).
 */
export interface IconPath {
  readonly d: string
  readonly mode?: 'fill' | 'stroke'
}

/**
 * Definición dunha icona SVG recoloreable. Datos puros (sen
 * ReactNode), polo que serializables e re-rexistrables.
 *
 * `viewBox` default `'0 0 24 24'`. Cada path renderízase con
 * `fill="currentColor"` (mode `'fill'`) ou `stroke="currentColor"`
 * (mode `'stroke'`), permitindo que un wrapper que estableza
 * `color` no `<svg>`/`<g>` ascendente recoloree o icono inteiro.
 */
export interface IconDef {
  readonly viewBox?: string
  readonly paths: readonly IconPath[]
}

// Clave global do rexistro. Use the same pattern as ThemeContext:
// Symbol.for ensures cross-bundle identity within the same realm.
const REGISTRY_KEY = Symbol.for('@yggdrasil-forge/react#IconRegistry')

type GlobalWithReg = { [REGISTRY_KEY]?: Map<string, IconDef> }
const store = globalThis as unknown as GlobalWithReg

function resolveRegistry(): Map<string, IconDef> {
  const existing = store[REGISTRY_KEY]
  if (existing !== undefined) return existing
  const created = new Map<string, IconDef>()
  store[REGISTRY_KEY] = created
  return created
}

const registry: Map<string, IconDef> = resolveRegistry()

/**
 * Iconset starter (F10.5). Arte funcional: paths simples 24×24 que
 * recolorean co tema. Refinar/ampliar a arte é dominio visual do
 * consumidor; o valor durable é a *arquitectura* (rexistro + recolor).
 */
export const BUILTIN_ICONS: Readonly<Record<string, IconDef>> = {
  'crossed-swords': {
    paths: [{ d: 'M4 4 L20 20 M20 4 L4 20', mode: 'stroke' }],
  },
  shield: {
    paths: [{ d: 'M12 2 L20 5 V11 C20 16.5 12 22 12 22 C12 22 4 16.5 4 11 V5 Z', mode: 'fill' }],
  },
  sparkle: {
    paths: [{ d: 'M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z', mode: 'fill' }],
  },
  arrow: {
    paths: [{ d: 'M5 19 L19 5 M10 5 H19 V14', mode: 'stroke' }],
  },
  gem: {
    paths: [{ d: 'M12 3 L19 12 L12 21 L5 12 Z', mode: 'fill' }],
  },
  bolt: {
    paths: [{ d: 'M13 2 L4 14 H11 L9 22 L20 9 H13 Z', mode: 'fill' }],
  },
}

// Auto-rexistro dos builtins ao cargar o módulo (top-level).
// Idempotente: o Map é o singleton global compartido, polo que esta
// asignación non duplica nin pisa entradas customizadas dun consumidor
// que xa rexistrara con outros valores (last-write-wins é a semántica
// declarada; isto execútase unha soa vez por bundle/realm).
for (const [id, def] of Object.entries(BUILTIN_ICONS)) {
  if (!registry.has(id)) registry.set(id, def)
}

/**
 * Rexistra unha icona co seu `id`. Sobrescribe se xa existía (último
 * gaña; idiomático para que un consumidor poida customizar builtins).
 */
export function registerIcon(id: string, def: IconDef): void {
  registry.set(id, def)
}

/**
 * Rexistra múltiples iconas dunha vez. Útil para iconsets enteiros.
 */
export function registerIcons(record: Readonly<Record<string, IconDef>>): void {
  for (const [id, def] of Object.entries(record)) {
    registry.set(id, def)
  }
}

/**
 * Obtén unha icona polo seu `id`. Devolve `undefined` se non existe.
 */
export function getIcon(id: string): IconDef | undefined {
  return registry.get(id)
}

/**
 * `true` se hai unha icona rexistrada con ese `id`.
 */
export function hasIcon(id: string): boolean {
  return registry.has(id)
}
// ── FIN: icons/registry ──
