# BRIEFING — SUB-FASE 2.3 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase media de Fase 2.** TimeManager standalone, alcance ACOTADO a
> caducidades (`expiresAt`/`expiresAtCalendar`/`startsAt`). Cooldowns e
> re-certificacións FÓRA. Integración con TreeEngine en sub-fase 2.3.b.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/` (`mkdir -p`). NUNCA na raíz. Rutas
internas `C:/Users/tajes/proxectos/yggdrasil-forge/...` (NON `/c/Users/...`).
Un script por operación, `assert` antes de modificar.

**0.2 — .gitignore** xa ten bloque defensivo. NON o toques.

**0.3 — Tests SEMPRE con --force:**
`pnpm turbo run test --filter=@yggdrasil-forge/core --force`.

**0.4 — Decisións do director (non se consultan):** rama `main`; ficheiros
`python3`+`utf-8`, nunca heredoc; edición parcial `str_replace`; orde
T0→T8 sen cambios.

**0.5 — ANTI-PLACEHOLDER (grep verificable).** Antes do commit:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Resultado LITERAL no reporte.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`, detén o avance. As decisións
clave **xa están pre-resoltas** (secs 5 e 6).

**0.7 — ENTREGA.** Integración = `git push` directo a `origin/main`. Se
transporte por parche: aplícase **DENDE A RAÍZ** (NUNCA Downloads —
incidente 1.15) e **con working tree limpo previo** (`git status` ou
`git stash` antes — lección 2.1.b). Push final polo autor. **Confirma
`git status` ANTES de commitear e despois de aplicar todos os parches:
verifica que todos os ficheiros esperados están presentes** (sección 9
do briefing lista os esperados).

---

## 1. IDENTIFICACIÓN

Sub-fase **2.3** de Yggdrasil Forge. **Quinta sub-fase da Fase 2.**
Tipo: **feature nova media** — `TimeManager` standalone (peza illada,
non cableada a TreeEngine).

---

## 2. CONTEXTO MÍNIMO

