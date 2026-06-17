# BRIEFING — sub-fase `publish-unblock` de Yggdrasil Forge (v2)

> **4º Arquitecto (Director) → Executor.**
> **Desbloqueo de publish 0.2.0.** Tres problemas de lint/build
> identificados e verificados polo Director (4º A. + revisión final
> antes de prescribir). **v2 corrixe omisión de v1**: `changeset:publish`
> tamén chama `pnpm build` (secondary invoker non capturado en v1).
>
> Todo o diagnóstico e os fixes xa foron probados no clone local:
> lint+format+build verdes; ademais verificación adicional do step
> `changeset:publish` que executa changesets/action **despois** do
> step Build do workflow.
>
> Cero código de librería; só hixiene de formato + un script de build
> + actualización dun script de publish.

---

## 1. Diagnóstico (xa verificado — NON re-investigar)

Tras o merge do PR #2 (0.2.0), o Release workflow falla por:

**P1 — Lint: 6 erros** en `package.json` de 6 paquetes activos.
`files: [...]` multiline → Biome esixe oneline. `pnpm lint:fix` arránxao
só (verificado: fixa exactamente os 6 ficheiros, nada máis).

**P2 — Lint: 4 warnings** (suppressions inútiles) en
`packages/core/src/plugins/PluginAPI.ts` liñas 76, 80, 84, 88.
Son comentarios `biome-ignore lint/suspicious/noConsole` que xa non teñen
efecto (a regra pasa sen eles). Bórranse as 4 liñas.

**P3 — Build: `react-demo` non compila** porque as súas deps (`^0.2.0`)
non están publicadas aínda. **Cero é só un step**: tanto o step Build
como o script `changeset:publish` invocan `pnpm build`. Hai que migrar
ambos a `build:packages` (un novo script que exclúe `./examples/*`).

> **Estado verificado polo Director:** tras P1+P2+P3 con TODAS as tres
> sub-pezas de T3 (a/b/c) aplicadas, a secuencia
> `pnpm lint && pnpm format:check` é verde. Build paquetes 20/20 verde.
> Queda 1 warning preexistente non-bloqueante.

---

## 2. Tarefas (T0–T6)

### T0 — Preflight
Fresh clone; HEAD == `cbe82c0`. Árbore limpa. Identidade git
(`git config user.email` e `user.name`).

### T1 — Fix P1: `pnpm lint:fix`
- Executa `pnpm lint:fix`.
- `git diff --name-only` debe mostrar **exactamente** estes 6 ficheiros:
  `packages/{core,importers,plugins,react,search,validators}/package.json`.
  Se aparece calquera outro → **PARA e escala**.
- **Non revertas** este cambio.

### T2 — Fix P2: eliminar 4 suppressions en `PluginAPI.ts`
Script Python en `/tmp/ygg-exec/remove-suppressions.py`:
```python
# utf-8; sen heredocs
path = 'packages/core/src/plugins/PluginAPI.ts'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

target = 'biome-ignore lint/suspicious/noConsole'
original = len(lines)
cleaned = [l for l in lines if target not in l]
removed = original - len(cleaned)

assert removed == 4, f"Expected 4 removals, got {removed}"

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(cleaned)

print(f"OK: removed {removed} suppression lines")
```
- O `assert removed == 4` protexe: se algo cambiou → para.
- **Feito:** PluginAPI.ts sen as 4 liñas.

### T3 — Fix P3: script `build:packages` + 2 invocadores

**(a) `package.json` raíz — ENGADIR script `build:packages`**.

Áncora exacta (liña 14):
```
    "build": "turbo run build",
```

Inserir **inmediatamente despois** (liña 15 nova):
```
    "build:packages": "turbo run build --filter='!./examples/*'",
```

**(b) `package.json` raíz — ACTUALIZAR `changeset:publish`**.

⚠️ **Este é o paso NOVO en v2** (v1 esquecía isto, polo que o publish
seguía bloqueado). `changesets/action` invoca `changeset:publish`
**despois** do step Build do workflow, e este script tamén chama
`pnpm build` → falla outra vez por react-demo.

Áncora exacta (ubicación variable; usar string match):
```
    "changeset:publish": "pnpm build && changeset publish"
```

Substituír por:
```
    "changeset:publish": "pnpm build:packages && changeset publish"
```

**(c) `.github/workflows/release.yml` — cambiar o step Build**.

Áncora exacta (liña 59-60):
```yaml
      - name: Build
        run: pnpm build
```

Substituír por:
```yaml
      - name: Build
        run: pnpm build:packages
```

### T4 — Format + gate CI completo
- `pnpm format` (o lint:fix de T1 reformatou JSONs; format sincroniza
  e tamén formatea o cambio do `build:packages` script).
