# BRIEFING — sub-fase `release-format-fix` de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Arranxo do papercut A.6.15 — esta vez PERMANENTE.** Ao mergear o PR de
> versión #3, `changeset version` re-expandiu os arrays `files` de 6
> `package.json` a multi-liña; como o bot corre con `HUSKY=0`, Biome non os
> recolleu → `main` está **lint/format VERMELLO**. Arránxase agora **e**
> evítase a recorrencia. Infra pura; cero código de librería; **sen changeset**.

---

## 1. Diagnóstico (verificado polo Director)

`pnpm lint` e `pnpm format:check` fallan en `main` (HEAD post-merge do PR
#3). Causa exacta:
- `changeset version` (no bot de `changesets/action`) reescribe os
  `package.json` e expande `"files": ["dist","README.md","LICENSE"]` a
  multi-liña.
- O bot corre con `HUSKY=0` (correcto, A.6.14), polo que o pre-commit
  (`lint-staged` → Biome) **non** recolle eses arrays.
- Resultado: 6 `package.json` (`core, importers, plugins, react, search,
  validators`) quedan en formato que Biome rexeita → CI vermella ao mergear.

Isto xa pasou en publish-unblock (A.6.15) e **volverá en cada release**
mentres non se automatice o formato no propio paso de versión.

## 2. Obxectivo

(a) Deixar `main` verde xa (recoller os 6 ficheiros). (b) Que **non volva
ocorrer**: que `changeset:version` formatee antes de commitear o PR.

## 3. Decisións (verificadas)

1. **Fix inmediato:** `pnpm format` recolle os 6 `package.json` (verificado:
   `biome format --write .` toca exactamente eses 6).
2. **Fix permanente:** engadir `&& pnpm format` ao final do script
   `changeset:version`. Así o bot, tras `changeset version` + lockfile,
   formatea, e o PR de versión xa vai limpo → o merge non rompe a CI.
   (`pnpm format` = `biome format --write .`; só afecta JSON/TS, ignora
   `.md` non soportados; idempotente.)
3. Infra → **sen changeset**.

## 4. Tarefas (T0–T5)

### T0 — Preflight
Fresh clone; HEAD == o merge do PR #3 (`dbf7686` ou o máis recente).
Confirma que `pnpm format:check` **falla** á entrada (estado a arranxar).
Identidade git (`Director (4th Architect)`).

### T1 — Fix inmediato: recoller os 6 package.json
- Executa `pnpm format`.
- `git diff --name-only` debe mostrar **exactamente**:
  `packages/{core,importers,plugins,react,search,validators}/package.json`.
  Calquera outro ficheiro → **PARA e escala**.

### T2 — Fix permanente: `changeset:version` formatea
- Ficheiro `package.json` (raíz). Áncora exacta:
```
    "changeset:version": "changeset version && pnpm install --lockfile-only --no-frozen-lockfile --config.link-workspace-packages=true",
```
- Substituír por (engadir `&& pnpm format` ao final):
```
    "changeset:version": "changeset version && pnpm install --lockfile-only --no-frozen-lockfile --config.link-workspace-packages=true && pnpm format",
```

### T3 — Lección A.6.16 en MASTER
Ficheiro `docs/architecture/MASTER.md`. Áncora: `## A.7 — Protocolo consolidado`.
Inserir **inmediatamente antes**:

```markdown
### A.6.16 — Release: formato automático no paso de versión (fix permanente de A.6.15)

A.6.15 documentou que `changeset version` re-expande os arrays `files` dos
`package.json` e, como o bot corre con `HUSKY=0` (A.6.14), Biome non os
recolle → `main` queda lint/format vermello tras cada merge de PR de
versión. O parche dunha-vez (`pnpm format` manual) repetíase en cada release.

Fix permanente: `changeset:version` remata con `&& pnpm format`. O bot
formatea os manifests despois de versionar e antes de commitear; o PR de
versión xa vai limpo, e o merge non rompe a CI. `pnpm format` só afecta
JSON/TS (ignora ficheiros non soportados), é idempotente e seguro no bot.
```

### T4 — Gate CI
- `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`
  → as catro **verdes** (lint/format xa non fallan). Conta de tests igual.
- Anti-placeholder → cero.

### T5 — Commit + patch
```
fix(release): collapse package.json files arrays + auto-format in changeset:version (release-format-fix)

- pnpm format: re-collapse the 6 files arrays re-expanded by the version PR #3 merge
- changeset:version now ends with && pnpm format → version PRs are pre-formatted, no more post-merge lint red
- MASTER A.6.16: permanent fix for the A.6.15 recurrence

Infra only. No library code. No changeset. Verification = green CI on main.
```
- `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada)
```
package.json                                 (M: changeset:version += pnpm format)
packages/core/package.json                   (M: files oneline)
packages/importers/package.json              (M)
packages/plugins/package.json                (M)
packages/react/package.json                  (M)
packages/search/package.json                 (M)
packages/validators/package.json             (M)
docs/architecture/MASTER.md                  (M: A.6.16)
docs/briefings/BRIEFING_RELEASE_FORMAT_FIX.md (A — copia este briefing)
```
Calquera outro = erro → **PARA e escala**.

## 6. Que NON facer
- ❌ NON tocar a superficie pública nin código de librería.
- ❌ NON crear changeset.
- ❌ NON modificar versións a man (xa as puxo o PR #3).

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §5) ·
- `🟢 GATE CI` (lint/format:check/typecheck:packages/test verdes) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing release-format-fix. 4º Arquitecto. Que A.6.15 non volva. 🌳*
