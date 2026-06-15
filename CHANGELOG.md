# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **`SearchPlugin`** en @yggdrasil-forge/search: wrapper Plugin sobre
  SearchEngine. permissions ['read_state'], install auto-indexa,
  API: search/reindex/getEngine.
- README.md substituído con sección Search completa.

### Note
- 🎯 FASE 8.6 PECHADA: SearchEngine + SearchPlugin completos.

## [Unreleased]

### Added
- **`@yggdrasil-forge/search`** paquete activado. SearchEngine
  standalone: substring case-insensitive, scoring por campo
  (name=10, searchKeywords=7, description=5, tags=3), sort
  descendente, limit configurable. DT-14 fix aplicado.
- Adaptación: `NodeDef.label` (non `name`) + `LocalizedString`
  flatten para tódalas variantes i18n indexadas.

### Changed
- smoke.test.ts → SearchEngine.test.ts (git mv; 21 tests reais).

## [Unreleased]

### Added
- **`DebugPlugin`** segundo plugin oficial en @yggdrasil-forge/plugins.
  Loga operacións do TreeEngine via 8 hooks (incluído computeCost
  preparación). DebugOptions: enabled (default true), logLevel
  (default debug). before* devolven true, compute* devolven
  defaultResult inchanged.

### Note
- 🎯 FASE 8.5 PECHADA: HistoryPlugin + DebugPlugin completados.

## [Unreleased]

### Added
- **`@yggdrasil-forge/plugins`** paquete novo + scaffold completo.
  DT-14 fix aplicado proactivamente en tsup.config.ts.
- **`HistoryPlugin`** primeiro plugin oficial: tracking de unlock/
  lock/respec via after* hooks, FIFO con maxSize default 100, API
  pública (getHistory, clearHistory, size, getMaxSize), uninstall
  cleanup.

