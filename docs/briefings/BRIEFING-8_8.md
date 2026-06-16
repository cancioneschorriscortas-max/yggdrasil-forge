# BRIEFING — SUB-FASE 8.8 de Yggdrasil Forge

> Pega este documento no chat executor.
> **🎯 ÚLTIMA SUB-FASE DA FASE 8**. Tras pechar 8.8, Fase 8 quedará
> **completa oficialmente**.
>
> **Read-only mode completion**: completar a implementación parcial
> existente do read-only mode no TreeEngine.
>
> **Estado actual (verificado polo director empíricamente)**:
> - ✅ `TreeEngineOptions.readOnly?: boolean` xa existe.
> - ✅ `private readonly readOnly: boolean` + `isReadOnly()` xa
>   implementados.
> - ✅ `READ_ONLY_VIOLATION` ErrorCode xa existe (`YGG_RO001`).
> - ✅ **5 métodos xa bloquean** en readOnly: unlock, lock, respec,
>   applyChanges, tick.
> - ❌ **3 métodos faltan bloquear**: `setProgress`, `restoreSnapshot`,
>   `loadLoadout`.
> - ⚠️ Cero tests centralizados sobre readOnly (6 usos espallados
>   en 4 ficheiros).
>
> **8.8 entrega**:
> 1. **3 checks readOnly engadidos** ao TreeEngine.ts en
>    `setProgress`, `restoreSnapshot`, `loadLoadout` (patrón
>    establecido idéntico aos 5 métodos existentes).
> 2. **Test suite centralizada** NOVA en
>    `__tests__/engine/TreeEngine.readOnly.test.ts` (~18 tests
>    cubrindo os 8 métodos bloqueados + lectores + storage operations
>    non-mutating).
>
> **Decisións confirmadas polo director**:
> - **3 métodos a bloquear**: `setProgress`, `restoreSnapshot`,
>   `loadLoadout`. Cero modificar `loadFromShareLink` (cero muta
>   state).
> - **Test file centralizado** (vs engadir aos existentes).
> - **`snapshot` e `saveLoadout` PERMÍTENSE en readOnly** (cero
>   mutan state; só lecturas + storage).
> - **`registerPlugin` cero bloquear** (plugins V1.0 só read_state).
> - **Patrón idéntico** ao xa establecido nos 5 métodos existentes.
> - **Cero ErrorCodes novos** (READ_ONLY_VIOLATION xa existe).
> - **Risco BAIXO**: scope acoutado + patrón establecido + cero
>   novidade arquitectónica.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente o
> estado actual dos 5 métodos que xa bloquean + confirma que os 3
> métodos a modificar **NON teñen aínda** check readOnly (xa
> verificado polo director).
>
> **🎯 Tras 8.8**:
> - **Fase 8 PECHADA OFICIALMENTE**.
> - Próxima sub-fase será **doc MASTER post-Fase 8** (consolidación
>   leccións 8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.8 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.8 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica (cero nova interface
require modificar).

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: as 3 novas ramas readOnly chegan a 100%.
Cero regresión na baseline post-8.7.b.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE DURA**: cero modificación de
calquera test existente. Tódolos ~2177 tests previos deben pasar
intactos. **Especial atención** a:
- TreeEngine.test.ts (test base).
- TreeEngine.mutations.test.ts (3 usos existentes de readOnly).
- TreeEngine.applyChanges.test.ts (1 uso).
- TreeEngine.audit.test.ts (1 uso).
- TreeEngine.time.test.ts (1 uso de tick + readOnly).

**0.14 — Cero modificación de outros métodos** de TreeEngine.ts
fora dos 3 prescritos.

**0.15 — Cero modificación de outros paquetes**.

**0.16 — Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
que os 3 métodos a modificar **NON teñen aínda** check readOnly.

**0.17 — 🎯 Sub-fase ÚLTIMA da Fase 8**: tras completar, Fase 8
queda PECHADA. Reportar este fito explícitamente.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.8** de Yggdrasil Forge. **🎯 ÚLTIMA DA FASE 8**.

**Pezas (3 grupos)**:

**Grupo A — TreeEngine.ts modificación cirúrxica (1 MODIFICADO)**:
1. `packages/core/src/engine/TreeEngine.ts`: engadir 3 checks
   readOnly:
   - `setProgress(nodeId, percent)` — início do método (línea ~435).
   - `restoreSnapshot(id)` — início do método (línea ~2340).
   - `loadLoadout(name)` — início do método (línea ~2396).

**Grupo B — Tests centralizados (1 NOVO)**:
2. `packages/core/__tests__/engine/TreeEngine.readOnly.test.ts`
   (NOVO; ~18 tests).

**Grupo C — Housekeeping**:
3. `.changeset/read-only-mode-8-8.md` (NOVO).
4. `CHANGELOG.md` (MODIFICADO).

**Total: 4 ficheiros tocados** (2 NOVOS + 2 MODIFICADOS).

**Cero modificación de**:
- Calquera outro método de TreeEngine.ts.
- `packages/core/src/types/` (TreeEngineOptions xa ten `readOnly?`).
- `packages/common/src/errors/codes.ts` (READ_ONLY_VIOLATION xa
  existe).
- `packages/common/src/errors/messages.ts` (mensaxe xa existe).
- Outros paquetes (common/storage/react/plugins/search/validators).
- **Calquera test existente** (~2177 totais; engadir só un test
  file novo).
- Storage scaffold/configs.
- `package.json` root, configs root.
- MASTER.md.

**CERO deps de npm engadidas**. **CERO ErrorCodes novos**. **CERO
tipos novos**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `580f53f`, verificada
empíricamente)**.

