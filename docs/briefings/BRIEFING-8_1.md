# BRIEFING — SUB-FASE 8.1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA sub-fase da Fase 8** (Builds + Plugins + Search +
> Validators). Engade ao paquete `@yggdrasil-forge/core` un módulo
> novo de **builds** con:
> 1. **`BuildSerializer`** — funcións puras `serialize(build)` +
>    `deserialize(str)` para JSON serialization con validación
>    de shape (cero compresión; **Opción A** confirmada polo
>    director).
> 2. **`UrlSerializer`** — funcións puras `encodeForUrl(build)` +
>    `decodeFromUrl(code)` que combina BuildSerializer + base64url
>    para producir códigos URL-safe (sen `+`, `/`, `=`).
> 3. **`base64url`** — helper interno con `encode`/`decode` usando
>    `TextEncoder`/`TextDecoder` + `btoa`/`atob` (estándares
>    Node 16+ e browsers; cero deps).
> 4. **TreeEngine APIs** novas: `shareBuild(opts?: { baseUrl?: string })
>    → BuildShareLink` + `loadFromShareLink(code) → Result<Build>`.
> 5. **3 ErrorCodes novos** baixo prefixo novo **`YGG_B*`** (Builds):
>    `YGG_B001 BUILD_DESERIALIZE_FAILED`,
>    `YGG_B002 BUILD_INVALID_SHAPE`,
>    `YGG_B003 SHARE_LINK_DECODE_FAILED`. Mensaxes localizadas
>    gl/es/en para cada un.
>
> **Cero compresión** (Opción A do director): cero deps novas;
> JSON puro + base64url. Builds pequenas (~1-5 KB) caben
> cómodamente en URLs sen compresión.
>
> **Cero modificación** de calquera outro compoñente ou test
> existente. **Modificacións cirúrxicas** en
> `packages/core/src/engine/TreeEngine.ts` (+2 APIs) e
> `packages/core/src/index.ts` (+exports).
>
> 8.2 (Loadouts + Snapshots), 8.3 (RespecManager), 8.4
> (PluginManager + HookRunner), 8.5-8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. Lección 7.5 L1
(verificación empírica de comportamento runtime) aplicada en §2.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: pezas novas (BuildSerializer, UrlSerializer,
base64url) chegan a **100/100/100/100**. Cero regresión na baseline
post-Fase 7.

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de calquera
ficheiro existente fora dos explicitamente prescritos en §5.1.

**Tódolos 1523 tests core + 60 common + 193 storage + 116 react =
1892 tests existentes deben pasar intactos**.

**0.14 — Convención de prefixo de ErrorCodes**: confirmado
empíricamente que `packages/common/src/errors/codes.ts` usa
prefixos por categoría (`YGG_E*` Engine, `YGG_F*` Federation, `YGG_C*`
Concurrency, `YGG_RO*` Read-only, `YGG_T*` Tenancy, `YGG_R*` Reconcile,
`YGG_L*` Layout). **Para 8.1 introduce novo prefixo `YGG_B*`
(Builds)**. Os 3 ErrorCodes novos van baixo este prefixo, NON
continuando a numeración YGG_E* (que está en E036).

---

## 1. IDENTIFICACIÓN

Sub-fase **8.1** de Yggdrasil Forge. **PRIMEIRA da Fase 8**
(Builds + Plugins + Search + Validators).

**Pezas (5 grupos)**:

**Grupo A — ErrorCodes novos**:
1. **`packages/common/src/errors/codes.ts`** (MODIFICADO): engadir
   sección `// Builds` con 3 ErrorCodes baixo prefixo `YGG_B*`:
   ```ts
   // Builds
   BUILD_DESERIALIZE_FAILED = 'YGG_B001',
   BUILD_INVALID_SHAPE = 'YGG_B002',
   SHARE_LINK_DECODE_FAILED = 'YGG_B003',
   ```
2. **`packages/common/src/errors/messages.ts`** (MODIFICADO):
   engadir 3 entradas (gl/es/en) para os ErrorCodes anteriores.

**Grupo B — Módulo builds (NOVO)**:
3. **`packages/core/src/builds/base64url.ts`** (NOVO; **interno**;
   cero export público): `encodeBase64Url(str: string): string` +
   `decodeBase64Url(str: string): string`. Implementación con
   `TextEncoder`/`TextDecoder` + `btoa`/`atob`. **Cero deps**.
4. **`packages/core/src/builds/BuildSerializer.ts`** (NOVO; **público**):
   - `serialize(build: Build): string` → `JSON.stringify(build)`.
   - `deserialize(str: string): Result<Build>` → JSON.parse +
     validación de shape mínima.
5. **`packages/core/src/builds/UrlSerializer.ts`** (NOVO; **público**):
   - `encodeForUrl(build: Build): string` →
     `encodeBase64Url(serialize(build))`.
   - `decodeFromUrl(code: string): Result<Build>` →
     `decodeBase64Url(code)` + `deserialize(...)`.

**Grupo C — TreeEngine APIs**:
6. **`packages/core/src/engine/TreeEngine.ts`** (MODIFICADO):
   engadir 2 APIs públicas:
   - `shareBuild(opts?: { baseUrl?: string }): BuildShareLink`.
   - `loadFromShareLink(code: string): Result<Build>`.

**Grupo D — Exports**:
7. **`packages/core/src/index.ts`** (MODIFICADO): engadir exports
   públicos de BuildSerializer + UrlSerializer (cero export de
   base64url; interno).

**Grupo E — Tests**:
8. **`packages/core/__tests__/builds/BuildSerializer.test.ts`**
   (NOVO; ~6 tests).
9. **`packages/core/__tests__/builds/UrlSerializer.test.ts`**
   (NOVO; ~6 tests).
10. **`packages/core/__tests__/builds/base64url.test.ts`** (NOVO;
    ~4 tests).
11. **`packages/core/__tests__/builds/TreeEngine.shareBuild.test.ts`**
    (NOVO; ~6 tests).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, `packages/common/` fora
  de codes.ts + messages.ts.
