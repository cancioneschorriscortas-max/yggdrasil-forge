# BRIEFING — SUB-FASE 5.2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Segunda sub-fase da Fase 5.** Integración real de SubtreeManager
> con TreeEngine. Engadir `getSubtreeEngine` + `enterSubtree`,
> sincronización automática parent ↔ sub-engine via subscribe,
> propagación de cycle detection (activeSubtreeIds), e initialState
> support. **Budget compartido DIFERIDO** (DT-19 NOVA): 5.2 só
> implementa budget illado. **Modifica TreeEngine** (peza
> monumental); risco arquitectónico medio-alto.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5
L2, 3.6.a L1, 4.3 L1**: calquera modificación fóra de §6 require
**ESCALAR ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 5.2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 5.2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **5.2** de Yggdrasil Forge. **Segunda da Fase 5**. Integración
real de SubtreeManager (5.1) con TreeEngine.

**Pezas**:

1. **Modificar TreeEngine** para engadir:
   - `getSubtreeEngine(subtreeId)`: lookup pasivo.
   - `enterSubtree(subtreeId)`: creación + evento + sincronización.
   - Constructor acepta `options.initialState` e `options.activeSubtreeIds`.
   - Helper privado `ensureSubtreeManager()` para lazy creation.
   - Helper privado `isAnyAnchorUnlocked(subtreeId)`.
2. **Modificar SubtreeManager** para soportar Unsubscribe handles
   (memory leak prevention).
3. **Modificar StateStore** (verificar): xa acepta `initialState`
   via `options.initialState`; cero modificación esperada.
4. **Engadir TreeEngineOptions.initialState + activeSubtreeIds**.
5. **ErrorCode novo**: `SUBTREE_NOT_UNLOCKED` (YGG_E025).
6. **DT-19 NOVA**: budget compartido diferido a sub-fase futura.

**Cero modificación de pezas non listadas**: layouts, migrations,
reconciler, etc.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría empírica feita polo director sobre commit `2fd2e6a`**:

- **TreeEngine constructor actual**: `(treeDef, options?: TreeEngineOptions)`.
  Cero acepta `initialState` separado.
- **StateStore SÍ acepta `initialState` via `options.initialState`**
  (StateStore.ts liña 30-31).
- **TreeEngine emite `subtreeEntered`** evento xa declarado.
- **TreeEngine ten dous métodos de subscription**:
  - `on<K>(event, handler): Unsubscribe` (por evento).
  - `subscribe(listener): Unsubscribe` (calquera mudanza de estado).
- **5.1 SubtreeManager** xa existe con API completa:
  - `getExistingSubtree`, `hasSubtree`, `getOrCreateSubtree`,
    `listSubtrees`, `destroySubtree`, `clear`, `size`.
  - TreeEngineFactory: `(treeDef, initialState?) => TreeEngine`.
  - **Nota**: a factory declara `initialState?` pero TreeEngine
    actual non o usa. **5.2 corrixe iso**.
- **NodeType 'subtree_anchor'** + **TreeState.subtreeStates** + 
  **Prereq subtree_completion** xa funcionais e testeados.

**Modelo PoE**: cluster jewel (subtree_anchor) **debe estar
equipado** (unlocked) para "entrar". **5.2 fai cumprir isto** via
`SUBTREE_NOT_UNLOCKED`.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `2fd2e6a` (SubtreeManager 5.1).
- 1263 tests core + 60 common + 171 storage = ~1494 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **SubtreeManager + TreeEngineFactory + mergeTreeDefWithOverrides**
  dispoñibles.
- **`SUBTREE_DEPTH_EXCEEDED` (YGG_E023) + `SUBTREE_CYCLE_DETECTED`
  (YGG_E024)** xa en common.
- DT abertas non bloqueantes: DT-9, DT-11, DT-12, DT-14, DT-15, DT-16,
  DT-17, DT-18.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Modificar `TreeEngine` para engadir métodos públicos `getSubtreeEngine`
(lookup pasivo) e `enterSubtree` (creación + sincronización +
evento), engadir campos `initialState` e `activeSubtreeIds` a
`TreeEngineOptions`, propagar `initialState` ao StateStore no
constructor, modificar `SubtreeManager` para soportar Unsubscribe
handles internos (memory leak prevention), engadir ErrorCode
`SUBTREE_NOT_UNLOCKED` (YGG_E025), e cubrir con tests funcionais
exhaustivos. **Budget compartido DIFERIDO a sub-fase futura** (DT-19
nova; 5.2 implementa só budget illado).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Sincronización automática via subscribe + Unsubscribe handle

**Decisión grande 1**: cando `enterSubtree(id)` crea/recupera un
sub-engine, **rexistra un listener** vía `subEngine.subscribe()`. O
listener actualiza `parent.state.subtreeStates[id]` cada vez que o
sub-engine muta.

**Implementación dentro de TreeEngine.enterSubtree**:

