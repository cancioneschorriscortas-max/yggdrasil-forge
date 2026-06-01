# BRIEFING — SUB-FASE 3.2.a de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase pequena de implementación.** Crear `MemoryStorage`, primeira
> implementación concreta de `StorageAdapter` (interface definida en 3.1).
> Backend trivial sobre `Map<string, unknown>`. Cero serialización.
> LocalStorageAdapter sepárase a 3.2.b.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Toda a decisión
arquitectónica está pre-resolta (sec 5).**

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.2.a — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.2.a — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.
NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.2.a** de Yggdrasil Forge. **Primeira implementación
concreta da Fase 3.** Tipo: **backend trivial** — implementar
`MemoryStorage` cumprindo a interface `StorageAdapter` de 3.1. Toda en
memoria, pérdese ao recargar/cerrar proceso. Ideal para tests, SSR,
contextos sen storage persistente.

---

## 2. CONTEXTO MÍNIMO

Tras 3.1 a interface `StorageAdapter` está definida en
`@yggdrasil-forge/storage`. Esta sub-fase implementa a primeira peza
real: `MemoryStorage`, backend en memoria sen serialización.

**Por que MemoryStorage e non LocalStorageAdapter directo** (decisión
do director):
- MemoryStorage é trivial (Map sobre unknown, cero serialización).
- LocalStorageAdapter ten complexidade real (JSON, QuotaExceeded, mock
  de Storage interface). Vai en 3.2.b separada.
- MemoryStorage **vai ser reutilizable** como mock no test de
  LocalStorageAdapter (sinerxia natural se 3.2.a precede 3.2.b).
- Aplica "acoutar > ambicionar" (lección Fase 2).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `c39b8d7` (StorageAdapter interface).
- Tests pasan: 896 core + 17 common + 14 storage + outros = 956 monorepo.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`StorageAdapter` interface dispoñible** en
  `@yggdrasil-forge/storage` con 6 métodos (get, set, delete, list,
  clear, watch?) devolvendo `Promise<Result<T>>`.
- **`Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`** dispoñibles
  en `@yggdrasil-forge/common`.
- ErrorCodes existentes para storage: `STORAGE_READ_FAILED` (E055),
  `STORAGE_WRITE_FAILED` (E056), `STORAGE_QUOTA_EXCEEDED` (E057).
- `packages/storage/package.json` xa ten `@yggdrasil-forge/common` como
  dep workspace.
- DT-9, DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/storage/src/MemoryStorage.ts` cunha clase
`MemoryStorage` que implementa `StorageAdapter` sobre un
`Map<string, unknown>` interno, incluíndo soporte opcional para `watch`,
exportala desde `index.ts`, e cubrir con tests funcionais completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Almacenamento interno: Map

```ts
export class MemoryStorage implements StorageAdapter {
  private readonly data = new Map<string, unknown>()
  // ...
}
```

`Map<string, unknown>` é a estrutura natural: ordenación preservada
(útil para `list()`), iteración eficiente, cero serialización.

**Importante**: garda **referencias directas**. Se o consumidor pasa
un obxecto e despois muta o orixinal, o valor en MemoryStorage tamén
muta. **É comportamento esperado e documentado**. Os consumidores que
queiran inmutabilidade deben pasar copias profundas eles mesmos.

**Cero clone** automático no `set` nin no `get`. Razón: o usuario
controla; clone automático sería caro e inesperado.

### 5.2 — Cero serialización

A diferenza de LocalStorageAdapter (3.2.b), `MemoryStorage` **NON
serializa**. Acepta calquera `unknown` (Date, Map, Set, funcións,
clases, undefined, NaN, etc.) e devólveos tal cal.

**Asimetría observable con LocalStorageAdapter (a documentar)**: a
mesma TreeDef que pasa por MemoryStorage devolve idéntica
(`===` para primitivos, `===` para referencias); pasada por
LocalStorageAdapter, perde a identidade (sería un `JSON.parse(JSON.stringify(x))`).
**Iso é o comportamento correcto** para a peza in-memory. Documenta no
JSDoc.

### 5.3 — Comportamento exacto dos métodos

```ts
async get(key: string): Promise<Result<unknown | null>> {
  // Devolve o valor se existe, null se non. Nunca lanza.
  return ok(this.data.get(key) ?? null)
}