- Outros 14 paquetes scaffold (incluído `packages/search/` e
  `packages/validators/` — diferidos a 8.6/8.7).
- **Calquera outro ficheiro** en `packages/core/src/` fora de
  TreeEngine.ts (1 sección nova) e index.ts (+exports). Especialmente:
  cero modificación de JsonSerializer.ts (que serializa **TreeDef**,
  non Build; non require cambio).
- Tests existentes (72 ficheiros de test en core).
- `package.json` (cero deps novas), `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO deps de npm engadidas.** Cero entry points novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `458b56b`, verificada
empíricamente en clone independente)**.

### MASTER §25 (literal)

```
const link = await engine.shareBuild()
await engine.loadFromShareLink(code)
```

### MASTER §39 (Sistema de Plugins, anticipado para 8.4)

```typescript
interface Plugin {
  id: string
  name: string
  version: string
  apiVersion: string
  permissions?: PluginPermission[]
  install(engine: TreeEngine, api: PluginAPI): void | Promise<void>
  uninstall?(engine: TreeEngine): void | Promise<void>
}
```

**Anticipación**: o Plugin interface xa existe en
`packages/core/src/types/plugin.ts` (verificado en §3). Cero impacto
en 8.1.

### Build types xa preparados (verificado empíricamente)

`packages/core/src/types/build.ts` ten:
```ts
export interface Build {
  readonly id: string
  readonly treeId: string
  readonly treeVersion: string
  readonly schemaVersion: string
  readonly label?: LocalizedString
  readonly author?: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly state: TreeState
  readonly parentBuildId?: string
  readonly tags?: readonly string[]
}

export interface BuildShareLink {
  readonly url: string
  readonly shortCode: string
  readonly qrCode?: string
  readonly embedUrl?: string
}

export interface BuildSnapshot { ... }
```

**Confirmado exportado** desde `packages/core/src/types/index.ts`
(verificado: linha `export type { Build, BuildShareLink, BuildSnapshot
} from './build.js'`).

### Verificación empírica de base64 (lección 7.5 L1)

Script tsx do director:
```js
const sample = '{"hello":"world","emoji":"🌳"}'
const bytes = new TextEncoder().encode(sample)
let binary = ''
for (const b of bytes) binary += String.fromCharCode(b)
const enc = btoa(binary)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')
console.log('base64url:', enc)
// Output: eyJoZWxsbyI6IndvcmxkIiwiZW1vamkiOiLwn4yzIn0
```

**Confirmacións**:
- `btoa`/`atob` están en `globalThis` de Node 16+ e browsers
  modernos (verificado).
- `TextEncoder`/`TextDecoder` son standards (cero deps).
- O output ten **cero `+`, `/`, `=`** (URL-safe).
- UTF-8 (emoji) **funciona correctamente** con TextEncoder.

### Estado actual de ErrorCodes (verificado)

`packages/common/src/errors/codes.ts` ten **36 ErrorCodes** organizados
por prefixos:
- `YGG_E001`-`YGG_E036` (Engine).
- `YGG_F001`-`YGG_F002` (Federation).
- `YGG_C001` (Concurrency).
- `YGG_RO001` (Read-only).
- `YGG_T001`-`YGG_T002` (Tenancy).
- `YGG_R001` (Reconcile).
- `YGG_L001`-`YGG_L002` (Layout).

**Decisión do Director**: introducir novo prefixo **`YGG_B*`
(Builds)**, coherente coa convención. Cero continuación de YGG_E*.

### TreeEngine.JsonSerializer **NON** serializa Build

`packages/core/src/engine/JsonSerializer.ts` ten o comment literal
(verificado):
```
NO serializa TreeState/builds (solo la definición).
```

Polo tanto **BuildSerializer é peza nova**; cero require modificar
JsonSerializer.

### Estructura actual de packages/core/src/

Verificado empíricamente:
```
packages/core/src/
├── engine/      (TreeEngine + helpers)
├── types/       (NodeDef, EdgeDef, Build, Plugin, etc.)
├── utils/
└── index.ts
```

**Decisión do Director**: crear novo directorio **`packages/core/src/builds/`**.
Razón: pezas relacionadas con Builds (serializer, url, futuros
loadout/snapshot managers) merecen agrupamento propio. Patrón
consistente con `engine/`, `types/`, `utils/`.

### Tests existentes en core (verificado)

`72 ficheiros de test`. **Decisión do Director**: crear subdirectorio
**`packages/core/__tests__/builds/`** para os 4 ficheiros de test
novos de 8.1.

### Decisión sobre exposición de BuildSerializer / UrlSerializer

**Decisión do Director**: **públicos**.

**Razón**: consumidores poden requerir serializar/deserializar Builds
**sen un TreeEngine completo** (e.g., validar formato dunha URL
antes de cargar; tools de migración; sharing servers).

**base64url permanece interno** (detail de implementación).

### Decisión sobre formato de URL

**Decisión do Director**: `shareBuild(opts?: { baseUrl?: string })`.

- **`baseUrl` opcional**: se se pasa, a `url` final = `${baseUrl}${shortCode}`.
- Se non se pasa, `url` = `''` (string vacío; cero default).
- **`shortCode`**: é o output de `encodeForUrl(build)` (base64url
  do JSON).
- **`qrCode` e `embedUrl`**: cero implementación en 8.1; sub-fase
  futura específica (probablemente non Fase 8).

**Formato esperable**:
```ts
const link = engine.shareBuild({ baseUrl: 'https://app.com/share/' })
// link.url = 'https://app.com/share/eyJpZCI6...'
// link.shortCode = 'eyJpZCI6...'
// link.qrCode = undefined
// link.embedUrl = undefined
```

### Decisión sobre validación de shape en deserialize

**Decisión do Director**: validación **mínima**:
- `typeof parsed === 'object'`
- `parsed !== null`
- Campos requeridos presentes e do tipo correcto:
  - `id: string`
  - `treeId: string`
  - `treeVersion: string`
  - `schemaVersion: string`
  - `createdAt: number`
  - `updatedAt: number`
  - `state: object`
  - `state.nodes: object` (Record<string, NodeInstance>; cero validación profunda).

**Cero validación profunda** (e.g., cada NodeInstance shape):
overhead non xustificado. Se o consumidor pasa un Build corrupto
internamente, lanza erro no uso, non na deserialización.

**Cero Zod**: overkill para 8 campos. Validación inline en función.

### Estado scaffold tras Fase 7

```
packages/core/src/
├── builds/                    (NOVO en 8.1)
│   ├── base64url.ts           (NOVO; interno)
│   ├── BuildSerializer.ts     (NOVO; público)
│   └── UrlSerializer.ts       (NOVO; público)
├── engine/
│   ├── TreeEngine.ts          (MODIFICADO en 8.1: +2 APIs)
│   └── ... (resto sen modif)
├── types/                     (sen modif)
├── utils/                     (sen modif)
└── index.ts                   (MODIFICADO: +exports)