```ts
enterSubtree(subtreeId: string): Result<TreeEngine> {
  // ... validacións ...

  const manager = this.ensureSubtreeManager()
  const subResult = manager.getOrCreateSubtreeWithSync(subtreeId, (subEngine) => {
    // Setup listener para sincronización:
    const unsubscribe = subEngine.subscribe(() => {
      this.store.update((draft) => {
        if (!draft.subtreeStates) {
          draft.subtreeStates = {}
        }
        draft.subtreeStates[subtreeId] = subEngine.getState()
      })
    })
    return unsubscribe
  })
  if (!subResult.ok) return subResult

  this.events.emit('subtreeEntered', subtreeId)
  return ok(subResult.value)
}
```

**SubtreeManager require unha nova API**:

```ts
/**
 * Como getOrCreateSubtree pero permite ao consumidor rexistrar
 * cleanup callback (Unsubscribe) que se chamará en destroySubtree
 * ou clear. Garda o handle internamente; o consumidor non precisa
 * lembralo.
 */
getOrCreateSubtreeWithSync(
  subtreeId: string,
  setupSync: (engine: TreeEngine) => Unsubscribe,
): Result<TreeEngine>
```

**Cache interno cambia** a:

```ts
interface SubtreeCacheEntry {
  readonly engine: TreeEngine
  readonly unsubscribe: Unsubscribe | null  // null se cero sync setup
}
private readonly cache = new Map<string, SubtreeCacheEntry>()
```

**`destroySubtree(id)`** chama `entry.unsubscribe?.()` antes de
borrar a entrada.

**`clear()`** itera todas as entries chamando `unsubscribe`.

### 5.2 — Budget compartido DIFERIDO (DT-19 NOVA)

**Decisión grande 2**: NON implementar budget compartido en 5.2.

**Razóns** (decisión consciente do director):
- **Refactor maior de ResourceManager**: require `BudgetSource`
  inxectable que rompe a estrutura atual.
- **Dúas codepaths en `unlock/respec/lock`**: bug-prone.
- **Cero caso de uso real documentado** que require compartido.
- **Aplicación da lección 4.3 L1**: evitar complexity blooming.

**Reversión parcial da decisión P2 da 5.1**: a 5.1 declaraba "modo"
via subtreeOverrides.budget; a 5.2 implementa **só budget illado por
defecto**.

**Cada sub-engine usa o seu propio budget**:
- Se `subtreeOverrides.budget` existe → sub-engine usa ese budget
  (vía mergeTreeDefWithOverrides xa existente).
- Se `parentState.subtreeStates[id].budget` existe → sub-engine
  preserva (recupera estado previo via `initialState`).
- Senón → sub-engine inicializa budget desde TreeDef da template
  (estándar).

**DT-19 NOVA** será anotada en CHANGELOG e MASTER (na próxima
hixiene).

### 5.3 — enterSubtree REQUIRE anchor unlocked

**Decisión grande 3**: `enterSubtree(id)` rexeita con
`err(SUBTREE_NOT_UNLOCKED)` se cero anchor con ese `subtreeId` está
unlocked.

**Helper privado**:

```ts
private isAnyAnchorUnlocked(subtreeId: string): boolean {
  const treeDef = this.store.getTreeDef()
  const state = this.store.getState()
  for (const node of treeDef.nodes) {
    if (node.subtreeId === subtreeId) {
      const instance = state.nodes[node.id]
      if (instance?.state === 'unlocked' || instance?.state === 'maxed') {
        return true
      }
    }
  }
  return false
}
```

**`'maxed'` considérase como `'unlocked'`** (consistencia con 3.6.a
do Reconciler).

**`getSubtreeEngine(id)` NON require anchor unlocked**: é lookup
pasivo que devolve `null` se cero sub-engine creado.

### 5.4 — initialState support en TreeEngine

**Engadir a `TreeEngineOptions`** (en `packages/core/src/types/tree.ts`):

```ts
export interface TreeEngineOptions {
  readonly locale?: Locale
  readonly readOnly?: boolean
  readonly audit?: { ... }  // (existente)
  readonly timeNow?: () => number  // (existente)
  
  /**
   * Estado inicial. Se omitido, créase un estado baleiro a partir
   * do treeDef.
   *
   * Engadido en 5.2 para soportar recuperación de estado en sub-engines
   * (parentState.subtreeStates[id]). Tamén útil para deserializar
   * un estado persistido.
   */
  readonly initialState?: TreeState
  
  /**
   * Conxunto de subtreeIds activos na cadea recursiva ancestral.
   * Usado para propagar cycle detection a través de sub-engines.
   *
   * Engadido en 5.2. Default Set vacío.
   *
   * Cando TreeEngine A crea sub-engine para subtreeId 'B', pasa
   * activeSubtreeIds = parentActiveSet ∪ {'B'} ao sub-engine. Se
   * dentro de 'B' alguén intenta enterSubtree('A'), detéctase ciclo.
   */
  readonly activeSubtreeIds?: ReadonlySet<string>
}
```