### Changed
- `TreeEngine.ts` línea 1295: comentario actualizado ("integrados
  en 8.4.c" en lugar de "DIFERIDOS a 8.4"). Cero impacto funcional.

## [Unreleased]

### Added
- **TreeEngine.unlock**: hooks `runBeforeUnlock` (cancela con PL007)
  + `runAfterUnlock` (tras éxito).
- **TreeEngine.lock**: hooks `runBeforeLock` + `runAfterLock`.
- **TreeEngine.respec**: hooks `runBeforeRespec` + `runAfterRespec`.
  Cero hooks se nodeIdsToLock.length === 0.
- **TreeEngine.canUnlock**: `runComputeUnlockability` só ao return
  final. Early returns inchanged.
- `OPERATION_CANCELLED_BY_HOOK` (`YGG_PL007`) con mensaxe gl/es/en.

### Note
- Sub-fase 8.4.c ÚLTIMA das 3 de 8.4. Plugins funcionais end-to-end.
- Garantía dura backward-compat: 1655 tests previos intactos (303
  dependentes de unlock/lock/respec/canUnlock OK).
- computeCost DIFERIDO. actor no HookContext DIFERIDO.

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: **`PluginAPI` class interna** (6 métodos:
  registerHook → HookRunner, emit → EventEmitter, log → console,
  registerCondition/Layout/StorageAdapter → PL003 NOT_IMPLEMENTED).
- `PluginEngineHandle`: **tipo real** en types/plugin.ts (10 getters
  readonly; antes era `unknown`).
- `@yggdrasil-forge/common`: **3 ErrorCodes novos** YGG_PL003/PL005/PL006
  (reúsase PLUGIN_INSTALL_FAILED P001 existente).

### Changed
- `PluginManager`: constructor `(engineHandle, hookRunner, events,
  locale?)`; register chama install() con rollback; unregister chama
  uninstall() best-effort + cleanup hooks.
- `TreeEngine`: constructor crea HookRunner (onError → pluginError)
  + engineHandle (10 getters) + pasa a PluginManager.
- `PluginManager.test.ts`: helper makePluginManager + test #8
  modificado (excepción documentada: interno en construción).

### Note
- Sub-fase 8.4.b.ii: plugins son agora funcionais (install chamado
  con engineHandle + PluginAPI). Hooks NON chamados aínda (8.4.c).
- Conflicto PLUGIN_INSTALL_FAILED (P001 existente vs PL004 prescrito)
  resolto reusando P001.

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: **`HookRunner` class interna standalone**
  en `packages/core/src/plugins/HookRunner.ts`. Xestiona rexistro
  + execución dos 8 hooks tipados en `Hooks` interface.
  - `register(name, pluginId, handler)` + `unregisterAllForPlugin`.
  - 3 `runBefore*` async (cero short-circuit), 3 `runAfter*` async,
    2 `runCompute*` sync (chain pattern).
  - Captura de erros via `onError` callback opcional.

### Note
- Sub-fase 8.4.b.i: HookRunner standalone. Cero modificación de
  PluginManager (8.4.b.ii), TreeEngine (8.4.c), types, nin tests.
- Cero ErrorCodes novos. Cero PluginAPI. Cero deps.

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: **`PluginManager` class interna** en
  `packages/core/src/plugins/` (in-memory `Map<id, Plugin>` con 4
  métodos: `register` async, `unregister` async, `get` sync,
  `list` sync). Cero export público (interno).
- `TreeEngine`: **4 APIs públicas novas**:
  - `registerPlugin(plugin)` async — rexistra un plugin (8.4.a só
    almacena; install() en 8.4.b).
  - `unregisterPlugin(id)` async.
  - `getPlugin(id)` sync.
  - `listPlugins()` sync.
- `@yggdrasil-forge/common`: **2 ErrorCodes novos** baixo prefixo
  novo **`YGG_PL*` (Plugins)**:
  - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`).
  - `PLUGIN_NOT_FOUND` (`YGG_PL002`).
  - Mensaxes localizadas gl/es/en.

### Note
- Sub-fase 8.4.a PRIMEIRA das 3 sub-sub-fases de 8.4.
- Cero chamada a `plugin.install()` en 8.4.a. Plugins rexistrados
  son datos inactivos ata 8.4.b implemente PluginAPI.
- Cero HookRunner, cero PluginAPI implementación (DIFERIDOS a 8.4.b).
- Cero modificación de unlock/lock/respec (DIFERIDO a 8.4.c).
- Lección 8.3 L1 aplicada: T0.2 confirmou ausencia das 4 APIs.
- Cero deps de npm engadidas.
- Cero modificación de tests existentes (1969 intactos).

## [Unreleased]

### Added
- `TreeEngine.respec()`: **extended signature** (backward-compatible):
  - `respec(nodeIdOrIds?: string | readonly string[], opts?: RespecOptions)`.
  - **Backward-compatible**: `respec()` e `respec('a')` manteñen
    comportamento idéntico ao previo (cero impacto en 19 tests
    existentes).
  - **Novo**: array `string[]` como primeiro arg → respec selectivo
    múltiple + cascade conxunta.
  - **Novo**: `opts.costPercent` ∈ [0, 100] (penalty model; default
    0 = full refund). Fórmula:
    `refunded = floor(original_total_cost * (1 - costPercent / 100))`.
- `@yggdrasil-forge/core`: `RespecOptions` interface novo en
  `types/unlock.ts`. Re-exportado desde `types/index.ts`.
- `@yggdrasil-forge/common`: **1 ErrorCode novo** baixo prefixo
  existente `YGG_B*`:
  - `RESPEC_INVALID_COST_PERCENT` (`YGG_B007`): validación tras
    read-only check.
  - Mensaxes localizadas gl/es/en.

### Note
- Sub-fase 8.3 REVISED: rediseño completo tras escalación do
  Executor que detectou método `respec` existente (~150 liñas + 19
  tests dependentes). Briefing orixinal 8.3 era roto por erro do
  Director. Cero rollback de main: cadea 39 sub-fases intacta.
- Modificación cirúrxica backward-compatible do método existente
  en lugar de crear un novo ou reemplazar.
- Cero `RespecManager.ts` standalone (overengineering rejeitado).
- Lección 8.3 L1 capturada para A.6 do MASTER post-Fase 8.
- Hooks beforeRespec/afterRespec DIFERIDOS a 8.4.
- Cero reset progress (MASTER 2.4.b §5.8 preservado).
- Cero deps de npm engadidas.
- Cero modificación de tests existentes (1957 intactos).

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: **SnapshotManager + LoadoutManager**
  (internos) con 8 APIs públicas novas en TreeEngine:
  - **Snapshots**: `snapshot(label?)`, `restoreSnapshot(id)`,
    `listSnapshots()`, `deleteSnapshot(id)`.
  - **Loadouts**: `saveLoadout(name)`, `loadLoadout(name)`,
    `listLoadouts()`, `deleteLoadout(name)`.
- **Opción C+ implementada**: in-memory `Map<>` por defecto +
  opt-in persistencia via `TreeEngineOptions.storage?`
  (`StorageAdapter`). Write-through cache; lazy init na primeira
  chamada CRUD.
- **Tipo `Loadout` novo** en `types/build.ts`: `{ name, build,
  updatedAt }`. Re-exportado vía `types/index.ts`.
- **`TreeEngineOptions.storage?`** novo: `StorageAdapter` opcional
  para persistencia de loadouts e snapshots. Prefixos
  `snapshots:` e `loadouts:`.
- **4 eventos novos en EventMap**: `snapshotCreated`,
  `snapshotRestored`, `loadoutSaved`, `loadoutLoaded`.
- `@yggdrasil-forge/common`: **3 ErrorCodes novos** baixo prefixo
  existente `YGG_B*`:
  - `SNAPSHOT_NOT_FOUND` (`YGG_B004`).
  - `LOADOUT_NOT_FOUND` (`YGG_B005`).
  - `LOADOUT_NAME_INVALID` (`YGG_B006`).
  - Mensaxes localizadas gl/es/en para cada un.

### Note
- Sub-fase 8.2 SEGUNDA da Fase 8.
- **Restore semantics**: `restoreSnapshot` e `loadLoadout` APLICAN
  state ao engine via `replaceTreeState` +
  `invalidate(ALL_CACHE_TYPES)` + emit event (vs
  `loadFromShareLink` de 8.1 que NON aplica).
- **Cero validación de versión** en restore (Opción A; DIFERIDO a
  sub-fase futura con migración coordinada con MigrationRunner).
- **Lazy init confirmado** (Opción A): cero auto-load no
  constructor. Primeira chamada CRUD carga desde storage.
- **Save replaces**: `saveLoadout('Tank')` sobreescribe se xa
  existe (refrescando updatedAt). Cero erro.
- **Loadout name validation**: rejecta empty e whitespace-only
  (`LOADOUT_NAME_INVALID`). Case-sensitive lookup.
- **DIFERIDOS**: 8.3-8.8; version check en restore; migración de
  state; límite máximo de snapshots/loadouts; auto-cleanup.
- **Cero deps de npm engadidas**.
- **Cero modificación de pezas existentes** salvo TreeEngine.ts
  (+imports +2 membros +8 APIs) e 4 ficheiros de tipos.

## [Unreleased]

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
- **APLICACIÓN OPCIÓN A** (conflito serialize/deserialize con
  JsonSerializer): exports en core/index.ts renomeados a
  `serializeBuild` / `deserializeBuild`. Funcións internas en
  BuildSerializer.ts mantéñense con nomes orixinais. Lección 8.1 L1.
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

## [Unreleased]

### Documentation
- 🎉 FASE 7 PECHADA OFICIALMENTE no MASTER: Anexo A (13 entradas),
  cadea pechada (36 sub-fases sen rollback), métricas finais, A.6
  leccións (7.2 L1, 7.3 L1, 7.5 L1, 7.6 L1, 7.7 L1). Cero código.

## [Unreleased]

### Changed
- Code hygiene post-Phase 7: resolto 6 das 9 débedas abertas de
  cobertura/SSR-safety. Cero cambio funcional observable.
- +4 tests Announcer (locale es/en unlock+lock, lock gl, formatMessage
  lock). Cobertura 72.72/60 → 100/100.
- +1 test SkillTree (pass-through onNodeLongPress). 100/92.3 → 100/100.
- v8 ignores xustificados: svg-helpers.ts (rama cubic), SVGRenderer.tsx
  (rama background). Ambos a 100/100.
- Migración SSR-safety: SkillTree.tsx + useSkillTree.ts getServerSnapshot
  no 3º param de useSyncExternalStore.
- JSDoc fallback intencional disabled/expired en themes/minimal.ts.

### Note
- Hixiene post-Fase 7 (cero número en MASTER §67).
- DIFERIDAS: headless.ts + server.ts 0/0/0/0 (artefactos v8).
- Changeset patch (cero cambios funcionais observables).

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: tests a11y automatizados con jest-axe
  (4 tests cero violacións WCAG en SkillTree, SkillNode,
  SkillTreeStatic, SkillTreeAnnouncer).
- Tests SSR no-dom-imports guard (3 tests sobre 9 ficheiros
  server-safe: cero acceso a window/document/navigator).

### devDependencies
- jest-axe + @types/jest-axe (testing infrastructure; única
  excepción "cero deps" xustificada por MASTER §32+§107).

### Note
- Sub-fase 7.12 DÉCIMA SEGUNDA E ÚLTIMA da Fase 7.
- 🎉 FASE 7 PECHADA OFICIALMENTE — 12 sub-fases sen rollbacks.
- DIFERIDOS: Playwright + visual regression + tests E2E.
- Cero modificación de compoñentes ou tests existentes.
- Próximo: hixiene MASTER post-Fase 7 (10 débedas acumuladas).

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: novo compoñente **`SkillTreeErrorBoundary`**
  (class component). Captura erros de render nos descendants e
  renderiza fallback (ReactNode ou render prop con error+reset).
  Props: `fallback`, `onError?`, `children`. Method `reset()` para
  retry. Exportado desde root e `/headless`; cero exposición en
  `/server`.

### Note
- Sub-fase 7.11 DÉCIMA PRIMEIRA da Fase 7 (12 sub-fases totais).
- Primeiro class component en packages/react.
- DIFERIDO: 7.12 (tests visuais + a11y + SSR).
- Cero deps de npm engadidas. Cero ErrorCodes novos.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: soporte para long press en mobile/touch:
  - `SkillNode`: prop `onLongPress?` + `longPressDuration?` (700ms).
    Implementación con useRef + setTimeout + 4 PointerEvent handlers.
  - `SkillTree`: prop `onNodeLongPress?` con pass-through a SkillNode.
- Touch target 44x44px xa cuberto (NODE_RADIUS=24, diámetro=48).

### Changed
- `SkillNode.tsx` agora ten `'use client'` (consecuencia de useRef).
  renderToString segue funcionando (SSR-safety mantida).

### Note
- Sub-fase 7.10 DÉCIMA da Fase 7 (12 sub-fases totais).
- DIFERIDOS: pinch+pan (Fase 9), double tap, bottom sheets.
- Cero deps de npm engadidas. Cero ErrorCodes novos.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: terceiro entry point `/server` (RSC-safe):
  - **`SkillTreeStatic`**: compoñente puro sen hooks que renderiza
    estaticamente con treeDef + state. Cero 'use client', cero
    `<style>` interno.
  - **`computeLayout`**: re-exportado do core (función pura).
  - **`serializeForClient(treeDef, state?)`**: serializa a JSON con
    escape de `<`/`>` para inxección segura en `<script>` tags.
- package.json exports + tsup.config.ts: 3 entry points
  (root, /headless, /server).

### Note
- Sub-fase 7.9 NOVENA da Fase 7 (12 sub-fases totais).
- getServerSnapshot funcionalmente idéntico a getSnapshot; migración
  diferida a hixiene MASTER post-Fase 7.
- DIFERIDOS: 7.10 (mobile/touch), 7.11 (error boundaries), 7.12
  (tests visuais).
- Cero deps de npm engadidas. Cero ErrorCodes novos.
- Cero modificación de compoñentes ou tests existentes.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: respect for `prefers-reduced-motion`.
  O output de `buildAnimationsCSS` inclúe un bloque
  `@media (prefers-reduced-motion: reduce)` que aplica
  `transition: none !important` e `animation: none !important`
  aos elementos animados. Graceful degradation para browsers sen
  soporte.

### Note
- Sub-fase 7.8 OITAVA da Fase 7 (12 sub-fases totais).
- Cero modificación de SVGRenderer (integración xa feita en 7.6).
- DIFERIDOS: 7.9 (SSR/RSC), 7.10 (mobile/touch), 7.11 (error
  boundaries), 7.12 (tests visuais).
- Cero deps de npm engadidas. Cero ErrorCodes novos.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: novo compoñente público **`SkillTreeAnnouncer`**:
  live region ARIA invisible que anuncia eventos `unlock` e `lock` do
  engine. Mensaxes localizadas gl/es/en. Override vía `formatMessage`.
  Estilo sr-only inline. Exportado desde root e `/headless`.
- `SkillNode`: aria-label mellorado con info de estado actual
  (patrón: `"{label}, {stateLabel}"`).

### Fixed
- Resolve débeda de cobertura histórica de SkillNode desde 7.2:
  novos tests cobren keyboard handlers e resolveLabel fallbacks.

### Note
- Sub-fase 7.7 SÉTIMA da Fase 7 (12 sub-fases totais).
- DIFERIDOS: jest-axe, arrow-key navigation 2D, focus management,
  aria-pressed/aria-current, announcements para outros eventos.
- Cero deps de npm engadidas. Cero ErrorCodes novos.
- Cero modificación de compoñentes ou tests existentes (salvo
  SkillNode: aria-label mellorado).

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: animation framework básico (CSS-only):
  - Módulo interno `animations.ts` con `buildAnimationsCSS(themeId)`.
  - SVGRenderer integra animacións ao `<style>` interno con tema activo.
  - 4 efectos: transitions fill/stroke nos nodos, hover en nodos
    clickables, pulse para `data-state="unlockable"` (`@keyframes
    yf-pulse`), transitions de stroke en edges.
  - Comments delimitadores `ANIMATION BLOCK START/END` (prep 7.8).

### Note
- Sub-fase 7.6 SEXTA da Fase 7 (12 sub-fases totais).
- Modo headless: cero animacións automáticas.
- DIFERIDOS: prefers-reduced-motion (7.8), Framer Motion (futura).
- Cero deps de npm engadidas. Cero ErrorCodes novos.
- Cero modificación de compoñentes ou tests existentes (salvo
  SVGRenderer ampliouse con +2 tests).

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: módulo de hooks customizados:
  - **`useSkillTree(engine)`**: devolve `TreeState` reactivo.
  - **`useNodeState(engine, nodeId)`**: devolve `NodeInstance | null`.
  - **`useNodeSelector<T>(engine, nodeId, selector)`**: subscribe
    selectivamente. O selector debe ser referencialmente estable.
  - **`useStat(engine, statId)`**: devolve `number` reactivo.
- Tódolos hooks dispoñibles tanto desde root entry como desde
  `/headless` (independentes do tema).

### Note
- Sub-fase 7.5 QUINTA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS** (require APIs en core): useTreeChanges, useGroupNodes,
  useVisibleNodes.
- **DIFERIDOS Fase 7**: animacións (7.6), keyboard/ARIA (7.7),
  prefers-reduced-motion (7.8), SSR/RSC (7.9), mobile/touch (7.10),
  error boundaries (7.11), tests visuais (7.12).
- SkillTree NON refactorizado para usar useSkillTree internamente.
- Cero deps de npm engadidas.
- Cero ErrorCodes novos.
- Cero modificación de compoñentes ou tests existentes.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: sistema de temas completo:
  - **`Theme` interface** + tipos auxiliares (`ThemeColors`, `ThemeSizes`).
    Tokens documentados como contrato público estable.
  - **`minimal: Theme`** const exportada: tema default minimalista neutro.
    Aplicado automáticamente cando se importa `SkillTree` desde o entry
    point principal.
  - **`ThemeProvider`** compoñente público que distribúe un tema aos
    descendentes via React Context.
- **Refactor de SVGRenderer**: consume internamente `useTheme()` +
  `useId()`. Cando hai un tema activo, inxecta CSS variables como
  `style` inline no `<svg>` raíz + un `<style>` element interno con
  regras default scopeadas via `[data-theme-id="..."]`.
- **Autoload do tema `minimal`**: `SkillTree` exportado desde o root
  entry é un wrapper (`SkillTreeWithDefaultTheme`) que envolve o core
  `SkillTree` cun `<ThemeProvider theme={minimal}>`.
- **Novo entry point `/headless`**: `@yggdrasil-forge/react/headless`
  re-exporta os mesmos compoñentes **sen** o wrapper de autoload.
  Non re-exporta `ThemeProvider`, `Theme`, ou `minimal`.
- CSS variables públicas: `--yf-color-text`,
  `--yf-color-node-locked/unlockable/unlocked/maxed/in_progress`,
  `--yf-color-node-stroke`, `--yf-color-edge`, `--yf-color-mesh`,
  `--yf-stroke-width`, `--yf-font-size`, `--yf-font-size-small`,
  `--yf-color-background` (opcional).

### Note
- Sub-fase 7.4 CUARTA da Fase 7 (12 sub-fases totais).
- **DIFERIDO**: tema `oberon` (vive en `@yggdrasil-forge/themes`).
- **DIFERIDOS**: hooks customizados (7.5), animacións CSS (7.6),
  keyboard/ARIA (7.7), prefers-reduced-motion (7.8), SSR/RSC entry
  points (7.9), mobile/touch (7.10), error boundaries (7.11), tests
  visuais (7.12).
- **`SVGRenderer` deixa de ser compoñente puro**: engadiuse
  `'use client'`. Mantén SSR-safe via useId.
- **Convención sobre ThemeProvider + autoload**: o wrapper do root
  entry envolve incondicionalmente en `<ThemeProvider theme={minimal}>`.
  Para temas custom, importar `SkillTree` desde `/headless` e envolver
  explicitamente.
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx,
  MeshOverlay.tsx, svg-helpers.ts, createDefaultLayoutRegistry.ts**
  ou os seus tests.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: dous compoñentes públicos novos:
  - `MeshOverlay`: compoñente puro que renderiza `layoutResult.mesh`
    como `<g>` con `<line>` / `<circle>` / `<polygon>` segundo o
    `MeshElement.type` (3 literais: 'line', 'circle', 'polygon').
    Tipicamente xerado por `RadialLayout` (anel concéntrico, cross,
    star, polygon perimetral). Devolve null cando `mesh` é undefined
    ou array vacío (cero overhead DOM).
  - `SVGRenderer`: wrapper público para `<svg>` con viewBox calculado
    automáticamente desde `bounds + padding`, role/aria, classes
    documentadas (`yf-skill-tree`, `yf-skill-tree--error`,
    `data-layout`, `data-error`), e modo erro explícito. Reutilizable
    para que consumidores avanzados compoñan vistas custom (ex:
    `<SVGRenderer bounds={...}><SkillNode .../></SVGRenderer>`).
- `SkillTree` refactorizado internamente para usar `SVGRenderer` +
  `MeshOverlay`. **Cero cambio funcional observable** para o
  consumidor.
- `SkillEdge` refactorizado para importar `buildPathD` desde un
  módulo interno `svg-helpers.ts` (compartido con `SVGRenderer`).
  Cero cambio observable.

### Note
- Sub-fase 7.3 TERCEIRA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS**: ThemeProvider + temas (7.4), hooks customizados
  (7.5), animacións CSS (7.6), keyboard navigation + ARIA (7.7),
  prefers-reduced-motion (7.8), SSR + RSC entry points (7.9),
  mobile/touch (7.10), error boundaries (7.11), tests visuais (7.12).
- **Classes CSS novas (contrato público estable)**:
  `yf-mesh-overlay`, `yf-mesh-overlay__line`, `yf-mesh-overlay__circle`,
  `yf-mesh-overlay__polygon`. Reutilizables por ThemeProvider en 7.4.
- **`MeshOverlay` e `SVGRenderer` son compoñentes puros** (cero
  hooks, cero `'use client'`); usables tanto en server como en client.
- **`SkillTree` mantén `'use client'`** (usa hooks).
- **`svg-helpers` é módulo interno**, non exportado publicamente.
- **Cero deps de npm engadidas** (cero modificación de package.json
  ou pnpm-workspace.yaml).
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **SkillNode.tsx cobertura (73.33/52.17/75/69.23) mantense igual**;
  cubrirase naturalmente en 7.7 (keyboard navigation).

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: tres compoñentes públicos novos:
  - `SkillTree`: compoñente raíz SVG que toma un `TreeEngine` como
    prop e renderiza a árbore enteira. Subscríbese ao engine via
    `useSyncExternalStore` nativo de React 18+ (re-render automático).
    Computa layout internamente via `computeLayout` cun
    `LayoutEngineRegistry` default (Identity + Radial + Tree). Acepta
    props opcionais: `locale`, `onNodeClick`, `onEdgeClick`,
    `layoutRegistry` (override), `padding`. Marcado `'use client'`.
  - `SkillNode`: átomo de nodo. Renderiza `<g>` con `<circle>` +
    `<text>`. Props: `node`, `instance`, `position`, `onClick`. Compoñente
    puro (sen hooks; usable tanto en server como en client).
  - `SkillEdge`: átomo de edge. Renderiza `<path>` SVG cun `d`
    derivado de `EdgePath.points` + `EdgePath.kind` (`'line'`,
    `'cubic'`, `'polyline'`). Props: `edgeId`, `edge`, `path`,
    `onClick`. Compoñente puro.
- **Headless por defecto**: cero estilos hardcoded. Classes CSS
  documentadas (yf-skill-tree, yf-skill-tree--error, yf-skill-edges,
  yf-skill-nodes, yf-skill-node, yf-skill-node__circle,
  yf-skill-node__label, yf-skill-node__progress, yf-skill-edge) +
  data-attributes como contrato público estable para ThemeProvider
  (7.4) e temas.
- **SSR-safe**: verificable con `renderToString` (cero DOM access).
- `@yggdrasil-forge/core` engadido como dependency (require os tipos
  + 3 layout classes + computeLayout).
- Catálogo pnpm-workspace.yaml ampliado con 3 entradas: jsdom ^25.0.0,
  @testing-library/react ^16.0.0, @vitejs/plugin-react ^4.3.0
  (reutilizables en sub-fases 7.3-7.12).

### Note
- Sub-fase 7.2 SEGUNDA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS**: MeshOverlay/SVGRenderer dedicados (7.3), ThemeProvider +
  temas Oberón/minimal (7.4), hooks customizados (7.5), animacións
  CSS (7.6), keyboard navigation + ARIA (7.7), prefers-reduced-motion
  (7.8), SSR + RSC entry points (7.9), mobile/touch (7.10), error
  boundaries (7.11), tests visuais (7.12).
- **Reactividade**: SkillTree usa `useSyncExternalStore` (hook NATIVO
  de React; cero hook customizado do paquete).
- **Cero `'use client'` en SkillNode e SkillEdge** (puros sen hooks).
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.

## [Unreleased]

### Added
- `@yggdrasil-forge/react`: dependencias de React 19 + configuración
  inicial. React 19.2.7 (latest stable) e react-dom 19.2.7 declarados
  como `peerDependencies` (`^19.2.7`) e como `devDependencies` exactas
  (via catálogo pnpm) para tests internos. `@types/react` ^19.0.0 e
  `@types/react-dom` ^19.0.0 engadidos a devDependencies. Catálogo
  pnpm-workspace.yaml ampliado con 4 entradas (react, react-dom,
  @types/react, @types/react-dom) para reutilización en futuros paquetes
  da Fase 7+ (devtools, themes, heatmap).
- Configuración JSX no tsconfig do paquete (`"jsx": "react-jsx"`)
  para usar o automatic runtime moderno (cero `import React` necesario
  en ficheiros TSX).
- Smoke test ampliado (3 tests): verifica que React 19 pode renderizar
  un compoñente trivial vía `react-dom/server.renderToString` (cero
  DOM environment requerido para 7.1; jsdom engadirase cando 7.2+
  introduza compoñentes para renderizar no cliente).

### Note
- Sub-fase 7.1 PRIMEIRA da Fase 7 (React Renderer + a11y + SSR + RSC).
- **Cero compoñentes reais**: `SkillTree`, `SkillNode`, `SkillEdge` van
  en 7.2. `ThemeProvider` + temas en 7.4. Hooks en 7.5. SSR + RSC
  entry points (`/server`, `/headless`) en 7.9.
- **Critical security context**: React 19.2.7 escollido (latest stable
  do 1-jun-2026) por seguranza ante CVE-2025-55182 (React2Shell) que
  afecta 19.0.0–19.2.2.
- **Cero modificación de packages/core/, packages/common/,
  packages/storage/ ou outros 15 paquetes scaffold**. Sub-fase
  infraestrutura pura.
- **Cero ErrorCodes novos**.

## [Unreleased]

### Added

- `@yggdrasil-forge/core`: interface mínima de control de permisos no
  `TreeRegistry` para multi-tenancy. Novos tipos públicos
  `PermissionAction` (union de 5 literais: 'createEngine',
  'removeEngine', 'saveBuild', 'loadBuild', 'removeBuild') e
  `PermissionChecker` interface (un só método `check(action, userId):
  boolean | Promise<boolean>`). Engadido campo opcional
  `permissions?: PermissionChecker` a `TreeRegistryOptions`.
  TreeRegistry consulta o checker antes das 5 operacións de mutación
  per-user; se devolve `false`, a operación falla con
  `PERMISSION_DENIED` (YGG_E036). Operacións de lectura e
  administrativas NON consultan permissions — modelo enriquecido vía
  hooks de 8.4 PluginManager poderá estender.
- `@yggdrasil-forge/common`: ErrorCode `YGG_E036` `PERMISSION_DENIED`
  con mensaxes localizadas gl/es/en e placeholders `{action}/{userId}`.

### Fixed

- `@yggdrasil-forge/core`: `TreeRegistry.save()` agora propaga
  correctamente erros internos de `quotaCheckedSet` e `persistEngine`.
  Antes ignorábaos silenciosamente (patrón fire-and-forget preexistente
  desde 6.1; documentado como DT-26 post-6.4). Garantía actual: "first
  error wins". **Resolve DT-26**.

### Note

- Sub-fase 6.5 QUINTA E ÚLTIMA da Fase 6. **Fase 6 (TreeRegistry +
  Multi-tenancy) completa**.
- **Cero opt-in necesario para back-compat**: `permissions: undefined`
  → cero overhead, comportamento idéntico a 6.4.
- **Modelo enriquecido difírido a 8.4** (MASTER §67).
- **Orde de checks**: PERMISSION primeiro, QUOTA despois.
- **`removeBuild(buildId)`** non ten `userId` param; o executor
  resolve co `owner` do build atopado polo lookup interno (§0.6).
- **Cero modificación de packages/storage/**. Cero modificación de
  pezas de core fora de TreeRegistry.

## [Unreleased]

### Added

- `@yggdrasil-forge/core`: cotas configurables no `TreeRegistry` para
  multi-tenancy. Nova interface pública `QuotaConfig` con tres campos
  opcionais individuais:
  - `maxUsers`: número máximo de usuarios rexistrados (`createEngine`
    falla con `QUOTA_USERS_EXCEEDED` cando se excede).
  - `maxBuildsPerUser`: builds máximos por usuario (`saveBuild` falla
    con `QUOTA_BUILDS_EXCEEDED` cando se excede; `importBuilds` bypassa
    intencionalmente para permitir restauración).
  - `maxStorageBytes`: total de bytes acumulados nas escrituras de
    TreeRegistry (`JSON.stringify(value).length` por clave; helper
    privado `quotaCheckedSet`/`Delete` envolve os 9 callsites
    existentes). Reconstrución do accounting en `load()` (escaneo
    O(n) só se maxStorageBytes está activo).
- `@yggdrasil-forge/common`: 3 ErrorCodes novos `YGG_E033`
  `QUOTA_USERS_EXCEEDED`, `YGG_E034` `QUOTA_BUILDS_EXCEEDED`,
  `YGG_E035` `QUOTA_STORAGE_EXCEEDED`. Mensaxes localizadas gl/es/en
  con placeholders `{current}/{max}` (e `{userId}` para builds).

### Note

- Sub-fase 6.4 CUARTA da Fase 6. Permissions (6.5) DIFERIDAS.
- **Cero opt-in necesario para back-compat**: `quotas: undefined`
  resulta en pass-through directo (cero JSON.stringify, cero tracking).
- **Distinción semántica**: `QUOTA_STORAGE_EXCEEDED` (YGG_E035) é o
  límite **lóxico** (config do registry); `STORAGE_QUOTA_EXCEEDED`
  (YGG_S003) preexistente é o límite **físico** (backend de storage
  cheo). Son dominios distintos; ambos coexisten.
- **Cero modificación de packages/storage/**. Cero modificación de
  pezas de core fora de TreeRegistry.

## [Unreleased]

### Added

- `@yggdrasil-forge/storage`: nova clase `ScopedStorage` que envolve
  outro `StorageAdapter` e prefixa todas as claves cun `scope:`, para
  illar tenants nun storage compartido.
  - Constructor: `new ScopedStorage(base, scope)` (2 args posicionais,
    sen options).
  - Validación síncrona: rexeita scope vacío e scope con `':'`.
  - `clear()` itera `list(scope:) + delete` cada clave (O(n)) para
    preservar isolation cross-scope; NUNCA delega a `base.clear()`.
  - `watch` exposta condicionalmente só se o base storage a soporta.
  - Anidación soportada transparentemente
    (`ScopedStorage(ScopedStorage(base, 's1'), 's2')` resulta en
    claves `s2:s1:key`).

### Note

- Sub-fase 6.3 TERCEIRA da Fase 6.
- Quotas + Permissions DIFERIDOS a 6.4.
- **Subdivisión consciente**: MASTER §67 consolida `6.3 = ScopedStorage
  + Quotas + Permissions`; o director mantén a subdivisión adoptada en
  briefings 6.1+6.2 para reducir scope por sub-fase.
- **Cero modificación** de outros adapters, de `StorageAdapter`
  interface, de `packages/common/`, ou de `packages/core/`.
- **Cero ErrorCodes novos**.

## [Unreleased]

### Added

- `TreeRegistry` aggregate queries (todas operan directamente sobre
  storage sen instanciar TreeEngines):
  - `getAggregateStats(): Promise<AggregateStats>` — métricas globais
    (totalUsers, avgUnlockedCount, avgProgress, top/bottom-10 nodos
    máis/menos populares, completionRate).
  - `getNodePopularity(): Promise<Map<string, number>>` — count de
    usuarios con cada nodo desbloqueado (state ∈ {unlocked, maxed}).
    Inclúe nodos nunca desbloqueados (count=0).
  - `getProgressDistribution(nodeId): Promise<number[]>` — array
    determinístico (orde alfabética por userId) dos valores `progress`
    dos usuarios cuxo nodeId ten progress definido.
  - `getStuckUsers(threshold?): Promise<string[]>` — usuarios con
    menos de `threshold` nodos desbloqueados (default 1). Orde
    alfabética.
- `AggregateStats` interface pública exportada desde core.

### Note

- Sub-fase 6.2 SEGUNDA da Fase 6. ScopedStorage (6.3), Quotas +
  Permissions (6.4) seguen DIFERIDOS.
- **Precondición de consistencia**: aggregate queries leen storage
  directamente; para ver mutacións recentes de engines en cache
  (estratexia 'all-in-memory' ou 'lru'), o consumidor debe chamar
  `save()` previamente. 'on-demand' actualiza inmediatamente.
- **Subtree handling**: cero descenso a `subtreeStates`. Análise de
  sub-árbores diferida (sen signature prescrita).
- **Determinismo**: tie-breaks alfabéticos por nodeId/userId.
  `getProgressDistribution` devolve array ordenado por userId.
- **Best-effort**: storage failures por usuario individual son
  skipeados silenciosamente. `totalUsers` reflicte só usuarios con
  state persistido.
- **Cero ErrorCodes novos**, cero modificación de `@yggdrasil-forge/common`.

## [Unreleased]

### Added

- `TreeRegistry` clase: xestor de múltiples TreeEngines compartindo
  un só TreeDef.
  - Lifecycle: `createEngine`, `getEngine`, `removeEngine`,
    `listEngines`.
  - Shared tree: `getSharedTreeDef`, `applyChangesToAll`.
  - Build management completo: `saveBuild`, `loadBuild`,
    `listBuilds`, `removeBuild`, `exportAllBuilds`, `importBuilds`.
  - Persistence: `save`, `load` via StorageAdapter.
  - Cleanup: `destroy`.
- 3 cache strategies:
  - `'all-in-memory'`: todos os engines en memoria; save persiste
    todos; load carga todos eager.
  - `'lru'`: cache LRU con `maxInMemory` + `ttlMs` opcionais;
    engines cargan lazy.
  - `'on-demand'`: cero cache; getEngine carga sempre desde storage.
- `TreeRegistryOptions` + `TreeRegistryCacheConfig` types.
- ErrorCodes novos:
  - `TREE_REGISTRY_USER_NOT_FOUND` (YGG_E029)
  - `TREE_REGISTRY_USER_EXISTS` (YGG_E030)
  - `TREE_REGISTRY_BUILD_NOT_FOUND` (YGG_E031)
  - `APPLY_CHANGES_FAILED` (YGG_E032) — engadido tras T0
    confirmar inexistencia (§5.6)
  Traducidos gl/es/en.

### Note

- Sub-fase 6.1 PRIMEIRA da Fase 6 (TreeRegistry + Multi-tenancy).
- Aggregate queries (`getAggregateStats`, `getNodePopularity`,
  `getProgressDistribution`, `getStuckUsers`) DIFERIDAS a 6.2.
- `ScopedStorage` DIFERIDO a 6.3.
- `Quotas` + `Permissions` DIFERIDOS a 6.4.
- `applyChangesToAll` aplica changes só aos engines en cache;
  engines en storage non cargados non se actualizan
  automaticamente (decisión consciente; consumidor responsable).
- `importBuilds` usa `build.author` como userId; builds sen
  author son descartados silenciosamente.
- Schema de claves: `engine:${userId}:state`, `build:${buildId}`,
  `registry:userIds`, `registry:buildsIndex`, `registry:meta`.
- 4 ErrorCodes (E029-E032) en lugar dos 3 previstos;
  APPLY_CHANGES_FAILED engadido tras T0 confirmar inexistencia (§5.6).

## [Unreleased]

### Added

- `Federator` clase: utilidade para combinar múltiples TreeDefs.
  Métodos puros:
  - `detectConflicts(trees)`: detecta colisións de id en 7
    categorías (tree, node, edge, group, resource, stat, subtree).
  - `mergeTreeDefs(trees, strategy, options?)`: combina TreeDefs
    segundo unha estratexia (`'namespace_all'`, `'first_wins'`,
    `'last_wins'`, `'manual'`).
- `MergeStrategy`, `Conflict`, `ConflictReport`, `MergeOptions`,
  `MergedTreeMeta` types.
- `'namespace_all'` strategy reescribe TODAS as cross-references
  internas (edges source/target, prereqs nodeId/resourceId/
  statId/subtreeId/fromNodeId, effects nodeId/resourceId/statId,
  rootNodeId, conditional/composite recursivos, etc.)
  incluíndo all/any/none conditions.
- `'manual'` strategy devolve err(MERGE_CONFLICTS_DETECTED) se
  hai conflitos; cero conflitos → equivalente a 'first_wins'.
- 3 ErrorCodes novos: `MERGE_INVALID_INPUT` (YGG_E026),
  `MERGE_CONFLICTS_DETECTED` (YGG_E027), `MERGE_INCOMPATIBLE_SCHEMA`
  (YGG_E028), traducidos en gl/es/en.

### Note

- Sub-fase 5.3 ÚLTIMA da Fase 5. **Fase 5 PECHADA**.
- `Federator.loadFederation(sources)` **DIFERIDA** a sub-fase
  específica futura. **DT-20 NOVA**: require decisión arquitectónica
  sobre FederationSource shape (URL+CORS? File? Storage?) sin caso
  de uso real documentado. mergeTreeDefs cumpre o caso core; o
  consumidor carga TreeDefs co seu propio método e pasa.
- `mergeTreeDefs` rexeita TreeDefs con `schemaVersion` distintos
  (MERGE_INCOMPATIBLE_SCHEMA). Workflow: usar MigrationRunner antes
  de federar.
- tree.subtrees[id].nodes NON se rewrite recursivamente en
  'namespace_all' (decisión consciente: subtree é template
  interna; consumidor pode aplicar mergeTreeDefs recursivamente
  se quere flatten).
- 5.2 L2 aplicado: briefing prescribía `unlockable.prereq` /
  `all_of`/`any_of`/`children` / `group.nodes` pero a API real
  é `prerequisites: UnlockRule` / `all`/`any`/`none`/`conditions` /
  `group.nodeIds`. Corrixido transparentemente. Tamén engadidos
  rewrites para `distance_max.fromNodeId`, `modify_resource`,
  `modify_stat`, `modify_node_state`, `conditional`, `composite`.

## [Unreleased]

### Added

- `TreeEngine.getSubtreeEngine(subtreeId)`: lookup pasivo dun
  sub-engine creado. Devolve null se non existe.
- `TreeEngine.enterSubtree(subtreeId)`: crea ou recupera o
  sub-engine con sincronización automática co parent. Emite
  evento `subtreeEntered`. Devolve err(SUBTREE_NOT_UNLOCKED)
  se cero anchor con ese subtreeId está unlocked.
- `TreeEngineOptions.initialState?`: estado inicial pasado a
  StateStore. Útil para sub-engines (recuperación desde
  parentState.subtreeStates[id]) e deserialización.
- `TreeEngineOptions.activeSubtreeIds?`: conxunto de subtreeIds
  activos na cadea recursiva, propágase a través de sub-engines
  para cycle detection.
- `SubtreeManager.getOrCreateSubtreeWithSync(id, setupSync)`:
  crea sub-engine + setup callback de sincronización; o
  Unsubscribe handle gárdase no cache para liberación automática
  en destroySubtree/clear.
- `TreeEngineFactoryContext` interface: terceiro parámetro
  opcional do TreeEngineFactory para propagación de
  subtreeId + parentActiveIds.
- ErrorCode novo: `SUBTREE_NOT_UNLOCKED` (YGG_E025), traducido
  en gl/es/en.

### Changed

- `SubtreeManager` cache interno: agora garda `{ engine,
  unsubscribe }` por sub-engine; `destroySubtree` e `clear`
  liberan listeners. API pública sen cambios (5.1 tests intactos).
- `TreeEngineFactory` type: terceiro parámetro `context?:
  TreeEngineFactoryContext` opcional (cero ruptura).

### Note

- Sub-fase 5.2: integración real entre TreeEngine e
  SubtreeManager. Modelo PoE Cluster Jewels totalmente
  funcional para casos básicos.
- **Budget compartido DIFERIDO**. DT-19 NOVA non bloqueante:
  cada sub-engine usa o seu propio budget (illado por defecto).
  Para compartido (modelo PoE estrito) require refactor de
  ResourceManager con BudgetSource inxectable; diferido a
  sub-fase futura específica cando exista caso de uso demostrado.
- Sincronización parent ↔ sub-engine via subscribe (push model):
  cada mudanza no sub-engine actualiza automaticamente
  parent.state.subtreeStates[id]. Unsubscribe handles xestionados
  polo SubtreeManager para evitar memory leaks.
- Recursividade ilimitada con maxDepth=10 + cycle detection
  propagado a través de activeSubtreeIds.

## [Unreleased]

### Added

- `SubtreeManager` clase: xestor de lifecycle dos sub-engines
  (TreeEngine instances para sub-trees aniñadas):
  - Creación lazy via `getOrCreateSubtree(subtreeId)`.
  - Cache: o mesmo subtreeId devolve sempre a mesma instance.
  - Verificación de profundidade (`maxDepth`, default 10).
  - Detección de ciclos (subtreeId activo na cadea ancestral).
  - API: `getExistingSubtree`, `hasSubtree`, `getOrCreateSubtree`,
    `listSubtrees`, `destroySubtree`, `clear`, `size`.
- `TreeEngineFactory` type: factory inxectable para evitar
  acoplamento circular (en 5.2 TreeEngine pasarase a si mesmo
  como factory).
- `SubtreeManagerOptions` type.
- `mergeTreeDefWithOverrides(base, overrides)` helper: aplica
  Partial<TreeDef> a un TreeDef base (substitución simple; id
  sempre preserva base).
- ErrorCodes novos: `SUBTREE_DEPTH_EXCEEDED` (YGG_E023) +
  `SUBTREE_CYCLE_DETECTED` (YGG_E024), traducidos en gl/es/en.

### Note

- Sub-fase 5.1 PRIMEIRA da Fase 5. SubtreeManager é **standalone**:
  cero modificación de TreeEngine. A integración real
  (TreeEngine.getSubtreeEngine, enterSubtree, sincronización
  parent ↔ sub-engine) vai en 5.2 (Recursive engine).
- O modelo de datos para sub-trees xa estaba modelado en código
  desde Fase 1 (NodeType 'subtree_anchor', NodeDef.subtreeId/
  subtreeOverrides, TreeDef.subtrees, TreeState.subtreeStates,
  Prereq subtree_completion). A 5.1 engade a infraestrutura de
  XESTIÓN.
- Modelo inspirador: Path of Exile Cluster Jewels. Un nodo
  subtree_anchor expón un mini-tree ao desbloquearse;
  subtreeOverrides personaliza a template (paralelo aos "afixes"
  de PoE).

## [Unreleased]

### Added

- SSR verification: directorio `packages/core/__tests__/ssr/` con
  5 ficheiros de tests SSR (~25 tests):
  - `layouts.ssr.test.ts`: Layout Engine completo (4.1-4.5) en
    Node sen DOM.
  - `engine.ssr.test.ts`: TreeEngine + ProgressManager +
    StatComputer.
  - `effects-time.ssr.test.ts`: EffectsRunner + TimeManager.
  - `graph-audit.ssr.test.ts`: DependencyGraph + AuditLogger +
    Reconciler.
  - `no-dom-imports.ssr.test.ts`: **regression guard
    programático** que escanea `packages/core/src/` buscando
    usos prohibidos de `window.`/`document.`/`navigator.`.
- `docs/SSR.md`: guía documental sobre SSR-safety, con exemplos
  de uso en Next.js RSC, Astro, Node puro.

### Note

- Sub-fase 4.6 **ÚLTIMA da Fase 4**. Cero código novo en `src/`.
  Verifica formalmente o cumprimento de MASTER §38 ("@yggdrasil-
  forge/react/server RSC-safe"). Core era SSR-safe por construción
  desde Fase 1; esta sub-fase engade tests explícitos e
  documentación.
- Regression guard: o test `no-dom-imports.ssr.test.ts` corre en
  cada `pnpm test` e bloqueará calquera regresión futura que
  introduza DOM APIs en core.

## [Unreleased]

### Added

- `PathBuilder` (`buildPaths(layoutResult, style, options?)`):
  transforma os edges dun LayoutResult aplicando un dos 5 estilos
  de curva: 'straight', 'diagonal-vertical', 'diagonal-horizontal',
  'radial', 'orthogonal'.
- `CurveStyle` + `PathBuilderOptions` types.
- `PathKind` type ('line' | 'cubic' | 'polyline'); campo opcional
  `kind?` engadido a EdgePath (cero ruptura).
- `BoundsCalculator` (`computeBounds(layoutResult, options?)`):
  cálculo sofisticado con padding uniforme/por nodo, inclusión
  opcional de mesh e edges curvos.
- `BoundsCalculatorOptions` type.
- `QuadTree`: spatial index recursivo con queryRange + queryNearest.
  Para uso futuro en useVisibleNodes (Fase 7). Algoritmo paralelo
  a d3-quadtree (cero dependencia externa).
- `QuadTreeOptions` type.

### Note

- Sub-fase 4.5 entrega 3 pezas heteroxéneas pero
  arquitectónicamente independentes nun só sprint (decisión do
  autor).
- QuadTree branch coverage ≥85% relaxado (anticipo 4.3 L1):
  algoritmo recursivo con ramas internas que requiren puntos en
  posicións específicas para activarse.
- EdgePath.kind: campo opcional default 'line'. IdentityLayout/
  RadialLayout/TreeLayout (4.1-4.4) seguen producindo 2 puntos
  sen kind explícito.

## [Unreleased]

### Added

- `CustomLayoutConfig` interface (extends BaseLayoutConfig con
  `type: 'custom'`).
- `parseCustomConfig(config, locale?)` validador. Patrón consistente
  con parseRadialConfig (4.2) e parseTreeConfig (4.3).

### Note

- Sub-fase 4.4 **MINIMAL por deseño**: IdentityLayout (4.1) xa
  cumpre o contrato 'custom' segundo MASTER §20 ("Posicións
  manuais"). A 4.4 só engade parseCustomConfig por coherencia
  arquitectónica con sub-fases anteriores. Cero modificación de
  IdentityLayout. Cero opcións opt-in (requireAllPositions,
  defaultPosition) inventadas: decisión consciente de evitar
  inflación de scope sin casos de uso reais (3.0 L1 + 4.3 L1
  aplicadas).

## [Unreleased]

### Added

- `TreeLayout` (LayoutEngine para type='tree'): implementa o
  algoritmo de Buchheim et al. 2002 (linear-time variante de
  Reingold-Tilford 1981).
- `TreeLayoutConfig`, `TreeDirection` tipos exportados.
- `parseTreeConfig(config, locale?)` helper validador.
- 4 direccións soportadas: 'top-down', 'bottom-up', 'left-right',
  'right-left'.
- DAG → árbore lóxica via "primary parent" (menor level BFS;
  desempate por orde en treeDef.nodes).

### Note

- **Determinismo absoluto**: orde dos roots/children/desempates
  sempre por orde de aparición en treeDef.nodes.
- Múltiples roots: cada un é unha árbore independente; colócanse
  horizontalmente con separación nodeSpacing*2.
- Edges seguen visibles **todos** (incluído diamond DAGs). Só o
  layout xerárquico usa o primary parent.
- TreeLayout cero xera mesh (LayoutResult.mesh undefined).

## [Unreleased]

### Added

- `RadialLayout` (LayoutEngine para type='radial'): algoritmo de
  árbore radial clásica con BFS desde os roots da DependencyGraph
  + sectores angulares iguais por nodo.
- `RadialLayoutConfig`, `PolygonConfig`, `MeshType` tipos exportados.
- `parseRadialConfig(config, locale?)` helper validador.
- `MeshElement` discriminated union exportado (line/circle/polygon).
- `generateMesh(meshType, config, ...)` función pura exportada.
- `LayoutResult.mesh?: readonly MeshElement[]` campo opcional
  engadido (cero ruptura).
- Estréase o ErrorCode `LAYOUT_COMPUTE_FAILED` (YGG_L002) anticipado
  en 4.1: úsase en parseRadialConfig para validación.

### Note

- RadialLayout **ignora `NodeDef.position`**. Para posicións
  manuais, use o layout 'custom' (IdentityLayout). RadialLayout é
  algoritmo automático.
- **DT-16 (NOVO non bloqueante)**: RadialLayout usa sectores
  iguais por nodo, cero proporcional a número de descendentes.
  Para árbores desbalanceadas pode producir sobreposición visual.
  Algoritmo proporcional diferido a sub-fase futura.
- Subpath exports `/layouts/*` diferidos a sub-fase futura
  específica de bundle splitting (require tocar tsup config
  integrado co fix de DT-14).

## [Unreleased]

### Added

- Layout Engine base en `@yggdrasil-forge/core/engine/layouts/`:
  - `LayoutEngine` interface (contrato común).
  - `LayoutEngineRegistry` para rexistrar engines por tipo.
  - `LayoutResult`, `EdgePath`, `Bounds` tipos.
  - `IdentityLayout`: implementación trivial (type='custom') que copia `NodeDef.position` ou usa (0,0).
  - `computeLayout(treeDef, registry, locale?)` función pública.
- `BaseLayoutConfig` interface engadida como punto de extensión limpo para layouts futuros. `LayoutConfig` existente non modificado.
- ErrorCodes `LAYOUT_TYPE_UNKNOWN = YGG_L001` e `LAYOUT_COMPUTE_FAILED = YGG_L002` con mensaxes en gl/es/en. Familia nova YGG_L.

### Note

- Esta sub-fase (4.1) **non integra** computeLayout no TreeEngine (cache de LayoutResult). Iso é decisión futura.
- Sub-fases 4.2-4.4 engadirán RadialLayout, TreeLayout e ampliarán CustomLayout sobre a base IdentityLayout. 4.5 engadirá PathBuilder + BoundsCalculator + QuadTree.

## [Unreleased]

### Added

- Reconciler completo: tres opcións pendentes da `ReconcileOptions` agora implementadas:
  - `grandfatherIncreasedCosts`: emite `cost_grandfathered` cando o custo dun nodo unlocked subiu, sen modificar estado.
  - `refundDecreasedCosts`: emite `cost_decreased_refunded` e devolve a diferenza ao budget cando o custo baixou.
  - `invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'`: tres políticas para nodos cuxos prerequisites xa non se cumpren co estado actual. ATENCIÓN: 'preserve' rompe invariantes do engine; emite `prereq_failure_preserved` para auditoría.
- 5 tipos novos en `ReconcileChange`: `cost_grandfathered`, `cost_decreased_refunded`, `prereq_failure_disabled`, `prereq_failure_refunded`, `prereq_failure_preserved`.
- Reutilización de `UnlockResolver` para a avaliación de prereqs.
- Orde de aplicación documentada: refunds primeiro, prereqs último.

## [Unreleased]

### Added

- Reconciler base en `@yggdrasil-forge/core/engine/reconciler/`: función pura `reconcile(oldTreeDef, newTreeDef, oldTreeState, options, locale?)` para reconciliar saves contra TreeDefs modificadas (MASTER §23).
- `ReconcileOptions`, `ReconcileChange` e `ReconcileResult` types exportados.
- ErrorCode `RECONCILE_TREE_MISMATCH = YGG_R001` con mensaxes en gl/es/en.

### Note

- Esta sub-fase (3.6.a) implementa só `refundRemovedNodes` das catro opcións de `ReconcileOptions`. As outras tres (`grandfatherIncreasedCosts`, `refundDecreasedCosts`, `invalidateOnPrereqFailure`) acéptanse na interface pero non afectan o comportamento aínda; serán efectivas na sub-fase 3.6.b.

## [Unreleased]

### Added

- Sistema de migracións de schema en `@yggdrasil-forge/core/engine/migrations/`:
  - `Migration` interface (segundo MASTER §22).
  - `MigrationRegistry` para rexistrar migracións.
  - `MigrationRunner` con resolución de path greedy (salto máximo) e detección defensiva de ciclos.
  - `AutoBackup` safety net que persiste estado pre-migración nun `BackupStorage` inxectado (compatible estruturalmente con LocalStorageAdapter / IndexedDBAdapter / etc.).
- `JsonSerializer.deserializeAsync` función nova que acepta `MigrationRegistry` opcional. Cando presente e `schemaVersion` non coincide, intenta migrar antes de validar. Comportamento sen registry sen cambios. Función nova `deserializeAsync` engadida; `deserialize` sync mantense intacta (Caso B: 1 consumidor existente en TreeEngine.fromJSON, non modificado).
- Cero ErrorCodes novos: `MIGRATION_FAILED` e `NO_MIGRATION_PATH` xa existían en common.

## [Unreleased]

### Added

- `SessionStorageAdapter` (en `@yggdrasil-forge/storage`): wrapper sobre `LocalStorageAdapter` con `globalThis.sessionStorage` como default. Cero duplicación de lóxica; herda automáticamente todos os arranxos futuros de LocalStorageAdapter. A semántica é idéntica salvo na duración (sessionStorage pérdese ao pechar a pestana).
- `FileSystemAdapter` (en `@yggdrasil-forge/storage`): cuarta implementación concreta de `StorageAdapter`. Usa OPFS (Origin Private File System) accesible via `navigator.storage.getDirectory()`. Soporte amplo: Chrome, Edge, Firefox, Safari, Opera (desde marzo 2023). `directoryName` obrigatorio no constructor; `storage` (StorageManager) opcional permite inxectar `opfs-mock` nos tests. Estrutura plana de ficheiros (cero subdirectorios); keys que conteñan `/` ou `\\` rexéitanse. Serialización JSON (asimetría con IndexedDBAdapter: rexeita undefined/BigInt/funcións/circular refs, idéntico a LocalStorageAdapter).
- `SessionStorageAdapterOptions` e `FileSystemAdapterOptions` interfaces exportadas.
- devDependency: `opfs-mock ^2.7.0` no catalog para tests de FileSystemAdapter.

## [Unreleased]

### Added

- `IndexedDBAdapter` (en `@yggdrasil-forge/storage`): terceira implementación concreta de `StorageAdapter`. Wrapper sobre IndexedDB nativo con apertura lazy (constructor sync, BD ábrese na primeira operación). Soporta valores arbitrarios via structured clone nativo (Date, Map, Set, ArrayBuffer, undefined). Capacidade superior a localStorage (≥50MB típico). Cero `watch` (IndexedDB sen observador nativo intra-database). `databaseName` obrigatorio no constructor; `factory` opcional permite inxectar fake-indexeddb nos tests sen jsdom.
- `IndexedDBAdapterOptions` interface exportada.
- devDependency: `fake-indexeddb ^6.2.5` no catalog para tests.

## [Unreleased]

### Added

- `LocalStorageAdapter` (en `@yggdrasil-forge/storage`): segunda implementación concreta de `StorageAdapter`. Wrapper sobre `Storage` interface estándar (por defecto `globalThis.localStorage`) con serialización JSON automática. Acepta `Storage` inxectado no constructor para tests sen jsdom. Detecta `QuotaExceededError` multi-navegador (Chrome, Firefox, Safari, iOS) e mapéao a `STORAGE_QUOTA_EXCEEDED`. Valores corruptos no storage devolven `STORAGE_READ_FAILED`. Asimetría con MemoryStorage: valores pasan por `JSON.parse(JSON.stringify(x))` (perden identidade referencial; `undefined`, `BigInt`, funcións e circular refs rexéitanse).
- `LocalStorageAdapterOptions` interface exportada para configuración explícita.
- Script `test:coverage` en `@yggdrasil-forge/storage` (patrón idéntico a core e common).

## [Unreleased]

### Added

- `MemoryStorage` (en `@yggdrasil-forge/storage`): primeira implementación concreta de `StorageAdapter`. Backend en memoria sobre `Map<string, unknown>`. Cero serialización (acepta valores arbitrarios incluíndo Date, Map, Set, funcións). Soporta `watch` con notificación a múltiples callbacks; callback recibe `null` ao borrar a clave. Ideal para tests, SSR, contextos sen storage persistente.

## [Unreleased]

### Added

- Interface `StorageAdapter` exportada desde `@yggdrasil-forge/storage` segundo MASTER §21. Define o contrato uniforme para backends de almacenamento: `get`, `set`, `delete`, `list`, `clear`, `watch?`. Cada método devolve `Promise<Result<T>>` para manexo explícito de erros. Implementacións concretas (MemoryStorage, LocalStorage, etc.) vén en sub-fases 3.2-3.4.
- Dependencia nova: `@yggdrasil-forge/storage` agora depende de `@yggdrasil-forge/common` (workspace:*) para importar `Result`.

## [Unreleased]

### Changed

- `Result<T, E>` type e helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`) movidos de `@yggdrasil-forge/core/types/` a `@yggdrasil-forge/common` como primitivo xenérico compartido. `@yggdrasil-forge/core/types/result.js` mantén re-export para cero ruptura dos imports existentes en core. Sub-fase preparatoria para Fase 3 (StorageAdapter en `@yggdrasil-forge/storage` agora pode importar Result sen depender de core).

## [Unreleased]

### Fixed
- **Sub-fase 2.6.fix2** — Bug latente (DT-13): o effect `modify_resource` mutaba o budget pero non emitía o evento `budgetChange`, polo que os suscritores externos non se enteraban dos cambios de budget producidos vía effect. Agora `EffectsRunner.applyModifyResource` emite `budgetChange` tras a mutación (só cando o valor cambia), replicando o patrón de `TreeEngine`. Mesma familia que o bug de `set_progress` arranxado en 2.6.fix. Detectado no escenario 8 de 2.6 (cascade event ordering).

### Changed
- **Sub-fase 2.6.fix2** — Actualizado o test `cascade event ordering` (escenario 8 de `phase-2-cross-piece.test.ts`) para reflectir a nova orde de 6 eventos que inclúe `budgetChange`, completando o patrón de contrato intermedio (o test fixara antes 5 eventos documentando a ausencia de `budgetChange` como bug). Orde verificada empíricamente: `stateChange → unlock → auditEntry(node_unlocked) → budgetChange → progressChange → auditEntry(custom)`.

### Note
- **Emisión directa** (non delegación): `ResourceManager.applyCost` é cálculo puro; a emisión de `budgetChange` faina o chamante, igual ca `TreeEngine`.
- **Cero audit**: `budgetChange` non leva audit en ningunha vía; esta sub-fase non engade audit.
- **Rollback**: a emisión de `budgetChange` durante effects que logo se revierten é coherente co comportamento de `set_progress` (2.6.fix); eventos compensatorios de rollback son decisión futura se procede.
- **Cero modificación** de `TreeEngine`, `ResourceManager`, `ProgressManager`, `UnlockResolver`, `types/`, `common/`, `engine/index.ts`. Cero `ErrorCode` novo.
- **Tests do paquete `core`**: 891 → 896 (+5 novos). Cobertura global 98.18% (= baseline 2.6); `EffectsRunner.ts` 100% statements/lines/funcs.
- **DT-13 PECHADA**. A Fase 2 queda sen asimetrías de emisión coñecidas: `set_progress` (2.6.fix) e `modify_resource` (2.6.fix2) propagan os seus eventos cando se invocan desde effects.

## [Unreleased]

### Added
- **Sub-fase 2.6** — Tests de integración cross-piece que pechan a **Fase 2**. Novo ficheiro `packages/core/__tests__/integration/phase-2-cross-piece.test.ts` con **8 escenarios** que combinan tres ou máis pezas da Fase 2 (`EffectsRunner`, `StatComputer`, `TimeManager`, `ProgressManager`) en situacións realistas: Effects+Stats, Effects+Progress, TimeManager+Progress (preservación tras expiración), computed progress + `canUnlock`, statContribution condicional con computed (verifica o bug-fix 2.4.e), round-trip Fase 2 completo, applyChanges atómico cross-piece (positivo + negativo), e cascade event ordering (orde fixada empíricamente). Tests do paquete `core`: 882 → 891 (+9).

### Note
- **Cero código novo no motor**. Esta sub-fase só engade tests. Cobertura global subiu lixeiramente: 98.13% → **98.18%**.
- **Escalado preventivo detectado** durante a captura empírica do escenario 8: o effect `modify_resource` muta correctamente o budget pero **non emite `budgetChange`** cando se invoca desde un effect (camiño `EffectsRunner → ResourceManager.modify`). É unha asimetría análoga á que a sub-fase 2.6.fix arranxou para `set_progress`; outro cableado pendente da Fase 2. Briefing 2.6 §5.7 esixe non arranxar bugs descubertos silenciosamente; queda **rexistrado como candidato a futura 2.6.fix2 ou Fase 3**. O estado interno (`budget`) é coherente; só falta a propagación do evento.
- **Cero modificación** de `packages/core/src/`, `packages/common/`, `packages/core/__tests__/integration/fixtures.ts`, `engine/index.ts`, `types/`, `pnpm-lock.yaml`, `core/package.json`.
- **Fase 2 pechada**. 13 sub-fases (2.1 → 2.6) con pezas implementadas, cableadas e verificadas en escenarios cross-piece. Próximo: hixiene MASTER final + decisión sobre Fase 3 (Persistencia + Migracións) ou etapa intermedia de exemplos prácticos.

## [Unreleased]

### Fixed
- **Sub-fase 2.6.fix** — Bug latente do `EffectsRunner` introducido en 2.1: o effect `set_progress` mutaba directamente o `StateStore` saltándose o `ProgressManager`, perdendo a emisión de `progressChange`, o rexistro `progress_updated` no audit, e a invalidación da cache de `StatComputer`. Agora `EffectsRunner.applySetProgress` delega en `progressManager.setProgress` cando está dispoñible no `EffectContext` (caso normal cando `TreeEngine` constrúe o runner desde 2.4.e). Mantense un fallback legacy de mutación directa para os tests illados que constrúen `EffectContext` manualmente sen `progressManager`. Bug revelado pola investigación T0 da sub-fase 2.6.

### Changed
- **Sub-fase 2.6.fix** — `ProgressManagerLike` (exportada por `UnlockResolver.ts`, introducida en 2.4.d) amplíase para incluír `setProgress(nodeId, percent)` ademais de `getProgress(nodeId)`. O tipo de retorno declárase estructuralmente inline (idéntico en forma a `Result<ProgressUpdateResult>` definido en `engine/ProgressManager.ts`) para evitar reintroducir a dependencia cíclica `UnlockResolver → ProgressManager` documentada na cabeceira do `ProgressManager`. Cero ruptura: `ProgressManager` real xa o cumpre.

### Note
- **Cambio observable** (efecto colateral correcto): o effect `set_progress` agora rexeita os nodos sen `supportsProgress: true` con `EFFECT_APPLICATION_FAILED`, onde antes silenciaba a condición. Aliñado co contrato de `ProgressManager.setProgress`.
- **Cero modificación** de `ProgressManager.ts`, `TreeEngine.ts`, `StatComputer.ts`, `TimeManager.ts`, `engine/index.ts`, `packages/common/`, nin de `packages/core/src/types/`.
- **Tests do paquete `core`**: 876 → 882 (+6 novos en `EffectsRunner.test.ts` que verifican as 4 cascadas: evento, audit, cache de stats, e propagación de erro do PM; máis fallback legacy e preservación de `reverse()`).
- **Cobertura**: global 98.13% (idéntica á baseline 2.5); `EffectsRunner.ts` 100% statements/lines/funcs (branches 97.4%).
- **Próximo paso**: reanudar a sub-fase 2.6 tal cal está escrita; os escenarios 1 e 2 do briefing 2.6 pasan agora sen adaptación das asercións sobre eventos/audit, porque o motor xa propaga correctamente.

## [Unreleased]

### Added
- Validacións Zod novas no `treeDefSchema` (`packages/core/src/engine/treeDefSchema.ts`), sub-fase 2.5 — hardening do validador na fronteira. Por campo: `maxTier > 0`, `tier > 0`, `cost.amount > 0`, `progressMilestones` con valores en `[0, 100]` e ordenado estrictamente ascendente sen duplicados. Cross-field (no `nodeDefSchema`): `progressSource` definido obriga a `supportsProgress === true`.
- Validacións cross-node no `treeDefShapeSchema.superRefine`: `progressSource.computed.dependsOn` referencia nodos existentes; `prerequisites` (recursivo sobre `UnlockRule`, incluíndo combinadores `all`/`any`/`none` e condicións `node_unlocked`/`node_maxed`/`node_state`/`tier_min`/`progress_min`/`distance_max`/`stat_min`) referencia nodos/stats existentes; `exclusions[]` referencia nodos existentes; `edges` referencian nodos existentes nos seus extremos `source` e `target`. Cada issue carrega un `path` accionable apuntando ao campo concreto e unha `message` localizable.

### Note
- **Reutiliza `INVALID_TREE_DEF` (YGG_V001)**: cero `ErrorCode` novo, cero cambios en `@yggdrasil-forge/common`. Os issues devoltos polas validacións novas serializaranse a través do mesmo contexto (`error.context.issues`) implementado en 1.17.
- **Cero modificación de pezas do motor** (decisión §5.1 do briefing): `TreeEngine`, `ProgressManager`, `EffectsRunner`, `StatComputer`, `UnlockResolver`, `TimeManager` e `JsonSerializer` quedan intocados. `JsonSerializer.fromJSON` xa delega no validador, polo que automáticamente se beneficia das validacións novas sen tocar código. Cero cambios en `packages/core/src/types/` nin en `engine/index.ts`.
- **Asimetría deliberada validador-motor**: a validación corre só na fronteira (entrada externa: `validateTreeDef`, `JsonSerializer.fromJSON`). O motor mantén comportamento defensivo interno cando recibe `TreeDef` construídas directamente en código (uso típico en tests unitarios; non pasan polo validador). Ambos comportamentos son correctos e complementarios.
- **Limitación coñecida (§5.5 do briefing)**: a detección de ciclos en `prerequisites` ou en `progressSource.computed.dependsOn` queda **fóra de alcance** desta sub-fase. Os ciclos son detectados defensivamente polo motor en runtime (`UnlockResolver`, `ProgressManager`); a validación estructural de ciclos queda asignada a fase pedagóxica posterior (8.7).
- **Nota sobre o nome dos campos de `edge`** (validación #10): o briefing menciona `edges.from/to` por analoxía conceptual, pero o contrato real de `EdgeDef` (`types/edge.ts`) usa `source` e `target`. Os issues cargan `path: ['edges', i, 'source'|'target']` para que sexan accionables contra o campo real.
- Cobertura (acumulada 2.5): `treeDefSchema.ts` 95.83/89.06/94.44/98.83; global 98.13% (vs baseline 2.4.e 98.22%; lixeira baixa explicada por novas ramas defensivas no helper recursivo cuxos camiños minoritarios de Zod non se exercen). Tests do paquete `core`: 854 → 876 (+22 novos: 10 positivos + 10 negativos das validacións 1-10, máis 2 extra para cubrir as ramas `distance_max` e `stat_min` do helper recursivo de prerequisites).

## [Unreleased]

### Changed
- `EffectContext` (en `EffectsRunner.ts`) e `StatComputerContext` (en `StatComputer.ts`) agora aceptan `progressManager?: ProgressManagerLike` (opcional). Cando se inxecta, `progress_min` condicións dentro de effects `conditional` e dentro de stat conditional contributions consultan o `ProgressManager` (soportando nodos `computed` da sub-fase 2.4.c). Cero ruptura de API; o campo é opcional.
- `TreeEngine` reordeneou o seu constructor para que `ProgressManager` se construa **antes** de `EffectsRunner` e `StatComputer` (anteriormente construíase último, tras `timeManager`). Isto permítelle pasar a referencia `progressManager: this.progressManager` automáticamente nas instanciaciones de ambas pezas. O reordering é seguro porque `ProgressManagerContext` só precisa `{ treeDef, store, events, audit, locale }`, todos dispoñibles inmediatamente despois de `audit`.

### Fixed
- `TreeEngine.setProgress` agora invalida a cache de `StatComputer` tras mutación exitosa. **Bug latente** introducido en 2.4.b: `setProgress` era o único mutator do engine que non invalidaba (`unlock`, `lock`, `respec`, `applyChanges`, `tick` xa o facían). Era **invisible** en 2.4.b/c/d porque o `StatComputer` sempre lía `0` para nodos `computed`; cando 2.4.e (esta sub-fase) cableou `StatComputer` para consultar valores derivados, a cache stale fíxose observable. Invalidación gated en `result.ok` para preservar a filosofía atómica do engine (cero invalidación en operacións fallidas).

### Note
- **Pecha a asimetría coñecida documentada en 2.4.d**. Tras esta sub-fase, `progress_min` con nodos computed funciona **uniformemente** en `canUnlock`, en effects `conditional` e en stat conditional contributions. A familia 2.4.* está funcionalmente completa: progress (manual + computed) integrado uniformemente no engine.
- O test "asimetría coñecida 2.4.d" en `TreeEngine.progress.test.ts` foi renomeado a "asimetría 2.4.d pechada en 2.4.e" e as súas asercións invertidas: o effect conditional con `progress_min(computed, 50)` e `C=80` agora correctamente escolle a rama `then`. Engadíronse dous tests novos: un caso negativo do effect conditional (`C=30` → rama `else`) e un caso paralelo para `StatComputer` con conditional contributions que verifica tamén o bug-fix da cache.
- Cero modificacións a `UnlockResolver.ts` (o cableado de 2.4.d xa soporta a delegación). Cero modificacións a `ProgressManager.ts` (cumpre `ProgressManagerLike` por structural typing). Cero changes en `@yggdrasil-forge/common` (cero novos `ErrorCode`s). Cero cambios en `packages/core/src/types/` nin en `engine/index.ts`.
- Cobertura (acumulada 2.4.e): `EffectsRunner.ts` 100/97.33/100/100; `StatComputer.ts` 100/98.24/100/100; `UnlockResolver.ts` 100/100/100/100; `ProgressManager.ts` 100/100/100/100; `TreeEngine.ts` 96.47/83.81/98.5/96.87 (= baseline 2.4.d); global 98.22% (sobe lixeiramente desde 98.21% de 2.4.d). Tests do paquete `core`: 852 → 854 (+2 novos en `TreeEngine.progress.test.ts`: caso negativo do effect conditional + caso paralelo de StatComputer; 1 test preexistente reescrito).
- Auditoría grep confirmou **6 chamadas a `statComputer.invalidate()`** no `TreeEngine.ts` (5 previas + 1 nova en `setProgress`), correspondendo aos **6 mutators públicos** que tocan state: `setProgress`, `unlock`, `lock`, `respec`, `applyChanges`, `tick`. Cero outros sitios pendentes de invalidación.

## [Unreleased]

### Added
- `UnlockResolverContext.progressManager?: ProgressManagerLike` (engine, sub-fase 2.4.d): campo opcional que permite que o `UnlockResolver` consulte un `ProgressManager` (ou compatible estructural) ao avaliar condicións `progress_min`. Cando está presente, o método privado `getProgress` interno do resolver delega no manager (e así, nodos `computed` da sub-fase 2.4.c son consultables desde condicións de prerequisite). Cando ausente, fallback automático ao comportamento legacy (lectura directa de `NodeInstance.progress`); cero ruptura de API.
- Interface `ProgressManagerLike` exportada de `engine/UnlockResolver.ts`: tipo estructural mínimo `{ getProgress(nodeId: string): number }`. A clase concreta `ProgressManager` cumpre esta interface automáticamente por structural typing (TypeScript); **non se modifica `ProgressManager.ts`**. A interface úsase para inxección desacoplada e mocks triviais en tests illados.

### Changed
- `TreeEngine` agora pasa `progressManager: this.progressManager` nos dous `UnlockResolverContext` que constrúe internamente: en `canUnlock` (avaliación de `prerequisites`) e na re-avaliación cascada dentro de `applyChanges`. Consecuencia observable: unha condición `progress_min` apuntando a un nodo `computed` agora avalíase contra o valor derivado dinámicamente (sum/avg/min/max de `dependsOn`) en lugar de devolver sempre 0.

### Note
- **Compatibilidade total**: os 837 tests preexistentes pasan sen modificación (a presenza do novo campo no context é totalmente opcional; o fallback legacy preservouse intencionalmente).
- **Asimetría coñecida — diferida a sub-fase 2.4.e** (documentada como contrato observable cun test de regresión específico): `EffectsRunner.applyConditional` e `StatComputer.computeStatDef` constrúen cadanseu `UnlockResolverContext` **sen** o campo `progressManager`. Consecuencias:
  - Un `Effect` de tipo `'conditional'` cuxa `condition` é `progress_min` sobre un nodo computed **NON ve o valor derivado**; lee 0 e probablemente entra na rama `else`.
  - Unha contribución a stat condicionada por `progress_min` sobre un nodo computed tamén lee 0.
  - Arranxo en 2.4.e: estender `EffectsRunnerContext` e `StatComputerContext` para carregar `progressManager`, máis propagación desde o constructor de `TreeEngine`.
  - O test `TreeEngine — asimetría coñecida 2.4.d` en `TreeEngine.progress.test.ts` fixa o contrato observable actual (rama `else` ejecutada cando "debería" ser `then` polo valor computed) para evitar que un cambio futuro arranxe a asimetría accidentalmente sen darnos conta.
- **Cero ErrorCodes novos**, cero cambios en `@yggdrasil-forge/common`, cero cambios en `packages/core/src/types/`, cero cambios en `ProgressManager.ts` (decisión §5.5: structural typing fai innecesario tocar a clase concreta), cero cambios en `engine/index.ts` (a interface úsase como detalle do `UnlockResolverContext`; consumidores que precisen referenciala explícitamente impórtana desde `UnlockResolver.js` directamente).
- Cobertura (acumulada 2.4.d): `UnlockResolver.ts` 100/100/100/100 (mantén 2.4.c); `ProgressManager.ts` 100/100/100/100 (mantén); global 98.21% (= baseline 2.4.c). Tests do paquete `core`: 837 → 852 (15 novos: 10 illados en `UnlockResolver.progress.test.ts`, 5 de integración en `TreeEngine.progress.test.ts`).
- **Cero dependencia circular real**: aínda que a 2.4.c documentou unha preocupación teórica sobre "ProgressManager consulta UnlockResolver para conditions", a verificación empírica de T0 (grep en `ProgressManager.ts`) confirmou que **non hai chamadas reais de ProgressManager a UnlockResolver**. A relación é unidireccional: `UnlockResolver → ProgressManager` (vía context opcional). Cero risco.

## [Unreleased]

### Added
- `ProgressManager` agora soporta `computed` progress source (sub-fase 2.4.c): un nodo con `progressSource: { type: 'computed', dependsOn, formula }` deriva o seu progress dinámicamente dunha fórmula (`sum`/`avg`/`min`/`max`) sobre os progress dos seus `dependsOn`. **Sen cache** (cada `getProgress` recalcula); **sen persistencia** (`NodeInstance.progress` non se escribe para nodos computed); **detección de ciclos lazy** con `Set<string>` interno (ciclos devolven 0 silenciosamente, cero excepcións); resultado sempre clampado a `[0, 100]`. Composición admitida (un computed pode depender doutro computed). Dependencias inexistentes fíltranse antes de aplicar a fórmula (importante para `min`/`max`).
- `ErrorCode.INVALID_PROGRESS_OPERATION = 'YGG_E022'` (common, sub-fase 2.4.c) con mensaxes localizadas en gl/es/en. Úsase cando `setProgress` se chama sobre un nodo `computed`: un computed non se establece manualmente; só se deriva. Esto distínguese de `PROGRESS_SOURCE_UNSUPPORTED` (E020), que segue cubrindo `remote`/`callback`/`event`/ausente.

### Changed
- `ProgressManager.getProgress(nodeId)` cambia o comportamento para nodos con `progressSource` distinto de `manual` ou `computed` (decisión 2.4.c §5.6, opción B1 do arquitecto): agora devolve `0` ignorando o que houbera en `NodeInstance.progress`. **Cambio sutil de comportamento** respecto a 2.4 e 2.4.b, onde lía `NodeInstance.progress ?? 0` sen comprobar a fonte. Razón: coherencia semántica — "se non sabemos de onde vén o progress, devolvemos 0 sen lanzar". Sen impacto en tests preexistentes (todos usaban `manual`); novos tests específicos documentan o contrato observable.
- Orde de validacións en `ProgressManager.setProgress` actualizada: a comprobación de `progressSource.type === 'computed'` (devolvendo `INVALID_PROGRESS_OPERATION`) precede á comprobación de `progressSource.type === 'manual'` (que segue devolvendo `PROGRESS_SOURCE_UNSUPPORTED` para os outros casos). Antes de 2.4.c, computed devolvía o código xenérico.

### Note
- **Cero `progressChange` event para nodos computed** (decisión 2.4.c §5.10): cando o progress derivado dun computed cambia porque mutou un dos seus `dependsOn`, NON se emite ningún evento automático. Razón: a "cascada de eventos" require detectar todos os nodos computed que dependen (transitivamente) do nodo mutado, e o lifecycle de eventos encadeados é fonte de bugs. **Patrón recomendado**: escoita `progressChange` para nodos `manual` e re-consulta `getProgress` para os computed que dependan deles.
- **Cero cache** (decisión 2.4.c §5.2): `getProgress` recalcula en cada chamada para nodos computed. Os cálculos son triviais (lonxitude de `dependsOn` tipicamente <10) e unha cache requiriría invalidación coherente. Optimización futura se aparecera evidencia de problema.
- **Cero persistencia** (decisión 2.4.c §5.1): `NodeInstance.progress` non se escribe para nodos computed. `JsonSerializer` non precisa cambios; ao deserializar un estado, os valores computed recálculanse automaticamente.
- **Cero auto-unlock** (decisión 2.4 §5.7 mantida): un computed que alcance `progress=100` NON desbloquea o nodo. O estado é responsabilidade exclusiva de `unlock`/`lock`/`respec`/`tick`/`applyChanges`.
- **Limitación coñecida — diferida a sub-fase 2.4.d**: as condicións `progress_min` en `UnlockResolver` (usadas en `canUnlock`/`unlock`) seguen lendo `NodeInstance.progress` directamente, **sen pasar polo `ProgressManager`**. Tras 2.4.c, unha condición `progress_min` apuntando a un nodo `computed` segue lendo `0` (xa que computed non persiste). Arranxo en 2.4.d, que require análise da dependencia circular potencial: `ProgressManager` xa consulta `UnlockResolver` (para conditions en `unlock`); cablear a inversa engadiría un ciclo que esixe inversión via interface ou terceiro coordinador. Decisión U2 do arquitecto: non bloquear 2.4.c por esto.
- Validacións Zod sobre `dependsOn` (existencia dos nodos referenciados, ausencia de ciclos en validación estática): seguen **fóra do `TreeDefValidator`**, igual que validacións sobre `progressMilestones` ou `maxTier<=0`. Defensivamente, `ProgressManager` manexa todos estes casos sen lanzar. Diferidas a futura sub-fase de hardening do validador.
- Cero modificacións a `TreeEngine.ts` (decisión 2.4.c §5.9): os métodos públicos `setProgress`/`getProgress`/`getReachedMilestones` engadidos en 2.4.b son delegantes; reflicten automaticamente o novo comportamento de `ProgressManager`. Sen cambios en `engine/index.ts`, `JsonSerializer.ts`, `types/progress.ts`, `types/node.ts`, `pnpm-lock.yaml`, `packages/core/package.json`.
- Cobertura (acumulada 2.4.c): `ProgressManager.ts` **100/100/100/100** (mantén baseline 2.4 e 2.4.b); global **98.21%** (sobe lixeiramente desde 98.18% de 2.4.b). Tests do paquete `core`: 807 → 837 (30 novos, todos en `ProgressManager.test.ts`).

## [Unreleased]

### Added
- `TreeEngine.setProgress(nodeId, percent): Result<ProgressUpdateResult>` (engine, sub-fase 2.4.b): delega no `ProgressManager` interno. Valida (NodeDef existe → `supportsProgress === true` → `progressSource.type === 'manual'` → `percent` finito en `[0, 100]`). Idempotente cando `oldPercent === newPercent`. Emite `progressChange` e rexistra audit `{type: 'progress_updated', nodeId, from, to}` con `rollbackable: true`.
- `TreeEngine.getReachedMilestones(nodeId): readonly number[]` (engine, sub-fase 2.4.b): delega no `ProgressManager`. Devolve os milestones de `progressMilestones` que son `<= progress` actual.

### Changed
- `TreeEngine.getProgress(nodeId): number` (existente desde sub-fase 1.12): a implementación pasa a delegar en `ProgressManager.getProgress` en lugar de ler directamente do store. **Comportamento observable idéntico** (nodo inexistente → 0, instancia sen `progress` → 0, instancia con progress=X → X). Tests de regresión específicos en `__tests__/engine/TreeEngine.progress.test.ts` documentan o contrato preservado. Razón: centralizar toda a lectura de progress nunha peza única, evitando drift entre dúas implementacións paralelas.
- `TreeEngine` instancia agora un `private readonly progressManager: ProgressManager` tras `timeManager` no constructor. Sen cambios na orde xeral nin nas demais pezas.

### Note
- **Cero auto-unlock cando `progress === 100`** (decisión 2.4.b §5.4): `setProgress(nodeId, 100)` NON desbloquea o nodo. O estado segue sendo responsabilidade exclusiva de `unlock` / `lock` / `respec` / `tick` / `applyChanges`. O consumidor que queira "auto-unlock" implícitao externamente combinando `setProgress` + `canUnlock` + `unlock`.
- **Cero transición a `'in_progress'`** (decisión 2.4.b §5.5): `setProgress(nodeId, 50)` NON cambia `NodeInstance.state`. O estado `'in_progress'` segue declarado en `NodeState` pero **non se usa**; a semántica de entrada/saída (¿progress>0? ¿progress=100?) queda diferida a unha sub-fase futura que a defina.
- **`respec` non reseta `progress`** (decisión 2.4.b §5.8): tras un `unlock` + `setProgress(50)` + `respec`, `getProgress(nodeId)` segue devolvendo 50. Razón: `progress` é dato semántico ("xa fixen o 50%") que pode querer preservarse. O consumidor que queira resetar chama `setProgress(nodeId, 0)` explicitamente despois de `respec`. **Esta decisión non require cambios en `respec`** — a implementación actual simplemente non toca `progress`.
- **`computed` progress source** (decisión 2.4.b §5.1): nodos con `progressSource: { type: 'computed', ... }` seguen rexeitándose con `PROGRESS_SOURCE_UNSUPPORTED` (YGG_E020). A integración de `computed` (con detección de ciclos en `dependsOn`, cache + invalidación, fórmulas `sum`/`avg`/`min`/`max`) queda asignada a **sub-fase 2.4.c** separada, aplicando a lección recorrente "acoutar > ambicionar".
- Cero modificacións a `unlock` / `lock` / `respec` / `tick` / `applyChanges` / `canUnlock` (decisión 2.4.b §5.6). Cero novos `ErrorCode` (os tres engadidos en 2.4 cobren todos os casos de integración, decisión §5.7). Cero cambios en `@yggdrasil-forge/common`.
- Cobertura (acumulada 2.4.b): `TreeEngine.ts` 96.46% (= baseline 2.4); `ProgressManager.ts` 100% (sen cambios); global 98.18% (= baseline 2.4). Tests do paquete `core`: 788 → 807 (19 novos en `__tests__/engine/TreeEngine.progress.test.ts`).

## [Unreleased]

### Added
- `ProgressManager` (engine, sub-fase 2.4): peza standalone que xestiona o valor de progreso (0-100) dos nodos con `supportsProgress: true` e fonte `manual`. API pública: `setProgress(nodeId, percent): Result<ProgressUpdateResult>`, `getProgress(nodeId): number`, `getReachedMilestones(nodeId): readonly number[]`. `setProgress` valida en orde estricta (NodeDef existe → `supportsProgress === true` → `progressSource.type === 'manual'` → `percent` finito en `[0, 100]`); é idempotente se `oldPercent === newPercent` (cero evento, cero audit, cero mutación); permite progresos descendentes (devolve `crossedMilestones` baleiro nese caso); e calcula `crossedMilestones` como o conxunto de `progressMilestones` no intervalo `(oldPercent, newPercent]` cando o progress sobe. Se a `NodeInstance` non existe créase mínima con `state: 'locked'`. `getProgress` e `getReachedMilestones` son defensivas (nodo inexistente → 0 / `[]`). Tipos `ProgressManagerContext` e `ProgressUpdateResult` exportados desde `engine/index.ts`.
- `ErrorCode.PROGRESS_NOT_SUPPORTED = 'YGG_E019'`, `ErrorCode.PROGRESS_SOURCE_UNSUPPORTED = 'YGG_E020'`, `ErrorCode.INVALID_PROGRESS_VALUE = 'YGG_E021'` (common, sub-fase 2.4) con mensaxes localizadas en gl/es/en. Placeholders `{nodeId}` e (para `INVALID_PROGRESS_VALUE`) `{percent}`. O cuarto código contemplado no briefing (`NODE_NOT_FOUND`) **xa existía** como `YGG_E001` e reutilízase.

### Note
- Outras fontes de progreso (`remote` / `callback` / `event` / `computed`) declaradas en `types/progress.ts` están **fóra de alcance** desta sub-fase: cando un nodo ten `progressSource` distinto de `manual` (ou está ausente con `supportsProgress: true`), `setProgress` devolve `err` con `PROGRESS_SOURCE_UNSUPPORTED`. `computed` queda asignada tentativamente a 2.4.b; `remote`/`callback`/`event` requiren infraestrutura de I/O asíncrono que non debe vivir no core (Fase 5).
- **Auto-unlock con `percent === 100` non implementado por deseño** (decisión §5.7): `setProgress` non muta `NodeInstance.state` baixo ningunha circunstancia. O nodo segue `'locked'`/`'unlockable'`/o que estivese. Razóns: coherencia coa filosofía da Fase 2 (consumidor decide cando desbloquear), evitar bucles con effects, separar `progress` (dato) de `state` (transición). O consumidor que queira ese comportamento implémentao en tres liñas no seu wrapper despois de chamar a `setProgress` (exemplo no file header de `ProgressManager.ts`).
- Cero scheduling, cero polling, cero handlers: a peza é totalmente síncrona e determinista. Mesma filosofía ca `TimeManager`. Cero `setInterval` / `setTimeout`.
- A integración co `TreeEngine` (`engine.setProgress` / `engine.getProgress` / `engine.getReachedMilestones`) é sub-fase aparte (probablemente **2.4.b**), seguindo o patrón consistente con 2.1→2.1.b, 2.2→2.2.b, 2.3→2.3.b. `EventMap.progressChange` xa se emite cando `setProgress` ten éxito sobre un context construído polo consumidor; `AuditAction.progress_updated` rexístrase co formato `{type, nodeId, from, to}` declarado en `types/audit.ts` e `rollbackable: true`. `crossedMilestones` **non** se persiste no audit (non está no `AuditAction` variant); o consumidor recíbeo no `ProgressUpdateResult` devolto.
- Validacións Zod sobre `progressMilestones` (rango `[0, 100]`, orde ascendente, `progressSource` definido sen `supportsProgress`) seguen **fóra do `TreeDefValidator`**: igual que `maxTier<=0`, quedan diferidas a unha futura sub-fase de hardening do validador.
- Cobertura (acumulada 2.4): `ProgressManager.ts` 100/100/100/100 (stmts/branches/funcs/lines); global 98.14% → 98.18%. Tests do paquete `core`: 748 → 788 (40 novos en `__tests__/engine/ProgressManager.test.ts`).

## [Unreleased]

### Added
- `TreeEngine.tick(): TickResult` (engine, sub-fase 2.3.b): avalía todos os nodos `unlocked`/`maxed` con `timeConstraints` e materializa as caducidades detectadas polo `TimeManager`. Por cada nodo que transita: muta `NodeInstance.state` a `'expired'` (con entrada en `history`), emite `stateChange` (con `from`, `to: 'expired'`, `timestamp`, `reason: 'expired'`), emite `nodeExpired(nodeId)`, rexistra audit `{type: 'node_expired', nodeId}` con `rollbackable: false`, e invalida a cache do `StatComputer`. Todas as transicións dun mesmo `tick` comparten exactamente o mesmo `timestamp`, capturado unha soa vez ao inicio mediante `evaluateAt`. Idempotente (un segundo `tick` sen cambios de estado/reloxo é no-op). No-op en `readOnly`. `TickResult` interface exportada desde `engine/index.ts`.
- `TreeEngine.nextTickAt(): number | null` (engine, sub-fase 2.3.b): devolve o instante UTC ms máis próximo no futuro estrito no que algún nodo `unlocked`/`maxed` con `timeConstraints` transitaría. Útil para o consumidor programar `setTimeout(() => engine.tick(), delay)`. O motor **non** chama `setTimeout`/`setInterval` internamente: o scheduling é decisión do consumidor (cero timers internos → determinismo, compatibilidade SSR/Workers).
- `TreeEngineOptions.timeNow?: () => number` (types, sub-fase 2.3.b): inxección do reloxo virtual no `TimeManager` interno. Default `Date.now`. Tests deterministas inxectan unha función mockeable.
- `canUnlock` (engine, sub-fase 2.3.b) consulta `TimeManager` entre as comprobacións de estado (`maxed`/`unlocked`/`expired`/`disabled`) e as de prerequisites/recursos. Se `TimeManager` devolve `pending` → `allowed: false` co novo `NODE_NOT_YET_AVAILABLE` (YGG_E018); se devolve `expired` (caso típico: ningún `tick` chamouse aínda pero a constraint xa expirou) → `allowed: false` co existente `NODE_EXPIRED`. `permanent`/`active` non bloquean. O bloque previo de `currentState === 'expired'` (que xa marcaba `NODE_EXPIRED`) segue funcionando: a comprobación nova só intervén cando o estado almacenado **non** detecta a caducidade pero `TimeManager` si.
- `ErrorCode.NODE_NOT_YET_AVAILABLE = 'YGG_E018'` (common, sub-fase 2.3.b) con mensaxes localizadas en gl/es/en. Placeholders `{nodeId}` e `{startsAt}` (timestamp UTC ms; o consumidor formatérao como prefira).
- `TimeManager` (engine, sub-fase 2.3): peza standalone que avalía restricións temporais dun nodo a partir de tres campos de `TimeConstraints`: `startsAt` e `expiresAt` (UTC ms) e `expiresAtCalendar` (`{date, time, timezone}`, TZ-aware). API pública: `evaluate(constraints)`, `evaluateAt(constraints, atMs)`, `nextTransitionAt(constraints)`. Devolve un `TimeStatus` discriminado con kinds `permanent` / `pending` (con `startsAt`) / `active` (opcionalmente con `expiresAt`) / `expired` (con `expiredAt`). Reloxo virtual obrigatorio: o `TimeManager` non chama nunca a `Date.now()` directamente, todo pasa por `context.now: () => number`, o que permite inxección trivial en tests e SSR. Cando `expiresAtCalendar` e `expiresAt` están ambos definidos prevalece o calendar (resolúcese a UTC ms vía `Intl.DateTimeFormat` con corrección de offset en dúas pasadas para manexar transicións DST). Constraints inválidas (TZ inexistente, data malformada, `NaN`/`Infinity`) trátanse como ausentes; cero excepcións, cero `Result<>`.
- `TreeEngine.getStat(statId): number` e `TreeEngine.getAllStats(): Readonly<Record<string, number>>` (engine, sub-fase 2.2.b): API pública para consultar stats globais agregados. `getStat` devolve `NaN` para statIds descoñecidos; `getAllStats` devolve unha entrada por cada `StatDef` declarado en `treeDef.stats` (Record vacío se non hai stats). Delegan no `StatComputer` interno que se cablea como `private readonly` no constructor tras o `EffectsRunner`.
- Invalidación automática da cache do `StatComputer` tras cada mutación exitosa do estado: `unlock` (antes do bloque de effects para que estes leas valores actualizados), `lock`, `respec`, `applyChanges`. Multi-tier: cada salto de tier dun `unlock` invalida individualmente, polo que `perTier` reflicte sempre o tier vixente.

### Changed
- `StatComputerContext` (engine): o campo `state: TreeState` substituíuse por `store: StateStore` para que o computer lea o snapshot vixente con `store.getState()` en cada cálculo (necesario para integrarse con mutacións Immer en `TreeEngine`). Cambio mínimo requirido pola integración; a API pública de `StatComputer` (`computeStat` / `computeAllStats` / `explainStat` / `invalidate`) **non muda**. Os tests existentes da sub-fase 2.2 que mutaban `state` por referencia foron adaptados a `store.replaceTreeState`.

### Note
- `tick` (sub-fase 2.3.b) **non** afecta nodos en estados distintos de `unlocked`/`maxed`: un nodo `locked` con `startsAt` no pasado **non** pasa a desbloqueable automaticamente — iso é responsabilidade do consumidor (que pode consultar `canUnlock` ou inspeccionar directamente o `TimeManager`). `tick` tampouco dispara `nodeDef.effects` ao expirar (esos son semánticamente para unlock; "effects ao expirar" é decisión nova non aquí). Audit: unha única entrada `node_expired` por nodo (cero entradas agregadas tipo `tick_completed`).
- `lock`/`respec`/`applyChanges` non se modificaron na 2.3.b: o `TimeManager` non ten cache propia (consulta `context.now()` en cada chamada), polo que non hai nada que invalidar coordinadamente.
- `TimeManager` (sub-fase 2.3) implementa **só caducidades** (`startsAt` / `expiresAt` / `expiresAtCalendar`). Os campos `cooldownMs`, `reCertifyAfterMs`, `validForMs` declarados en `TimeConstraints` **trátanse como ausentes** en runtime nesta sub-fase: requiren modelo de estado adicional (ex: `lastUnlockedAt`) e quedan diferidos a unha sub-fase futura. `TimeManagerOptions` (`enabled`, `checkIntervalMs`, `leadTimeMs`, `timezone`) acéptase no contexto pero ignórase nesta sub-fase standalone; a súa semántica corresponde á capa de scheduling de 2.3.b.
- A integración de `TimeManager` con `TreeEngine` (auto-marcar nodos como `'expired'`, emitir `EventMap.nodeExpired`, escribir `AuditAction.node_expired`, programar checks vía `setTimeout` usando `nextTransitionAt`) é sub-fase aparte (**2.3.b**), seguindo o mesmo patrón ca 2.1→2.1.b e 2.2→2.2.b. `EventMap.nodeExpired` e `AuditAction.node_expired` están declarados pero non se emiten ata 2.3.b.
- Cobertura (acumulada 2.3.b): `TreeEngine.ts` 96.25% → 96.46%; `TimeManager.ts` 98.73% (sen variación); global 98.14% (sen variación respecto a 2.3). Tests do paquete `core`: 721 → 748 (27 novos en `__tests__/engine/TreeEngine.time.test.ts`).
- Cobertura (acumulada 2.3): `TimeManager.ts` 98.73/96.29/100/98.73 (a única liña non cuberta é a rama defensiva `Number.isNaN(Date.UTC(...))`, inalcanzable con dígitos válidos garantidos polo regex previo); global 98.11% → 98.14%. Tests do paquete `core`: 676 → 721 (45 novos en `__tests__/engine/TimeManager.test.ts`).
- O effect `modify_stat` segue sen implementar: nun unlock con `effects: [{ type: 'modify_stat', ... }]`, o `EffectsRunner.run` rexéitao co código orixinal `EFFECT_TYPE_UNSUPPORTED` (YGG_E013) que `unlock` envolve como `EFFECT_APPLICATION_FAILED` (YGG_E017) cun `context.originalErrorCode = 'YGG_E013'`. Rollback total do unlock como sempre. Implementación diferida a unha sub-fase futura (probablemente 2.2.c ou con `TimeManager`) que defina onde almacenar o delta persistente, como compoñer coa derivación de `StatComputer`, e como serializar.
- O evento `EventMap.statChange` queda declarado pero **non se emite**: a emisión require comparar valores antes/despois por mutación (overhead non trivial). Para observar cambios de stats, subscríbase aos eventos de mutación (`unlock`, `lock`, `respec`, `treeChanged`) e re-consulte `getStat` / `getAllStats`. Documentado no JSDoc do propio campo en `events.ts`.
- `explainStat` queda accesible só polo `StatComputer` interno; non se expón en `TreeEngine` (briefing 2.2.b §5.2: a API pública mantense mínima ata que un consumidor o necesite).
- Cobertura (acumulada 2.2.b): `StatComputer.ts` 100/98.18/100/100 (sen variación); `TreeEngine.ts` 96.20% → 96.25%; global 98.10% → 98.11%. Tests do paquete `core`: 663 → 676 (13 novos en `__tests__/engine/TreeEngine.stats.test.ts`).

## [Unreleased]

### Added
- `StatComputer` (engine, sub-fase 2.2): peza standalone que calcula valores agregados de stats globais a partir das `statContributions` dos nodos desbloqueados. API pública: `computeStat(statId)`, `computeAllStats()`, `explainStat(statId)`, `invalidate()`. Soporta operacións `+`, `-`, `*`, `/`, `min`, `max`, `set`; multiplicador `perTier` baseado en `NodeInstance.currentTier`; `conditions?` opcionais avaliadas como AND lóxico vía `UnlockResolver` (envolvidas como `UnlockRule { type: 'all', conditions }`). Clamp final de `min`/`max` aplicado **unha soa vez** tras todas as contribucións (briefing §5.3 paso 4), nunca entre operacións.
- Cache simple invalidable: `computeStat` consulta un `Map<string, number>` privado antes de calcular; `invalidate()` baléirao por completo (invalidación granular por nodo deliberadamente fóra de alcance — §5.4). `explainStat` **NUNCA** usa cache; recalcula sempre para reflectir o estado exacto no momento. Os statIds descoñecidos non se cachean (evitan contaminar a cache con NaN).
- Comportamento defensivo: `computeStat('nope')` para statId descoñecido devolve `NaN` (sen lanzar, sen `Result<>`); `explainStat('nope')` devolve `{ statId, finalValue: NaN, contributions: [] }`. `NodeInstance` que referencia un `NodeDef` inexistente saltase silenciosamente (caso defensivo improbable con TreeDef validada por Zod, pero protexido). Cero validación semántica de matemáticas patolóxicas: divisións por cero propágansen como `Infinity`/`NaN`, é responsabilidade do deseñador da árbore.
- `StatExplanation` (consumo): para cada nodo contribuínte, a entrada inclúe `{ nodeId, op, value, appliedTier, conditional? }`. Contribucións aplicadas **sen** `conditions?` → `conditional: undefined`; contribucións con `conditions?` que **pasaron** → `conditional: true` con `appliedTier` real; contribucións saltadas por condición → `conditional: true` con `appliedTier: 0` (briefing §5.5).
- Tests (`__tests__/engine/StatComputer.test.ts`): 40 tests novos cubrindo valor inicial sen contribucións, cada unha das 7 operacións, `perTier` on/off, todos os `NodeState` (só `unlocked`/`maxed` contribúen; `locked`/`unlockable`/`in_progress` ignóranse), conditions AND simple e múltiple, agregación multi-nodo, clamp `min` e `max`, statId inexistente para `computeStat` e `explainStat`, comportamento de cache (sen/con `invalidate()`), `computeAllStats` con e sen `treeDef.stats`, detalle exacto de `explainStat` (incluíndo NON-cache), división por cero como `Infinity`, NodeInstance ghost saltado silenciosamente, e ignorar contribucións con statId diferente. Total tests do paquete `core`: 623 → 663.
- Cobertura de `StatComputer.ts`: 100% Stmts / 98.18% Branch / 100% Func / 100% Lines (ben por riba do limiar ≥90%). Cobertura global do paquete pasa de 98.02% → 98.10% Stmts; sen regresión en ningunha métrica.

### Note
- Integración con `TreeEngine` (`getStat`, `getAllStats` getters) e cableado do effect `modify_stat` (hoxe `EFFECT_TYPE_UNSUPPORTED`) queda diferida á sub-fase 2.2.b, replicando o patrón illado→integrado xa usado en 2.1/2.1.b. `TreeState.computedStats` (xa presente en `tree.ts:113`, inicializado a `{}` en `StateStore.ts:131`) **NON se usa nesta sub-fase**; a sincronización co StateStore tamén é 2.2.b.

## [Unreleased]

### Added
- `TreeEngine.unlock` (engine, sub-fase 2.1.b): executa automaticamente `nodeDef.effects` vía o `EffectsRunner` integrado tras un unlock exitoso. Atomicidade total: se algún effect falla, faise rollback completo do unlock — restáurase o estado previo do nodo, o budget vólvese exacto ao previo (oldBudget directo, **independente da flag `refundable` dos recursos**: este é rollback técnico, NON refund voluntario), emítense eventos de reversión (`budgetChange`, `stateChange` con `reason: 'effect_failed'`, `lock`) e rexístrase unha entrada audit compensatoria. O audit `node_unlocked` previo NON se reverte (é histórico real do que pasou).
- Audit agregada con detalle: unha única entrada `custom` por unlock con effects, en lugar dunha entrada por effect. `name: 'effects_applied'` no éxito (cos detalles `{ nodeId, count, effects: [{ type, applied, reason }] }`) ou `name: 'effects_failed'` no rollback (cos detalles `{ nodeId, ...errorContext }` que inclúe `failedAt`, `failedEffect`, `reason`, `revertedCount`, `originalErrorCode`).
- Multi-tier (sec. 5.7): se un nodo ten `maxTier >= 2` e `effects`, cada salto de tier executa os effects (semántica natural). Ex: nodo con `effects: [modify_resource +5 gold]` e `maxTier: 3` dá 15 gold acumulados tras 3 unlocks.
- `EffectContext.engine` é auto-referencia ao mesmo `TreeEngine` que aloxa o runner, permitindo a `unlock_node` effects chamar de volta a `engine.unlock` (uso seguro pola atomicidade do propio `run`).
- Tests novos (`__tests__/engine/TreeEngine.effects.test.ts`): 8 tests cubrindo unlock sen effects (backwards compat), effects exitosos con audit agregada, fallo de effect simple (Caso A: rollback completo de estado/budget/eventos), fallo composto (Caso B: primeiro effect revertido + cost refundado), multi-tier (3 saltos = 3 audit entries), unlock_node recursivo sen ciclo, e ciclo A↔B (estado coherente; ver DT-11). Total tests do paquete `core`: 615 → 623.
- Cobertura: `TreeEngine.ts` 96.18% → 96.20% Stmts; global 97.69% → 98.02%. Baseline non baixou en ningunha métrica.

### Known issues
- DT-11 — Detección de ciclos `unlock_node` recursivos non se activa cando pasan polo `TreeEngine.unlock`: cada chamada a `engine.unlock` desde un effect `unlock_node` crea un novo `EffectsRunner.run` co seu propio `unlockedDuringRun` Set local, polo que a protección con `MAX_EFFECT_DEPTH = 8` é inerte nese fluxo concreto. O ciclo detéctase de forma colateral como `NODE_ALREADY_UNLOCKED` ao longo da cadea de erros propagados, e o estado queda coherente (rollback aplicado correctamente en cada nivel). Solución futura: estender o `EffectContext` para compartir o `Set<string>` entre invocacións aniñadas, ou mover a detección a `TreeEngine.unlock`. Non bloqueante.

## [Unreleased]

### Added
- `EffectsRunner` (engine, sub-fase 2.1): runner standalone do Effects DSL (`types/effects.ts`) que aplica e revira efectos declarativos contra unha pila inxectada de pezas do motor (`StateStore`, `ResourceManager`, `UnlockResolver`, `EventEmitter`, `TreeEngine`). Construído como peza illada por deseño: o consumidor instancia manualmente `EffectContext` con `{ engine, store, resources, resolver, events, locale }`. NON se conecta automaticamente a `TreeEngine.unlock` — a integración cómoda queda para a sub-fase 2.1.b.
- Cobertura desta sub-fase: 8 dos 10 effect types con forward + reverse — `modify_resource` (+/-/*), `trigger_event`, `conditional`, `composite`, `set_node_visibility`, `unlock_node`, `modify_node_state`, `set_progress`. Os outros dous (`modify_stat`, `plugin`) devolven `EFFECT_TYPE_UNSUPPORTED` (validate e run); quedan para 2.2 e fase 8.
- Atomicidade en `run()`: todo-ou-nada. Se o N-ésimo effect falla, os N-1 anteriores revírtense automaticamente en orde inversa; o error devolve `EFFECT_APPLICATION_FAILED` cun `context` que inclúe `failedAt`, `failedEffect`, `revertedCount` e `originalErrorCode` da causa real.
- `EffectsRunner.validate(effects)`: comprobación estática sen aplicar — tipos coñecidos, referencias a `nodeId`/`resourceId` existen na TreeDef, rango `[0, 100]` para `set_progress`, lista branca de transicións para `modify_node_state`, recursión completa sobre `composite`/`conditional`.
- `EffectsRunner.run(effects)`: forward atómico. Detección de bucles vía `Set<string>` de nodos desbloqueados durante a corrida (`unlock_node` repetido → `CIRCULAR_EFFECT`). Profundidade máxima de cascada `MAX_EFFECT_DEPTH = 8` (composite/conditional aniñados en exceso → `CIRCULAR_EFFECT`).
- `EffectsRunner.reverse(results)`: itera en orde inversa, cada effect usa o seu `previousValue` para restaurar o estado previo. Effects con `irreversible: true` → `IRREVERSIBLE_EFFECT`. Para `set_node_visibility` preservase a distinción "campo ausente vs explicitamente `undefined`" (decisión do arquitecto): se `previousValue === undefined`, elimínase o campo do draft; se é boolean, restaúrase exactamente.
- Lista branca de transicións de `modify_node_state` (sec. 5.8 do briefing): só `locked↔unlockable` e `unlocked↔disabled` están permitidas. Calquera outra (incluíndo saltar a `'unlocked'` ou `'maxed'` directamente) → `EFFECT_APPLICATION_FAILED`. Os saltos a `'unlocked'/'maxed'` deben pasar polo fluxo normal de `unlock` con custos e prerequisites.
- `EffectContext` (engine, public): interface inxectable que agrupa as pezas do motor que cada effect necesita. Exportada xunto co `EffectsRunner`.
- `NodeInstance.visible?: boolean` (types/node.ts): novo campo opcional mutable (sen `readonly`, coherente co estilo do tipo; Immer garante a inmutabilidade externa). Usado polo effect `set_node_visibility`.
- `EventMap.customEvent: (eventName: string, payload?: unknown) => void`: novo evento emitido polo effect `trigger_event`. O `payload` trátase como `unknown`; o consumidor é responsable de validalo.
- `EffectResult.previousValue?: unknown`: novo campo opcional para soportar `reverse()`. Cada effect coñece o tipo concreto que garda (number/boolean/string/array/object); reversores defensivos no caso de `previousValue` corrupto.
- `ErrorCode` ampliado con 5 códigos novos (`@yggdrasil-forge/common`): `EFFECT_TYPE_UNSUPPORTED` (YGG_E013), `IRREVERSIBLE_EFFECT` (YGG_E014), `CIRCULAR_EFFECT` (YGG_E015), `EFFECT_TARGET_NOT_FOUND` (YGG_E016), `EFFECT_APPLICATION_FAILED` (YGG_E017). Mensaxes localizadas en `gl`/`es`/`en`.
- Tests (`__tests__/engine/EffectsRunner.test.ts`): 68 tests novos cubrindo validate, run/reverse felices por tipo, atomicidade, detección de bucles, casos de error con `.code` exacto, integración con `customEvent`, e cobertura adicional de ramas defensivas. Total tests do paquete `core`: 547 → 615.
- Cobertura de `EffectsRunner.ts`: 100% Stmts / 97.29% Branch / 100% Func / 100% Lines. Cobertura global do paquete sobe a 98.04% Stmts / 91.09% Branch (de 97.69 / 89.93 baseline). Ramas defensivas xenuínas anotadas con `c8 ignore` xustificado.

## [Unreleased]

### Fixed
- DT-10 — Multi-tier unlock completo para nodos con `maxTier >= 2`: chamadas consecutivas a `unlock` sobre o mesmo nodo avanzan o seu tier ata `currentTier === maxTier`, momento no que pasa a `'maxed'`. Cada salto emite `unlock`, `stateChange` e `budgetChange`, e (con audit activo) rexistra unha entrada `node_unlocked` co tier alcanzado. Atomicidade preservada: se `applyCost` falla a media, o estado permanece intacto. A semántica de `maxTier === undefined` (queda en `'unlocked'`, reintentos bloqueados) e `maxTier === 1` (pasa a `'maxed'` no primeiro unlock) **non cambia**: multi-tier é opt-in vía `maxTier >= 2` explícito.

## [Unreleased]

### Added
- Phase 1 integration test suite (1.18, closure of Phase 1): new `packages/core/__tests__/integration/` directory with 6 end-to-end scenarios — `lifecycle`, `economy`, `applyChanges`, `audit`, `subscription`, `untrusted-input` — plus targeted coverage tests for `TreeEngine.ts`. Reusable rich fixtures (`fixtures.ts`) build realistic `TreeDef` instances that pass the Zod schema (round-trip safe via `toJSON ↔ fromJSON`).
- No production code changes. Coverage rises: global 92.72% → 97.68%, `TreeEngine.ts` 81.72% → 96.12%. Total core tests: 482 → 538.

## [Unreleased]

### Added
- `treeDefSchema` (engine): esquema Zod que reflicte estruturalmente o tipo `TreeDef`. Só validación estrutural (NON regras pedagóxicas — iso é a Fase 8). Recursivo (`subtrees`) vía `z.lazy`. `InferredTreeDef` exportado (tipo do TreeDef tras validación runtime; difire de `TreeDef` só no artefacto `?:T|undefined` de Zod 3, equivalencia probada por test de tipo).
- `TreeDefValidator.validateTreeDef(input, locale?)`: validación estrutural de entrada non confiable; devolve `Result<InferredTreeDef>`. En erro: `YggdrasilError(INVALID_TREE_DEF)` con `issues` serializables `{path, message}[]` no `context` e mensaxe localizada. Nunca lanza.
- `JsonSerializer` (engine): `serialize(treeDef)` JSON determinista (claves ordenadas de forma estable, recursivo; inclúe `schemaVersion`; só a definición, sen estado runtime) e `deserialize(json, locale?)` (parse → validación → comprobación de `schemaVersion` contra `SCHEMA_VERSION` de common). `schemaVersion` non soportada → `SCHEMA_VERSION_UNSUPPORTED`; JSON malformado → `INVALID_TREE_DEF` controlado.
- `TreeEngine.fromJSON(json, options?)`: factory estático que deserializa+valida e constrúe o engine; devolve `Result<TreeEngine>` SEN lanzar (a entrada é externa). O constructor normal mantén a súa semántica de throw intacta.
- `TreeEngine.toJSON()`: serializa o `TreeDef` actual do engine de forma determinista (round-trip a nivel engine).
- Dependencia `zod` (^3) engadida só a `@yggdrasil-forge/core`.
- `AuditLogger` (engine): rexistro de auditoría en memoria con `record`, `query`, `clear`, `size`. Desactivado por defecto (cero overhead); límite circular FIFO configurable (`maxEntries`, default 1000).
- `TreeEngine.getAuditLog(filter?)`: devolve unha copia filtrada das entradas de auditoría (por `actor`, `action.type`, rango `from`/`to` inclusivo, `limit`). Máis recente primeiro. Síncrono.
- `TreeEngine.clearAuditLog()`: baleira o rexistro de auditoría.
- `TreeEngine.logAudit(action, opts?)`: API manual para rexistrar accións `custom` ou propias; no-op se audit desactivado; emite `auditEntry` cando crea entrada.
- Rexistro automático tras as 4 mutacións exitosas (NON nos erros): `unlock` → `node_unlocked` (rollbackable), `lock` → `node_locked` (rollbackable), `respec` → `respec`, `applyChanges` → `tree_changed`. Cada rexistro emite o evento `auditEntry`.
- `TreeEngineOptions.audit`: configuración opcional `{ enabled?: boolean (default false); maxEntries?: number (default 1000) }`.

## [Unreleased]

### Added
- `Selector<T>` type: función pura `(state: TreeState) => T`.
- `createSelector`: factoría de selectors memoizados estilo reselect, caché last-args (tamaño 1) con igualdade referencial das entradas; tipada con sobrecargas para 1-3 selectors de entrada + combinador (cero `any`).
- `shallowEqual`: helper puro de comparación superficial (un nivel), para uso opcional como `equalityFn`. Non é o default; o default segue sendo `Object.is`.
- `TreeEngine.select<T>(selector)`: lectura pura e síncrona dunha porción derivada do snapshot actual. As excepcións do selector propáganse (non se capturan).
- `TreeEngine.subscribeWithSelector<T>(selector, listener, options?)`: subscríbese ao store global pero só chama a `listener(selected, previous)` cando o valor seleccionado cambia segundo `equalityFn` (default `Object.is`); soporta `fireImmediately`; devolve un `Unsubscribe`.

## [Unreleased]

### Added
- `TreeEngine.unlock(nodeId)`: mutación async que valida prerequisites, exclusións e recursos, aplica custo atómico, cambia estado e emite eventos `unlock`, `stateChange`, `budgetChange`.
- `TreeEngine.lock(nodeId)`: mutación async que reverte un nodo a `locked`, fai refund segundo `refundable`/`refundPercent`, e emite eventos `lock`, `stateChange`, `budgetChange`.
- `TreeEngine.respec(nodeId?)`: mutación async de respec total ou parcial con detección de cascada de dependentes invalidados. Atómica: unha soa `StateStore.update`.
- `TreeEngine.canUnlock(nodeId)`: comprobación síncrona pura que avalia prerequisites, exclusións e recursos sen mutar estado.
- `TreeEngine.on/off`: subscrición tipada a eventos do `EventMap`.
- Tipos exportados: `UnlockResult`, `LockResult`, `RespecResult`.

### Fixed
- DT-7: eliminada rama morta inalcanzable en `ResourceManager.applyCost` (bloque `if (required === null)` que nunca se executaba). Simplificado `aggregateCosts` para que nunca devolva `null`.

## [Unreleased]

### Added
- `TreeEngine`: fachada pública do motor con constructor e getters síncronos (`getNodeState`, `getAllNodeStates`, `getBudget`, `getProgress`, `getTreeDef`, `getLocale`, `isReadOnly`, `getSnapshot`, `getServerSnapshot`, `subscribe`).
- `TreeEngineOptions`: interface con campos `locale` e `readOnly`.

### Fixed
- DT-6: `ResourceManager` `INVALID_COST` agora reporta o importe real do custo negativo en vez de `unknown`.

### Added
- `INVALID_COST` (`YGG_V006`) error code with localized messages in Galician, Spanish, and English for invalid resource cost amounts.

### Changed
- `ResourceManager` now emits localized error messages via `getErrorMessage()` instead of hardcoded English strings.

### Fixed
- Lint warning `useTemplate` in `ResourceManager` (DT-5).

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: `DependencyGraph` class
  - Configurable by edge type (default: `dependency`; optionally `soft_dependency`)
  - `getDependencies`, `getDependents` (direct), `getAllDependencies`, `getAllDependents` (transitive closures)
  - `getRoots`, `getLeaves`, `getNodeIds`, `hasNode`, `getOutgoing`
  - `distanceBetween` (BFS, `Number.POSITIVE_INFINITY` if unreachable) — implements `DependencyGraphLike`
  - `getShortestPath` (BFS with predecessor tracking)
  - Handles bidirectional edges, self-loops, isolated nodes, disconnected graphs
- `@yggdrasil-forge/core`: `CycleDetector` class
  - `hasCycle` (fast DFS, short-circuits)
  - `findCycles` (all cycles, deduplicated via canonical rotation key)
  - `findCycleContaining` (cycle including a given node, for pedagogical error messages)
  - 100% test coverage for both

### Added
- `@yggdrasil-forge/core`: `UnlockResolver` class
  - Evaluates `UnlockRule` (all/any/none combinators + atomic conditions)
  - Supports all 15 atomic condition types
  - `evaluate(rule, ctx)` — fast boolean evaluation with short-circuit
  - `evaluateCondition(condition, ctx)` — atomic evaluation
  - `explain(rule, ctx)` — detailed explanation with localized reasons (gl/es/en)
  - Stateless: receives `UnlockResolverContext` (treeDef, state, optional dependencyGraph, customEvaluators, locale)
  - Localized error messages for missing dependency graph and unregistered custom evaluators
  - 100% test coverage

- `@yggdrasil-forge/core`: `ChangeTracker` class + `analyzeChanges` function
  - Pure analysis of `TreeChange[]` (no mutation, no external state access)
  - Selective cache invalidation per change type (layout / dependency / search / stats)
  - Field-aware analysis of `modify_node` and `modify_edge` (only invalidates caches affected by the modified fields)
  - Internal conflict detection: `duplicate_add_node`, `add_then_remove`, `remove_then_modify`, `modify_after_rename`, `rename_chain`, `rename_to_existing`, `duplicate_edge_id`
  - Rename tracking (oldId → newId map)
  - 100% test coverage

### Added
- `@yggdrasil-forge/core`: `StateStore` class
  - Holds mutable `treeDef` and `treeState` via Immer
  - `update(producer)` and `applyTreeDefChange(producer)` for ergonomic mutations
  - `replaceTreeDef`, `replaceTreeState` for full replacements
  - Integrated cache versioning for 4 cache types (`layout`, `dependency`, `search`, `stats`)
  - `getCacheVersion`, `invalidate`, `setCache`, `getCache` for cache lifecycle
  - Subscription system: `subscribe`, `getSnapshot`, `getServerSnapshot` (React `useSyncExternalStore`-compatible)
  - 100% test coverage



### Added
- `@yggdrasil-forge/core`: wave 3 type definitions
  - `Effect` DSL with 10 effect types (modify_resource, modify_stat, modify_node_state, set_node_visibility, unlock_node, set_progress, trigger_event, conditional, composite, plugin)
  - `TimeConstraints` with dual API (UTC ms absolutes/relatives + calendar with explicit timezone)
  - `TimeManagerOptions`
  - `StatContribution` with 7 operations (+/-/*//min/max/set), perTier, conditional contributions
  - `StatExplanation` for debugging stat computations
  - `AuthConfig` (none/bearer-static/bearer-provider/apikey-static/apikey-provider/basic/custom)
  - `AuthProvider`, `AuthRequestHandler`
  - `ProgressSourceConfig` (5 types: manual/remote/callback/event/computed)
  - `ProgressHandler`, `ProgressHandlerContext`
  - `Build`, `BuildShareLink`, `BuildSnapshot`
  - `AuditEntry`, `AuditAction` (10 action types), `AuditFilter`
  - `TreeChange` (12 change types including `rename_node_id` with auto-reference updates)
  - `ModifyNodeChanges`, `ModifyEdgeChanges` (constrained partials excluding id/type)
  - `EngineMetrics`