packages/core/__tests__/
├── builds/                    (NOVO en 8.1)
│   ├── base64url.test.ts
│   ├── BuildSerializer.test.ts
│   ├── UrlSerializer.test.ts
│   └── TreeEngine.shareBuild.test.ts
└── ... (resto sen modif)

packages/common/src/errors/
├── codes.ts                   (MODIFICADO: +3 YGG_B*)
└── messages.ts                (MODIFICADO: +3 gl/es/en entries)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `458b56b` (docs: close Phase 7
  officially).
- 1523 core + 60 common + 193 storage + 116 react = 1892 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 36 ErrorCodes existentes (último YGG_E036 + 6 noutros prefixos
  = 36 totais).
- DT abertas: 11.
- **Cadea 37 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/core` un **módulo novo
`builds/`** con `base64url` (helper interno), `BuildSerializer`
(JSON serialization con validación de shape mínima), e `UrlSerializer`
(base64url(JSON.stringify(build))) — todas funcións puras síncronas
**cero deps novas, cero compresión** (Opción A); + 2 **APIs novas
en TreeEngine** (`shareBuild(opts?: { baseUrl? })` →
BuildShareLink; `loadFromShareLink(code)` → Result<Build>); + **3
ErrorCodes novos baixo prefixo `YGG_B*` (Builds)** con mensaxes
localizadas gl/es/en; + tests específicos (~20). **Cero modificación
de calquera outro compoñente ou test existente** salvo os 4 ficheiros
de infra (TreeEngine.ts, core/index.ts, common/codes.ts,
common/messages.ts).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (7)**:
- `packages/core/src/builds/base64url.ts` (~40 liñas).
- `packages/core/src/builds/BuildSerializer.ts` (~60 liñas).
- `packages/core/src/builds/UrlSerializer.ts` (~50 liñas).
- `packages/core/__tests__/builds/base64url.test.ts` (~70 liñas;
  ~4 tests).
- `packages/core/__tests__/builds/BuildSerializer.test.ts` (~120
  liñas; ~6 tests).
- `packages/core/__tests__/builds/UrlSerializer.test.ts` (~110
  liñas; ~6 tests).
- `packages/core/__tests__/builds/TreeEngine.shareBuild.test.ts`
  (~140 liñas; ~6 tests).
- `.changeset/builds-serializer.md` (NOVO).

**MODIFICADOS (4)**:
- `packages/common/src/errors/codes.ts` (engadir bloque
  `// Builds` con 3 entradas).
- `packages/common/src/errors/messages.ts` (engadir 3 entradas
  gl/es/en).
- `packages/core/src/engine/TreeEngine.ts` (engadir 2 APIs
  públicas + imports).
- `packages/core/src/index.ts` (engadir exports de BuildSerializer
  + UrlSerializer).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de** (lista completa):
- Calquera outro ficheiro en `packages/core/src/` (JsonSerializer,
  StateStore, EventEmitter, etc.).
- Tests existentes (72 ficheiros en core, 7 en common, 8 en storage,
  17 en react).
- `packages/storage/`, `packages/react/`, e os 14 paquetes scaffold.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `docs/architecture/MASTER.md` (sub-fase doc posterior se require).

### 5.2 — base64url.ts (FIXADO)

```ts
// packages/core/src/builds/base64url.ts
// ── INICIO: base64url ──
// Helper interno para codificación URL-safe base64.
//
// **Cero deps**. Usa standards Node 16+ e browsers modernos:
// - `TextEncoder` / `TextDecoder` (Encoding Standard).
// - `btoa` / `atob` (HTML Living Standard; tamén en globalThis de
//   Node 16+).
//
// Diferencia con base64 estándar:
// - `+` → `-`
// - `/` → `_`
// - Padding `=` eliminado.
//
// Iso fai os strings safe para usar en URLs sen URL encoding.

/**
 * Codifica un string UTF-8 a base64url.
 *
 * @example
 * encodeBase64Url('{"hello":"world"}')
 * // 'eyJoZWxsbyI6IndvcmxkIn0'
 */
export function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decodifica un string base64url a UTF-8.
 *
 * Lanza `DOMException` (ou erro similar) se o input non é base64
 * válido. **Os chamantes deben envolvelo en try/catch**.
 */
export function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
// ── FIN: base64url ──
```

**Decisións nesta peza**:
- **Cero exposición pública** (cero export desde `core/index.ts`).
- **Cero validación interna** (chamante envolve en try/catch se
  require manexo de erros).
- **TextEncoder/TextDecoder** preferido sobre `unescape`/`escape`
  deprecadas.
- **Cero branching Node vs Browser**: `btoa`/`atob`
  están en `globalThis` de Node 16+.

### 5.3 — BuildSerializer.ts (FIXADO)