**Modificacións ao constructor de TreeEngine**:

```ts
constructor(treeDef: TreeDef, options?: TreeEngineOptions) {
  this.locale = options?.locale ?? 'gl'
  this.readOnly = options?.readOnly ?? false
  TreeEngine.validateTreeDef(treeDef, this.locale)
  
  // ── 5.2: pasar initialState a StateStore ──
  this.store = new StateStore(treeDef, {
    initialState: options?.initialState,
  })
  
  // ── 5.2: gardar activeSubtreeIds para propagar a sub-engines ──
  this.activeSubtreeIds = options?.activeSubtreeIds ?? new Set()
  
  // ... resto do constructor sen cambios ...
}
```

**Novo campo privado**:

```ts
private readonly activeSubtreeIds: ReadonlySet<string>
private subtreeManager: SubtreeManager | null = null  // lazy
```

### 5.5 — Lazy initialization de SubtreeManager

```ts
private ensureSubtreeManager(): SubtreeManager {
  if (this.subtreeManager === null) {
    this.subtreeManager = new SubtreeManager({
      parentTreeDef: this.store.getTreeDef(),
      parentState: this.store.getState(),
      engineFactory: (treeDef, initialState) =>
        new TreeEngine(treeDef, {
          ...(initialState !== undefined && { initialState }),
          activeSubtreeIds: new Set([
            ...this.activeSubtreeIds,
            // O subtreeId actual engadirase no getOrCreateSubtree
            // a través dunha lóxica interna do SubtreeManager;
            // ver 5.7.
          ]),
          locale: this.locale,
          // Cero pasar timeNow nin readOnly ao sub-engine por defecto;
          // o sub-engine vai en modo writable con Date.now estándar.
          // Caso uso opt-in fica para sub-fase futura.
        }),
      depth: this.activeSubtreeIds.size,
      maxDepth: 10,
      locale: this.locale,
      activeSubtreeIds: this.activeSubtreeIds,
    })
  }
  return this.subtreeManager
}
```

**Decisión clave**: 
- **`depth = activeSubtreeIds.size`**: a profundidade é cuantitativamente
  igual ao tamaño do set activo.
- **SubtreeManager require activeSubtreeIds + cycle propagation
  interna**: ver 5.7.

### 5.6 — Modificación interna de SubtreeManager

A 5.1 implementou `SubtreeManager.getOrCreateSubtree` cunha checa de
ciclo sobre `activeSubtreeIds` pasada na construción. **Pero**: cando
o **sub-engine creado** terá que seguir propagando o ciclo,
**precisa engadirse a si mesmo ao set**.

**Mudanza cirúrxica en SubtreeManager.getOrCreateSubtree**:

```ts
// Tras pasar todas as validacións (cache, cycle, depth, existence):
// 5. Crear sub-engine via factory
// 5.2: pasar activeSubtreeIds incluíndo este subtreeId á factory
const subEngine = this.engineFactory(mergedTreeDef, initialState)
// (a factory xa engade subtreeId aos activeSubtreeIds; ver 5.7)
```

**Pero hai un problema**: SubtreeManager non controla **dentro** da
factory. **A factory está inxectada**. **Quen engade subtreeId aos
activeSubtreeIds?**

**Solución**: SubtreeManager **pasa o subtreeId á factory vía un
parámetro adicional opcional**, OU o consumidor (TreeEngine en 5.2)
encárgase de construír a factory de tal xeito que **a factory dentro
do TreeEngine sabe que subtreeId estamos creando**.

**Decisión arquitectónica máis limpa**: **ampliar TreeEngineFactory**:

```ts
export type TreeEngineFactory = (
  treeDef: TreeDef,
  initialState?: TreeState,
  context?: TreeEngineFactoryContext,
) => TreeEngine

export interface TreeEngineFactoryContext {
  /** Subtree id que se está creando. Permítelle á factory engadir
   * o id aos activeSubtreeIds antes de pasar a TreeEngine. */
  readonly subtreeId: string
  /** Set de subtreeIds activos no nivel ancestral. */
  readonly parentActiveIds: ReadonlySet<string>
}
```

**SubtreeManager.getOrCreateSubtree** modifícase para pasar o
contexto:

```ts
const subEngine = this.engineFactory(mergedTreeDef, initialState, {
  subtreeId,
  parentActiveIds: this.activeSubtreeIds,
})
```

**Factory dentro de TreeEngine** (`ensureSubtreeManager`):

```ts
engineFactory: (treeDef, initialState, context) => {
  const newActiveIds = context !== undefined
    ? new Set([...context.parentActiveIds, context.subtreeId])
    : this.activeSubtreeIds
  return new TreeEngine(treeDef, {
    ...(initialState !== undefined && { initialState }),
    activeSubtreeIds: newActiveIds,
    locale: this.locale,
  })
},
```

