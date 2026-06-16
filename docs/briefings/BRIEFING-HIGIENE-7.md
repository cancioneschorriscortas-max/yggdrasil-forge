# BRIEFING — SUB-FASE HIXIENE DE CÓDIGO POST-FASE 7 de Yggdrasil Forge

> Pega este documento no chat executor.
> **SUB-FASE DE HIXIENE DE CÓDIGO** posterior ao peche da Fase 7
> (12/12 sub-fases sen rollbacks). Resolve **6 das 9 débedas
> abertas** de cobertura/SSR-safety acumuladas durante a Fase 7,
> deixando documentadas como "known limitations" 2 débedas que son
> artefactos v8 inherentes á instrumentación (cero solución técnica
> sen romper a propia instrumentación) e 1 débeda xa resolta
> implícitamente en 7.12.
>
> **Pezas a entregar (5 grupos)**:
> 1. **Tests novos** en SkillTreeAnnouncer.test.tsx + SkillTree.test.tsx
>    que cobren ramas non exercidas (resolven débedas 5, 9).
> 2. **`v8 ignore` xustificados** en svg-helpers.ts + SVGRenderer.tsx
>    para ramas defensivas reais (resolven débedas 1, 2).
> 3. **Migración cirúrxica** `getSnapshot.bind` → `getServerSnapshot.bind`
>    no 3º param de `useSyncExternalStore` en 5 ficheiros: SkillTree.tsx
>    + 4 hooks (resolve débeda 8; cero cambio funcional observable
>    porque ambos métodos do core devolven o mesmo valor actualmente,
>    pero preparado para futuras divergencias).
> 4. **Comment de design intencional** en themes/minimal.ts
>    documentando que os estados `disabled` e `expired` aplican
>    fallback ao color de `nodeLocked` (resolve débeda 4 sen
>    scope creep — modificar 3 ficheiros para engadir cores rompería
>    a intención "minimal" do tema).
> 5. **CHANGELOG + changeset** documentando a hixiene.
>
> **DIFERIDAS explícitamente como "known limitations"** (sub-fase
> de doc MASTER posterior documentará):
> - **D6**: `headless.ts` cobertura 0/0/0/0 — artefacto v8 inherente
>   con módulos puramente de re-exports + dynamic import en tests.
> - **D7**: `server.ts` cobertura 0/0/0/0 — mesmo patrón.
>
> **JA RESOLTA implícitamente en 7.12** (anotación):
> - **D3**: `SkillTreeWithDefaultTheme.tsx` pasou de 50/100/0/50 a
>   100/100/100/100 porque os tests a11y de 7.12 exerceron o wrapper
>   indirectamente (root entry é `SkillTreeWithDefaultTheme as SkillTree`).
>
> **MASTER doc update** (leccións 7.5 L1, 7.6 L1, 7.7 L1 + bloque
> "🎉 FASE 7 PECHADA OFICIALMENTE" co resumo histórico) **DIFERIDO
> a sub-fase POSTERIOR** dedicada a doc.
>
> **Cero modificación de**: tests existentes (salvo os 2 ampliados),
> compoñentes existentes fora dos 7 modificados, calquera ficheiro
> doutros paquetes.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ HIXIENE CÓDIGO POST-FASE 7 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ HIXIENE CÓDIGO POST-FASE 7 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — Cobertura prescrita post-hixiene**:
- **SkillTreeAnnouncer.tsx**: subir de 72.72/60/50/72.72 a **>= 95/85/85/95**.
- **svg-helpers.ts**: subir de 92.59/83.33 a **100/100** (post v8 ignores).
- **SVGRenderer.tsx**: subir de 93.75/91.3 a **100/100** (post v8 ignores).
- **SkillTree.tsx**: subir de 100/92.3 a **100/100** (post +1 test).
- **Resto sen regresión**.
- **Global packages/react**: subir desde 95.16/93.54/89.83/95.93 (post-7.12) a **>= 96/95/91/96**.

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de calquera
ficheiro existente salvo os explicitamente prescritos en §5.1.

**Tódolos 111 tests existentes deben pasar intactos**. Especial
atención a:
- **6 tests de SkillTreeAnnouncer.test.tsx** (cobertura actual 6
  de 12 entradas no map DEFAULT_MESSAGES; ampliamos a +3 sen tocar
  os 6 previos).
- **15 tests de SkillTree.test.tsx** (ampliamos con +1 sen tocar
  os 15 previos).
- **4 tests de a11y.test.tsx** (cero modificación; deben pasar tras
  os v8 ignores).
- **Resto de tests**: cero impacto esperado dos cambios cirúrxicos.

---

## 1. IDENTIFICACIÓN

**Sub-fase HIXIENE DE CÓDIGO POST-FASE 7** de Yggdrasil Forge. Non
ten número no roadmap MASTER §67 (é hixiene, non sub-fase prescrita).

**Pezas (5 grupos)**:

**Grupo A — Tests novos**:
1. **`SkillTreeAnnouncer.test.tsx`** (MODIFICADO): +3 tests novos
   ao final sen modificar os 6 existentes:
   - Mensaxe en locale `'es'` (default 'en' pero pasa locale='es').
   - Mensaxe en locale `'en'` explícito.
   - Evento `lock` dispara announcement (todos os 6 previos eran
     sobre unlock).