### Estado actual readOnly (verificado)

**`TreeEngineOptions.readOnly`** (`packages/core/src/types/tree.ts`):
```ts
export interface TreeEngineOptions {
  readonly locale?: Locale
  readonly readOnly?: boolean
  readonly audit?: {...}
  // ...
}
```

**`TreeEngine` field + getter** (`packages/core/src/engine/TreeEngine.ts`):
```ts
private readonly readOnly: boolean

// constructor (línea ~135):
this.readOnly = options?.readOnly ?? false

// getter (línea ~462):
isReadOnly(): boolean {
  return this.readOnly
}
```

**`READ_ONLY_VIOLATION` ErrorCode** (`packages/common/src/errors/codes.ts`):
```ts
READ_ONLY_VIOLATION = 'YGG_RO001'
```

**Mensaxes gl/es/en**: xa existen en `messages.ts`.

### Métodos xa con check readOnly (5; verificado)

| Método | Línea | Patrón |
|---|---|---|
| `unlock(nodeId)` | ~811 | Bloquea con err(READ_ONLY_VIOLATION) |
| `lock(nodeId)` | ~1170 | Idéntico |
| `respec(nodeIdOrIds?, opts?)` | ~1301 | Idéntico |
| `applyChanges(changes)` | ~1512 | Idéntico |
| `tick()` | ~2064 | Idéntico |

**Patrón uniforme** (verificado):
```ts
if (this.readOnly) {
  return err(
    new YggdrasilError(
      ErrorCode.READ_ONLY_VIOLATION,
      getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
    ),
  )
}
```

### 3 métodos que FALTAN bloquear (verificado)

#### `setProgress(nodeId, percent): Result<ProgressUpdateResult>` (línea ~435)

**Implementación actual**:
```ts
setProgress(nodeId: string, percent: number): Result<ProgressUpdateResult> {
  const result = this.progressManager.setProgress(nodeId, percent)
  if (result.ok) {
    this.statComputer.invalidate()
  }
  return result
}
```

**Inxección**: engadir check ao **inicio** do método, antes de
`this.progressManager.setProgress`. **Sync** (cero await; método
síncrono).

#### `restoreSnapshot(id): Promise<Result<void>>` (línea ~2340)

**Implementación actual**:
```ts
async restoreSnapshot(id: string): Promise<Result<void>> {
  const result = await this.snapshotManager.restore(id)
  if (!result.ok) return result
  const snap = result.value
  this.store.replaceTreeState(snap.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('snapshotRestored', snap)
  return ok(undefined)
}
```

**Inxección**: engadir check ao **inicio** do método, antes de
`this.snapshotManager.restore`. **Async** (require `return err(...)`).

#### `loadLoadout(name): Promise<Result<Loadout>>` (línea ~2396)

**Implementación actual**:
```ts
async loadLoadout(name: string): Promise<Result<Loadout>> {
  const result = await this.loadoutManager.load(name)
  if (!result.ok) return result
  const loadout = result.value
  this.store.replaceTreeState(loadout.build.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('loadoutLoaded', loadout)
  return ok(loadout)
}
```

**Inxección**: engadir check ao **inicio** do método, antes de
`this.loadoutManager.load`. **Async** (require `return err(...)`).

### Métodos que NON require bloqueo (verificado)

