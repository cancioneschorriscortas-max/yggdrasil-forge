# Yggdrasil × Godot (GDScript, sen dependencias)

`le_arbore.gd` le un documento Yggdrasil con `JSON.parse_string` (nativo de Godot 4) e lista nodos, custos, recursos e arestas — a inxestión mínima da **estrutura**, ~40 liñas.

```bash
# copia un ficheiro da galería como arbore.json á beira do script e:
godot --headless --script le_arbore.gd
```

**O que este exemplo NON che dá**: a semántica de desbloqueo (`canUnlock`, custos por rango, exclusións, cascadas). Dúas opcións: reimplementala en GDScript lendo [o contrato estable](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/contrato/contrato-estable/), ou correr o motor REAL co bundle embebible `@yggdrasil-forge/core/global` via [GodotJS](https://github.com/godotjs/GodotJS) — receita na páxina [Yggdrasil no teu motor](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/via-do-dato/motores/).

## Verificación (honestidade A.6.43: a CI non corre Godot)

- Campos usados polo script: **verificados contra o schema publicado en cada CI** (`packages/core/__tests__/engines-snippets.test.ts`) — se o contrato cambia, o test berra e este exemplo revísase.
- Sintaxe: revisada contra a API documentada de Godot 4.x (`FileAccess.get_file_as_string`, `JSON.parse_string`, tipado GDScript 2.0).
- Execución manual: **pendente** — cando o corras, anota aquí versión e data (p.ex. «Godot 4.3.stable, 2026-08-29, saída correcta co panadeiro»).
