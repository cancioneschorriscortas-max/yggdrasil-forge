// ── INICIO: ShellRuntimeContext ──
// **Fix 7.14-A — regresión de Proba.**
//
// Contexto para o estado VOLÁTIL do shell que os paneis do canvas
// necesitan en vivo: a sesión de Proba e o tema do chrome.
//
// **Por que existe** (autopsia da regresión): desde 7.7 (eliminar
// `key={mode}`) + 7.7c (reconciliación de paneis), os paneis de
// dockview NON se remontan ao alternar Autoría↔Proba. O panel `canvas`
// está presente en TODOS os modos, así que a reconciliación (que só
// engade/quita paneis) nunca o recrea; dockview tampouco refresca o
// closure do seu `component` cando cambia o mapa `components`. Resultado:
// o `EditorCanvas` quedaba renderizando para sempre coa `probaSession`
// capturada no primeiro montaxe (null) → o canvas nunca entraba en
// Proba (recheos non cambiaban, edición seguía activa), e `reset()`
// (nova sesión) non chegaba nin ao canvas nin ao ProbaPanel.
//
// **Por que Context**: dockview-react 6.6.1 renderiza os paneis por
// `createPortal` (reactPortalStore), e os portais PRESERVAN o contexto
// de React desde onde se definen na árbore (dentro de `<DockviewReact>`,
// baixo este Provider). Así, aínda que o panel non se recree, ao mudar
// o valor do contexto os seus consumidores (EditorCanvas/ProbaPanel)
// re-renderízanse co valor vivo. `engine` NON vai aquí: só cambia ao
// substituír documento, e iso xa remonta o shell enteiro (key=docEpoch
// na app), recreando os paneis con closures frescos.

import { createContext, useContext } from 'react'
import type { ProbaSession } from '../proba/useProbaSession.js'

export interface ShellRuntime {
  /** Sesión de Proba activa (null en Autoría). */
  readonly probaSession: ProbaSession | null
  /** Tema do chrome (claro/escuro). undefined = comportamento por defecto. */
  readonly chromeTheme?: 'light' | 'dark'
}

const ShellRuntimeContext = createContext<ShellRuntime>({ probaSession: null })

export const ShellRuntimeProvider = ShellRuntimeContext.Provider

/** Le o estado volátil do shell (sesión de Proba + tema) en vivo. */
export function useShellRuntime(): ShellRuntime {
  return useContext(ShellRuntimeContext)
}
// ── FIN: ShellRuntimeContext ──
