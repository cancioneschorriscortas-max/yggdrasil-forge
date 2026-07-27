---
'@yggdrasil-forge/cli': minor
---

feat(cli): `ygg layout` — o pipeline IA completo sen GUI (7.16)

`ygg layout <ficheiro|-> --algo radial|tree|clustered-radial|constellation
[--out f]`: valida, aplica o auto-layout directo sobre o documento e
emite o resultado. Con isto: xerar → validate → layout → importar, todo
por CLI. Determinista (mesmo input → mesmo JSON).