2. **`SkillTree.test.tsx`** (MODIFICADO): +1 test novo ao final sen
   modificar os 15 existentes:
   - SkillTree con prop `onNodeLongPress` definida pasa o handler
     a SkillNode (cubre liña 96 pass-through branch).

**Grupo B — `v8 ignore` xustificados**:
3. **`svg-helpers.ts`** (MODIFICADO): engadir `/* v8 ignore ... */`
   en liñas 39, 46-57 (rama cubic defensiva non triggable polo API
   pública).
4. **`SVGRenderer.tsx`** (MODIFICADO): engadir `/* v8 ignore ... */`
   en liña 82 (rama background defensiva).

**Grupo C — Migración SSR-safety**:
5. **`SkillTree.tsx`** (MODIFICADO): `engine.getSnapshot.bind(engine)`
   → `engine.getServerSnapshot.bind(engine)` no 3º param de
   useSyncExternalStore. **Cero outras modificacións**.
6. **`hooks/useSkillTree.ts`**, **`useNodeState.ts`**,
   **`useNodeSelector.ts`**, **`useStat.ts`** (MODIFICADOS): mesmo
   cambio (cada un ten o seu propio useSyncExternalStore).

**Grupo D — Comment de design intencional**:
7. **`themes/minimal.ts`** (MODIFICADO): engadir JSDoc comment
   documentando que estados `disabled` e `expired` aplican fallback
   ao color de `nodeLocked` (decisión intencional para o tema
   "minimal"; consumidores que requirean cores específicas
   inxectan tema custom).

**Grupo E — Housekeeping**:
8. **CHANGELOG + changeset** documentando a hixiene de código (cero
   nova versión semver porque cero cambios funcionais observables;
   patch level).

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- **Calquera outro ficheiro** en `packages/react/src/`:
  SkillNode (cero modif), SkillEdge (cero modif), MeshOverlay (cero
  modif), ThemeProvider (cero modif), SkillTreeWithDefaultTheme
  (cero modif), SkillTreeAnnouncer (cero modif: só os tests), 
  SkillTreeStatic (cero modif), SkillTreeErrorBoundary (cero modif),
  serializeForClient (cero modif), animations (cero modif),
  createDefaultLayoutRegistry (cero modif), theme-types (cero modif),
  headless (cero modif), index (cero modif), server (cero modif).
- **Tests existentes** salvo os 2 ampliados.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas. Cero entry
points novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `f94f225`, verificada
empíricamente en clone independente)**.

### Cobertura empírica post-7.12 (verificada)

```
SkillTreeAnnouncer.tsx       72.72 / 60   / 50  / 72.72   ← liñas 52, 82-90 (locale es/en + lock)
svg-helpers.ts               92.59 / 83.33/ 100 / 100     ← liñas 39, 46-57 (rama cubic defensiva)
SVGRenderer.tsx              93.75 / 91.3 / 100 / 93.75   ← liña 82 (rama background defensiva)
SkillTree.tsx                100   / 92.3 / 100 / 100     ← liña 96 (pass-through onNodeLongPress)
headless.ts                  0     / 0    / 0   / 0       ← artefacto v8 (DIFERIDA)
server.ts                    0     / 0    / 0   / 0       ← mesmo (DIFERIDA)
SkillTreeWithDefaultTheme.tsx 100  / 100  / 100 / 100     ← RESOLVIDA implícitamente en 7.12

Global: 95.16 / 93.54 / 89.83 / 95.93
```

### SkillTreeAnnouncer — análise das liñas 52, 82-90

**Liña 52**: probablemente o ramo `formatMessage !== undefined` no
handler `handleLock` (cobertura asimétrica fronte ao handler de
unlock que xa está cuberta).

**Liñas 82-90**: probablemente as entradas `es.unlock`, `es.lock`,
`en.unlock`, `en.lock` do map `DEFAULT_MESSAGES` (4 arrow functions
non chamadas porque os 6 tests previos usan default locale 'en' pero
o teste explícito de locale ='gl' só exerce gl.unlock).

**Resolución prescrita**: 3 tests novos que exercen específicamente:
- locale='es' + evento unlock.
- locale='en' + evento unlock (cobre as funcións en.unlock/lock).
- locale='gl' + evento lock (cobre gl.lock + handleLock branch).

### svg-helpers — liñas 39, 46-57 (cubic branch)

**Análise**: probablemente unha rama defensiva no constructor de
camiños cubic que cero usuario actual exerce. **Decisión do
Director**: `v8 ignore` con xustificación, mantendo o código
defensivo (refactor para eliminar non vale o risco).

### SVGRenderer — liña 82 (background)

**Análise**: probablemente o ramo defensivo `theme.colors.background
!== undefined` ou similar (cero tema actual define background).
**Decisión**: `v8 ignore` con xustificación.

### SkillTree — liña 96 (pass-through onNodeLongPress)

**Análise**: o spread condicional `{...(onNodeLongPress !== undefined
&& { onLongPress: onNodeLongPress })}` engadido en 7.10. **Resolución
prescrita**: 1 test novo que pase `onNodeLongPress` a SkillTree e
verifique que SkillNode recibe `onLongPress`.

### Migración getServerSnapshot