| Método | Razón |
|---|---|
| `loadFromShareLink` | Cero muta state; só `decodeFromUrl(code)` |
| `snapshot(label?)` | Cero muta state; só `getState()` + storage save |
| `saveLoadout(name)` | Cero muta state; só `getState()` + storage save |
| `deleteSnapshot/deleteLoadout` | Cero mutan state; só borran do storage |
| `registerPlugin/unregisterPlugin` | Plugins V1.0 só read_state; cero mutan state |
| `clearAuditLog` | Audit é meta-data separado; cero state |
| `getXxx()` lectores | Lectura pura |
| `subscribe(listener)` | Subscription; cero muta state |
| `tick()` | XA BLOQUEA (línea 2064) |

**Filosofía readOnly aplicada**: bloquea operacións que **mutan o
TreeState**. Permite lecturas e operacións de storage que cero
mutan state.

### Tests existentes con readOnly (6 usos en 4 ficheiros; verificado)

```bash
TreeEngine.applyChanges.test.ts: 1 uso
TreeEngine.audit.test.ts: 1 uso
TreeEngine.mutations.test.ts: 3 usos
TreeEngine.time.test.ts: 1 uso (tick)
```

**Decisión do director**: NOVO ficheiro `TreeEngine.readOnly.test.ts`
centralizado. **Cero modificación dos 4 ficheiros existentes** (xa
teñen tests para os métodos correspondentes; intactos).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `580f53f` (sub-fase 8.7.b — Validators
  complete).
- 1673 core + 60 common + 193 storage + 116 react + 35 plugins +
  32 search + 68 validators = **~2177 tests** monorepo limpo.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 50 ErrorCodes existentes (incluído `READ_ONLY_VIOLATION YGG_RO001`).
- **Cadea 50 sub-fases consecutivas sen rollback** (un milleiro!).
- **Paquetes activos: 7**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Completar a implementación parcial existente do read-only mode no
TreeEngine engadindo checks readOnly nos 3 métodos que mutan state
e aínda **non bloquean**: **`setProgress`** (líña ~435; sync),
**`restoreSnapshot`** (líña ~2340; async), **`loadLoadout`** (líña
~2396; async); aplicar o **patrón uniforme establecido** xa usado
nos 5 métodos existentes (`if (this.readOnly) return err(YggdrasilError(ErrorCode.READ_ONLY_VIOLATION, ...))`);
crear suite de tests **centralizada nova** en
`packages/core/__tests__/engine/TreeEngine.readOnly.test.ts`
(~18 tests cubrindo os 8 métodos bloqueados + verificacións de
que lectores e storage operations non-mutating funcionan en readOnly).
**Cero modificación** de calquera outro método de TreeEngine; cero
modificación de outros paquetes; cero modificación de calquera
test existente; cero deps novas; cero ErrorCodes novos; cero tipos
novos. **🎯 Tras 8.8, FASE 8 PECHARÁ OFICIALMENTE**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (2)**:
- `packages/core/__tests__/engine/TreeEngine.readOnly.test.ts`
  (~280 liñas; ~18 tests).
- `.changeset/read-only-mode-8-8.md` (NOVO).

**MODIFICADOS (2)**:
- `packages/core/src/engine/TreeEngine.ts` (+~30 liñas; 3 checks).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 4 ficheiros tocados** (2 NOVOS + 2 MODIFICADOS).

### 5.2 — `setProgress` modificación cirúrxica (FIXADO)

**Localización**: línea ~435 de TreeEngine.ts.

**Antes**:
```ts
setProgress(nodeId: string, percent: number): Result<ProgressUpdateResult> {
  // ── INICIO: 2.4.e bug-fix — ...
  const result = this.progressManager.setProgress(nodeId, percent)
  if (result.ok) {
    this.statComputer.invalidate()
  }
  return result
}
```

**Despois**:
```ts
setProgress(nodeId: string, percent: number): Result<ProgressUpdateResult> {
  // ── INICIO: 8.8 — readOnly check ──
  if (this.readOnly) {
    return err(
      new YggdrasilError(
        ErrorCode.READ_ONLY_VIOLATION,
        getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
      ),
    )
  }
  // ── FIN: 8.8 ──
  // ── INICIO: 2.4.e bug-fix — ...
  const result = this.progressManager.setProgress(nodeId, percent)
  if (result.ok) {
    this.statComputer.invalidate()
  }
  return result
}
```

**Decisión nesta peza**: check **antes** do bloque 2.4.e (cero
modificar o bloque existente).

### 5.3 — `restoreSnapshot` modificación cirúrxica (FIXADO)

**Localización**: línea ~2340 de TreeEngine.ts.