async set(key: string, value: unknown): Promise<Result<void>> {
  // Garda directamente. Nunca falla (memoria infinita teórica).
  this.data.set(key, value)
  this.notifyWatchers(key, value)  // Ver 5.5
  return ok(undefined)
}

async delete(key: string): Promise<Result<void>> {
  // Elimina. Cero erro se non existe.
  this.data.delete(key)
  this.notifyWatchers(key, null)  // Ver 5.5 — notifica null ao borrar
  return ok(undefined)
}

async list(prefix?: string): Promise<Result<string[]>> {
  const keys = Array.from(this.data.keys())
  if (prefix === undefined) {
    return ok(keys)
  }
  return ok(keys.filter(k => k.startsWith(prefix)))
}

async clear(): Promise<Result<void>> {
  // Captura claves antes para notificar watchers.
  const keys = Array.from(this.data.keys())
  this.data.clear()
  for (const key of keys) {
    this.notifyWatchers(key, null)
  }
  return ok(undefined)
}
```

**Cero `try/catch`** nestes métodos. Razón: `Map` non lanza en
operacións normais. Os asincronos `async` devolven `Promise<Result>`
para cumprir a interface, pero o resultado é síncrono internamente.

### 5.4 — `watch` SÍ se implementa

`MemoryStorage` implementa `watch?` (opcional na interface). É case
gratis cun `Map<string, Set<Callback>>`:

```ts
private readonly watchers = new Map<string, Set<(value: unknown) => void>>()

watch(key: string, callback: (value: unknown) => void): () => void {
  // Engadir callback ao set da clave.
  let set = this.watchers.get(key)
  if (set === undefined) {
    set = new Set()
    this.watchers.set(key, set)
  }
  set.add(callback)

  // Devolve función de desubscrición.
  return () => {
    const s = this.watchers.get(key)
    if (s !== undefined) {
      s.delete(callback)
      if (s.size === 0) {
        this.watchers.delete(key)
      }
    }
  }
}

