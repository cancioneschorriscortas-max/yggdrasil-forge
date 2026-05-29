---
'@yggdrasil-forge/storage': patch
---

feat(storage): add StorageAdapter interface (sub-phase 3.1)

Interface `StorageAdapter` exportada desde `@yggdrasil-forge/storage` segundo MASTER §21. Define o contrato uniforme para backends de almacenamento: `get`, `set`, `delete`, `list`, `clear`, `watch?`. Cada método devolve `Promise<Result<T>>` para manexo explícito de erros. Dependencia nova: `@yggdrasil-forge/common` (workspace:*). Implementacións concretas (MemoryStorage, LocalStorage, etc.) vén en sub-fases 3.2-3.4.