**Antes**:
```ts
async restoreSnapshot(id: string): Promise<Result<void>> {
  const result = await this.snapshotManager.restore(id)
  if (!result.ok) return result
  const snap = result.value
  this.store.replaceTreeState(snap.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('snapshotRestored', snap)
  return ok(undefined)
}
```

**Despois**:
```ts
async restoreSnapshot(id: string): Promise<Result<void>> {
  // ── INICIO: 8.8 — readOnly check ──
  if (this.readOnly) {
    return err(
      new YggdrasilError(
        ErrorCode.READ_ONLY_VIOLATION,
        getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
      ),
    )
  }
  // ── FIN: 8.8 ──
  const result = await this.snapshotManager.restore(id)
  if (!result.ok) return result
  const snap = result.value
  this.store.replaceTreeState(snap.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('snapshotRestored', snap)
  return ok(undefined)
}
```

### 5.4 — `loadLoadout` modificación cirúrxica (FIXADO)

**Localización**: línea ~2396 de TreeEngine.ts.

**Antes**:
```ts
async loadLoadout(name: string): Promise<Result<Loadout>> {
  const result = await this.loadoutManager.load(name)
  if (!result.ok) return result
  const loadout = result.value
  this.store.replaceTreeState(loadout.build.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('loadoutLoaded', loadout)
  return ok(loadout)
}
```

**Despois**:
```ts
async loadLoadout(name: string): Promise<Result<Loadout>> {
  // ── INICIO: 8.8 — readOnly check ──
  if (this.readOnly) {
    return err(
      new YggdrasilError(
        ErrorCode.READ_ONLY_VIOLATION,
        getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
      ),
    )
  }
  // ── FIN: 8.8 ──
  const result = await this.loadoutManager.load(name)
  if (!result.ok) return result
  const loadout = result.value
  this.store.replaceTreeState(loadout.build.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('loadoutLoaded', loadout)
  return ok(loadout)
}
```

### 5.5 — Tests prescritos (~18 tests; FIXADO)

**`__tests__/engine/TreeEngine.readOnly.test.ts`** (NOVO).

#### Constructor + isReadOnly (2 tests)

1. **`new TreeEngine(treeDef, { readOnly: true })`**: `isReadOnly()`
   devolve true.
2. **`new TreeEngine(treeDef)` (default)** ou
   `{ readOnly: false }`: `isReadOnly()` devolve false.

#### Métodos existentes que xa bloquean (5 tests — verificación
robusta)

3. **`unlock` con readOnly=true**: devolve err con
   READ_ONLY_VIOLATION.
4. **`lock` con readOnly=true**: devolve err con READ_ONLY_VIOLATION.
5. **`respec` con readOnly=true**: devolve err con
   READ_ONLY_VIOLATION.
6. **`applyChanges` con readOnly=true**: devolve err.
7. **`tick` con readOnly=true**: devolve err.

#### 3 métodos novos (3 tests)

8. **`setProgress` con readOnly=true**: devolve err con
   READ_ONLY_VIOLATION. Verificar **state intacto** (progress
   non-modificado).
9. **`restoreSnapshot` con readOnly=true**: devolve err. **state
   intacto**.
10. **`loadLoadout` con readOnly=true**: devolve err. **state
    intacto**.

#### Lectores funcionan en readOnly (4 tests)

11. **`getNodeState` funciona en readOnly**.
12. **`canUnlock` funciona en readOnly**: devolve Result válido
    (cero err).
13. **`getStat` funciona en readOnly**.
14. **`getBudget` + `getProgress` + `getTreeDef` funcionan**.

#### Storage non-mutating funciona en readOnly (3 tests)

15. **`snapshot('label')` funciona en readOnly**: crea BuildSnapshot
    (cero muta state actual; só lee state e garda).
16. **`saveLoadout('name')` funciona en readOnly**: crea Loadout
    (cero muta state actual).
17. **`getAuditLog()` + `clearAuditLog()` funcionan en readOnly**
    (audit é meta-data separado).

#### Read-only + plugins (1 test bonus)

18. **`registerPlugin` funciona en readOnly**: plugin V1.0 só ten
    permission `read_state`; cero require bloquear.

**Total: ~18 tests centralizados**. Post-8.8 esperado: 1673 → **~1691
core tests**.

**Fixtures**:
- Helper `makeReadOnlyEngine(treeDef)` para construir engine
  preestablecido en readOnly.
- Mock storage para snapshot/loadout tests (require `storage`
  option).
- Trees mínimos para cada test (cero require lóxica complicada).