```ts
// packages/core/src/builds/BuildSerializer.ts
// ── INICIO: BuildSerializer ──
// Funcións puras síncronas para serialización JSON de Build con
// validación de shape mínima.
//
// **Cero compresión** (Opción A do director): JSON puro. Builds
// pequenas (1-5 KB típicas) caben cómodamente en URLs sen
// compresión. **Sub-fase futura** podería engadir compresión via
// `pako` se require (e.g., builds > 10 KB en URLs).

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Build, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'

/**
 * Serializa unha Build a JSON. Cero compresión.
 *
 * @example
 * const json = serialize(build)
 * // '{"id":"build-1","treeId":"tree-1",...}'
 */
export function serialize(build: Build): string {
  return JSON.stringify(build)
}

/**
 * Deserializa un string JSON a Build. Devolve Result<Build>.
 *
 * Validación: shape mínima (campos requiridos presentes e do tipo
 * correcto). Cero validación profunda (e.g., cada NodeInstance).
 *
 * Errores posibles:
 * - `BUILD_DESERIALIZE_FAILED` (`YGG_B001`): JSON.parse falla.
 * - `BUILD_INVALID_SHAPE` (`YGG_B002`): shape non coincide con Build.
 */
export function deserialize(str: string): Result<Build> {
  let parsed: unknown
  try {
    parsed = JSON.parse(str)
  } catch (e) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_DESERIALIZE_FAILED,
        getErrorMessage(ErrorCode.BUILD_DESERIALIZE_FAILED, 'gl'),
        { cause: e instanceof Error ? e : undefined },
      ),
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_INVALID_SHAPE,
        getErrorMessage(ErrorCode.BUILD_INVALID_SHAPE, 'gl'),
      ),
    )
  }

  const obj = parsed as Record<string, unknown>

  // Validación mínima de campos requiridos:
  if (
    typeof obj['id'] !== 'string' ||
    typeof obj['treeId'] !== 'string' ||
    typeof obj['treeVersion'] !== 'string' ||
    typeof obj['schemaVersion'] !== 'string' ||
    typeof obj['createdAt'] !== 'number' ||
    typeof obj['updatedAt'] !== 'number' ||
    typeof obj['state'] !== 'object' ||
    obj['state'] === null
  ) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_INVALID_SHAPE,
        getErrorMessage(ErrorCode.BUILD_INVALID_SHAPE, 'gl'),
      ),
    )
  }

  const state = obj['state'] as Record<string, unknown>
  if (typeof state['nodes'] !== 'object' || state['nodes'] === null) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_INVALID_SHAPE,
        getErrorMessage(ErrorCode.BUILD_INVALID_SHAPE, 'gl'),
      ),
    )
  }

  return ok(obj as unknown as Build)
}
// ── FIN: BuildSerializer ──
```

**Decisións nesta peza**:
- **`serialize` cero overhead**: simple `JSON.stringify`. Cero
  ordenación de claves nin determinismo extra (cero requirido por
  Build; comparado con JsonSerializer que SI ordena claves para
  TreeDef determinismo).
- **`deserialize` devolve Result**: erros de parse e shape encerrados.
- **Validación inline**: 8 campos verificados. Cero Zod.
- **`as unknown as Build`** tras validación: cast autorizado tras
  validation gate (patrón establecido en core).

### 5.4 — UrlSerializer.ts (FIXADO)

```ts
// packages/core/src/builds/UrlSerializer.ts
// ── INICIO: UrlSerializer ──
// Funcións puras síncronas para codificar/decodificar Builds en
// formato URL-safe (base64url).
//
// Composición: serialize → base64url para encode; base64url →
// deserialize para decode.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Build, Result } from '../types/index.js'
import { err } from '../types/index.js'
import { decodeBase64Url, encodeBase64Url } from './base64url.js'
import { deserialize, serialize } from './BuildSerializer.js'

/**
 * Codifica unha Build a un string URL-safe (base64url do JSON).
 *
 * O resultado é seguro para usar como path segment ou query param
 * sen URL encoding adicional (cero `+`, `/`, `=`).
 *
 * @example
 * const code = encodeForUrl(build)
 * // 'eyJpZCI6...'
 */
export function encodeForUrl(build: Build): string {
  return encodeBase64Url(serialize(build))
}

/**
 * Decodifica un código URL-safe a Build. Devolve Result<Build>.
 *
 * Errores posibles:
 * - `SHARE_LINK_DECODE_FAILED` (`YGG_B003`): base64url decode falla
 *   (input inválido).
 * - `BUILD_DESERIALIZE_FAILED` (`YGG_B001`): JSON parse falla tras
 *   decode (raro pero posible se corrupción).
 * - `BUILD_INVALID_SHAPE` (`YGG_B002`): shape do JSON non coincide
 *   con Build.
 */
export function decodeFromUrl(code: string): Result<Build> {
  let json: string
  try {
    json = decodeBase64Url(code)
  } catch (e) {
    return err(
      new YggdrasilError(
        ErrorCode.SHARE_LINK_DECODE_FAILED,
        getErrorMessage(ErrorCode.SHARE_LINK_DECODE_FAILED, 'gl'),
        { cause: e instanceof Error ? e : undefined },
      ),
    )
  }
  return deserialize(json)
}
// ── FIN: UrlSerializer ──
```

**Decisións nesta peza**:
- Reutiliza BuildSerializer + base64url (cero duplicación).
- Erro `SHARE_LINK_DECODE_FAILED` para input inválido **antes** de
  intentar JSON parse.
- Erros de deserialize propágan-se sin modificación (return directo
  do Result).

### 5.5 — TreeEngine APIs (FIXADO)

**Engadir imports** ao top de TreeEngine.ts (despois dos imports
existentes):

```ts
import { decodeFromUrl, encodeForUrl } from '../builds/UrlSerializer.js'
```

**Engadir tipos de Build** ao bloque de imports de types/index.js
existente (cero ficheiro novo de import; só engadir aos types
listados):

