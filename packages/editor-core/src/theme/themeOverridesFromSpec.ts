// ── INICIO: themeOverridesFromSpec (7.17, Cambio 0) ──
// O mapeo `DocumentMeta.theme → overrides de ThemeColors` extraído de
// EditorCanvas (@editor-react) SEN cambio de comportamento, para que o
// CLI (`ygg render`) e calquera consumidor headless o reutilicen.
//
// Devolve un record plano {campoDeThemeColors: cor}. Non importa tipos
// de @react (editor-core é headless): as claves son os NOMES dos
// campos de `ThemeColors` e o consumidor tipa ao aplicar
// (`{...base.colors, ...overrides}`).

import type { ThemeSpec } from '../document/ThemeSpec.js'

/**
 * Overrides de cores derivados do tema do documento.
 *
 * @param spec - O `meta.theme` do documento (ou undefined).
 * @param _dark - Base escollida polo consumidor (minimal/minimalDark).
 *   Reservado no contrato: HOXE os overrides do documento son os
 *   mesmos sobre ambas bases (gañan sempre sobre a base enteira);
 *   o parámetro existe para que futuros defaults dependentes da base
 *   non cambien a sinatura pública.
 */
export function themeOverridesFromSpec(
  spec: ThemeSpec | undefined,
  _dark: boolean,
): Record<string, string> {
  const fills = spec?.nodeFills ?? {}
  return {
    ...(spec?.textColor !== undefined && { text: spec.textColor }),
    ...(fills.locked !== undefined && { nodeFillLocked: fills.locked }),
    ...(fills.unlockable !== undefined && { nodeFillUnlockable: fills.unlockable }),
    ...(fills.unlocked !== undefined && { nodeFillUnlocked: fills.unlocked }),
    ...(fills.maxed !== undefined && { nodeFillMaxed: fills.maxed }),
    ...(fills.inProgress !== undefined && { nodeFillInProgress: fills.inProgress }),
  }
}
// ── FIN: themeOverridesFromSpec ──