### 5.6 — Cobertura prescrita

- **TreeEngine.ts**: baseline mantida + 3 ramas novas (setProgress
  + restoreSnapshot + loadLoadout) cubertas 100%.
- **Resto**: sen regresión.

### 5.7 — Cero deps novas

Verificable empíricamente.

### 5.8 — Test counts esperados post-8.8

- **core**: 1673 + ~18 = **~1691 tests**.
- **common**: 60 (intactos).
- **storage**: 193 (intactos).
- **react**: 116 (intactos).
- **plugins**: 35 (intactos).
- **search**: 32 (intactos).
- **validators**: 68 (intactos).
- **Total monorepo**: 2177 + ~18 = **~2195 tests**.

### 5.9 — Coordinación con sub-fases pasadas

**5 tests existentes** sobre readOnly en outros ficheiros
(TreeEngine.mutations.test.ts ×3, TreeEngine.applyChanges.test.ts
×1, TreeEngine.audit.test.ts ×1, TreeEngine.time.test.ts ×1):
**Cero modificar**. Os tests novos en `TreeEngine.readOnly.test.ts`
son **adicionais** + **centralizados**, cero duplican os existentes.

**Lección 8.6.a L1**: cero require verificar tipos en este caso
(usamos só readOnly boolean + Result patron coñecidos).

### 5.10 — Lección 8.3 L1 aplicada

T0.2 verifica empíricamente:
```bash
# Confirmar 3 métodos NON teñen aínda check readOnly:
grep -B 2 -A 5 "^  setProgress\(" packages/core/src/engine/TreeEngine.ts | head -10
grep -B 2 -A 5 "^  async restoreSnapshot\(" packages/core/src/engine/TreeEngine.ts | head -10
grep -B 2 -A 5 "^  async loadLoadout\(" packages/core/src/engine/TreeEngine.ts | head -10
# Esperado: cero "this.readOnly" no inicio destes 3 métodos.

# Confirmar 5 métodos existentes XA teñen check:
grep -c "this\.readOnly" packages/core/src/engine/TreeEngine.ts
# Esperado: 7 (1 declaración + 1 getter + 5 checks)
```

### 5.11 — Cero modificar outras pezas

**Garantía dura**: cero modificar:
- Outros métodos de TreeEngine.ts (só engadir 3 checks; cero
  modificar `setProgress`, `restoreSnapshot`, `loadLoadout`
  beyond engadir o check ao inicio).
- `TreeEngineOptions` (xa ten readOnly).
- ErrorCodes (READ_ONLY_VIOLATION xa existe).
- Mensaxes (xa existen gl/es/en).
- Tests existentes (~2177 totais).
- Outros paquetes.

### 5.12 — 🎯 Fito histórico: Fase 8 PECHADA

Tras 8.8, **Fase 8 completa oficialmente** (8.1 → 8.8):
- 8.1: BuildSerializer + UrlSerializer.
- 8.2: SnapshotManager + LoadoutManager + opt-in storage.
- 8.3: Respec extension (costPercent + nodeIdOrIds).
- 8.4.a/b.i/b.ii/c: Plugin system completo (PluginManager +
  HookRunner + PluginAPI + TreeEngine hooks integration).
- 8.5.a/b: Plugins oficiais (History + Debug).
- 8.6.a/b: Search (engine + plugin).
- 8.7.a/b: Validators (engine + 9 regras + integration via IoC).
- **8.8: Read-only mode completion**.

**51 sub-fases consecutivas sen rollback** tras 8.8 (récord histórico
do proxecto).