private notifyWatchers(key: string, value: unknown): void {
  const set = this.watchers.get(key)
  if (set === undefined) return
  // Iteración nun snapshot por se algún callback chama unsubscribe.
  for (const cb of Array.from(set)) {
    try {
      cb(value)
    } catch {
      // Ignora erros de callbacks externos (illa de fallos).
      // Razón: un callback malo non debe romper outros watchers.
    }
  }
}
```

**Importante**: `notifyWatchers` chámase desde `set`, `delete`, `clear`.
**Cero notificación en `get`** (é lectura, non cambio).

**Comportamento de `watch` ao borrar**: o callback recibe `null` cando
a clave se borra (vía `delete` ou `clear`). Iso é coherente coa
sinatura: `watch(key, callback: (value: unknown) => void)` — `null` é
`unknown` válido. Documenta no JSDoc.

### 5.5 — Constructor

```ts
constructor() {
  // Cero opcións nesta sub-fase. Iso é deliberado.
}
```

**NON aceptar opcións** como `initialData` ou similar. Razón:
- Mantén a peza mínima.
- Se algún día se precisa precarga, engádese como `seed(data)` método
  explícito en sub-fase futura. Cero adivinar API por adiantado.

### 5.6 — Cero ErrorCodes novos

`MemoryStorage` non pode fallar nas operacións normais. **Ningún
`err()` nesta implementación**. Os ErrorCodes E055-057 existentes
úsanse só para os adapters externos (3.2.b en diante).

### 5.7 — Cero modificación da interface StorageAdapter

A interface 3.1 mantense intacta. **Cero edicións** a
`packages/storage/src/StorageAdapter.ts`. Se durante implementación
detectas algo que cre que falta na interface, **escala (0.6)** — non
modifiques.

### 5.8 — Exportación pública

Engadir a `packages/storage/src/index.ts`:

```ts
export { MemoryStorage } from './MemoryStorage.js'
```

Logo do export existente de `StorageAdapter`.

### 5.9 — Tests funcionais

Crear `packages/storage/__tests__/MemoryStorage.test.ts`. **Mínimo 15
tests**:

**Operacións básicas:**
1. `get` con clave inexistente devolve `ok(null)`.
2. `set` + `get` recupera o valor exacto (con `===`).
3. `set` sobreescribe valor existente.
4. `delete` elimina. `get` posterior devolve `ok(null)`.
5. `delete` con clave inexistente non lanza (devolve `ok(undefined)`).

**list:**
6. `list()` sen prefix devolve todas as claves.
7. `list(prefix)` filtra correctamente.
8. `list()` en storage baleiro devolve `ok([])`.

**clear:**
9. `clear` elimina todas as claves.
10. `clear` en storage baleiro non lanza.

**watch:**
11. `watch` con `set` posterior chama o callback co valor novo.
12. `watch` non recibe notificación cando se modifica OUTRA clave.
13. `watch` con `delete` chama o callback con `null`.
14. `watch` con `clear` chama o callback con `null` (para esa clave).
15. Función de desubscrición funciona: tras chamala, o callback non se
    chama máis.
16. Múltiples watchers na mesma clave: todos reciben notificación.
17. Callback que lanza erro non rompe outros watchers nin operacións
    posteriores.

**Comportamento referencial (5.1):**
18. `set` garda referencia: mutar o obxecto orixinal afecta o
    almacenado (é o esperado nesta peza).

**Tipos diversos:**
19. Acepta valores arbitrarios sen serializar: Date, Map, Set,
    funcións, undefined, null, NaN, etc.

**Asincronía:**
20. Todos os métodos devolven Promise (compatible coa interface). Test
    explícito con `await`.

Pode estender se algún caso parece importante; cero duplicación.

### 5.10 — Cobertura

`MemoryStorage.ts` debe alcanzar **100% cobertura** (statements, lines,
funcs). É unha peza pequena con lóxica clara — non hai escusa para
deixar ramas sen cubrir. Se algunha rama defensiva non se exerce,
**escala (0.6)** antes de aceptala como gap.

### 5.11 — Cero modificación de outros paquetes

Só `packages/storage/`. Cero common, cero core, cero outros.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:
- `packages/storage/src/MemoryStorage.ts` — **NOVO**: a clase.
- `packages/storage/src/index.ts` — **MODIFICADO**: engadir export.
- `packages/storage/__tests__/MemoryStorage.test.ts` — **NOVO**: tests.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 956 tests `--force`.
2. **Verifica** que `StorageAdapter` está exportado:
   `grep "StorageAdapter" packages/storage/src/index.ts`.
3. **Verifica** que `Result`, `ok` están dispoñibles desde common:
   `grep -A2 "Result type" packages/common/src/index.ts`.

### T1 — Crear MemoryStorage.ts (5.1-5.5)
- Estrutura: clase con `data: Map`, `watchers: Map`.
- Métodos públicos: `get`, `set`, `delete`, `list`, `clear`, `watch`.
- Método privado: `notifyWatchers`.
- JSDoc en cada método público documentando comportamento (5.2
  asimetría con LocalStorageAdapter, 5.4 watch comportamento de null
  ao borrar, 5.1 referencias non clonadas).

Typecheck 20/20.

### T2 — Exportar desde index.ts (5.8)
Engadir `export { MemoryStorage } from './MemoryStorage.js'` despois
do export existente de `StorageAdapter`.

### T3 — Tests funcionais (5.9)
Crear `__tests__/MemoryStorage.test.ts` cos 15+ tests. Importa:

```ts
import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../src/MemoryStorage.js'
```

Tests son asíncronos (`async () => {...}` con `await`).

### T4 — Verificación + cobertura
- `pnpm turbo run test --filter=@yggdrasil-forge/storage --force`.
- `pnpm --filter @yggdrasil-forge/storage run test:coverage`.
- `MemoryStorage.ts` debe estar a **100%**.
- 14 tests previos de storage (3.1) seguen pasando intactos.

### T5 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/storage/src/
pnpm test
```
LITERAL.

