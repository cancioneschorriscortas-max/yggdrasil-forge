// ── INICIO: generateId ──
// Xerador de identificadores únicos para uso interno do motor.

/**
 * Contador monotónico interno para garantir unicidade aínda dentro
 * do mesmo milisegundo.
 */
let counter = 0

/**
 * Xera un identificador único.
 *
 * Formato: `{prefix}_{timestamp36}_{counter36}_{random36}`
 *
 * Non é criptográficamente seguro — é só para identificar entidades
 * internas (audit entries, snapshots, etc.) de forma única.
 *
 * @param prefix - Prefixo descriptivo (ex: 'audit', 'build', 'snapshot')
 *
 * @example
 * generateId('audit')  // 'audit_lm3k2p_0_4f9x'
 * generateId('build')  // 'build_lm3k2p_1_a82c'
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const count = (counter++).toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${timestamp}_${count}_${random}`
}

/**
 * Reinicia o contador interno. Só para uso en tests.
 */
export function resetIdCounter(): void {
  counter = 0
}
// ── FIN: generateId ──
