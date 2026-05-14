// ── INICIO: engine public API ──
// Exporta as pezas do motor.
// Por agora: EventEmitter, ConcurrencyGuard.
// Iranse engadindo TreeEngine, StateStore, etc. nas seguintes sub-fases.

export { EventEmitter, type Unsubscribe } from './EventEmitter.js'
export {
  ConcurrencyGuard,
  type ConcurrencyGuardOptions,
} from './ConcurrencyGuard.js'
// ── FIN: engine public API ──
