// ── INICIO: ThemeSpec ──
// **O tema visual como DATO DO DOCUMENTO** (7.5e).
//
// Antes de 7.5e, o tema vivía como estado local dun compoñente
// React (ThemeLab illado do example). Iso significaba:
//   - Non pasaba polo motor → sen undo/redo.
//   - Non serializaba → perdíase ao gardar.
//   - Non era compatible entre consumidores.
//
// Agora `theme` é un campo opcional en `DocumentMeta` xunto ao
// `background`. Aplícanse as tres consecuencias:
//   1. Undo/redo automático (History via History Manager).
//   2. Serialización de balde (JsonDocumentAdapter serializa `meta`
//      como obxecto; test de round-trip específico).
//   3. Portable: outros consumidores (Tauri, CLI) poden lerlo tamén.
//
// **Same Data. Different Themes.** — o TreeDef segue portable
// (dato do dominio); o tema é presentación, vive no editor namespace
// do ficheiro.
//
// **Headless**: cero dependencia de react. `ThemeSpec` é un tipo puro;
// o mapeo a `Theme` (de @react) faise no consumidor.

/**
 * Estados visuais dos nodos que o tema pode rechear. Corresponden
 * aos `nodeFill<Estado>` de `packages/react/src/theme-types.ts`.
 */
export type ThemeNodeState = 'locked' | 'unlockable' | 'unlocked' | 'maxed' | 'inProgress'

/**
 * Tinte dunha rexión. **A pertenza é por tag**: os nodos con
 * `NodeDef.tags` que inclúan este `tag` renderízanse cun tinte de
 * fondo `color` (o renderer aplica opacidade baixa).
 *
 * A **creación** de rexións (definir novas rexións, borrar, renomear)
 * é doutra ferramenta futura (arco de creación). Aquí só se define
 * o tinte por rexión existente.
 */
export interface ThemeRegionTint {
  readonly id: string
  readonly label: string
  readonly tag: string
  /** CSS color string; o renderer aplícao con opacidade baixa. */
  readonly color: string
}

/**
 * Tema do documento. Capa de presentación separada do TreeDef.
 *
 * Todos os campos son opcionais: sen `nodeFills`/`regions` aplícase o
 * tema base (`minimal` de @react). Con `nodeFills` parcial, o que
 * falte cae ao base. O `preset` é informativo — a UI úsao para saber
 * de que preset partiu (rótulo, botón "restablecer") pero non afecta
 * ao render.
 */
export interface ThemeSpec {
  /** Recheo do corpo do nodo por estado. Parcial: o que falte cae ao tema base. */
  readonly nodeFills?: Partial<Record<ThemeNodeState, string>>
  /**
   * Cor do texto (label + progreso) e iconas dos nodos, e das
   * etiquetas de rexión. **Control directo do autor** — se non se
   * define, o editor escolle un valor lexible automaticamente
   * segundo o tema claro/escuro do seu chrome (7.8.1); fóra do
   * editor, cae ao tema base (`minimal`, texto escuro fixo).
   */
  readonly textColor?: string
  /**
   * Tintes de rexión. A CREACIÓN de rexións é doutra ferramenta
   * futura. Aquí só se define o tinte por rexión existente.
   */
  readonly regions?: readonly ThemeRegionTint[]
  /** Id do preset de partida (informativo, para a UI). */
  readonly preset?: string
}
// ── FIN: ThemeSpec ──
