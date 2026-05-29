---
'@yggdrasil-forge/common': patch
'@yggdrasil-forge/core': patch
---

refactor(common): move Result type from core (sub-phase 3.0)

`Result<T, E>` type e helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`) movidos de `@yggdrasil-forge/core/types/` a `@yggdrasil-forge/common` como primitivo xenérico compartido. `@yggdrasil-forge/core/types/result.js` mantén re-export para cero ruptura dos imports existentes en core. Sub-fase preparatoria para Fase 3 (StorageAdapter en `@yggdrasil-forge/storage` agora pode importar Result sen depender de core).
