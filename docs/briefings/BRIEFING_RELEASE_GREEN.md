# BRIEFING — sub-fase `release-green` de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Arranxo do workflow `Release`** (vermello en todos os commits con
> changeset desde examples-2). Diagnóstico verificado empíricamente polo
> Director (reproducido o bump + lockfile + os fixes). Cero código de
> librería; só infra (scripts + workflows) + 1 lección.

---

## 1. Contexto e diagnóstico (xa verificado polo Director — NON re-investigar)

A **CI** está VERDE desde `ci-green`. O **Release** segue VERMELLO. Son
dous problemas distintos; este trata só o Release.

Causa raíz (reproducida localmente):
1. `changesets/action` executa `changeset version`, que bumpa @core
   (0.1.0→0.2.0, e os linked) e **actualiza os rangos de dependencia dos
   EXEMPLOS privados** (`react-demo`, `node-basics`) de `^0.1.0` a
   `^0.2.0`. Eses exemplos usan semver publicado a propósito (Stackblitz),
   **non** `workspace:*`.
2. @core 0.2.0 **non está publicado** e `link-workspace-packages` é
   **false** (default pnpm v11), polo que pnpm vai ao rexistro e **non**
   pode actualizar o `pnpm-lock.yaml` → queda **stale** →
   `ERR_PNPM_OUTDATED_LOCKFILE` en calquera `--frozen-lockfile` posterior.
3. Ademais, os **git hooks de Husky** (pre-commit `lint-staged`, pre-push
   `pnpm typecheck`) disparan dentro do bot ao facer commit/push do PR de
   versión. Os hooks son para dev local, non para bots.

> Hipóteses xa **descartadas** empíricamente (non as repitas): o pre-commit
> **non** corre `pnpm install` (corre `lint-staged`); `pnpm install
> --lockfile-only` só **non** arranxa (vai ao rexistro); `ignore` dos
> exemplos **non** evita o bump dos seus rangos.

Os paquetes activos (que dependen entre si por `workspace:*`) **non**
rompen o lockfile ao bumpar. O problema vén só dos exemplos.

## 2. Obxectivo (unha frase)

Deixar o workflow **Release VERDE**: que `changeset:version` rexenere un
lockfile consistente, e que os hooks de Husky **non** corran nos bots de CI.

## 3. Decisións xa tomadas (NON discutibles — verificadas)

1. **`changeset:version` rexenera o lockfile** engadindo, tras `changeset
   version`, un `pnpm install --lockfile-only --no-frozen-lockfile
   --config.link-workspace-packages=true`. O flag forza linkar o @core
   0.2.0 **local** (sen el, pnpm vai ao rexistro e falla). **Verificado:**
   o lockfile resultante pasa `pnpm install --frozen-lockfile` **sen** flag.
2. **`HUSKY: '0'`** no `env` a nivel de workflow en `release.yml` **e**
   `ci.yml` (defensa en profundidade; os hooks nunca deben correr en bots).
3. **Sen changeset** (é infra/CI, non código publicable).
4. **Non** se cambian os exemplos a `workspace:*` (rompería Stackblitz);
   non se toca `.npmrc` global.

## 4. Tarefas (T0–T6)

> Edicións vía script Python en `/tmp/ygg-exec/` (utf-8, sen heredocs,
> `assert` de áncora antes de modificar). Áncora fallida → **PARA e escala**.

### T0 — Preflight
- Fresh clone; HEAD == `dc26a57` (ci-green). Se hai commits máis novos,
  confírmao e adapta; se o estado diverxe do diagnóstico, **escala**.
- Árbore limpa, identidade git.

### T1 — `package.json`: script `changeset:version`
- Áncora exacta: `    "changeset:version": "changeset version",`
- Substitúe por:
```
    "changeset:version": "changeset version && pnpm install --lockfile-only --no-frozen-lockfile --config.link-workspace-packages=true",
```

### T2 — `.github/workflows/release.yml`: HUSKY env
- Áncora exacta: `  cancel-in-progress: false`
- Inserir **despois** dela (liña en branco + bloque), de xeito que quede:
```
  cancel-in-progress: false

env:
  HUSKY: '0'

jobs:
```
> Verifica que `env:` queda a **nivel de workflow** (indentación 0), antes
> de `jobs:`. NON o metas dentro dun job.

### T3 — `.github/workflows/ci.yml`: HUSKY env
- Áncora exacta: `  cancel-in-progress: true`
- Inserir **despois** dela igual que en T2:
```
  cancel-in-progress: true

env:
  HUSKY: '0'

jobs:
```