```ts
import type {
  ApplyChangesResult,
  // ... existentes
  Build,            // ← engadir
  BuildShareLink,   // ← engadir
  // ... resto existentes
} from '../types/index.js'
```

**Engadir 2 APIs públicas** despois de `getServerSnapshot()` (ou
en sección coherente):

```ts
// ── Builds: share / load ──

/**
 * Crea un BuildShareLink para a build actual.
 *
 * Constrúe un snapshot do estado actual + metadata e codifícao a
 * base64url para uso en URLs.
 *
 * @param opts.baseUrl - URL base opcional para construír a `url`
 *   final. Se non se pasa, `url` é string vacío e o consumidor
 *   constrúe a URL completa con `link.shortCode`.
 *
 * @example
 * const link = engine.shareBuild({ baseUrl: 'https://app.com/share/' })
 * // link.shortCode: 'eyJpZCI6...'
 * // link.url: 'https://app.com/share/eyJpZCI6...'
 * // link.qrCode: undefined (sub-fase futura)
 * // link.embedUrl: undefined (sub-fase futura)
 */
shareBuild(opts?: { readonly baseUrl?: string }): BuildShareLink {
  const build: Build = {
    id: `build-${Date.now()}`,
    treeId: this.treeDef.id,
    treeVersion: this.treeDef.version,
    schemaVersion: this.treeDef.schemaVersion,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: this.getSnapshot(),
  }
  const shortCode = encodeForUrl(build)
  const baseUrl = opts?.baseUrl ?? ''
  return {
    url: baseUrl + shortCode,
    shortCode,
  }
}

/**
 * Carga unha Build a partir dun shortCode (base64url).
 *
 * **NOTA**: este método **deserializa e valida** o shape do Build,
 * pero **NON aplica o estado ao engine actual**. O consumidor é
 * responsable de:
 *   1. Verificar que `build.treeId` e `build.treeVersion` son
 *      compatibles co engine actual.
 *   2. Aplicar `build.state` mediante mecanismo apropiado (e.g.,
 *      crear novo TreeEngine con ese estado, ou aplicar via
 *      mecanismo de futura sub-fase 8.2 Snapshots).
 *
 * @example
 * const result = engine.loadFromShareLink(shortCode)
 * if (result.ok) {
 *   console.log('Build cargada:', result.value)
 * }
 */
loadFromShareLink(code: string): Result<Build> {
  return decodeFromUrl(code)
}
```

**Decisións nesta peza**:
- **`shareBuild` é síncrono** (cero await; cero IO). Constrúe Build
  inline + chama encodeForUrl.
- **`Date.now()` permitido aquí**: `id` e timestamps son **runtime
  values** que require non-determinismo natural (cero usuario espera
  que `engine.shareBuild()` sexa idempotente entre chamadas).
- **`loadFromShareLink` NON aplica o estado**: limítase a decodificar
  + validar. Aplicar require coordinación con outras sub-fases (8.2
  snapshots + restore). **Documentar** claramente o NOTA na JSDoc.
- **`opts.baseUrl ?? ''`**: cero default explícito; se non se pasa,
  url é string vacío + consumidor constrúe.

**Cero modificación** de outros métodos do TreeEngine.

### 5.6 — Modificacións en common/errors/codes.ts (FIXADO)

**Engadir antes do `}` final do enum** (despois da última entrada
`LAYOUT_COMPUTE_FAILED`):

```ts
  // Builds
  BUILD_DESERIALIZE_FAILED = 'YGG_B001',
  BUILD_INVALID_SHAPE = 'YGG_B002',
  SHARE_LINK_DECODE_FAILED = 'YGG_B003',
```

**Cero outras modificacións** do ficheiro.

### 5.7 — Modificacións en common/errors/messages.ts (FIXADO)

**Engadir antes do `}` final do objeto ERROR_MESSAGES** (despois
da última entrada `LAYOUT_COMPUTE_FAILED`):

```ts
  [ErrorCode.BUILD_DESERIALIZE_FAILED]: {
    gl: 'Erro ao deserializar Build: JSON inválido',
    es: 'Error al deserializar Build: JSON inválido',
    en: 'Failed to deserialize Build: invalid JSON',
  },
  [ErrorCode.BUILD_INVALID_SHAPE]: {
    gl: 'Build con shape inválido: campos requiridos ausentes ou con tipo incorrecto',
    es: 'Build con shape inválido: campos requeridos ausentes o con tipo incorrecto',
    en: 'Invalid Build shape: required fields missing or with wrong type',
  },
  [ErrorCode.SHARE_LINK_DECODE_FAILED]: {
    gl: 'Erro ao decodificar share link: código base64url inválido',
    es: 'Error al decodificar share link: código base64url inválido',
    en: 'Failed to decode share link: invalid base64url code',
  },
```

**Cero outras modificacións**.

### 5.8 — Exports en core/index.ts (FIXADO)

**Engadir nunha sección lóxica** (despois de exports de engine ou
en sección "Builds" nova):

```ts
// Builds: serialization e share links (sub-fase 8.1)
export { serialize, deserialize } from './builds/BuildSerializer.js'
export { encodeForUrl, decodeFromUrl } from './builds/UrlSerializer.js'
```

**Cero export de** `base64url` (interno).

**Cero outras modificacións** do ficheiro.

### 5.9 — Tests prescritos (~22 totais)

**`__tests__/builds/base64url.test.ts`** (~4 tests):

1. Roundtrip básico: `'hello'` → encode → decode → `'hello'`.
2. UTF-8 emoji: `'🌳 árbore'` → roundtrip preservado.
3. Output URL-safe: cero `+`, `/`, `=` en encoded string.
4. Edge case: string vacío `''` → encode → decode → `''`.

**`__tests__/builds/BuildSerializer.test.ts`** (~6 tests):

5. `serialize(build)` produce JSON parseable.
6. `serialize → deserialize` roundtrip preserva build.
7. `deserialize('invalid json')` devolve err con `BUILD_DESERIALIZE_FAILED`.
8. `deserialize('null')` devolve err con `BUILD_INVALID_SHAPE`.
9. `deserialize('{"id": "x"}')` (missing campos) devolve err con
   `BUILD_INVALID_SHAPE`.
