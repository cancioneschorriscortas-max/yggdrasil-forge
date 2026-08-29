# Yggdrasil × Godot (GDScript, sen dependencias)

`le_arbore.gd` le un documento Yggdrasil con `JSON.parse_string` (nativo de Godot 4) e lista nodos, custos, recursos e arestas — a inxestión mínima da **estrutura**, ~40 liñas.

```bash
# nun directorio cun project.godot mínimo (ou no teu proxecto),
# copia un ficheiro da galería como arbore.json á beira do script e:
godot --headless --path . --script res://le_arbore.gd
```

**O que este exemplo NON che dá**: a semántica de desbloqueo (`canUnlock`, custos por rango, exclusións, cascadas). Dúas opcións: reimplementala en GDScript lendo [o contrato estable](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/contrato/contrato-estable/), ou correr o motor REAL co bundle embebible `@yggdrasil-forge/core/global` via [GodotJS](https://github.com/godotjs/GodotJS) — receita na páxina [Yggdrasil no teu motor](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/via-do-dato/motores/).

## Verificación (honestidade A.6.43: a CI non corre Godot)

- Campos usados polo script: **verificados contra o schema publicado en cada CI** (`packages/core/__tests__/engines-snippets.test.ts`) — se o contrato cambia, o test berra e este exemplo revísase.
- Sintaxe: revisada contra a API documentada de Godot 4.x (`FileAccess.get_file_as_string`, `JSON.parse_string`, tipado GDScript 2.0).
- Execución manual: ✅ **Godot 4.6.1.stable.official (14d19694e), win64, 2026-08-29** — `--headless` co panadeiro da galería: saída correcta (árbore, recurso, 5 nodos con rangos e custos, 4 arestas). Detalle atopado na proba e xa recollido no script: `JSON.parse_string` devolve TODOS os números como float (`initial: 0.0`); o helper `_num` móstraos como enteiros.