`packages/core/src/engine/StateStore.ts` (verificado empíricamente
en 7.9):
```ts
getSnapshot(): TreeState {
  return this.treeState
}
getServerSnapshot(): TreeState {
  return this.treeState   // ← idéntico actualmente
}
```

**Funcionalmente idénticos no estado actual**. **Cero cambio
observable** tras a migración; **preparación para futuras
divergencias** (se o core engade non-determinismo a getSnapshot,
getServerSnapshot quedaría determinístico).

### Theme NodeStates — análise do fallback intencional

**SVGRenderer construye un mapa de colores por NodeState**. Os
estados `disabled` e `expired` non están no theme actual, polo que
**caen no fallback** (probablemente `nodeLocked` color).

**Decisión do Director**: este fallback é **intencional para o tema
"minimal"**. Razóns:
- O tema chamase "minimal" — engadir 2 cores extra rompe esa
  identidade.
- Os estados `disabled` e `expired` son raros e o color de "bloqueado"
  é semánticamente razoable para eles.
- Consumidores que requirean cores específicas inxectan o seu propio
  tema (patrón `<ThemeProvider theme={...}>`).

**Resolución prescrita**: **comment de design intencional** en
`themes/minimal.ts` documentando explícitamente o fallback. Cero
modificación de `theme-types.ts` ou `SVGRenderer.tsx` (scope creep
evitado).

### Estado scaffold post-7.12