10. `deserialize` de build con `tags`/`label`/`author` opcionais
    preserva os campos.

**`__tests__/builds/UrlSerializer.test.ts`** (~6 tests):

11. `encodeForUrl(build)` produce string URL-safe.
12. `encodeForUrl → decodeFromUrl` roundtrip preserva build.
13. `decodeFromUrl('!!!')` (base64url inválido) devolve err con
    `SHARE_LINK_DECODE_FAILED`.
14. `decodeFromUrl('aGVsbG8')` (base64url válido pero non JSON
    válido) devolve err con `BUILD_DESERIALIZE_FAILED`.
15. `decodeFromUrl` con UTF-8 chars (emoji en label) preserva
    integridade.
16. `encodeForUrl` con build moi grande (e.g., 100 nodos) **produce
    string** (cero crash; tamaño aceptable).

**`__tests__/builds/TreeEngine.shareBuild.test.ts`** (~6 tests):

17. `engine.shareBuild()` devolve BuildShareLink válido (shortCode
    non vacío, url='').
18. `engine.shareBuild({ baseUrl: 'https://x.com/s/' })` constrúe
    url completa.
19. `engine.shareBuild()` produce shortCode decodificable con
    `decodeFromUrl`.
20. `engine.loadFromShareLink(shortCode)` con código válido devolve
    `ok(build)` con treeId correcto.
21. `engine.loadFromShareLink('invalid')` devolve err con
    `SHARE_LINK_DECODE_FAILED`.
22. **Roundtrip end-to-end**: engine.shareBuild → loadFromShareLink
    → build cargado ten `treeId` igual ao engine source.

**Total: ~22 tests novos**. Post-8.1 esperado: 1523 → **~1545 core
tests**.

### 5.10 — Cobertura prescrita

- **base64url.ts**: **100/100/100/100** (función pura simple).
- **BuildSerializer.ts**: **100/100/100/100** (todas as ramas
  cubertas polos 6 tests).
- **UrlSerializer.ts**: **100/100/100/100** (ramas cubertas polos
  6 tests).
- **TreeEngine.ts**: manter baseline; engadir cobertura para os
  2 métodos novos (esperado 100 nas liñas novas).
- **packages/common**: cobertura mantida (3 ErrorCodes + mensaxes
  son data; cubertos polos tests que exercen as ramas de err).
- **Cero regresión** noutras pezas do monorepo.

### 5.11 — Cero deps novas

Verificable empíricamente: cero modificación de `package.json` deps,
lockfile, workspace catalog. **Cero `pako`, `lz-string`, ou outras
libs de compresión**. **Se aparecen** → ESCALAR.

### 5.12 — Test counts esperados post-8.1

- **core**: 1523 (previo) + ~22 (novos) = **~1545 tests**.
- **common, storage, react**: intactos.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| base64url helpers | TS funcións puras | base64url.ts | ~40 |
| BuildSerializer | TS funcións + validación | BuildSerializer.ts | ~60 |
| UrlSerializer | TS funcións | UrlSerializer.ts | ~50 |
| 3 ErrorCodes | enum entries | codes.ts | +5 |
| 3 mensaxes localizadas | object entries | messages.ts | +15 |
| TreeEngine.shareBuild + loadFromShareLink | 2 métodos | TreeEngine.ts | +50 |
| Exports root core | re-exports | core/src/index.ts | +3 |
| 4 ficheiros de tests | describe blocks | 4 .test.ts | ~440 |

**Total estimado**: ~225 liñas de código + ~440 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/core/src/builds/base64url.ts` (NOVO)
- `packages/core/src/builds/BuildSerializer.ts` (NOVO)
- `packages/core/src/builds/UrlSerializer.ts` (NOVO)
- `packages/core/__tests__/builds/base64url.test.ts` (NOVO)
- `packages/core/__tests__/builds/BuildSerializer.test.ts` (NOVO)
- `packages/core/__tests__/builds/UrlSerializer.test.ts` (NOVO)
- `packages/core/__tests__/builds/TreeEngine.shareBuild.test.ts` (NOVO)
- `packages/core/src/engine/TreeEngine.ts` (MODIFICADO: +imports +
  2 métodos)
- `packages/core/src/index.ts` (MODIFICADO: +2 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +3 entries)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +3 entries)
- `.changeset/builds-serializer.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 13 ficheiros tocados** (8 NOVOS + 5 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`,
  `packages/core/__tests__/`, `packages/common/`,
  `packages/storage/`, `packages/react/`.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Outros 14 paquetes scaffold (incluído `packages/search/` e
  `packages/validators/` — diferidos a 8.6/8.7).
- `docs/architecture/MASTER.md` (sub-fase doc se require).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Funcións puras en `.ts` puro (cero JSX en builds/). Cero `'use
client'`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en cada función pública (BuildSerializer,
UrlSerializer, TreeEngine.shareBuild, TreeEngine.loadFromShareLink).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`
en cada ficheiro novo.

**Anti-throw**: deserialize e decodeFromUrl **non lanzan**;
encerran erros en Result. **Excepción**: base64url decode pode
lanzar (DOMException) — chamantes (UrlSerializer.decodeFromUrl)
envolven en try/catch.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/`, `packages/react/`, outros 14
  paquetes scaffold.
- ❌ Modificar `packages/search/` ou `packages/validators/`
  (diferidos a 8.6 e 8.7).
- ❌ Modificar **calquera outro ficheiro** en `packages/core/src/`
  fora de `engine/TreeEngine.ts` (cirúrxico: +imports +2 métodos)
  e `index.ts` (+exports).
- ❌ Modificar `JsonSerializer.ts` (serializa TreeDef, non Build;
  cero cambio require).
- ❌ Modificar **calquera test existente** (72 ficheiros en core,
  7 en common, 8 en storage, 17 en react).
