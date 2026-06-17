# BRIEFING — sub-fase `ci-green` de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Desbloqueo de CI.** A CI leva vermella desde examples-2 por un erro de
> lint dunha liña que o protocolo anterior revertía en cada sub-fase. Esta
> sub-fase arránxao, grava a lección, e establece o **gate completo de CI**
> como estándar. Mínima superficie.

---

## 1. Contexto e causa raíz (diagnóstico xa feito polo Director)

`origin/main` en `8e7b5a7`. A CI (`ci.yml`) corre
`install --frozen-lockfile → lint → format:check → typecheck → test` e
**falla no paso `lint`**. Reproducido localmente: o único erro é
`examples/react-demo/src/App.tsx` (`organizeImports`) — as importacións de
`@yggdrasil-forge/react` e `@yggdrasil-forge/react/headless` están en orde
incorrecta. `pnpm lint:fix` arránxao (1 liña). **O resto da pipeline xa
está verde** (install, format:check, typecheck 25/25, test 1695+ core).

O erro persistía porque o protocolo dicía "reverter cambios fóra de scope":
o Executor revertía o arranxo automático de `App.tsx` en cada sub-fase. Isto
**corríxese aquí e no protocolo** (ver T2 / lección A.6.13).

## 2. Obxectivo (unha frase)

Deixar a CI **verde en `origin/main`** arranxando o lint de `App.tsx`,
gravar a lección A.6.13, e demostrar o novo gate completo de CI.

## 3. Decisións xa tomadas (NON discutibles)

1. O arranxo = o resultado de `pnpm lint:fix` sobre `App.tsx` (reordenar 2
   importacións). **MANTÉN ese cambio. NON o revertas.**
2. **NON** se tocan as 3 warnings `suppressions/unused` de
   `packages/core/src/plugins/PluginAPI.ts` (info/warn/error). `pnpm lint`
   sae **0** con warnings → **non bloquean CI**. Limparanse nunha futura
   sub-fase que xa toque `@core` (queda anotado como débeda na lección).
3. **Sen changeset** (arranxo en `examples/`, non publicable; hixiene de CI).
4. **Novo gate (estándar desde agora):** antes do patch execútase a
   secuencia completa de CI e DEBE estar verde.

## 4. Tarefas (T0–T5)

### T0 — Preflight
- Fresh clone; HEAD == `8e7b5a7` (se non, escala). Árbore limpa. Identidade git.
- `pnpm install --frozen-lockfile` (debe pasar; o lockfile está sincronizado).

### T1 — Arranxar o lint de `App.tsx`
- `pnpm lint:fix`.
- `git status --short` → **só** debe aparecer
  `examples/react-demo/src/App.tsx` modificado (o reordenamento de imports).
  Se aparece **calquera outro** ficheiro modificado → **PARA e escala**
  (sería débeda inesperada; non a revertas en silencio, escálaa).
- Confirma que o cambio é o esperado: `@yggdrasil-forge/react` antes de
  `@yggdrasil-forge/react/headless`.
- `pnpm lint` → **exit 0** (3 warnings de PluginAPI son aceptables; cero
  errors).
- **Feito:** `App.tsx` arranxado, `pnpm lint` verde.

### T2 — Lección A.6.13 en MASTER
- Ficheiro: `docs/architecture/MASTER.md`.
- Áncora (debe existir): `## A.7 — Protocolo consolidado`.
- Inserir **inmediatamente antes** dela este bloque exacto:

```markdown
### A.6.13 — Pechar o lazo da CI (non só o estado local)

Síntoma: master-transition, F9.1 e F9.3.a quedaron VERMELLOS en CI aínda
que o Executor reportou "todo verde" e o Director verificou o diff. Causa
raíz: un erro de lint dunha liña en `examples/react-demo/src/App.tsx`
(`organizeImports`) introducido en examples-2. `pnpm lint:fix` arránxao,
pero o protocolo dicía "reverte cambios fóra de scope", así que o Executor
revertía o arranxo en cada sub-fase → o erro persistía e a CI fallaba en
`lint`. Ademais medíase `pnpm lint` ANTES de reverter → o "verde" estaba
caduco.

Correccións de protocolo (obrigatorias desde agora):
1. **Gate final = secuencia completa de CI**, como ÚLTIMO paso antes do
   patch, DESPOIS de todos os edits/reverts:
   `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`. O
   reporte DEBE incluír esa saída. Prohibido medir antes de reverter.
2. **Nunca reverter arranxos lexítimos de lint/format.** Se `lint:fix` toca
   ficheiros fóra de scope, é débeda preexistente: inclúese o arranxo (se é
   trivial e CI-relevante) ou escálase — nunca se reverte. Reverter só vale
   para churn de formato espurio.
3. **Unha sub-fase NON está "feita" ata que a CI estea verde en
   origin/main.** A verificación do Director inclúe confirmar o run de
   Actions. (As "53 sub-fases sen rollback" medían verde LOCAL; as últimas
   3 estaban vermellas en CI — o código sólido, a pipeline non.)

Débeda non bloqueante coñecida: 3 warnings `suppressions/unused`
(`noConsole`) en `packages/core/src/plugins/PluginAPI.ts` (info/warn/error);
`pnpm lint` sae 0 con warnings, non bloquean. Límpanse nunha futura
sub-fase que xa toque @core.
```

- **Feito:** A.6.13 ao final de §A.6, antes de §A.7.

### T3 — Gate completo de CI (o novo estándar, demostrado aquí)
- Executa, **nesta orde e despois de T1/T2**:
  `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`
- **As catro deben saír verdes.** Captura a saída final (conta de tests).
- **Feito:** secuencia completa de CI verde.

### T4 — Tracking + anti-placeholder
- Copia este briefing a `docs/briefings/BRIEFING_CI_GREEN.md`.
- Anti-placeholder nos ficheiros tocados → cero (agás meta deste briefing).
- **Feito.**

### T5 — Commit + patch
- Un só commit; mensaxe exacta:
```
fix(ci): resolve App.tsx import-order lint error blocking CI (ci-green)

- examples/react-demo/src/App.tsx: organizeImports (was reverted every sub-phase by old protocol)
- MASTER A.6.13: close the CI loop — full CI sequence as final gate, never revert legit lint fixes
- track BRIEFING_CI_GREEN.md

Root cause: pre-existing lint error from examples-2 perpetuated by "revert out-of-scope" rule. CI now green (lint/format:check/typecheck/test). No changeset (examples-only).
```
- `git format-patch -1 HEAD`.
- **Feito.**

## 5. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/App.tsx           (M: import reorder, 1 liña)
docs/architecture/MASTER.md               (M: A.6.13)
docs/briefings/BRIEFING_CI_GREEN.md       (A)
```
Calquera outro ficheiro = erro → **PARA e escala**.

## 6. Que NON facer
- ❌ NON tocar `packages/core/.../PluginAPI.ts` (warnings non bloqueantes;
  débeda futura).
- ❌ NON reverter o arranxo de `App.tsx` (é o obxectivo!).
- ❌ NON usar `--unsafe` (non fai falta).
- ❌ NON crear changeset.
- ❌ NON tocar workflows (`.github/`) nin configuración (a CI non é o
  problema; o código era).

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §5) ·
- `🟢 GATE CI` — saída literal de `pnpm lint`, `format:check`, `typecheck`,
  `test` (as catro verdes; conta de tests). **Esta sección é obrigatoria
  desde agora.**
- `🧩 PATCH` (nome do .patch) · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing ci-green. 4º Arquitecto. Pechamos o lazo da CI e gravamos por que
se rompera. 🌳*