`@yggdrasil-forge/core` ten todo o motor da Fase 1 + EffectsRunner
(2.1, 2.1.b) + StatComputer integrado (2.2, 2.2.b). Esta sub-fase
implementa o `TimeManager`, que verifica restricións temporais de
nodos: principalmente cando un nodo **caduca** (`expiresAt` /
`expiresAtCalendar`) e cando **aínda non comezou** (`startsAt`).

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `6d391c8`.
- 676 tests pasan en core (37 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Grep limpo. Working tree limpo.
- **Toda a infraestrutura de tipos xa existe** (cero cambios en tipos
  nin en common):
  - `TimeConstraints { startsAt?, expiresAt?, expiresAtCalendar?,
    validForMs?, cooldownMs?, reCertifyAfterMs? }` en `types/time.ts`.
  - `TimeManagerOptions { enabled, checkIntervalMs?, leadTimeMs?,
    timezone? }` en `types/time.ts`.
  - `NodeDef.timeConstraints?: TimeConstraints` en `types/node.ts:176`.
  - `NodeState` xa inclúe `'expired'`.
  - `EventMap.nodeExpired(nodeId): void` xa declarado.
  - `AuditAction.node_expired { nodeId }` xa existe (use-o desde 2.3.b
    cando se cablea ao TreeEngine; NON nesta sub-fase).
- DT-11 aberta, non bloqueante; non é deste alcance.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `TimeManager` como peza illada que, dado un `NodeDef` con
`timeConstraints` e un valor actual de reloxo virtual inxectado,
determina **se o nodo está activo, aínda non comezou (`pending`) ou
xa expirou**, **sen** integralo a `TreeEngine` (iso é 2.3.b).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Standalone, NON integrado a TreeEngine

`TimeManager` constrúese como peza illada. `TreeEngine` NON o
instancia nin chama nesta sub-fase. **A integración (auto-marcar nodos
como `'expired'`, emitir `nodeExpired`, audit, etc.) implementarase en
2.3.b**, mesmo patrón ca 2.1→2.1.b e 2.2→2.2.b.

### 5.2 — Clock virtual OBRIGATORIO dende día 1

`TimeManager` **NUNCA** chama a `Date.now()` directamente. Recibe unha
función `now: () => number` no contexto (igual que `EffectsRunner` e
`StatComputer` reciben pezas):

```ts
export interface TimeManagerContext {
  /**
   * Función que devolve o instante actual en UTC ms.
   * Permite inxección para tests e SSR. En produción adoita ser `Date.now`.
   */
  readonly now: () => number
  readonly options?: TimeManagerOptions
  readonly locale: Locale
}
```

Razóns:
- Tests trivialmente controlables (cambias o `now` e xeras "tic-tacs").
- SSR / Workers / contornos sen `Date.now` directo poden inxectar
  alternativas.
- Engadilo agora é cero custo; engadilo despois sería un refactor caro.

**O briefing 2.3.b conectará TimeManager con TreeEngine pasando
`now: Date.now` por defecto** (cun override opcional en
`TreeEngineOptions.timeNow`, decisión que se tomará entón).

### 5.3 — Alcance EXACTO de "caducidades"

Implementa o procesamento dos tres campos relacionados con xanela de
validez:

- `startsAt` (UTC ms): instante a partir do cal o nodo é activo. Antes
  → `'pending'`.
- `expiresAt` (UTC ms): instante a partir do cal o nodo caduca.
- `expiresAtCalendar` (`{ date, time, timezone }`): mesma semántica
  pero TZ-aware (ex: "expira o luns 2026-09-01 ás 09:00 en Madrid"). É
  unha alternativa a `expiresAt`; **se o nodo ten ambos definidos**,
  prevalece `expiresAtCalendar` (decisión 5.5).

**FÓRA de alcance** (segue como tipos sen lóxica nesta sub-fase):
- `cooldownMs` (require gardar `lastUnlockedAt` ou similar; modelo de
  estado a deseñar).
- `reCertifyAfterMs` (require estado adicional `'pending_recertification'`
  ou semántica similar a definir).
- `validForMs` (decisión de "relativo a que?" sen aclarar; deíxase ata
  ter máis contexto).

Se atopas un nodo con `cooldownMs`, `reCertifyAfterMs` ou `validForMs`
definidos, **trátaos como se estivesen ausentes** (ignóraos
silenciosamente; non son responsabilidade desta sub-fase). Documenta
isto cun comentario.

### 5.4 — API exacta do TimeManager

```ts
class TimeManager {
  constructor(context: TimeManagerContext)

  /**
   * Avalía o status temporal dun nodo agora mesmo segundo `now()`.
   * Cero efectos secundarios.
   */
  evaluate(constraints: TimeConstraints | undefined): TimeStatus

  /**
   * Avalía o status temporal dun nodo nun instante específico (override).
   * Útil para "que pasará dentro de X ms?". Cero efectos secundarios.
   */
  evaluateAt(constraints: TimeConstraints | undefined, atMs: number): TimeStatus

  /**
   * Calcula o próximo instante (UTC ms) no que o status do nodo
   * podería cambiar. Útil para 2.3.b ao programar checks.
   * Devolve `null` se non hai ningún cambio futuro previsible
   * (ex: nodo permanente sen constraints, ou nodo xa expirado).
   */
  nextTransitionAt(constraints: TimeConstraints | undefined): number | null
}

export type TimeStatus =
  | { readonly kind: 'permanent' }   // sen constraints temporais
  | { readonly kind: 'pending'; readonly startsAt: number }   // aínda non comezou
  | { readonly kind: 'active'; readonly expiresAt?: number }  // activo (con/sen caducidade)
  | { readonly kind: 'expired'; readonly expiredAt: number }
```

Decisións concretas:

- **`evaluate` reutiliza `evaluateAt(constraints, this.context.now())`**.
- **Status `permanent`**: cando `constraints` é `undefined` ou
  todos os campos relevantes (`startsAt`, `expiresAt`,
  `expiresAtCalendar`) son `undefined`. Indica "nodo sen restricións
  temporais; o TimeManager non opina sobre o seu estado".
- **Status `pending`**: cando `startsAt > now`. Inclúe `startsAt`
  para que o consumidor poida planificar.
- **Status `active`**: o nodo está dentro da súa xanela. Inclúe
  `expiresAt?` se hai caducidade (para que o consumidor poida
  programar o próximo check).
- **Status `expired`**: o nodo pasou a caducidade. Inclúe `expiredAt`.
- **Cero `Result<>`**: a API é total (sempre devolve TimeStatus
  válido). Restricións inválidas (ex: `startsAt > expiresAt`) trátanse
  segundo 5.6.

### 5.5 — Prevalencia de `expiresAtCalendar` sobre `expiresAt`

Se un nodo ten ambos definidos:
1. Resólvese `expiresAtCalendar` a un UTC ms usando a TZ especificada.
2. Ese valor **substitúe** ao `expiresAt` para a avaliación.

Razón: `expiresAtCalendar` é máis expresivo (TZ-aware); `expiresAt`
estaría duplicando información. Mais simple ca tentar conciliar dous
valores potencialmente distintos.

**Conversión de `expiresAtCalendar` a UTC ms:** usar o construtor nativo
`new Date(...)` con manexo manual de TZ é complexo. **Decisión do
director:** usa a API estándar **`Intl.DateTimeFormat`** + manipulación
de timestamps, sen dependencias externas. Implementación concreta:

```ts
function resolveCalendarToMs(cal: {date: string; time: string; timezone: string}): number {
  // Estratexia: construír un Date ISO neutro, formatear cara á TZ con
  // Intl.DateTimeFormat, calcular o offset, e aplicalo. Devolve UTC ms.
  // Se a TZ é inválida ou o formato falla → devolve NaN (5.6 trátao).
}
```

**Se a implementación de `resolveCalendarToMs` resulta máis compleja
do esperado** (ex: TZ con DST cambiando entre data declarada e hoxe),
**escala** (0.6) con caso concreto. Non improvises algoritmo subóptimo.

### 5.6 — Manexo de constraints inválidas

Casos patolóxicos:
- `startsAt > expiresAt` (xanela negativa): devolver `expired` se `now >
  expiresAt`, `pending` se `now < startsAt`, e **o "active" nunca se
  alcanza**. Documentar como esperado; é responsabilidade do TreeDef
  estar ben formado.
- `expiresAtCalendar` con timezone inválida ou data malformada
  (`resolveCalendarToMs` devolve `NaN`): tratar como **`permanent`**
  (ignorar a constraint defectuosa). Documenta cun comentario.
- `startsAt` ou `expiresAt` non finitos (`NaN`, `Infinity`): tratar como
  ausentes.

**Cero excepcións. Cero `Result<>`.** A API é total.

### 5.7 — Cero cambios en common, cero ErrorCodes novos

Toda a infraestrutura xa existe. Cero edicións a:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/types/*` (xa están todos os tipos necesarios:
  `TimeConstraints`, `TimeManagerOptions`, `NodeState`, `EventMap`,
  `AuditAction`).

Se ao implementar descobres que falta algo nos tipos → **escala**
(0.6), non engadas tipos novos en tipos sen escalar.

### 5.8 — `nextTransitionAt`: implementación

Devolve **o instante máis próximo no futuro** no que o status podería
cambiar. Calcula:
- Se hai `startsAt` no futuro → candidato.
- Se hai `expiresAt` resolvido (UTC ou calendar) no futuro → candidato.
- Toma o mínimo dos candidatos no futuro estrito (`> now`).
- Se non hai ningún candidato no futuro → `null`.

Útil en 2.3.b para programar `setTimeout` precisos en vez de pollings
caros.

### 5.9 — `TimeManagerOptions`: nesta sub-fase, ignorada agás `enabled`

`TimeManagerOptions` ten campos (`enabled`, `checkIntervalMs`,
`leadTimeMs`, `timezone`) que son relevantes para a integración (2.3.b).
Nesta sub-fase **standalone**, o `TimeManager.evaluate` non agenda
nada nin fai polling, polo tanto:
- `enabled: false` → `evaluate` segue funcionando igual (devolve o
  TimeStatus correcto); a peza nunca "fai nada en segundo plano"
  porque non hai segundo plano. **A semántica de `enabled` defínese
  en 2.3.b** (probablemente: se está `false`, o TreeEngine ignora as
  constraints).
- `checkIntervalMs`, `leadTimeMs`, `timezone`: **ignorados nesta
  sub-fase** (son para o agendado de 2.3.b).

Documenta isto na cabeceira de `TimeManager.ts`.

---

## 6. UBICACIÓN E ESTRUTURA

`packages/core/src/engine/TimeManager.ts` (un só ficheiro, ~200-300
liñas estimadas). Helpers internos no mesmo ficheiro (non exportados).
`TimeManagerContext` e `TimeStatus` exportados desde `TimeManager.ts`.

Export desde `engine/index.ts`:
```ts
export {
  TimeManager,
  type TimeManagerContext,
  type TimeStatus
} from './TimeManager.js'
```

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity
`pnpm install`; confirma 676 tests `--force`. Setup 0.1–0.5 ok.

### T1 — TimeManager: esqueleto + evaluateAt + evaluate
- Crea `TimeManager.ts` con constructor recibindo `TimeManagerContext`.
- Implementa `evaluateAt(constraints, atMs): TimeStatus` segundo
  algoritmo (5.4, 5.6).
- `evaluate(constraints)` delega en `evaluateAt(constraints,
  this.context.now())`.
- Cero `any`. Cero `Date.now()` directo en TimeManager.

Typecheck 20/20.

### T2 — resolveCalendarToMs (5.5)
Implementa o helper interno que converte `expiresAtCalendar` a UTC ms.
Usar `Intl.DateTimeFormat`. Manexa TZ inválida ou data malformada
devolvendo `NaN` (5.6 trátao como ausencia).

**Se atopas que a implementación require complexidade non prevista
(ex: cálculo manual de DST), escala (0.6) con caso concreto.**

### T3 — nextTransitionAt (5.8)
Implementa segundo algoritmo (5.8). Tests T5 cubrirán.

### T4 — Exports
TimeManager + TimeManagerContext + TimeStatus exportados desde
`engine/index.ts`.

### T5 — Tests
`packages/core/__tests__/engine/TimeManager.test.ts` (novo). Cobre
**como mínimo**:

- **Constraints undefined** → `evaluate` devolve `{ kind: 'permanent' }`.
- **Todos os campos undefined** → `permanent`.
- **`startsAt` futuro, now < startsAt** → `pending` co `startsAt` no
  payload.
- **`startsAt` pasado, sen `expiresAt`** → `active` (sen `expiresAt`).
- **`startsAt` pasado, `expiresAt` futuro** → `active` co `expiresAt`
  no payload.
- **`expiresAt` pasado** → `expired` co `expiredAt`.
- **`startsAt > expiresAt`** (xanela negativa): now anterior a ambos →
  `pending`; now posterior a ambos → `expired`; **never active**
  (verifica con `now` entre ambos: se now > startsAt e now < expiresAt
  iso é imposible cunha xanela negativa, polo tanto debe dar `expired`
  ou `pending` segundo a comparación; **escribe o test e documenta o
  resultado**).
- **`expiresAtCalendar` resoluble** (ex: TZ válida) → comportamento
  análogo a `expiresAt`.
- **`expiresAtCalendar` con TZ inválida** → `resolveCalendarToMs`
  devolve NaN → trátase como ausente → `permanent` se non hai outros
  campos.
- **`expiresAt` e `expiresAtCalendar` ambos definidos** → prevalece
  calendar (5.5); verifica que o `expiresAt` ignórase usando valores
  que diverxan.
- **`expiresAt = NaN`** → tratado como ausente.
- **Clock inxección**: dous TimeManager con `now` distintos devolven
  status distinto para os mesmos constraints. Test crítico de 5.2.
- **`evaluateAt` con atMs específico**: o mesmo constraint avaliado a
  tres instantes (pasado, presente, futuro) dá tres status distintos.
- **`nextTransitionAt`**:
  - sen constraints → `null`.
  - só `startsAt` futuro → devolve `startsAt`.
  - só `expiresAt` futuro → devolve `expiresAt`.
  - ambos no futuro → devolve o menor.
  - todos no pasado → `null`.
- **Cooldown/recertify/validFor IGNORADOS**: nodo con `cooldownMs:
  10000` e sen outros campos → devolve `permanent` (constraints
  fóra de alcance, 5.3).

Número total exacto no reporte; cobertura ≥90% en TimeManager.ts.

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. **TimeManager.ts
debe estar a ≥90% nas catro métricas.** Global non debe baixar do
baseline **98.11%**.

### T7 — Verificación + grep
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Grep LITERAL no reporte. Cobertura LITERAL.

### T8 — Changeset + CHANGELOG + commit + push

- Changeset **minor** — só `@yggdrasil-forge/core` (common NON se toca;
  confírmao co `git diff --stat`).
- CHANGELOG `## [Unreleased]`:
  - Added: `TimeManager` (peza standalone) con `evaluate`,
    `evaluateAt`, `nextTransitionAt`. Soporta `startsAt`, `expiresAt`,
    `expiresAtCalendar` (TZ-aware) con prevalencia do calendar sobre
    UTC ms se ambos están definidos. Clock virtual inxectado vía
    `now: () => number` no contexto.
  - Note: `cooldownMs`, `reCertifyAfterMs`, `validForMs` NON
    implementados (asignados a sub-fase futura). A integración con
    `TreeEngine` (auto-expirar nodos, emisión de `nodeExpired`) é
    sub-fase aparte (2.3.b).

Commit Conventional: `feat(core): add standalone TimeManager with
expiresAt and calendar-aware expirations (sub-phase 2.3)`. Push
directo a `origin/main` (base `6d391c8`). Reporta hash.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar cooldownMs, reCertifyAfterMs, validForMs (5.3:
  fóra de alcance; trátanse como ausentes).
- ❌ Chamar a `Date.now()` directamente en TimeManager (5.2: usar
  sempre `context.now`).
- ❌ Integrar TimeManager con TreeEngine (5.1: 2.3.b).
- ❌ Engadir audit / emitir eventos `nodeExpired` (esa lóxica é 2.3.b).
- ❌ Engadir ErrorCodes ou tocar common (5.7).
- ❌ Modificar `types/time.ts`, `types/node.ts`, `types/events.ts`,
  `types/audit.ts` (xa están todos os tipos necesarios; se algo non
  encaixa → ESCALAR).
- ❌ Implementar `setInterval`/`setTimeout` (a lóxica de scheduling é
  2.3.b).
- ❌ Refactorizar pezas existentes ("xa que toco..."). SÓ engadir
  TimeManager.ts.
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1) ou changeset-release.

### Ficheiros esperados no diff final (verifica con `git status` antes
de commitear — lección incorporada en 0.7):

- `packages/core/src/engine/TimeManager.ts` (NOVO)
- `packages/core/src/engine/index.ts` (modificado: exports)
- `packages/core/__tests__/engine/TimeManager.test.ts` (NOVO)
- `.changeset/*.md` (NOVO, nome libre)
- `CHANGELOG.md` (modificado)
- `docs/briefings/BRIEFING-2.3.md` (NOVO, este briefing — opcional
  pero recomendado por consistencia cos anteriores)

**NON deben aparecer cambios en** `packages/common/`,
`packages/core/src/types/`, `pnpm-lock.yaml`, `packages/core/package.json`.

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 2.3 — COMPLETADA E EN origin/main
═══════════════════════════════════════
✅ Commit <hash> en origin/main (base 6d391c8)
✅ TimeManager.ts: evaluate / evaluateAt / nextTransitionAt
✅ Clock virtual: context.now inxectado (cero Date.now directo)
✅ Soporta: startsAt, expiresAt, expiresAtCalendar (TZ-aware)
✅ Prevalencia: calendar > UTC ms cando ambos definidos
✅ Constraints inválidas → tratadas como ausentes (cero excepcións)
✅ Cooldown/recertify/validFor IGNORADOS (5.3, fóra de alcance)
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / TimeManager.ts <Y%>
   (baseline 2.2.b: 98.11% global; obxectivo ≥90% en TimeManager)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída; pre-existente vs nova>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: integración con TreeEngine diferida a 2.3.b;
   cooldown/recertify/validFor non implementados (asignados a sub-fase
   futura); EventMap.nodeExpired e AuditAction.node_expired declarados
   pero non emitidos ata 2.3.b.
✅ Changeset minor (core; common NON tocado) + CHANGELOG
✅ git status pre-commit confirmou os 6 ficheiros esperados (ver §9)
📋 Confirmado: /tmp/ygg-exec rutas C:/, sen heredoc, --force,
   working tree limpo antes de aplicar parche (lección 2.1.b),
   integración push directo, transporte <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.3.b (integración TimeManager ↔ TreeEngine
+ scheduling de checks).
═══════════════════════════════════════
```

---

*Fin do briefing 2.3. Alcance acotado a caducidades; clock virtual
obrigatorio dende día 1; cero refactor. Calquera caso non cuberto →
ESCALAR (0.6).*
