// ── INICIO: MigrationRegistry ──
// Almacén de migracións dispoñibles. Sub-fase 3.5.

import type { Migration } from './Migration.js'

/**
 * Rexistro de migracións por par (from, to). Usado polo
 * MigrationRunner para resolver paths de migración.
 */
export class MigrationRegistry {
  // Map<from, Map<to, Migration>> para acceso eficiente por pares.
  private readonly migrations = new Map<string, Map<string, Migration>>()

  /**
   * Rexistra unha migración. Sobreescribe se xa existía unha co
   * mesmo (from, to). Devolve a propia instancia para permitir chaining.
   */
  register(migration: Migration): this {
    let toMap = this.migrations.get(migration.from)
    if (toMap === undefined) {
      toMap = new Map()
      this.migrations.set(migration.from, toMap)
    }
    toMap.set(migration.to, migration)
    return this
  }

  /**
   * Recupera unha migración directa entre dúas versións.
   * Devolve undefined se non existe.
   */
  find(from: string, to: string): Migration | undefined {
    return this.migrations.get(from)?.get(to)
  }

  /**
   * Devolve todas as migracións cuxo `from` coincide.
   * Útil para resolución de path no Runner.
   */
  findFrom(from: string): readonly Migration[] {
    const toMap = this.migrations.get(from)
    if (toMap === undefined) return []
    return Array.from(toMap.values())
  }

  /**
   * Indica se o rexistro está baleiro (cero migracións).
   */
  isEmpty(): boolean {
    return this.migrations.size === 0
  }

  /**
   * Conta total de migracións rexistradas.
   */
  size(): number {
    let total = 0
    for (const toMap of this.migrations.values()) {
      total += toMap.size
    }
    return total
  }
}
// ── FIN: MigrationRegistry ──