**Próxima sub-fase: doc MASTER post-Fase 8** (consolidación leccións
8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1 + marcador "🎉 FASE 8 PECHADA
OFICIALMENTE" en Anexo A).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| 3 checks readOnly | TS additions | TreeEngine.ts | +~30 |
| Test suite centralizada | TS describe | tests/TreeEngine.readOnly.test.ts | ~280 (~18 tests) |
| .changeset | YAML+md | .changeset/read-only-mode-8-8.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~25 |

**Total estimado**: ~340 liñas (incluído ~280 de tests).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `packages/core/__tests__/engine/TreeEngine.readOnly.test.ts`
- `.changeset/read-only-mode-8-8.md`

**MODIFICADOS (2)**:
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 4 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera outro método de TreeEngine.ts fora dos 3 prescritos
  (setProgress, restoreSnapshot, loadLoadout).
- `packages/core/src/types/` (TreeEngineOptions intacta).
- `packages/common/src/errors/` (READ_ONLY_VIOLATION + mensaxes
  xa existen).
- Outros paquetes (common/storage/react/plugins/search/validators).
- **Calquera test existente** (~2177 totais).
- `package.json` root, configs root.
- `pnpm-lock.yaml` (cero deps novas).
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc**: cero require para 3 checks novos (son patrón uniforme
xa documentado nos 5 métodos existentes).

**Marcadores**: `// ── INICIO: 8.8 — readOnly check ──` / `// ── FIN:
8.8 ──` en cada un dos 3 puntos de inxección.

**Patrón EXACTO** dos 5 métodos existentes: usar `err(new YggdrasilError(...))`
+ `getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {})`.

---

## 9. QUE NON FACER

- ❌ Modificar **calquera outro método** de TreeEngine.ts fora dos
  3 prescritos.
- ❌ Modificar a lóxica interna dos 3 métodos a tocar (só engadir
  o check ao inicio; cero alterar o existente).
- ❌ Modificar `TreeEngineOptions` interface (xa ten readOnly).
- ❌ Engadir ErrorCodes novos (READ_ONLY_VIOLATION xa existe).
- ❌ Engadir mensaxes en outros idiomas (xa existen gl/es/en).
- ❌ Modificar tests existentes (~2177 totais). Engadir SÓ no test
  file novo.
- ❌ Bloquear `loadFromShareLink` (cero muta state).
- ❌ Bloquear `snapshot` ou `saveLoadout` (cero mutan state).
- ❌ Bloquear `registerPlugin/unregisterPlugin` (plugins V1.0
  read-only).
- ❌ Bloquear `deleteSnapshot/deleteLoadout` (cero mutan state).
- ❌ Bloquear `clearAuditLog` (audit é meta-data separado).
- ❌ Modificar outros paquetes.
- ❌ Engadir deps de npm.
- ❌ Usar `!` non-null assertions.
- ❌ Crear test files en `validators/` ou outros paquetes.
- ❌ Modificar MASTER.md (DIFERIDO a sub-fase doc post-Fase 8).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T7)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `580f53f` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar TreeEngine.readOnly.test.ts non existe:
ls packages/core/__tests__/engine/TreeEngine.readOnly.test.ts 2>/dev/null && \
  echo "ESCALAR: xa existe" || echo "✅ libre"

# Confirmar 5 checks readOnly existentes (esperado: 7 matches
# totais; 1 declaración + 1 getter + 5 checks):
grep -c "this\.readOnly" packages/core/src/engine/TreeEngine.ts
# Esperado: 7

# Confirmar 3 métodos a modificar NON teñen aínda check:
sed -n '435,445p' packages/core/src/engine/TreeEngine.ts | grep -c "this\.readOnly"
# Esperado: 0

sed -n '2340,2350p' packages/core/src/engine/TreeEngine.ts | grep -c "this\.readOnly"
# Esperado: 0

sed -n '2396,2406p' packages/core/src/engine/TreeEngine.ts | grep -c "this\.readOnly"
# Esperado: 0

# Confirmar READ_ONLY_VIOLATION ErrorCode existe:
grep "READ_ONLY_VIOLATION" packages/common/src/errors/codes.ts
# Esperado: 1 match (YGG_RO001)

# Confirmar mensaxes gl/es/en xa existen:
grep -A 3 "READ_ONLY_VIOLATION" packages/common/src/errors/messages.ts | head -5
# Esperado: 3 idiomas
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/core build
pnpm turbo run typecheck --force                        # 23/23
pnpm --filter @yggdrasil-forge/core test --force        # 1673 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 3 checks readOnly a TreeEngine.ts

Aplicar §5.2, §5.3, §5.4 literal. **Orde sugerida**:

1. `setProgress` (línea ~435).
2. `restoreSnapshot` (línea ~2340).
3. `loadLoadout` (línea ~2396).

**Cero modificar** outras partes destes métodos. **Cero modificar**
outros métodos.

### T2 — Verificación typecheck + tests previos intactos

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/core test --force          # 1673 tests INTACTOS
```

**Especial atención**: tódolos 1673 tests core existentes deben
pasar intactos. **Se algún falla → ESCALAR**. Os 6 tests existentes
con `readOnly: true` en outros ficheiros deben **seguir pasando**.

### T3 — Crear TreeEngine.readOnly.test.ts

Aplicar §5.5 literal (~18 tests).

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/core test --force          # 1673 + ~18 = ~1691 tests
```