```
packages/react/src/
├── SkillNode.tsx                  (cero modif)
├── SkillTree.tsx                  (MODIFICADO: 1 liña - getServerSnapshot)
├── SkillEdge.tsx                  (cero modif)
├── MeshOverlay.tsx                (cero modif)
├── SVGRenderer.tsx                (MODIFICADO: +1 v8 ignore)
├── ThemeProvider.tsx              (cero modif)
├── SkillTreeWithDefaultTheme.tsx  (cero modif)
├── SkillTreeAnnouncer.tsx         (cero modif - só tests)
├── SkillTreeStatic.tsx            (cero modif)
├── SkillTreeErrorBoundary.tsx     (cero modif)
├── serializeForClient.ts          (cero modif)
├── svg-helpers.ts                 (MODIFICADO: +1-2 v8 ignores)
├── animations.ts                  (cero modif)
├── createDefaultLayoutRegistry.ts (cero modif)
├── theme-types.ts                 (cero modif)
├── themes/minimal.ts              (MODIFICADO: JSDoc comment)
├── headless.ts                    (cero modif)
├── index.ts                       (cero modif)
├── server.ts                      (cero modif)
└── hooks/                         (4 ficheiros MODIFICADOS: 1 liña cada)
    ├── useSkillTree.ts            (MODIFICADO)
    ├── useNodeState.ts            (MODIFICADO)
    ├── useNodeSelector.ts         (MODIFICADO)
    └── useStat.ts                 (MODIFICADO)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `f94f225` (sub-fase 7.12 — Fase 7
  pechada).
- 1523 core + 60 common + 193 storage + 111 react = ~1887 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- 9 compoñentes públicos + 4 hooks + 5 módulos internos + 3 entry
  points.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Resolver **6 de 9 débedas abertas** acumuladas durante a Fase 7
mediante: **(A)** 4 tests novos en SkillTreeAnnouncer.test.tsx (+3)
e SkillTree.test.tsx (+1) que cobren ramas non exercidas (locale
es/en + lock event para Announcer; pass-through onNodeLongPress
para SkillTree); **(B)** `v8 ignore` xustificados en svg-helpers.ts
(rama cubic defensiva) e SVGRenderer.tsx (rama background defensiva);
**(C)** migración cirúrxica de `getSnapshot.bind(engine)` a
`getServerSnapshot.bind(engine)` no 3º param de useSyncExternalStore
en SkillTree.tsx + 4 hooks (cero cambio funcional, prepara para
futuras divergencias); **(D)** JSDoc comment en themes/minimal.ts
documentando o fallback intencional para estados disabled/expired.
**DIFERIDAS** explícitamente como "known limitations" cobertura 0
de headless.ts e server.ts (artefactos v8 inherentes). **Doc update
MASTER (leccións + bloque pechado) DIFERIDO** a sub-fase de doc
posterior.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**MODIFICADOS (10 ficheiros src/tests + 1 housekeeping)**:
- `packages/react/src/SkillTree.tsx` (1 liña: 3º param de
  useSyncExternalStore).
- `packages/react/src/SVGRenderer.tsx` (engadir 1 v8 ignore en liña 82).
- `packages/react/src/svg-helpers.ts` (engadir 1-2 v8 ignores en
  liñas 39, 46-57).
- `packages/react/src/themes/minimal.ts` (engadir JSDoc comment).
- `packages/react/src/hooks/useSkillTree.ts` (1 liña).
- `packages/react/src/hooks/useNodeState.ts` (1 liña).
- `packages/react/src/hooks/useNodeSelector.ts` (1 liña).
- `packages/react/src/hooks/useStat.ts` (1 liña).
- `packages/react/__tests__/SkillTreeAnnouncer.test.tsx` (+3 tests
  ao final).
- `packages/react/__tests__/SkillTree.test.tsx` (+1 test ao final).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**NOVO**:
- `.changeset/code-hygiene-post-fase7.md` (NOVO).

**Cero modificación de** (lista completa):
- Calquera outro ficheiro en `packages/react/src/` ou
  `packages/react/__tests__/`.
- Calquera test existente fora dos 2 ampliados (animations,
  SkillNode, SkillTreeStatic, serializeForClient, server-entry,
  smoke, MeshOverlay, ThemeProvider, themes, headless, hooks,
  SkillTreeErrorBoundary, a11y, no-dom-imports.ssr).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.
- `docs/architecture/MASTER.md` (DIFERIDO a sub-fase posterior).

### 5.2 — Tests novos en SkillTreeAnnouncer.test.tsx (FIXADOS)

Engadir ao final do describe block existente (despois do test
"formatMessage override"):

```tsx
describe('SkillTreeAnnouncer — locale e evento lock (hixiene)', () => {
  it('anuncio en castelán cando locale="es"', async () => {
    const engine = ... // construír engine como nos tests previos
    render(<SkillTreeAnnouncer engine={engine} locale="es" />)
    // Disparar unlock e verificar mensaxe contén "desbloqueado" (es)
    // Confirmar que es.unlock se exerce.
    ...
  })

  it('anuncio en inglés cando locale="en" (default explícito)', async () => {
    const engine = ...
    render(<SkillTreeAnnouncer engine={engine} locale="en" />)
    // Disparar unlock e verificar mensaxe contén "unlocked"
    // Confirmar que en.unlock se exerce.
    ...
  })

  it('evento lock dispara announcement coa mensaxe correspondente', () => {
    const engine = ...
    render(<SkillTreeAnnouncer engine={engine} locale="gl" />)
    // Disparar lock e verificar mensaxe contén "bloqueado"
    // Confirmar que gl.lock se exerce + handleLock branch
    ...
  })
})
```

**Decisións sobre implementación dos tests**:
- Reutilizar os fixtures e helpers existentes en
  SkillTreeAnnouncer.test.tsx (cero duplicación).
- Disparar eventos mediante `engine.unlock(...)` ou `engine.lock(...)`
  cando aplique (require que o engine teña xa o setup adecuado).
- Verificar a mensaxe vía `container.querySelector('[role="status"]')`
  ou similar.

**Cero modificación dos 6 tests existentes**.

### 5.3 — Test novo en SkillTree.test.tsx (FIXADO)

Engadir ao final do describe block existente:

```tsx
it('SkillTree pasa onNodeLongPress a SkillNode (pass-through)', () => {
  const onNodeLongPress = vi.fn()
  const treeDef = makeMinimalTreeDef()
  const engine = new TreeEngine(treeDef)
  const { container } = render(
    <SkillTree engine={engine} onNodeLongPress={onNodeLongPress} />
  )
  // Verificar que un nodo do SVG renderizou correctamente; o branch
  // de pass-through (liña 96 de SkillTree.tsx) está exercido cando
  // SkillTree recibe a prop e a propaga.
  const nodes = container.querySelectorAll('.yf-skill-node')
  expect(nodes.length).toBeGreaterThan(0)
  // Para verificar propagación efectiva, dispatch pointerDown +
  // avanzar timers + verificar onNodeLongPress chamouse.
  // Implementación detallada queda ao executor (vi.useFakeTimers
  // + fireEvent.pointerDown + vi.advanceTimersByTime + assertion).
})
```

**Decisións**:
- Reutilizar `makeMinimalTreeDef` e helpers existentes.
- Verificar **branch coverage** + (idealmente) **funcionalidade
  end-to-end** propagación → long press dispara onNodeLongPress.

**Cero modificación dos 15 tests existentes**.

### 5.4 — v8 ignores en svg-helpers.ts (FIXADOS)

**Liñas 39 + 46-57**: identificar empíricamente as ramas exactas
con `pnpm exec vitest run --coverage --reporter verbose` e engadir:

```ts
/* v8 ignore next N -- rama cubic defensiva non triggable polo API
   pública actual; mantida por robustez interna (cero usuario externo
   pode construír esta rama sen pasar polo API público que
   normaliza inputs primeiro). */
```

**Cero modificación funcional**.

### 5.5 — v8 ignore en SVGRenderer.tsx liña 82 (FIXADO)

```ts
/* v8 ignore next 1 -- rama background defensiva; o tema actual
   non define `theme.colors.background` e o tipo opcional require
   este check, pero cero camiño público actualmente o triggea. */