**Cero ruptura externa**: o **terceiro parámetro `context?`** é
opcional. **Os tests da 5.1** que usaron `(treeDef) => new
TreeEngine(treeDef)` **seguen funcionando**.

### 5.7 — Modificación de SubtreeManager para Unsubscribe handles

**Cambios concretos en SubtreeManager.ts**:

1. **Cache shape cambia**:
   ```ts
   interface SubtreeCacheEntry {
     readonly engine: TreeEngine
     readonly unsubscribe: Unsubscribe | null
   }
   private readonly cache = new Map<string, SubtreeCacheEntry>()
   ```

2. **Novo método** `getOrCreateSubtreeWithSync(id, setupSync)`:
   - Mesma lóxica que `getOrCreateSubtree`.
   - **Tras crear o engine**, chama `setupSync(engine)` para obter o
     `Unsubscribe`.
   - **Cachéa `{ engine, unsubscribe }`**.

3. **`getOrCreateSubtree` segue existindo**:
   - **Pasa `setupSync = null` por defecto** → cero listener.
   - Cachea `{ engine, unsubscribe: null }`.
   - **API externa idéntica á 5.1**.

4. **`destroySubtree(id)`**:
   ```ts
   destroySubtree(subtreeId: string): boolean {
     const entry = this.cache.get(subtreeId)
     if (entry === undefined) return false
     entry.unsubscribe?.()  // libera listener se existe
     this.cache.delete(subtreeId)
     return true
   }
   ```

5. **`clear()`**:
   ```ts
   clear(): void {
     for (const entry of this.cache.values()) {
       entry.unsubscribe?.()
     }
     this.cache.clear()
   }
   ```

6. **`getExistingSubtree(id)`** devolve `entry.engine` (cero
   modificación de retorno).

7. **`listSubtrees()`**, **`hasSubtree`**, **`size`**: idénticos.

8. **`TreeEngineFactory`** amplíase con terceiro parámetro `context?`
   (5.6).

**`Unsubscribe` type**: importar de
`'./EventEmitter.js'` (xa existe).

### 5.8 — TreeEngine.getSubtreeEngine

```ts
/**
 * Devolve o sub-engine xa creado para `subtreeId`, ou null.
 * Lookup pasivo: cero crea, cero require anchor unlocked.
 *
 * Para creación + sincronización, use `enterSubtree`.
 */
getSubtreeEngine(subtreeId: string): TreeEngine | null {
  if (this.subtreeManager === null) {
    return null  // cero sub-engine creado aínda
  }
  return this.subtreeManager.getExistingSubtree(subtreeId)
}
```

### 5.9 — TreeEngine.enterSubtree

```ts
/**
 * Entra nunha sub-árbore: crea o sub-engine se non existe, configura
 * a sincronización automática co parent, emite o evento subtreeEntered,
 * e devólveo.
 *
 * Validacións (en orde):
 * 1. Polo menos un nodo `subtree_anchor` con `subtreeId` debe estar
 *    en estado 'unlocked' ou 'maxed'. Senón, err(SUBTREE_NOT_UNLOCKED).
 * 2. As validacións internas do SubtreeManager (existence, cycle,
 *    depth) propagan os seus err() respectivos.
 *
 * Tras crear, o sub-engine subscríbese: cada mudanza no sub-engine
 * actualiza automaticamente `parent.state.subtreeStates[subtreeId]`.
 *
 * Emítese o evento `subtreeEntered(subtreeId)` (xa declarado).
 */
enterSubtree(subtreeId: string): Result<TreeEngine> {
  // 1. Anchor unlocked check
  if (!this.isAnyAnchorUnlocked(subtreeId)) {
    return err(
      new YggdrasilError(
        ErrorCode.SUBTREE_NOT_UNLOCKED,
        getErrorMessage(ErrorCode.SUBTREE_NOT_UNLOCKED, this.locale, {
          subtreeId,
        }),
        { context: { subtreeId } },
      ),
    )
  }

  // 2. Crear/recuperar via SubtreeManager con sync
  const manager = this.ensureSubtreeManager()
  const result = manager.getOrCreateSubtreeWithSync(subtreeId, (subEngine) => {
    return subEngine.subscribe(() => {
      this.store.update((draft) => {
        if (!draft.subtreeStates) {
          draft.subtreeStates = {}
        }
        draft.subtreeStates[subtreeId] = subEngine.getState()
      })
    })
  })

  if (!result.ok) return result

  // 3. Emitir evento
  this.events.emit('subtreeEntered', subtreeId)

  return ok(result.value)
}
```

### 5.10 — ErrorCode novo

**Familia YGG_E**. Modificar `packages/common/src/errors/codes.ts`:

```ts
// Despois de SUBTREE_CYCLE_DETECTED = 'YGG_E024':
SUBTREE_NOT_UNLOCKED = 'YGG_E025',
```