### T4 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "TreeEngine\.ts|^All files" | head -3
# Esperado:
#   TreeEngine.ts: cobertura igual ou superior (3 ramas novas cubertas
#   ao 100% polos 3 tests de §5.5 punto 8/9/10).
```

### T5 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/__tests__/engine/TreeEngine.readOnly.test.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T6 — Verificación final monorepo

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm turbo run test --force                               # tódolos paquetes
# Esperado:
#   core: 1673 + ~18 = ~1691
#   outros: intactos (common 60, storage 193, react 116, plugins 35,
#           search 32, validators 68)
```

### T7 — Changeset + CHANGELOG + commit + push

`.changeset/read-only-mode-8-8.md`:
```
---
'@yggdrasil-forge/core': minor
---

feat(core): complete read-only mode (block setProgress + restoreSnapshot + loadLoadout) — 🎯 FASE 8 PECHADA (sub-phase 8.8)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **Read-only mode completion**: TreeEngine bloquea agora **8
  métodos mutantes** cando \`readOnly: true\`. Os 5 existentes
  (\`unlock\`, \`lock\`, \`respec\`, \`applyChanges\`, \`tick\`) +
  **3 novos en 8.8**:
  - **\`setProgress(nodeId, percent)\`**: bloquea devolvendo
    \`err(READ_ONLY_VIOLATION)\` sen mutar progress.
  - **\`restoreSnapshot(id)\`**: bloquea sen restaurar.
  - **\`loadLoadout(name)\`**: bloquea sen aplicar loadout.
- **Test suite centralizada** en
  \`packages/core/__tests__/engine/TreeEngine.readOnly.test.ts\`
  (~18 tests cubrindo os 8 métodos bloqueados + verificacións de
  lectores e storage operations non-mutating).

### Note
- 🎯 **SUB-FASE 8.8 É A ÚLTIMA DA FASE 8**. Con esta sub-fase,
  **FASE 8 PECHA OFICIALMENTE**.
- **51 sub-fases consecutivas sen rollback** (récord histórico do
  proxecto).
- Patrón uniforme replicado dos 5 métodos existentes: \`if
  (this.readOnly) return err(YggdrasilError(READ_ONLY_VIOLATION,
  ...))\`.
- **Filosofía read-only**: bloquea operacións que **mutan o
  TreeState**. Permite:
  - **Lecturas** (\`getNodeState\`, \`canUnlock\`, \`getStat\`,
    \`getBudget\`, etc.).
  - **Storage non-mutating** (\`snapshot\`, \`saveLoadout\`, \`getAuditLog\`):
    estes lean state actual e gardan; cero mutan state.
  - **Plugin registration** (\`registerPlugin\`, \`unregisterPlugin\`):
    plugins V1.0 só teñen permission \`read_state\`.
  - **Storage deletion** (\`deleteSnapshot\`, \`deleteLoadout\`):
    borran do storage; cero mutan state.
- **Cero modificación** de:
  - Outros métodos de TreeEngine.
  - Outros paquetes.
  - \`TreeEngineOptions\` (xa tiña \`readOnly?: boolean\`).
  - \`READ_ONLY_VIOLATION\` ErrorCode (xa existía como \`YGG_RO001\`).
  - Mensaxes gl/es/en (xa existían).
  - Calquera test existente (~2177 totais).
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**.
- **Cero tipos novos**.
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que os
  3 métodos a modificar non teñen aínda check readOnly.
- **🎉 FASE 8 COMPLETA**:
  - 8.1: BuildSerializer + UrlSerializer.
  - 8.2: SnapshotManager + LoadoutManager + opt-in storage.
  - 8.3: Respec extension (costPercent + nodeIdOrIds).
  - 8.4.a/b.i/b.ii/c: Plugin system completo.
  - 8.5.a/b: Plugins oficiais (History + Debug).
  - 8.6.a/b: Search (engine + plugin).
  - 8.7.a/b: Validators (engine + 9 regras + integration via IoC).
  - **8.8: Read-only mode completion**.
- **Próxima sub-fase**: doc MASTER post-Fase 8 (consolidación
  leccións 8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1 + marcador "🎉 FASE 8
  PECHADA OFICIALMENTE" no Anexo A).
```

Commit Conventional:
`feat(core): complete read-only mode (block setProgress + restoreSnapshot + loadLoadout) — 🎯 FASE 8 PECHADA (sub-phase 8.8)`