- ❌ Engadir compresión (`pako`, `lz-string`, etc.) — DIFERIDO
  a sub-fase futura específica.
- ❌ Engadir deps de npm (cero deps engadidas).
- ❌ Engadir Zod schemas para validar Build (overkill; validación
  inline é suficiente).
- ❌ Implementar `qrCode` ou `embedUrl` no BuildShareLink (DIFERIDOS;
  sub-fase futura específica).
- ❌ Engadir Loadouts, Snapshots, Respec — sub-fases 8.2, 8.3.
- ❌ Engadir PluginManager — sub-fase 8.4.
- ❌ Aplicar `build.state` automáticamente en `loadFromShareLink`
  (decisión §5.5: o consumidor é responsable de aplicar; require
  coordinación con 8.2).
- ❌ Modificar TreeEngine doutras formas (cero modificación de
  existing methods; só engadir 2 novos).
- ❌ Crear novos ErrorCodes baixo prefixo YGG_E* (usar novo prefixo
  YGG_B* segundo §5.6).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir cero default values escondidos no Build (e.g., aplicar
  Date.now()  en deserialize  — só en shareBuild).
- ❌ Implementar caché de Builds (cero require).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa (baseline) + lección 7.5 L1

**T0.1** — `git status` limpo. `git log -1` mostra `458b56b` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar Build, BuildShareLink xa exportados desde core/types:
grep -E "Build|BuildShareLink" packages/core/src/types/index.ts | head -3
# esperado: 1+ match con re-export

# Confirmar último ErrorCode (E036) e ausencia de B*:
grep -E "YGG_E0[0-9]+|YGG_B" packages/common/src/errors/codes.ts | sort -u | tail -5
# esperado: ata YGG_E036; cero YGG_B*

# Confirmar btoa/atob + TextEncoder dispoñibles en Node:
node -e "console.log(typeof btoa, typeof atob, typeof TextEncoder)"
# esperado: 'function' 'function' 'function'

# Confirmar JsonSerializer non serializa Build:
grep -A 2 "NO serializa" packages/core/src/engine/JsonSerializer.ts | head -3
# esperado: comentario explícito "NO serializa TreeState/builds"
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build  # require para core
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1523 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir ErrorCodes + mensaxes a common

Aplicar §5.6 e §5.7 literal. Engadir 3 ErrorCodes `YGG_B*` + 3
mensaxes gl/es/en cada un.

### T2 — Verificación intermedia common

```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/common test --force      # 60 tests pasando
```

**Os 60 tests de common deben pasar intactos** (cero modificación
da lóxica; só engadir entries a enums e objects). Se algún falla
→ **ESCALAR**.

### T3 — Crear base64url.ts

Crear `packages/core/src/builds/base64url.ts` segundo §5.2 literal.

### T4 — Crear BuildSerializer.ts + UrlSerializer.ts

Crear segundo §5.3 e §5.4 literal.

### T5 — Modificar TreeEngine + index.ts

Aplicar §5.5 e §5.8 literal:
- TreeEngine.ts: engadir imports + 2 métodos (`shareBuild`,
  `loadFromShareLink`).
- index.ts: engadir 2 export lines.

### T6 — Verificación intermedia core (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1523 tests pasando
```

**Tódolos 1523 tests previos deben pasar intactos** (cero modificación
de pezas existentes; só engadir 2 métodos novos). Se algún falla
→ **ESCALAR**.

### T7 — Crear 4 ficheiros de tests novos

Aplicar §5.9 literal:
- `__tests__/builds/base64url.test.ts` (~4 tests).
- `__tests__/builds/BuildSerializer.test.ts` (~6 tests).
- `__tests__/builds/UrlSerializer.test.ts` (~6 tests).
- `__tests__/builds/TreeEngine.shareBuild.test.ts` (~6 tests).

### T8 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1545 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "builds/|^All files"
# Cobertura targets:
#   base64url.ts: 100/100/100/100
#   BuildSerializer.ts: 100/100/100/100
#   UrlSerializer.ts: 100/100/100/100
#   Resto: sen regresión
```