```

**Cero modificación funcional**.

### 5.6 — Migración SSR-safety (FIXADA)

**Cambio en cada ficheiro** (5 ficheiros: SkillTree.tsx + 4 hooks):

**ANTES**:
```ts
const state = useSyncExternalStore(
  engine.subscribe.bind(engine),
  engine.getSnapshot.bind(engine),
  engine.getSnapshot.bind(engine),   // ← 3º param: getSnapshot
)
```

**DESPOIS**:
```ts
const state = useSyncExternalStore(
  engine.subscribe.bind(engine),
  engine.getSnapshot.bind(engine),
  engine.getServerSnapshot.bind(engine),   // ← 3º param: getServerSnapshot
)
```

**Cero outras modificacións**. **Cero cambio funcional** (ambos
métodos devolven `this.treeState` no core actual).

**Nota**: nos hooks que constrúen `getSnapshot` con `useCallback`
(useNodeState, useNodeSelector, useStat), o 3º param de
useSyncExternalStore é o mesmo `getSnapshot` calculado. Iso é
**aceptable** (cero violación funcional). **A migración aplícase
SO ao 3º param cando é `engine.getSnapshot.bind(engine)`** (caso de
SkillTree.tsx + useSkillTree.ts). Para os outros 3 hooks, o terceiro
parámetro debería seguir sendo o mesmo `getSnapshot` (no
`useCallback`).

**Verificable empíricamente**:

```bash
grep -nE "engine\.getSnapshot\.bind" packages/react/src/SkillTree.tsx packages/react/src/hooks/*.ts
# esperado post-modif: cero matches no 3º param;
# os primeiros 2 params poden seguir usando getSnapshot.bind (decisión
# do Director: tampouco se modifican os primeiros 2 params; só o 3º).
```

**Decisión final do Director**: aplicar a migración **só nos
ficheiros que actualmente usan `engine.getSnapshot.bind(engine)`
como 3º param literal**. Para SkillTree.tsx + useSkillTree.ts iso
significa 1 liña por ficheiro. Para useNodeState/Selector/Stat, o
3º param é a función `getSnapshot` envolta en useCallback, que
calcula desde `engine.getSnapshot()`. **Para estes 3 hooks**, opcionalmente
**tamén cambiar** internamente a chamada de `engine.getSnapshot()`
ao 3º param wrapped en `engine.getServerSnapshot()`. **Decisión do
Director**: **só aplicar a SkillTree.tsx e useSkillTree.ts** (os
únicos que usan o `bind` directo). **Os outros 3 hooks quedan como
están** porque a migración require coordinación con useCallback que
está fora do scope cirúrxico desta hixiene.

**Verificación empírica do scope** (T0.2):
```bash
grep -n "engine\.getSnapshot\.bind(engine)" packages/react/src/SkillTree.tsx packages/react/src/hooks/useSkillTree.ts
```

**Se grep ten 2 ocorrencias en SkillTree.tsx + 2 en useSkillTree.ts
(4 total)**: cambiar **só os 3º params** (o do `useSyncExternalStore`
en cada ficheiro = 2 cambios totais en 2 ficheiros). **Os outros 3
hooks non se tocan**.

### 5.7 — Comment en themes/minimal.ts (FIXADO)

**Engadir tras a definición de `nodeInProgress`**:

```ts
export const minimal: Theme = {
  colors: {
    text: '#222222',
    nodeLocked: '#cccccc',
    nodeUnlockable: '#e8e8e8',
    nodeUnlocked: '#4a90e2',
    nodeMaxed: '#f5a623',
    nodeInProgress: '#7ed321',
    // Decisión de design intencional (hixiene post-Fase 7):
    // Os estados `disabled` e `expired` NON teñen cor específica neste
    // tema "minimal" — caen no fallback ao color de `nodeLocked` polo
    // mecanismo de SVGRenderer. Iso é coherente coa identidade
    // "minimal" do tema (cero cores redundantes para estados raros).
    // Consumidores que requirean cores específicas para disabled/expired
    // inxectan o seu propio tema vía <ThemeProvider theme={...}>.
    nodeStroke: '#555555',
    edge: '#999999',
    mesh: '#dddddd',
  },
  ...
}
```

**Cero modificación da estrutura nin valores**.

### 5.8 — Cobertura prescrita

- **SkillTreeAnnouncer.tsx**: ≥95/85/85/95 (subir desde
  72.72/60/50/72.72 cos +3 tests).
- **svg-helpers.ts**: 100/100/100/100 (post v8 ignores).
- **SVGRenderer.tsx**: 100/100/100/100 (post v8 ignore).
- **SkillTree.tsx**: 100/100/100/100 (post +1 test).
- **Resto sen regresión**.
- **Global packages/react**: ≥96/95/91/96.

### 5.9 — Test counts esperados post-hixiene

- **react**: 111 (previo) + 4 (novos) = **~115 tests**.
- **core, common, storage**: intactos.

### 5.10 — Cero deps novas

**Garantía dura**. Cero modificación de package.json. **Se aparece**
→ ESCALAR.

### 5.11 — Cero cambio funcional observable

**Cero usuario externo** notará algún cambio de comportamento. Os
cambios son:
- Tests novos: só engaden cobertura, cero cambio nas APIs.
- v8 ignores: comentarios, cero cambio nas regras CSS xeradas.
- Migración SSR-safety: ambos métodos devolven o mesmo valor.
- Theme comment: só JSDoc, cero cambio nas cores.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| +3 tests Announcer | describe block | SkillTreeAnnouncer.test.tsx | +60 |
| +1 test SkillTree | it() block | SkillTree.test.tsx | +20 |
| 1-2 v8 ignores | Comments | svg-helpers.ts | +4 |
| 1 v8 ignore | Comment | SVGRenderer.tsx | +2 |
| Migración 3º param | 1 liña change | SkillTree.tsx | 1 |
| Migración 3º param | 1 liña change | useSkillTree.ts | 1 |
| JSDoc fallback | Comment | themes/minimal.ts | +6 |

**Total estimado**: ~14 liñas de código + ~80 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/SkillTree.tsx` (MODIFICADO: 1 liña)
- `packages/react/src/SVGRenderer.tsx` (MODIFICADO: +1 v8 ignore)
- `packages/react/src/svg-helpers.ts` (MODIFICADO: +1-2 v8 ignores)
- `packages/react/src/themes/minimal.ts` (MODIFICADO: JSDoc comment)
- `packages/react/src/hooks/useSkillTree.ts` (MODIFICADO: 1 liña)
- `packages/react/__tests__/SkillTreeAnnouncer.test.tsx` (MODIFICADO:
  +3 tests)
- `packages/react/__tests__/SkillTree.test.tsx` (MODIFICADO: +1 test)
- `.changeset/code-hygiene-post-fase7.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 9 ficheiros tocados** (1 NOVO + 8 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/react/src/` ou
  `packages/react/__tests__/`.
- `packages/react/src/hooks/useNodeState.ts`, `useNodeSelector.ts`,
  `useStat.ts` (DECISIÓN do Director: cero modificación; o seu uso
  de `getSnapshot` está envolto en useCallback e a migración
  require coordenación extra, **fora deste scope cirúrxico**).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.
- `docs/architecture/MASTER.md` (sub-fase posterior).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc** completo nas mensaxes de v8 ignore (xustifica POR QUE).

**Marcadores existentes** manteñen idénticos (cero modificación dos
INICIO/FIN).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar **calquera outro ficheiro existente** salvo os 8
  prescritos en §5.1.
- ❌ Modificar `useNodeState.ts`, `useNodeSelector.ts`, `useStat.ts`
  (a migración nestes hooks require coordinación con useCallback;
  **fora do scope cirúrxico desta hixiene**).
- ❌ Modificar `docs/architecture/MASTER.md` (DIFERIDO a sub-fase
  posterior).
- ❌ Engadir cores `nodeDisabled` e `nodeExpired` ao tema minimal
  (decisión §2 do Director: design intencional documentado, cero
  scope creep).
- ❌ Modificar `theme-types.ts` (cero engadir propiedades novas).
- ❌ Modificar SVGRenderer.tsx para "arrumbar" estados disabled/expired
  (cero engadir entradas ao mapa de cores; o fallback é intencional).
- ❌ Engadir `v8 ignore` sin xustificación clara (cada un require
  comentario explicando POR QUE).
- ❌ Modificar `headless.ts` ou `server.ts` (artefactos v8
  aceptados como known limitations).
- ❌ Engadir tests para cubrir cobertura de `headless.ts` ou
  `server.ts` (artefactos inherentes; cero solución técnica sen
  romper a propia instrumentación).
- ❌ Engadir deps de npm.
- ❌ Usar `!` non-null assertions (TS).
- ❌ Engadir Date.now() / Math.random() (cero non-determinismo).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T8)

### T0 — Verificación previa (baseline) + verificacións empíricas

**T0.1** — `git status` limpo. `git log -1` mostra `f94f225` como HEAD.

**T0.2** — Verificacións empíricas críticas:

```bash
# Confirmar scope cirúrxico do getServerSnapshot:
grep -n "engine\.getSnapshot\.bind(engine)" packages/react/src/SkillTree.tsx packages/react/src/hooks/useSkillTree.ts
# esperado: 2 matches en cada un (xa que useSyncExternalStore ten 2
# params que usan engine.getSnapshot.bind: o 2º (client snapshot) e
# o 3º (server snapshot)). Cambiar SO o 3º.

# Confirmar liñas exactas non cubertas:
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage 2>&1 | \
  grep -E "Announcer|svg-helpers|SVGRenderer|SkillTree\.tsx"
# esperado: SkillTreeAnnouncer 52, 82-90; svg-helpers 39, 46-57;
# SVGRenderer 82; SkillTree 96.

# Confirmar estado Theme cubre 5 NodeStates:
grep -E "node[A-Z]" packages/react/src/themes/minimal.ts
# esperado: nodeLocked, nodeUnlockable, nodeUnlocked, nodeMaxed,
# nodeInProgress (5 nodes), nodeStroke (non-state).
```

**T0.3** — Baseline previo:
```bash
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 111 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 3 tests novos a SkillTreeAnnouncer.test.tsx

Aplicar §5.2 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/react test --force
# esperado: 114 tests pasando (111 + 3 novos)
```

### T2 — Engadir 1 test novo a SkillTree.test.tsx

Aplicar §5.3 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/react test --force
# esperado: 115 tests pasando (114 + 1 novo)
```

### T3 — Verificación intermedia cobertura

```bash
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage 2>&1 | \
  grep -E "Announcer|SkillTree\.tsx"
# esperado:
#   SkillTreeAnnouncer.tsx: >= 95/85/85/95
#   SkillTree.tsx: 100/100/100/100
```

**Se algún test novo non eleva a cobertura como esperado**:
- Verificar que os tests realmente exercen as ramas non cubertas.
- Engadir tests adicionais se require.
- **ESCALAR se non se chega ao target**.

### T4 — Engadir v8 ignores xustificados

Aplicar §5.4 + §5.5 literal:
- `svg-helpers.ts`: identificar empíricamente as ramas exactas en
  liñas 39, 46-57 e engadir `/* v8 ignore next N -- ... */`.
- `SVGRenderer.tsx`: engadir `/* v8 ignore next 1 -- ... */` en
  liña 82.

**Verificar cobertura post-v8 ignores**:
```bash
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage 2>&1 | \
  grep -E "svg-helpers|SVGRenderer"