Modificar `packages/common/src/errors/messages.ts`:

- **SUBTREE_NOT_UNLOCKED**:
  - gl: 'A sub-árbore {subtreeId} non está desbloqueada (ningún anchor está unlocked)'
  - es: 'La sub-árbol {subtreeId} no está desbloqueada (ningún anchor está unlocked)'
  - en: 'Subtree {subtreeId} is not unlocked (no anchor is unlocked)'

**Autorización explícita** (excepción 3.4 L1): modificar
`packages/common/` só para estes 2 ficheiros.

### 5.11 — Sincronización: detalles críticos

**O listener** captura `subtreeId` e `subEngine` por closure. Cada
vez que `subEngine.subscribe` dispara o callback:

```ts
subEngine.subscribe(() => {
  this.store.update((draft) => {
    if (!draft.subtreeStates) {
      draft.subtreeStates = {}
    }
    draft.subtreeStates[subtreeId] = subEngine.getState()
  })
})
```

**`store.update`** dispara o `subscribe` do **parent**, que á súa
vez podería ser **escoitado polo seu propio parent grandai** se hai
recursión. **Cadea de propagación**: N niveis = N updates.
**Custo aceptable**.

**Cero loop infinito**: a actualización é **idempotente** (o sub-engine
xa devolvera o seu estado actualizado antes de chamar o callback).

### 5.12 — Cero modificación de pezas non listadas

**Cero modificación** de:
- LayoutEngine, RadialLayout, TreeLayout, IdentityLayout,
  MeshGenerator, PathBuilder, BoundsCalculator, QuadTree.
- MigrationRegistry, MigrationRunner, AutoBackup, Reconciler.
- ProgressManager, StatComputer, EffectsRunner, UnlockResolver,
  TimeManager, DependencyGraph, AuditLogger, ResourceManager.
- StateStore (xa acepta initialState; cero modificación).
- Tipos NodeDef, EdgeDef, TreeDef, TreeState (xa modelados).

**SI se modifica**:
- TreeEngine.ts (constructor + 2 métodos novos + 1 helper privado +
  1 campo privado).
- SubtreeManager.ts (cache shape + 1 método novo + destroySubtree +
  clear).
- TreeEngineFactory type (engadir terceiro parámetro context?).
- types/tree.ts (engadir 2 campos a TreeEngineOptions).
- common/errors/codes.ts + messages.ts (engadir 1 ErrorCode +
  mensaxes).
- engine/index.ts (cero exports novos esperados; `subtreeManager` é
  privado).

### 5.13 — Tests funcionais

Crear un só ficheiro de test novo:
`packages/core/__tests__/engine/TreeEngine.subtrees.test.ts`.

**Tests esperados (~50)**:

*getSubtreeEngine pasivo (~8 tests):*
1. cero sub-engine creado: devolve null.
2. tras enterSubtree('id'), getSubtreeEngine('id') devolve a mesma
   instance.
3. distintos IDs: cero engaña.
4. getSubtreeEngine cero require anchor unlocked.
5. tras destroySubtree, getSubtreeEngine devolve null.
6. tras clear, getSubtreeEngine devolve null.
7. múltiples chamadas devolven mesma instance.
8. cero crea sub-engine se cero foi creado previamente.

*enterSubtree creación básica (~6 tests):*
9. anchor unlocked + subtree existe: ok con TreeEngine.
10. tras enterSubtree, getSubtreeEngine devolve a mesma instance.
11. dúas chamadas a enterSubtree(id): devolve mesma instance
    (cached).
12. eventoo 'subtreeEntered' emitido.
13. enterSubtree non chama emit se hai err.
14. sub-engine devolve treeDef = mergeTreeDefWithOverrides aplicado.

*enterSubtree anchor unlocked check (~5 tests):*
15. anchor locked: err(SUBTREE_NOT_UNLOCKED).
16. anchor unlocked: ok.
17. anchor 'maxed' (consistente con 3.6.a): ok.
18. múltiples anchors co mesmo subtreeId; un unlocked: ok.
19. múltiples anchors; todos locked: err.

*enterSubtree validations (cycle, depth, existence) (~6 tests):*
20. subtree id non existe en parentTreeDef.subtrees: err(
    SUBTREE_NOT_FOUND).
21. ciclo detectado (a → b → a): err(SUBTREE_CYCLE_DETECTED).
22. depth excedida (10+ niveis): err(SUBTREE_DEPTH_EXCEEDED).
23. mensaxe de erros propaga subtreeId.
24. mensaxe de erros propaga chain en ciclo.
25. mensaxe de erros propaga depth e maxDepth.

*Sincronización parent ↔ sub (~10 tests):*
26. tras enterSubtree, parent.state.subtreeStates[id] = initial sub
    state.
27. sub.unlock(node): parent.state.subtreeStates[id].nodes[node] ==
    sub.getState().nodes[node].
