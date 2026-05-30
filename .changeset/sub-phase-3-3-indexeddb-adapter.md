---
'@yggdrasil-forge/storage': minor
---

feat(storage): add IndexedDBAdapter with native structured clone (sub-phase 3.3)

`IndexedDBAdapter`: terceira implementación concreta de `StorageAdapter`. Wrapper sobre IndexedDB nativo con apertura lazy (constructor sync, BD ábrese na primeira operación). Soporta valores arbitrarios via structured clone nativo (Date, Map, Set, ArrayBuffer, undefined). Capacidade superior a localStorage (≥50MB típico). Cero `watch` (IndexedDB sen observador nativo intra-database). `databaseName` obrigatorio no constructor; `factory` opcional permite inxectar fake-indexeddb nos tests sen jsdom. `IndexedDBAdapterOptions` interface exportada. devDependency: `fake-indexeddb ^6.2.5` no catalog para tests.