# esperado:
#   svg-helpers.ts: 100/100/100/100
#   SVGRenderer.tsx: 100/100/100/100
```

### T5 — Migración SSR-safety

Aplicar §5.6 literal:
- `SkillTree.tsx`: cambiar 3º param de useSyncExternalStore a
  `engine.getServerSnapshot.bind(engine)`.
- `useSkillTree.ts`: mesmo cambio.

**Verificación intermedia**:
```bash
pnpm turbo run typecheck --force        # 22/22
pnpm --filter @yggdrasil-forge/react test --force        # 115 tests pasando
```

**Tódolos 111 tests previos + 4 novos deben pasar intactos**.

### T6 — JSDoc comment en themes/minimal.ts

Aplicar §5.7 literal: engadir o comment explicando o fallback
intencional para disabled/expired.

### T7 — Verificación final + cobertura completa

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~115 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   SkillTreeAnnouncer.tsx: >= 95/85/85/95
#   svg-helpers.ts: 100/100/100/100
#   SVGRenderer.tsx: 100/100/100/100
#   SkillTree.tsx: 100/100/100/100
#   Global packages/react: >= 96/95/91/96
#   Resto: sen regresión
```

### T8 — Build + Lint + Format + Grep + Changeset + commit + push

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/SkillTree.tsx \
  packages/react/src/SVGRenderer.tsx \
  packages/react/src/svg-helpers.ts \
  packages/react/src/themes/minimal.ts \
  packages/react/src/hooks/useSkillTree.ts \
  packages/react/__tests__/SkillTreeAnnouncer.test.tsx \
  packages/react/__tests__/SkillTree.test.tsx