28. múltiples sub.unlocks: parent actualízase progresivamente.
29. sub.respec(): parent actualízase.
30. tras destroySubtree, mudanza no sub-engine **non** afecta ao
    parent (listener liberado).
31. tras clear, igual (listener liberado para todos).
32. múltiples sub-engines independentes: cada un sincroniza por
    separado.
33. parent.subtreeStates non se crea ata que hai sub-engines.
34. parent.subscribe dispara cando sub.unlock (cadea de
    propagación).
35. cero loop infinito (verificado por count de updates en N
    actualizacións).

*Recursividade (~5 tests):*
36. sub.enterSubtree(otra): crea sub-sub-engine.
37. sub-sub-engine.unlock: sub-engine actualízase; parent
    actualízase (cadea).
38. ciclo recursivo (a → b → a) detectado correctamente.
39. profundidade 5: funciona.
40. profundidade 10+ : err.

*initialState recovery (~5 tests):*
41. parent.subtreeStates[id] inicial vacío: sub-engine empeza
    limpo.
42. parent.subtreeStates[id] con nodes unlocked previos: sub-engine
    inicializa con eses estados (state recovery).
43. tras destroy + re-enter: sub-engine recupera estado previo.
44. enterSubtree dúas veces: cero perdida de estado entre chamadas.
45. constructor de TreeEngine con options.initialState funciona
    standalone (cero require sub-tree).

*ErrorCodes integrados (~3 tests):*
46. SUBTREE_NOT_UNLOCKED ten YGG_E025.
47. Locale 'es' propaga a SUBTREE_NOT_UNLOCKED.
48. Locale 'en' propaga.

*Cero modificación de comportamento previo (~2 tests):*
49. TreeDef sen subtrees: TreeEngine funciona igual; cero
    SubtreeManager creado (lazy).
50. TreeDef sen subtrees: getSubtreeEngine('x') devolve null sen
    crash.

**Tamaño previsto**: ~500-600 liñas de tests.

### 5.14 — Cobertura

- TreeEngine.ts modificacións: ≥95% Branch (TreeEngine é peza
  grande; lección 3.5 L1 aplicable).
- SubtreeManager.ts modificacións: ≥95% Branch.
- Global core: ≥97.94% (baseline post-5.1). **Cero presión**.

### 5.15 — DT-19 NOVA

Anotar no CHANGELOG da sub-fase:

> **DT-19 (NOVA, futura)**: Budget compartido entre parent e
> sub-engines non implementado. **Modelo actual (5.2)**: cada
> sub-engine ten o seu propio budget illado (configurable via
> `subtreeOverrides.budget` ou recuperado desde
> `parentState.subtreeStates[id].budget`). **Para implementar
> compartido**: refactor de ResourceManager con BudgetSource
> inxectable + dúas codepaths en TreeEngine.unlock/respec/lock.
> **Diferido** a sub-fase específica de hardening cando exista caso
> de uso real demostrado.

**NON modificar MASTER nesta sub-fase**: a anotación de DT-19 fará-se
na próxima hixiene post-Fase 5.

### 5.16 — Cero modificación de exports públicos de SubtreeManager

A API pública da 5.1 (`getOrCreateSubtree`, `getExistingSubtree`,
etc.) **non se modifica externamente**. **`getOrCreateSubtreeWithSync`
é un método ADICIONAL**.

**`TreeEngineFactory` amplíase con terceiro parámetro opcional**.
**Tests da 5.1 seguen funcionando** (cero pasaban context).

### 5.17 — Determinismo

- Orde dos anchors ao buscar "algún unlocked": orde de aparición en
  treeDef.nodes.
- Cero novas fontes de non-determinismo.

### 5.18 — Tamaño previsto

