---
'@yggdrasil-forge/core': patch
---

fix(core): `Resource.initial` semea o orzamento inicial (StateStore)

`StateStore.createInitialState` ignoraba `Resource.initial` e o
orzamento nacía sempre a 0 (ou só co que trouxera `startingBudget`),
malia que o contrato do tipo xa dicía "Valor inicial cando se crea un
novo TreeState". Agora cada recurso arranca no seu `initial` (0 por
defecto), clampeado a `[0, max]`. Precedencia: `startingBudget`
sobreescribe por recurso (override explícito da árbore).