- Gate obrigatorio:
  `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
- **As catro deben saír verdes.** (1 warning preexistente é aceptable;
  cero errors.) Captura a conta de tests.

### T5 — Leccións A.6.15 en MASTER

Ficheiro `docs/architecture/MASTER.md`. Áncora: `## A.7 — Protocolo consolidado`
(liña 3304).

Inserir **inmediatamente antes** desa liña:

```markdown
### A.6.15 — Bot PRs e publish: illamento dos exemplos + secondary invokers

Tras o merge do PR de versión 0.2.0, o Release workflow fallaba por:
1. `files: [...]` multiline en 6 `package.json` (Biome esixe oneline;
   `pnpm lint:fix` arránxao; NON revertir estes cambios automáticos).
2. 4 comentarios `biome-ignore noConsole` inútiles en PluginAPI.ts
   (a regra pasaba sen eles; suppressions inútiles son errors de lint).
3. Os exemplos privados (`react-demo`, `node-basics`) usan deps por
   semver publicado (`^0.2.0`) para compatibilidade con Stackblitz.
   Ao publicar 0.2.0, esas versións non existen aínda no rexistro →
   o build de Release falla con TS2307. Fix: `build:packages` exclúe
   `./examples/*` do turbo build.

**Lección secundaria (v2): secondary invokers de `pnpm build`**.
Excluír os exemplos no step Build do workflow non é suficiente se
outros scripts invocan `pnpm build` por si mesmos. Concretamente,
`changeset:publish = "pnpm build && changeset publish"` corre **despois**
do step Build, dentro de `changesets/action`, e tamén falla. Tódolos
invocadores indirectos de `pnpm build` no pipeline deben migrar a
`build:packages` ou ser auditados.

Patrón xeral: os exemplos son demostradores, non código publicable.
O build de Release só debe compilar paquetes da librería, non exemplos.
Cando se introduce un script de filtro como `build:packages`,
**buscar todos os invokers de `build`** (`grep "pnpm build" package.json
.github/`) antes de dar a tarefa por feita.
```

### T6 — Tracking + commit + patch
- Copia este briefing a `docs/briefings/BRIEFING_PUBLISH_UNBLOCK.md`.
- Un só commit:
```
fix(publish): lint errors + build exclusion to unblock 0.2.0 release (publish-unblock)

P1: files array oneline in 6 package.json (pnpm lint:fix)
P2: remove 4 stale noConsole biome-ignore suppressions in PluginAPI.ts
P3: add build:packages script + migrate 2 invokers (release.yml Build step + changeset:publish) — excludes examples from Release build pipeline
MASTER A.6.15: examples isolation pattern + secondary invokers lesson
track BRIEFING_PUBLISH_UNBLOCK.md (v2 with T3(b) added)

Verified locally: lint/format:check green, build:packages 20/20 green, changeset:publish points to build:packages. No library code changed. No changeset.
```
- `git format-patch -1 HEAD`.

---

## 3. Ficheiros esperados no diff (lista pechada)
```
package.json                                        (M: +build:packages script + changeset:publish update)
packages/core/package.json                          (M: files oneline)
packages/importers/package.json                     (M: files oneline)
packages/plugins/package.json                       (M: files oneline)
packages/react/package.json                         (M: files oneline)
packages/search/package.json                        (M: files oneline)
packages/validators/package.json                    (M: files oneline)
packages/core/src/plugins/PluginAPI.ts              (M: 4 suppressions borradas)
.github/workflows/release.yml                       (M: pnpm build → pnpm build:packages)
docs/architecture/MASTER.md                         (M: A.6.15 con lección secundaria)
docs/briefings/BRIEFING_PUBLISH_UNBLOCK.md          (A: este ficheiro, v2)
```
**11 ficheiros tocados** (10 M + 1 A). Calquera outro = erro → **PARA e escala**.

## 4. Que NON facer
- ❌ NON reverter os cambios de `lint:fix` nos `package.json`.
- ❌ NON cambiar deps de `react-demo` a `workspace:*` (rompe Stackblitz).
- ❌ NON tocar `ci.yml` (o build de CI non corre exemplos; non está afectado).
- ❌ NON crear changeset (é hixiene de infra).
- ❌ NON esquecer T3 (b) — sen el o publish segue bloqueado **silenciosamente**.

## 5. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T6) · `📂 DIFF` (== §3, 11 ficheiros) ·
- `🟢 GATE CI` (lint/format:check/typecheck/test, as 4 verdes; conta tests) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing publish-unblock v2. 4º Arquitecto. v1 esqueceu T3(b) —
secondary invoker en changeset:publish. v2 verificado co Director
antes de prescribir.* 🌳