- Modificacións TreeEngine.ts: ~150 liñas adicionais.
- Modificacións SubtreeManager.ts: ~40 liñas adicionais.
- Modificacións TreeEngineFactory + types: ~25 liñas.
- ErrorCode + mensaxes: ~10 liñas.
- Tests: ~500-600 liñas.
- **Total**: ~750 liñas. **Sub-fase mediana-grande**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/TreeEngine.ts` (MODIFICADO: constructor
  + 2 métodos públicos + 1 helper privado + 1 campo privado)
- `packages/core/src/engine/SubtreeManager.ts` (MODIFICADO: cache
  shape + getOrCreateSubtreeWithSync + destroySubtree + clear)
- `packages/core/src/types/tree.ts` (MODIFICADO: TreeEngineOptions
  +2 campos)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +1 ErrorCode;
  autorizado por 5.10)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +3 mensaxes;
  autorizado por 5.10)

**Tests:**
- `packages/core/__tests__/engine/TreeEngine.subtrees.test.ts` (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1263 tests core + 60 common + 171 storage con `--force`.

2. **Verifica StateStore acepta initialState**:
   ```
   grep -B1 -A5 "interface StateStoreOptions\|class StateStore" \
     packages/core/src/engine/StateStore.ts
   ```
   Confirma que o constructor é `(treeDef, options?: StateStoreOptions)`
   e que `options.initialState` propaga a `this.treeState`.

3. **Verifica EventEmitter exporta Unsubscribe**:
   ```
   grep -B1 -A2 "Unsubscribe" packages/core/src/engine/EventEmitter.ts | head -5
   ```

4. **Verifica TreeEngine ten `subscribe(listener)` público**:
   ```
   grep -A2 "subscribe(listener" packages/core/src/engine/TreeEngine.ts | head -5
   ```

5. **Verifica patrón do ErrorCode SUBTREE_CYCLE_DETECTED para
   replicar estilo**:
   ```
   grep -A2 "SUBTREE_CYCLE_DETECTED" packages/common/src/errors/codes.ts
   grep -A4 "SUBTREE_CYCLE_DETECTED" packages/common/src/errors/messages.ts
   ```

### T1 — ErrorCode novo en common (5.10)

1. Editar `packages/common/src/errors/codes.ts`:
   - Engadir `SUBTREE_NOT_UNLOCKED = 'YGG_E025'` despois de
     `SUBTREE_CYCLE_DETECTED`.
2. Editar `packages/common/src/errors/messages.ts`:
   - Engadir as 3 mensaxes (gl/es/en).
3. Typecheck 20/20.
4. Confirma 60 tests common seguen pasando.

### T2 — Ampliar TreeEngineOptions (5.4)

Editar `packages/core/src/types/tree.ts`:
- Engadir `initialState?: TreeState` con JSDoc.
- Engadir `activeSubtreeIds?: ReadonlySet<string>` con JSDoc.

Typecheck 20/20.

### T3 — Ampliar TreeEngineFactory (5.6)

Editar `packages/core/src/engine/SubtreeManager.ts`:
- Engadir interface `TreeEngineFactoryContext`.
- Ampliar `TreeEngineFactory` type con terceiro parámetro
  `context?: TreeEngineFactoryContext`.
- Modificar `getOrCreateSubtree` para pasar contexto á factory.

Typecheck 20/20. **1263 tests previos deben seguir pasando** (cero
ruptura de 5.1; o context é opcional).

### T4 — Modificar SubtreeManager con Unsubscribe handles (5.7)

Continuar editando SubtreeManager.ts:
- Importar `Unsubscribe` desde `'./EventEmitter.js'`.
- Cambiar cache shape a `Map<string, SubtreeCacheEntry>`.
- Engadir interface `SubtreeCacheEntry`.
- Engadir método `getOrCreateSubtreeWithSync`.
- Modificar `destroySubtree` para chamar unsubscribe.
- Modificar `clear` para iterar e chamar unsubscribe.
- `getExistingSubtree`, `hasSubtree`, `listSubtrees`, `size` adaptan
  a accederen `entry.engine`.

Typecheck 20/20.

### T5 — Modificar TreeEngine constructor (5.4)

Editar TreeEngine.ts:
- Engadir field `private readonly activeSubtreeIds: ReadonlySet<string>`.
- Engadir field `private subtreeManager: SubtreeManager | null = null`.
- Pasar `options.initialState` a `new StateStore(treeDef, { initialState })`.
- Inicializar `activeSubtreeIds = options?.activeSubtreeIds ?? new Set()`.

Typecheck 20/20.

### T6 — Engadir helpers privados (5.3 + 5.5)

Engadir en TreeEngine.ts:
- `private ensureSubtreeManager(): SubtreeManager` (lazy creation).
- `private isAnyAnchorUnlocked(subtreeId: string): boolean`.

Typecheck 20/20.

### T7 — Engadir getSubtreeEngine + enterSubtree (5.8 + 5.9)

Engadir en TreeEngine.ts:
- `getSubtreeEngine(subtreeId): TreeEngine | null`.
- `enterSubtree(subtreeId): Result<TreeEngine>`.

Importar `ErrorCode`, `YggdrasilError`, `getErrorMessage` se non
están xa.

Typecheck 20/20.

### T8 — Tests (5.13)

Crear `__tests__/engine/TreeEngine.subtrees.test.ts` cos ~50 tests.

**Importante**:
- Usar TreeEngine real (cero mock).
- Cubrir os 5 grupos: getSubtreeEngine pasivo, enterSubtree creación,
  anchor unlocked, validations, sincronización, recursividade,
  initialState recovery, ErrorCodes integrados.
- Verificar **cero loop infinito** explícitamente (count de updates).

### T9 — Verificación post-T8

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1263 tests previos seguen pasando intactos.
- 60 common previos intactos (cero ruptura por +1 ErrorCode).
- 171 storage previos intactos.

### T10 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- TreeEngine.ts ≥95% Branch (peza grande; lección 3.5 L1).
- SubtreeManager.ts ≥95% Branch.
- Global core ≥97.94%.

### T11 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/src/engine/SubtreeManager.ts
pnpm test
```

