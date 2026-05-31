---
'@yggdrasil-forge/storage': minor
---

feat(storage): add SessionStorageAdapter and FileSystemAdapter (sub-phase 3.4)

`SessionStorageAdapter`: wrapper sobre `LocalStorageAdapter` con `globalThis.sessionStorage` como default. Cero duplicación de lóxica; herda automáticamente todos os arranxos futuros de LocalStorageAdapter. A semántica é idéntica salvo na duración (sessionStorage pérdese ao pechar a pestana).

`FileSystemAdapter`: cuarta implementación concreta de `StorageAdapter`. Usa OPFS (Origin Private File System) accesible via `navigator.storage.getDirectory()`. Soporte amplo: Chrome, Edge, Firefox, Safari, Opera (desde marzo 2023). `directoryName` obrigatorio no constructor; `storage` (StorageManager) opcional permite inxectar `opfs-mock` nos tests. Estrutura plana de ficheiros (cero subdirectorios); keys que conteñan `/` ou `\\` rexéitanse. Serialización JSON (asimetría con IndexedDBAdapter: rexeita undefined/BigInt/funcións/circular refs, idéntico a LocalStorageAdapter).

Interfaces `SessionStorageAdapterOptions` e `FileSystemAdapterOptions` exportadas. devDependency: `opfs-mock ^2.7.0` no catalog para tests.