Push directo a `origin/main` (base `580f53f`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.8 — COMPLETADA E EN origin/main ═══
🎯 ÚLTIMA SUB-FASE DA FASE 8 — FASE 8 PECHADA OFICIALMENTE
✅ Commit <hash> en origin/main (base 580f53f)
✅ 3 checks readOnly engadidos a TreeEngine.ts:
   - setProgress (sync; línea ~435)
   - restoreSnapshot (async; línea ~2340)
   - loadLoadout (async; línea ~2396)
✅ Patrón uniforme replicado dos 5 métodos existentes
✅ NOVO ficheiro: TreeEngine.readOnly.test.ts con ~18 tests:
   - 2 constructor + isReadOnly
   - 5 métodos existentes (verificación robusta)
   - 3 métodos novos
   - 4 lectores en readOnly
   - 3 storage non-mutating en readOnly
   - 1 bonus plugins en readOnly
✅ T0.2 verificación empírica (lección 8.3 L1):
   - 3 métodos a modificar non tiñan check (confirmado)
   - 5 métodos existentes xa bloquean (7 matches totais)
   - READ_ONLY_VIOLATION + mensaxes xa existían
✅ T2 verificación crítica: 1673 tests core INTACTOS
✅ T3 + T6 verificación:
   - core: 1673 + ~18 = ~1691 tests
   - common: 60 INTACTOS
   - storage: 193 INTACTOS
   - react: 116 INTACTOS
   - plugins: 35 INTACTOS
   - search: 32 INTACTOS
   - validators: 68 INTACTOS
✅ T4 cobertura: 3 ramas readOnly novas ao 100%
✅ CERO modificación de outros métodos de TreeEngine
✅ CERO modificación de outros paquetes
✅ CERO modificación de TreeEngineOptions, ErrorCodes, mensaxes
✅ CERO modificación de calquera test existente (~2177 totais)
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ CERO tipos novos
✅ Tests: ~2177 + ~18 = ~2195 monorepo
✅ Typecheck: 23/23 | Lint: 0/0 | Format: 0/0
✅ Build paquete core: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   🎉 FASE 8 PECHADA OFICIALMENTE (8.1 → 8.8).
   - 51 sub-fases consecutivas sen rollback (RÉCORD HISTÓRICO).
   - 8 métodos mutantes bloquean en readOnly mode.
   - Storage non-mutating + lectores + plugins funcionan en readOnly.
   - Próxima sub-fase: doc MASTER post-Fase 8 (consolidación leccións
     8.x L1).
✅ Changeset minor (core) + nova [Unreleased]
✅ git status pre-commit: 4 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE doc MASTER POST-FASE 8.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.8. **🎯 ÚLTIMA SUB-FASE DA FASE 8**. Completa a
implementación parcial existente do read-only mode engadindo
checks nos 3 métodos restantes (\`setProgress\`, \`restoreSnapshot\`,
\`loadLoadout\`) seguindo o patrón uniforme establecido nos 5
métodos existentes. Crea suite de tests centralizada nova
cubrindo os 8 métodos bloqueados + verificacións de lectores e
storage operations non-mutating. **Cero modificación** de outros
métodos, outros paquetes, ou calquera test existente. 4 ficheiros
tocados (2 NOVOS + 2 MODIFICADOS). ~18 tests novos. **Risco BAIXO**:
patrón establecido + scope acoutado + cero novidade arquitectónica.
Lección 8.3 L1 aplicada con rigor en T0.2.*

*🎉 **TRAS 8.8, FASE 8 PECHARÁ OFICIALMENTE**: 13 sub-fases
completadas (8.1, 8.2, 8.3, 8.4.a/b.i/b.ii/c, 8.5.a, 8.5.b, 8.6.a,
8.6.b, 8.7.a, 8.7.b, 8.8). **51 sub-fases consecutivas sen
rollback** (récord histórico). Próxima sub-fase: doc MASTER
post-Fase 8 (consolidación leccións + marcador oficial de peche).*

*Decisións críticas documentadas:
- 3 métodos a bloquear identificados via análise estructural
  (mutación de TreeState).
- Test file centralizado novo (vs distribuído nos 4 existentes).
- Filosofía readOnly: bloquea mutations; permite lecturas + storage
  non-mutating.
- Cero modificar loadFromShareLink (cero muta state).
- Cero modificar snapshot/saveLoadout (cero mutan; só lectura +
  storage write).
- Cero modificar deleteSnapshot/deleteLoadout (cero mutan state).
- Cero modificar registerPlugin (plugins V1.0 read_state only).
- Cero modificar clearAuditLog (audit é meta-data separado).
- Patrón uniforme exacto dos 5 métodos existentes (cero
  innovación).
- Cero ErrorCodes / tipos / mensaxes novos.*
