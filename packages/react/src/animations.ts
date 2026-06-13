// ── INICIO: animations ──
// Módulo interno: xera regras CSS de animación scopeadas por
// data-theme-id. Concatenado polo SVGRenderer ao output de tema
// dentro do <style> interno do SVG.
//
// **Nome de keyframes**: `yf-pulse` (global, NON scopeable con useId
// porque o output de useId non é un CSS identifier válido directo).
// Prefixo `yf-` reservado polo paquete.
//
// **Reduced motion (7.8)**: o bloque inclúe un override
// `@media (prefers-reduced-motion: reduce)` que aplica
// transition: none e animation: none aos elementos animados,
// respectando a preferencia do usuario.

/**
 * Devolve un string con regras CSS de animación scopeadas por
 * `[data-theme-id="${themeId}"]`. Diseñado para ser concatenado
 * ao output das regras de tema dentro do `<style>` interno do
 * SVGRenderer.
 *
 * Anima:
 * - Transitions de fill/stroke nos `.yf-skill-node__circle`.
 * - Hover en nodos clickables (`.yf-skill-node[role="button"]`).
 * - Pulse en `.yf-skill-node[data-state="unlockable"]`.
 * - Transitions de stroke nos `.yf-skill-edge`.
 *
 * En modo headless (cero tema), este módulo non se invoca (o
 * SVGRenderer non inxecta `<style>` cando theme === null).
 */
export function buildAnimationsCSS(themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  return `/* ANIMATION BLOCK START */
@keyframes yf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
${sel} .yf-skill-node__circle { transition: fill 0.3s ease, stroke 0.3s ease; }
${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { animation: yf-pulse 2s ease-in-out infinite; }
${sel} .yf-skill-node[role="button"] { cursor: pointer; transition: opacity 0.2s ease; }
${sel} .yf-skill-node[role="button"]:hover .yf-skill-node__circle { opacity: 0.9; }
${sel} .yf-skill-edge { transition: stroke 0.3s ease, stroke-width 0.3s ease; }
@media (prefers-reduced-motion: reduce) {
  ${sel} .yf-skill-node__circle,
  ${sel} .yf-skill-node[role="button"],
  ${sel} .yf-skill-edge {
    transition: none !important;
    animation: none !important;
  }
}
/* ANIMATION BLOCK END */`
}
// ── FIN: animations ──