### Changed
- `NodeDef`: `unknown` placeholders replaced with concrete types (cost, costPerTier, effects, prerequisites, progressSource, subtreeOverrides, timeConstraints, statContributions)
- `TreeDef`: `resources`, `startingBudget`, `i18n` now use concrete types
- `TreeState.budget`: now `Budget`
- `NodeInstance.subtreeState`: now `TreeState`
- `EventMap`: `buildLoaded`, `treeChanged`, `auditEntry` now use concrete types


### Added
- `@yggdrasil-forge/core`: foundational type definitions
  - `Result<T, E>` with helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`)
  - `NodeDef`, `NodeInstance`, `NodeType`, `NodeState`, `Position`, `StateChange`
  - `freezeNodeDef(def)` for recursive Object.freeze of node definitions
  - `EdgeDef`, `EdgeType`, `EdgeStyle`
  - `TreeDef`, `TreeState`, `GroupDef`, `StatDef`, `LayoutConfig`
  - `RichContent`, `NodeContent`
  - Re-exports of `ErrorCode`, `YggdrasilError`, `isYggdrasilError`, `getErrorMessage` from `@yggdrasil-forge/common`
- `test:coverage` script in package.json template (and in `common` + `core` retroactively)

- `@yggdrasil-forge/core`: wave 2 type definitions
  - `Resource`, `Cost`, `Budget` (economy primitives)
  - `I18nConfig` (per-tree i18n configuration)
  - `UnlockCondition` (15 atomic types: node-based, resource-based, distance, tags, time, custom, etc.)
  - `UnlockRule` (AND/OR/NOT combinators + atomic conditions)
  - `UnlockCheck`, `UnlockExplanation`, `UnlockConditionEvaluation`
  - `EventMap` (15 events: unlock, lock, stateChange, budgetChange, statChange, progressChange, respec, buildLoaded, subtreeEntered, treeChanged, nodeExpired, externalProgressSynced, pluginError, error, auditEntry)
  - `Plugin`, `PluginAPI`, `PluginEngineHandle`, `PluginInstallResult`
  - `Hooks` (beforeUnlock/afterUnlock/beforeLock/afterLock/beforeRespec/afterRespec/computeUnlockability/computeCost)
  - `HookContext`, `ConditionEvaluator`, `PluginLogLevel`, `PluginPermission`
### Changed
- `scripts/create-package.mjs` now includes `test:coverage` in scaffolded packages

### Added
- `@yggdrasil-forge/common`: real content (constants, locales, i18n, errors)
  - `Locale`, `SupportedLocale`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `FALLBACK_LOCALE`, `isSupportedLocale`
  - `LocalizedString`, `resolveLocalized`, `interpolate`
  - `ErrorCode` enum (30+ codes covering engine, validation, storage, plugins, etc.)
  - `YggdrasilError` class with `code`, `context`, `cause`, `toJSON()`
  - `isYggdrasilError` type guard
  - `getErrorMessage` with localized messages in gl/es/en for all error codes
- 100% test coverage in `@yggdrasil-forge/common`

### Fixed
- lint-staged now processes the entire repo with Biome instead of file-by-file (fixes Windows command line length limit)
- Release workflow no longer attempts to publish to npm without NPM_TOKEN configured (avoids spurious red runs)
- Turbo `test` task now declares explicit empty outputs (silences warning)

### Added
- Created `@yggdrasil-forge/common` package (placeholder)
- Created `@yggdrasil-forge/core` package (placeholder, depends on common)
- Configured tsup for ESM + CJS dual builds across packages
- Configured TypeScript project references for incremental builds
- Per-package vitest configs that extend the root config
- Per-package tsconfig with composite mode
- Approved esbuild build scripts via `pnpm approve-builds`
- Vitest configured at workspace root with v8 coverage provider
- Smoke tests to verify Vitest installation
- GitHub Actions CI workflow (lint, format, typecheck, test)
- PR title validation workflow (enforces Conventional Commits)
- CI and License badges in README
- New scripts: `test:ui`, `test:coverage`, `format:check`
- Initial monorepo structure
- .gitattributes for cross-platform LF line endings
- .npmrc with hoisted node-linker (Windows compatibility)
- Turborepo telemetry disabled by default
- Approved build scripts for @biomejs/biome via pnpm allowBuilds
- TypeScript, Biome, and Turborepo configuration
- License (MIT) and contribution guidelines
- Master architecture document at `docs/architecture/MASTER.md`
- VS Code workspace settings and recommended extensions
- Husky git hooks (pre-commit lint-staged, pre-push typecheck)
- Environment check script (`pnpm check-env`)
- Refined Biome configuration with stricter rules
- Refined TypeScript configuration with extra safety options
- Additional npm scripts: `lint:fix`, `test:watch`, `fresh`, `validate`
- Configured `pnpm catalog` for shared devDependencies (tsup, vitest, etc.)
- Configured `@changesets/cli` with hybrid versioning (4 core packages linked, others independent)
- Created GitHub Actions release workflow (preparation, requires NPM_TOKEN to activate)
- Created `scripts/create-package.mjs` for consistent package scaffolding
- Created 15 placeholder packages following the standard template:
  - Core (linked): themes, react
  - Independent: storage, i18n, analytics, search, diff, exporters, importers,
    webhooks, stats, validators, heatmap, multitenancy, devtools, neo4j, cli


### Changed
- Removed root-level `__tests__/smoke.test.ts` (replaced by per-package smoke tests)
- Added tsup as devDependency per-package (required for pnpm workspace isolation)
- Renamed `docs/BRIEFINGS` to `docs/briefings` (kebab-case convention)
- Refined `turbo.json` with stream UI and test:watch task
- TypeScript: enabled `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `incremental`
- Refactored `common` and `core` packages to use catalog references