```

`.changeset/code-hygiene-post-fase7.md`:
```
---
'@yggdrasil-forge/react': patch
---

chore(react): code hygiene post-Phase 7 (resolve 6 of 9 open coverage/SSR debts)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Changed
- **Code hygiene post-Phase 7**: resolto 6 das 9 débedas abertas
  de cobertura/SSR-safety acumuladas durante a Fase 7 (12
  sub-fases). Cero cambio funcional observable polo consumidor.

#### Tests novos
- `SkillTreeAnnouncer.test.tsx`: **+3 tests** cubrindo:
  - Mensaxe en castelán (`locale="es"`) cando o engine dispara
    unlock.
  - Mensaxe en inglés (`locale="en"`) explícito.
  - Evento `lock` dispara announcement coa mensaxe correspondente
    (en lugar de só unlock, como cubrían os 6 tests previos).
  - Cobertura: SkillTreeAnnouncer.tsx **72.72/60/50/72.72 → ≥95/85/85/95**.
- `SkillTree.test.tsx`: **+1 test** cubrindo pass-through de
  `onNodeLongPress` a SkillNode (rama spread condicional engadida
  en 7.10).
  - Cobertura: SkillTree.tsx **100/92.3/100/100 → 100/100/100/100**.

#### v8 ignores xustificados (ramas defensivas reais)
- `svg-helpers.ts`: **liñas 39, 46-57** (rama cubic defensiva non
  triggable polo API público actual; mantida por robustez interna).
  Cobertura: **92.59/83.33 → 100/100**.
- `SVGRenderer.tsx`: **liña 82** (rama `theme.colors.background`
  defensiva; o tema actual non define background pero o tipo opcional
  require o check). Cobertura: **93.75/91.3 → 100/100**.

#### Migración SSR-safety (cero cambio funcional observable)
- `SkillTree.tsx` + `hooks/useSkillTree.ts`: 3º param de
  `useSyncExternalStore` cambia de `engine.getSnapshot.bind(engine)`
  a `engine.getServerSnapshot.bind(engine)`. Os outros 3 hooks
  (useNodeState, useNodeSelector, useStat) usan getSnapshot envolto
  en useCallback; **migración nestes hooks DIFERIDA** (require
  coordinación adicional fora do scope cirúrxico desta hixiene).
- **Cero cambio funcional**: `TreeEngine.getServerSnapshot()` e
  `getSnapshot()` devolven o mesmo valor (`this.treeState`) no
  estado actual do core. **Migración prepara para futuras
  divergencias** (se o core engade non-determinismo a getSnapshot,
  getServerSnapshot quedaría determinístico).

#### Documentación de design intencional
- `themes/minimal.ts`: engadiuse JSDoc comment documentando que os
  estados NodeState `disabled` e `expired` caen no fallback ao color
  de `nodeLocked` (decisión intencional para o tema "minimal";
  consumidores que requirean cores específicas inxectan o seu propio
  tema vía `<ThemeProvider theme={...}>`).

### Note
- **Sub-fase de hixiene post-Fase 7** (cero número en MASTER §67).
- **Cadea limpa**: 35 sub-fases consecutivas sen rollback (3.0 →
  hixiene incluída).
- **Cero cambios funcionais observables polo consumidor**: changeset
  marcado como `patch` (cero break, cero feature nova).
- **DIFERIDAS explícitamente como "known limitations"** (sub-fase
  de doc MASTER posterior documentará):
  - **`headless.ts` cobertura 0/0/0/0**: artefacto v8 inherente a
    módulos puramente de re-exports + dynamic import en tests.
  - **`server.ts` cobertura 0/0/0/0**: mesmo patrón.