### T9 — Build + Lint + Format + Grep + Changeset + commit + push

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/builds/*.ts \
  packages/core/__tests__/builds/*.ts
```

`.changeset/builds-serializer.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): add Build serialization + URL share links (sub-phase 8.1)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/core`: **módulo novo `builds/`** con
  serialización JSON e share links URL-safe:
  - **`BuildSerializer`** (público): `serialize(build): string`
    + `deserialize(str): Result<Build>`. Cero compresión (JSON
    puro); validación de shape mínima en deserialize.
  - **`UrlSerializer`** (público): `encodeForUrl(build): string`
    + `decodeFromUrl(code): Result<Build>`. Base64url para
    URL-safety (cero `+`, `/`, `=`).
  - **`base64url`** helpers (internos): implementación con
    TextEncoder/TextDecoder + btoa/atob (cero deps; Node 16+
    e browsers modernos).
- `TreeEngine`: 2 APIs públicas novas:
  - **`shareBuild(opts?: { baseUrl?: string }): BuildShareLink`**
    — constrúe un BuildShareLink co estado actual codificado a
    base64url. Se se pasa `baseUrl`, constrúe a `url` completa
    como `baseUrl + shortCode`.
  - **`loadFromShareLink(code: string): Result<Build>`** —
    decodifica un shortCode a Build. **NON aplica o estado ao
    engine** (require coordinación con 8.2 Snapshots para
    aplicar; documentado na JSDoc).
- `@yggdrasil-forge/common`: **3 ErrorCodes novos** baixo prefixo
  novo **`YGG_B*` (Builds)**:
  - `BUILD_DESERIALIZE_FAILED` (`YGG_B001`): JSON parse falla.
  - `BUILD_INVALID_SHAPE` (`YGG_B002`): shape do JSON non coincide
    con Build.
  - `SHARE_LINK_DECODE_FAILED` (`YGG_B003`): base64url decode
    falla.
  - Mensaxes localizadas gl/es/en para cada un.

### Note
- Sub-fase 8.1 PRIMEIRA da Fase 8 (8 sub-fases prescritas: 8.1
  BuildSerializer + UrlSerializer, 8.2 Loadouts + Snapshots, 8.3
  RespecManager, 8.4 PluginManager + HookRunner, 8.5 Plugins
  oficiais, 8.6 SearchPlugin + @search, 8.7 ValidatorEngine, 8.8
  Read-only mode).
- **Cero compresión** (Opción A do director): JSON puro + base64url.
  Builds pequenas caben cómodamente en URLs. **Compresión via `pako`
  ou similar DIFERIDA** a sub-fase futura se require (e.g., builds
  > 10 KB).
- **`loadFromShareLink` NON aplica o estado** ao engine: limítase a
  decodificar + validar shape. O consumidor é responsable de:
  1. Verificar que `build.treeId` e `build.treeVersion` son
     compatibles co engine actual.
  2. Aplicar `build.state` mediante mecanismo apropiado (e.g.,
     crear novo TreeEngine con ese estado, ou aplicar via
     mecanismo de futura sub-fase 8.2 Snapshots).
- **`qrCode` e `embedUrl` do BuildShareLink seguen `undefined`**
  (DIFERIDOS; sub-fase futura específica fora da Fase 8).
- **DIFERIDOS**: 8.2-8.8.
- **Cero deps de npm engadidas**.
- **Cero modificación de packages/storage/, packages/react/** ou
  outros 14 paquetes scaffold. **Cero modificación de
  packages/search/ ou packages/validators/** (diferidos a 8.6/8.7).
- **Cero modificación de calquera test existente** (1523 core +
  60 common + 193 storage + 116 react = 1892 tests intactos).
- **Cero modificación de pezas existentes en packages/core/src/**
  salvo TreeEngine.ts (+imports +2 métodos) e index.ts (+exports).
- **Novo prefixo de ErrorCodes `YGG_B*` (Builds)** introducido
  segundo convención de prefixos por categoría establecida en
  fases anteriores.
```

Commit Conventional:
`feat(core): add Build serialization + URL share links (sub-phase 8.1)`

Push directo a `origin/main` (base `458b56b`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 458b56b)
✅ Módulo packages/core/src/builds/ creado (3 ficheiros NOVOS):
   - base64url.ts (interno; helpers TextEncoder + btoa/atob)
   - BuildSerializer.ts (público; serialize + deserialize + Result)
   - UrlSerializer.ts (público; encodeForUrl + decodeFromUrl)
✅ TreeEngine APIs novas: shareBuild() + loadFromShareLink()
✅ 3 ErrorCodes novos baixo prefixo YGG_B* (Builds):
   - YGG_B001 BUILD_DESERIALIZE_FAILED
   - YGG_B002 BUILD_INVALID_SHAPE
   - YGG_B003 SHARE_LINK_DECODE_FAILED
✅ Mensaxes localizadas gl/es/en para os 3 ErrorCodes
✅ Cero compresión (Opción A; JSON puro + base64url)
✅ T0.2 verificación empírica: Build exports xa presentes,
   últimos ErrorCodes E036, btoa/atob/TextEncoder dispoñibles
   en Node, JsonSerializer comment "NO serializa builds"
✅ T2 verificación common: 60 tests previos pasan intactos
✅ T6 verificación intermedia core: 1523 tests previos pasan
   intactos
✅ CERO modificación de pezas existentes en packages/core/src/
   salvo TreeEngine.ts (+imports +2 métodos) e index.ts (+exports)
✅ CERO modificación de tests existentes (1523 core, 60 common,
   193 storage, 116 react = 1892 intactos)
✅ CERO modificación de packages/storage/, packages/react/, ou
   outros 14 paquetes scaffold
✅ CERO modificación de packages/search/ ou packages/validators/
✅ CERO deps de npm engadidas
✅ Tests: 1523 + 22 = ~1545 core tests
   - 4 base64url (roundtrip, UTF-8, URL-safe, edge cases)
   - 6 BuildSerializer (serialize, deserialize, errores, optionals)
   - 6 UrlSerializer (encode, decode, base64url inválido, UTF-8)
   - 6 TreeEngine.shareBuild (basic, baseUrl, decodificable,
     loadFromShareLink, error, roundtrip end-to-end)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - base64url.ts: 100/100/100/100
   - BuildSerializer.ts: 100/100/100/100
   - UrlSerializer.ts: 100/100/100/100
   - TreeEngine.ts: <baseline mantida ou superada>
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.1 PRIMEIRA da Fase 8.
   - 7 sub-fases pendentes (8.2-8.8).
   - 38 sub-fases consecutivas sen rollback.
   - Compresión DIFERIDA (sub-fase futura se require).
   - loadFromShareLink NON aplica estado (require 8.2 Snapshots).
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 13 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.2 (Loadouts + Snapshots).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.1. **PRIMEIRA sub-fase da Fase 8**. Engade módulo
novo `builds/` con 3 funcións puras (base64url interno,
BuildSerializer + UrlSerializer públicos) + 2 APIs en TreeEngine
+ 3 ErrorCodes baixo prefixo novo YGG_B*. **Cero compresión** (Opción
A confirmada). Risco MEDIO: peza nova ben acoutada (~225 liñas
código + ~440 tests; 13 ficheiros tocados). Cero modificación de
pezas existentes salvo TreeEngine cirúrxico + 2 ficheiros de common.
Establece patrón "builds" para 8.2 (Loadouts + Snapshots) e 8.3
(RespecManager). Calquera dúbida → ESCALAR.*

*Lección 7.5 L1 aplicada: T0.2 verifica empíricamente Build exports,
último ErrorCode, dispoñibilidade de btoa/atob/TextEncoder en
runtime Node, e comportamento de JsonSerializer existente (cero
solapa con BuildSerializer).*
