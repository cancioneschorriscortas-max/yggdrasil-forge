# @yggdrasil-forge/storage

## 0.1.0

### Minor Changes

- [`3658808`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/36588085092a183eed5642a12fad0bae854e866b) - feat(storage): add MemoryStorage backend (sub-phase 3.2.a)

  `MemoryStorage`: primeira implementación concreta de `StorageAdapter`. Backend en memoria sobre `Map<string, unknown>`. Cero serialización (acepta valores arbitrarios incluíndo Date, Map, Set, funcións). Soporta `watch` con notificación a múltiples callbacks; callback recibe `null` ao borrar a clave. Ideal para tests, SSR, contextos sen storage persistente.

- [`2e6998a`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2e6998a53dd390819a7da1b0f162f71561f44205) - feat(storage): add LocalStorageAdapter with JSON serialization (sub-phase 3.2.b)

  `LocalStorageAdapter`: segunda implementación concreta de `StorageAdapter`. Wrapper sobre `Storage` interface estándar (por defecto `globalThis.localStorage`) con serialización JSON automática. Acepta `Storage` inxectado no constructor para tests sen jsdom. Detecta `QuotaExceededError` multi-navegador (Chrome, Firefox, Safari, iOS) e mapéao a `STORAGE_QUOTA_EXCEEDED`. Valores corruptos no storage devolven `STORAGE_READ_FAILED`. `LocalStorageAdapterOptions` interface exportada. Script `test:coverage` engadido a storage.

- [`1528fa8`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1528fa8ef6432a96dcdc34f462817392188990ce) - feat(storage): add IndexedDBAdapter with native structured clone (sub-phase 3.3)

  `IndexedDBAdapter`: terceira implementación concreta de `StorageAdapter`. Wrapper sobre IndexedDB nativo con apertura lazy (constructor sync, BD ábrese na primeira operación). Soporta valores arbitrarios via structured clone nativo (Date, Map, Set, ArrayBuffer, undefined). Capacidade superior a localStorage (≥50MB típico). Cero `watch` (IndexedDB sen observador nativo intra-database). `databaseName` obrigatorio no constructor; `factory` opcional permite inxectar fake-indexeddb nos tests sen jsdom. `IndexedDBAdapterOptions` interface exportada. devDependency: `fake-indexeddb ^6.2.5` no catalog para tests.

- [`190fd98`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/190fd989299c0a78d139364a1d9b95af43b44653) - feat(storage): add SessionStorageAdapter and FileSystemAdapter (sub-phase 3.4)

  `SessionStorageAdapter`: wrapper sobre `LocalStorageAdapter` con `globalThis.sessionStorage` como default. Cero duplicación de lóxica; herda automáticamente todos os arranxos futuros de LocalStorageAdapter. A semántica é idéntica salvo na duración (sessionStorage pérdese ao pechar a pestana).

  `FileSystemAdapter`: cuarta implementación concreta de `StorageAdapter`. Usa OPFS (Origin Private File System) accesible via `navigator.storage.getDirectory()`. Soporte amplo: Chrome, Edge, Firefox, Safari, Opera (desde marzo 2023). `directoryName` obrigatorio no constructor; `storage` (StorageManager) opcional permite inxectar `opfs-mock` nos tests. Estrutura plana de ficheiros (cero subdirectorios); keys que conteñan `/` ou `\\` rexéitanse. Serialización JSON (asimetría con IndexedDBAdapter: rexeita undefined/BigInt/funcións/circular refs, idéntico a LocalStorageAdapter).

  Interfaces `SessionStorageAdapterOptions` e `FileSystemAdapterOptions` exportadas. devDependency: `opfs-mock ^2.7.0` no catalog para tests.

### Patch Changes

- [`c39b8d7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c39b8d7f18932e5b80ba0aaf72a8c4e22c9c5c4f) - feat(storage): add StorageAdapter interface (sub-phase 3.1)

  Interface `StorageAdapter` exportada desde `@yggdrasil-forge/storage` segundo MASTER §21. Define o contrato uniforme para backends de almacenamento: `get`, `set`, `delete`, `list`, `clear`, `watch?`. Cada método devolve `Promise<Result<T>>` para manexo explícito de erros. Dependencia nova: `@yggdrasil-forge/common` (workspace:\*). Implementacións concretas (MemoryStorage, LocalStorage, etc.) vén en sub-fases 3.2-3.4.

- Updated dependencies [[`b1ee18d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b1ee18d3da98f231d7a638fa919aeb54daa20e8f), [`1897fbf`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1897fbf5af9ac72a13990a28b5ee3041d30e2e9f), [`5d4cee5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5d4cee5d69ac860eaecff95a9274f497c9f7f099), [`cfafc76`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cfafc76e2b747e03d504fefb838c077c12b5ff87), [`1774a81`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1774a8166f98ce21de644cfe24a237ae2995f942), [`de16c01`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/de16c01fdcba47bc4f83348d911d9da2f3c5c14c), [`2a12ef7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2a12ef7a94b63c6f9bbfdc4e789780efe3e08293), [`cd61e7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd61e7e05e63d6e4d85c12c68216eb95c9e5ec16), [`b913aae`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b913aae47370495617522a0c34f34e01742a9d22)]:
  - @yggdrasil-forge/common@0.1.0
