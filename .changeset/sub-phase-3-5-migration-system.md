---
'@yggdrasil-forge/core': minor
---

feat(core): add migration system with AutoBackup (sub-phase 3.5)

Sistema de migracións de schema en `@yggdrasil-forge/core/engine/migrations/`: `Migration` interface (segundo MASTER §22), `MigrationRegistry` para rexistrar migracións, `MigrationRunner` con resolución de path greedy (salto máximo) e detección defensiva de ciclos, `AutoBackup` safety net que persiste estado pre-migración nun `BackupStorage` inxectado. `JsonSerializer.deserializeAsync` función nova que acepta `MigrationRegistry` opcional; cando presente e `schemaVersion` non coincide, intenta migrar antes de validar. `deserialize` sync mantense intacta (Caso B). Cero ErrorCodes novos: `MIGRATION_FAILED` e `NO_MIGRATION_PATH` xa existían en common.
