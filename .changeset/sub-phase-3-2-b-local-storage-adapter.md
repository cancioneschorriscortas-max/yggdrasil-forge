---
'@yggdrasil-forge/storage': minor
---

feat(storage): add LocalStorageAdapter with JSON serialization (sub-phase 3.2.b)

`LocalStorageAdapter`: segunda implementación concreta de `StorageAdapter`. Wrapper sobre `Storage` interface estándar (por defecto `globalThis.localStorage`) con serialización JSON automática. Acepta `Storage` inxectado no constructor para tests sen jsdom. Detecta `QuotaExceededError` multi-navegador (Chrome, Firefox, Safari, iOS) e mapéao a `STORAGE_QUOTA_EXCEEDED`. Valores corruptos no storage devolven `STORAGE_READ_FAILED`. `LocalStorageAdapterOptions` interface exportada. Script `test:coverage` engadido a storage.
