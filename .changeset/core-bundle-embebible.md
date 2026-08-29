---
'@yggdrasil-forge/core': minor
---

Bundle embebible (17.7): novo formato de distribución `dist/yggdrasil-core.global.js` (export estable `@yggdrasil-forge/core/global`) — IIFE autocontido (`YggdrasilCore`, immer+zod dentro, cero DOM, cero imports) para intérpretes JS incrustados en motores: Jint (.NET/Unity), puerts (Unreal/Unity), GodotJS, QuickJS. Garantido por test de fume en CI contra QuickJS real: a mesma árbore da galería toma as mesmas decisións dentro dun intérprete sen DOM. Cero cambios de API.
