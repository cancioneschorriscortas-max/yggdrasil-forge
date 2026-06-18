// ── INICIO: icons/builtin ──
// Re-export do iconset starter (F10.5).
//
// Nota arquitectónica: a *data* (`BUILTIN_ICONS`) e o *auto-rexistro*
// viven en `registry.ts` (F10.5 fix-tree-shake), porque
// `package.json` `"sideEffects": false` fai que un bare import como
// `import './builtin.js'` sexa tree-shaken polos bundlers. Mover o
// rexistro a `registry.ts` (módulo que `SkillNode` xa importa para
// `getIcon`) garante que o top-level se execute sempre.
//
// Este módulo conservase como punto de import explícito para
// consumidores que queiran a constante `BUILTIN_ICONS` sen pasar
// polo barrel.

export { BUILTIN_ICONS } from './registry.js'
// ── FIN: icons/builtin ──