- **JA RESOLTA implícitamente en 7.12** (anotación):
  - `SkillTreeWithDefaultTheme.tsx` pasou de 50/100/0/50 a
    100/100/100/100 porque os tests a11y exerceron o wrapper
    indirectamente (root entry é
    `SkillTreeWithDefaultTheme as SkillTree`).
- **MASTER doc update DIFERIDO** (sub-fase posterior dedicada):
  leccións 7.5 L1 (verificación empírica de comportamento runtime),
  7.6 L1 (single template literal multiline), 7.7 L1 (preferir HTML5
  semantic elements), bloque "🎉 FASE 7 PECHADA OFICIALMENTE — 12
  sub-fases × 0 rollbacks" co resumo histórico.
- **Cero deps de npm engadidas**. **Cero ErrorCodes novos**. Cero
  modificación de packages/common/. Cero modificación de
  packages/core/, packages/storage/ ou outros 14 paquetes scaffold.
- **Cero modificación de calquera compoñente, módulo, hook ou test
  existente** fora dos 8 ficheiros explicitamente prescritos:
  SkillTree.tsx (1 liña), SVGRenderer.tsx (+v8 ignore), svg-helpers.ts
  (+v8 ignores), themes/minimal.ts (+comment), useSkillTree.ts (1
  liña), SkillTreeAnnouncer.test.tsx (+3 tests), SkillTree.test.tsx
  (+1 test), CHANGELOG.md.
- Os 111 tests previos pasan intactos.
```

Commit Conventional:
`chore(react): code hygiene post-Phase 7 (resolve 6 of 9 open debts) (sub-phase hygiene)`

Push directo a `origin/main` (base `f94f225`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ HIXIENE CÓDIGO POST-FASE 7 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base f94f225)
✅ +3 tests Announcer (locale es, locale en, evento lock):
   SkillTreeAnnouncer.tsx 72.72/60/50/72.72 → <X>/<Y>/<Z>/<W>
✅ +1 test SkillTree pass-through onNodeLongPress:
   SkillTree.tsx 100/92.3/100/100 → 100/100/100/100
✅ v8 ignores xustificados:
   - svg-helpers.ts liñas 39, 46-57 (rama cubic defensiva)
     92.59/83.33 → 100/100
   - SVGRenderer.tsx liña 82 (rama background defensiva)
     93.75/91.3 → 100/100
✅ Migración SSR-safety: SkillTree.tsx + useSkillTree.ts a
   getServerSnapshot.bind no 3º param de useSyncExternalStore
   (cero cambio funcional observable)
✅ JSDoc fallback intencional disabled/expired en themes/minimal.ts
✅ T0.2 verificación empírica: liñas non cubertas confirmadas,
   scope cirúrxico migración SSR-safety identificado (2 ficheiros)
✅ T3 verificación intermedia cobertura (4 ramas resoltas)
✅ CERO modificación de useNodeState/Selector/Stat (migración
   diferida; require coordinación con useCallback fora deste scope)
✅ CERO modificación de calquera outro compoñente/test existente
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO modificación de docs/architecture/MASTER.md (sub-fase
   posterior dedicada)
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ Tests: <N> pasan en react (4 novos, 111 previos intactos)
   - 3 SkillTreeAnnouncer (locale es/en + lock)
   - 1 SkillTree (pass-through onNodeLongPress)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura post-hixiene:
   - SkillTreeAnnouncer.tsx: <subido a >=95/85/85/95>
   - svg-helpers.ts: 100/100/100/100
   - SVGRenderer.tsx: 100/100/100/100
   - SkillTree.tsx: 100/100/100/100
   - Global packages/react: <subido a >=96/95/91/96>
   - headless.ts, server.ts: 0/0/0/0 (DIFERIDOS como known
     limitations; artefactos v8)
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok (3 entry points)
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Hixiene post-Fase 7 (cero número en MASTER §67).
   - 36 sub-fases consecutivas sen rollback.
   - 6 das 9 débedas resoltas; 2 (headless+server) diferidas como
     known limitations; 1 (Theme NodeStates) resolta como design
     intencional documentado.
   - MASTER doc DIFERIDO a sub-fase posterior dedicada.
   - Changeset patch (cero cambios funcionais observables).
✅ Changeset patch (react) + nova [Unreleased]
✅ git status pre-commit: 9 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE DE DOC MASTER (leccións + bloque pechado).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing de hixiene de código post-Fase 7. Resolve 6 das 9
débedas abertas mediante cambios cirúrxicos pequenos (~14 liñas de
código + ~80 liñas de tests; 9 ficheiros tocados). Cero cambios
funcionais observables polo consumidor (changeset `patch`). DIFERIDAS
explicitamente: 2 débedas que son artefactos v8 inherentes
(`headless.ts` + `server.ts` 0/0/0/0) + MASTER doc update (sub-fase
posterior dedicada). Risco BAIXO. Calquera dúbida → ESCALAR.*

*Lección 7.5 L1 aplicada rigorosamente: T0.2 verifica empíricamente
scope cirúrxico (grep de `engine.getSnapshot.bind(engine)` no 3º
param), liñas exactas non cubertas, e estado dos 5 NodeStates no
tema antes de aplicar cambios.*
