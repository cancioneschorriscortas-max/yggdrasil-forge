// ── INICIO: 3.0 — re-export desde @yggdrasil-forge/common ──
// Result foi movido a common como primitivo xenérico compartido
// (sub-fase 3.0). Este re-export mantense por compatibilidade cos
// imports existentes en core (`../types/result.js`, `../types/index.js`).
// Novos paquetes deben importar directamente desde
// '@yggdrasil-forge/common'.
//
// Decisión documentada en MASTER §A.6 lección 3.0 L1.
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from '@yggdrasil-forge/common'
// ── FIN: 3.0 ──