**Nota sobre `unknown`**: o ficheiro vai conter `unknown` como tipo de
parámetro/retorno (parte do contrato `StorageAdapter`). **Cero
placeholder** — documenta no reporte que as ocorrencias son
intencionais.

- Changeset **minor** para `@yggdrasil-forge/storage` (engade API
  pública nova).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `MemoryStorage` (en `@yggdrasil-forge/storage`): primeira
    implementación concreta de `StorageAdapter`. Backend en memoria
    sobre `Map<string, unknown>`. Cero serialización (acepta valores
    arbitrarios incluíndo Date, Map, Set, funcións). Soporta `watch`
    con notificación a múltiples callbacks; callback recibe `null` ao
    borrar a clave. Ideal para tests, SSR, contextos sen storage
    persistente.
  ```

### T6 — Commit + push
Commit Conventional:
`feat(storage): add MemoryStorage backend (sub-phase 3.2.a)`.
Push directo a `origin/main` (base `c39b8d7`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/storage/src/MemoryStorage.ts` (NOVO)
- `packages/storage/src/index.ts` (MODIFICADO: +1 export)
- `packages/storage/__tests__/MemoryStorage.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/`, `packages/storage/src/StorageAdapter.ts`,
`packages/storage/__tests__/StorageAdapter.test.ts`,
`packages/storage/__tests__/smoke.test.ts`,
`packages/storage/package.json`, `packages/storage/tsconfig.json`,
`pnpm-lock.yaml`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown`** como tipo de parámetro/retorno é correcto (parte do
contrato StorageAdapter).

---

## 9. QUE NON FACER

- ❌ Modificar a interface StorageAdapter (5.7).
- ❌ Implementar serialización JSON (5.2: iso é LocalStorageAdapter
  3.2.b).
- ❌ Clonar valores no `set`/`get` automaticamente (5.1).
- ❌ Aceptar opcións no constructor (5.5: peza mínima).
- ❌ Engadir ErrorCodes (5.6: ningún err esperado en MemoryStorage).
- ❌ Implementar LocalStorageAdapter ou outras pezas (alcance 3.2.b+).
- ❌ Modificar outros paquetes (5.11).
- ❌ Engadir `initialData` ou `seed()` métodos sen escalar.
- ❌ Refactorizar StorageAdapter ou pezas existentes.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.2.a — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base c39b8d7)
✅ MemoryStorage implementa StorageAdapter sobre Map<string, unknown>
✅ Cero serialización (referencias directas, decisión 5.1/5.2)
✅ watch implementado con Set de callbacks por clave (5.4)
✅ Notifica null ao delete/clear (5.4)
✅ Cero opcións no constructor (5.5: peza mínima)
✅ Cero ErrorCodes novos (5.6: MemoryStorage non pode fallar normal)
✅ T0 StorageAdapter exportado: <confirmado>
✅ T0 Result desde common: <confirmado>
✅ Tests: <N> pasan en storage (<delta> novos)
   - <X> tests funcionais MemoryStorage
   - 14 previos (3.1) intactos
✅ Cobertura: MemoryStorage.ts 100% / global <X%>
   (baseline 98.18%; non debe baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
   (Nota: 'unknown' en MemoryStorage.ts é tipo correcto da interface)
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: ningunha nova. LocalStorageAdapter en 3.2.b.
✅ Changeset minor (storage) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.2.b (LocalStorageAdapter).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.2.a. MemoryStorage trivial, watch incluído, cero
serialización. Calquera caso non cuberto → ESCALAR.*
