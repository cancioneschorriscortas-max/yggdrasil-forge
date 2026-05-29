---
'@yggdrasil-forge/storage': minor
---

feat(storage): add MemoryStorage backend (sub-phase 3.2.a)

`MemoryStorage`: primeira implementación concreta de `StorageAdapter`. Backend en memoria sobre `Map<string, unknown>`. Cero serialización (acepta valores arbitrarios incluíndo Date, Map, Set, funcións). Soporta `watch` con notificación a múltiples callbacks; callback recibe `null` ao borrar a clave. Ideal para tests, SSR, contextos sen storage persistente.