- Changeset **minor** para `@yggdrasil-forge/core`.
- Changeset **patch** para `@yggdrasil-forge/common`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
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
  ```

### T12 — Commit + push

Commit Conventional:
`feat(core): integrate SubtreeManager with TreeEngine (sub-phase 5.2)`.
Push directo a `origin/main` (base `2fd2e6a`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/TreeEngine.ts` (MODIFICADO)
- `packages/core/src/engine/SubtreeManager.ts` (MODIFICADO)
- `packages/core/src/types/tree.ts` (MODIFICADO)
- `packages/common/src/errors/codes.ts` (MODIFICADO)
- `packages/common/src/errors/messages.ts` (MODIFICADO)
- `packages/core/__tests__/engine/TreeEngine.subtrees.test.ts` (NOVO)
- `.changeset/*.md` (NOVO: 2 ficheiros)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, `vitest.config.ts`,
  `turbo.json`, `biome.json`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Calquera outra peza core (ProgressManager, layouts/,
  mergeTreeDefWithOverrides, etc.).
- Tests existentes (cero modificación).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` para os bloques novos en TreeEngine
(consistencia coas seccións xa marcadas). 2 espazos, comilla simple,
sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS strict, **cero
`any`**. NON desactives Biome.

**TreeEngine modificacións**: agrupar cada cambio cunha sección
marcada `// ── INICIO: 5.2 — <breve descrición> ──` para facilitar
o seguimento histórico (paralelo a 2.1.b, 2.2.b, etc.).

---

## 9. QUE NON FACER

- ❌ Implementar budget compartido (5.2: diferido; DT-19 NOVA).
- ❌ Refactorizar ResourceManager (5.2: cero modificación).
- ❌ Modificar StateStore (xa acepta initialState).
- ❌ Modificar TreeState ou outros tipos máis aló de TreeEngineOptions.
- ❌ Modificar eventos (5.11: subtreeEntered xa declarado).
- ❌ Modificar NodeDef, EdgeDef, TreeDef estrutural.
- ❌ Cambiar API pública de SubtreeManager (engadir si; modificar
  non; 5.16).
- ❌ Modificar TreeEngineFactory de xeito rompedor (5.16: terceiro
  parámetro opcional).
- ❌ Modificar layouts, migrations, reconciler, ou outras pezas
  (5.12).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` agás `codes.ts` e `messages.ts`
  (5.10 autorizado).
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes adicionais (só YGG_E025 prescrito).
- ❌ Implementar Federator (5.3).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 5.2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 2fd2e6a)
✅ TreeEngine.getSubtreeEngine + enterSubtree públicos
✅ enterSubtree con sincronización automática via subscribe +
   Unsubscribe handles xestionados polo SubtreeManager
✅ enterSubtree require anchor unlocked (SUBTREE_NOT_UNLOCKED YGG_E025)
✅ Constructor acepta initialState + activeSubtreeIds
✅ TreeEngineFactory ampliada con context? (cero ruptura 5.1)
✅ SubtreeManager modificado: cache `{engine, unsubscribe}`;
   getOrCreateSubtreeWithSync; destroySubtree + clear liberan
   listeners
✅ Cycle detection propagado a través de TreeEngine ↔
   SubtreeManager ↔ sub-engine (recursividade real)
✅ Cero modificación de pezas non listadas
✅ Cero modificación de tipos máis aló de TreeEngineOptions
✅ Cero rotura de SubtreeManager API pública (5.1 tests intactos)
✅ T0.2 StateStore.initialState verificado
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> getSubtreeEngine pasivo
   - <Y> enterSubtree creación + anchor + cycle/depth/exist
   - <Z> Sincronización parent ↔ sub
   - <W> Recursividade real
   - <V> initialState recovery
   - <U> ErrorCodes integrados
   - <T> Cero modificación de comportamento previo
✅ Cobertura:
   - TreeEngine.ts: <X%> (≥95% Branch; lección 3.5 L1)
   - SubtreeManager.ts: <X%> (≥95% Branch)
   - Global core: <X%> (baseline 97.94%; mantense ou sobe)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - DT-19 NOVA: Budget compartido diferido a sub-fase futura
     específica (cada sub-engine usa o seu propio budget illado).
   - Sincronización via push model (subscribe listener).
   - Sub-fase 5.2 INTEGRACIÓN REAL: TreeEngine ↔ SubtreeManager
     funcional + sincronización automática + recursión.
   - Modelo PoE Cluster Jewels totalmente funcional para casos
     básicos.
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 5.3 (Federator).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 5.2. Sub-fase mediana-grande con modificación
substancial de TreeEngine. Risco arquitectónico medio mitigado por
cobertura exhaustiva de tests. Budget compartido DIFERIDO
conscientemente. Calquera dúbida → ESCALAR.*