### T4 — Lección A.6.14 en MASTER
- Ficheiro `docs/architecture/MASTER.md`. Áncora:
  `## A.7 — Protocolo consolidado`. Inserir **inmediatamente antes** este
  bloque exacto:

```markdown
### A.6.14 — Release: lockfile stale tras `changeset version` + hooks no bot

Síntoma: o workflow Release quedou VERMELLO en todos os commits con
changeset desde examples-2 (git exit 1 no step changesets/action). Causa
raíz (verificada, NON a primeira hipótese):
1. `changeset version` bumpa @core (e linked) e actualiza os rangos de
   dependencia dos EXEMPLOS privados (react-demo, node-basics), que usan
   semver publicado `^0.1.0`→`^0.2.0`. Como @core 0.2.0 non está publicado
   e `link-workspace-packages` é false (default pnpm v11), pnpm vai ao
   rexistro e o `pnpm-lock.yaml` queda stale → `ERR_PNPM_OUTDATED_LOCKFILE`.
2. Os git hooks de Husky (pre-commit `lint-staged`, pre-push `typecheck`)
   disparan dentro do bot de changesets/action ao facer commit/push.

Hipótese errada inicial: "o pre-commit corre `pnpm install`". É falso —
corre `lint-staged`. **Verifica sempre o hook real antes de diagnosticar.**

Fix (verificado de punta a punta):
- `changeset:version`: `changeset version && pnpm install --lockfile-only
  --no-frozen-lockfile --config.link-workspace-packages=true` (o flag forza
  linkar o @core local; o lockfile resultante pasa `--frozen-lockfile` sen
  flag).
- `HUSKY: '0'` no env dos workflows (hooks só para dev local, nunca bots).

Os exemplos seguen en semver publicado a propósito (Stackblitz); non se
pasan a `workspace:*` nin se toca `.npmrc`.
```

### T5 — Tracking + anti-placeholder + gate CI local
- Copia este briefing a `docs/briefings/BRIEFING_RELEASE_GREEN.md`.
- Anti-placeholder nos ficheiros tocados → cero.
- **Gate completo de CI local** (estándar desde A.6.13):
  `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test` → as
  catro verdes.
> ⚠️ O fix de Release **non se pode probar 100% en local** (é específico do
> bot de changesets, que precisa `GITHUB_TOKEN`). A verificación REAL faise
> en GitHub Actions tras o push (Agarfal). Aquí só validamos sintaxe +
> gate CI.

### T6 — Commit + patch
- Un só commit; mensaxe exacta:
```
fix(release): regenerate lockfile in changeset:version + disable Husky in CI bots (release-green)

- changeset:version now runs pnpm install --lockfile-only --no-frozen-lockfile --config.link-workspace-packages=true (fixes ERR_PNPM_OUTDATED_LOCKFILE from private examples' published-semver deps)
- HUSKY='0' at workflow env level in release.yml and ci.yml (git hooks are for local dev, not bots)
- MASTER A.6.14: root cause + verified fix

Infra only. No library code. No changeset. Real verification = green Release run on Actions.
```
- `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada)
```
package.json                              (M: changeset:version script)
.github/workflows/release.yml             (M: env HUSKY)
.github/workflows/ci.yml                  (M: env HUSKY)
docs/architecture/MASTER.md               (M: A.6.14)
docs/briefings/BRIEFING_RELEASE_GREEN.md  (A)
```
Calquera outro ficheiro = erro → **PARA e escala**. (En particular: NON
toques `pnpm-lock.yaml` a man, nin os `package.json` dos exemplos, nin
`.npmrc`.)

## 6. Que NON facer
- ❌ NON cambiar os exemplos a `workspace:*` (rompe Stackblitz).
- ❌ NON tocar `.npmrc` (`link-workspace-packages` global cambiaría a
  resolución en dev; o flag vai SÓ inline no script).
- ❌ NON re-investigar o diagnóstico (xa verificado).
- ❌ NON crear changeset.
- ❌ NON regenerar o lockfile a man neste commit (faino o script no bot).

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T6) · `📂 DIFF` (== §5) ·
- `🟢 GATE CI` (saída de lint/format:check/typecheck/test) ·
- `🧩 PATCH` (nome do .patch) · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing release-green. 4º Arquitecto. Fix verificado; a proba final é o
run verde en Actions. 🌳*
