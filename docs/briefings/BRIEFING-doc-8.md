# BRIEFING — SUB-FASE doc-8 de Yggdrasil Forge

> Pega este documento no chat executor.
> **🎉 SUB-FASE DOC POST-FASE 8** — documentación pura no MASTER.
> Marca oficialmente o peche da Fase 8 + consolida as 5 leccións
> estruturais capturadas durante Fase 8 + actualiza contadores
> globais.
>
> **CERO código novo**. **CERO modificación de ficheiros .ts**.
> Soamente:
> 1. `docs/architecture/MASTER.md` (modificacións cirúrxicas).
> 2. `.changeset/doc-8-master.md` (NOVO).
> 3. `CHANGELOG.md` (nova `## [Unreleased]`).
>
> **Risco MOI BAIXO**: documentación pura. Cero impacto en testes
> (~2195 totais inchanged), typecheck, ou build.
>
> **Decisións confirmadas polo director**:
> - **Naming**: `doc-8` (coherente con futuras sub-fases doc).
> - **Nova sección** A.6.X dedicada ás 5 leccións Fase 8 (cero
>   confundir coas existentes A.6 sobre Immer/caches/selectors).
> - **Marcador "🎉 FASE 8 PECHADA OFICIALMENTE"** no Anexo A coa
>   métrica completa (13 sub-fases, 51 consecutivas sen rollback,
>   +15 ErrorCodes, +3 paquetes activos, +700 tests).
> - **Contadores actualizados** repartidos no MASTER: cadea 3.0→8.8,
>   ErrorCodes 76, paquetes activos 7.
> - **DT-14 status update**: aplicado en 3 paquetes (@plugins,
>   @search, @validators); 12 scaffold pendentes ata activación.
>
> Tras esta sub-fase, o proxecto **estará en estado documental
> impecable** para empezar Fase 9 (ou release 0.1.0-alpha).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`** (aínda que esta sub-fase non
modifica código, verificar baseline post-edits).

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (cero esperado
porque modificación é só doc).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE doc-8 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE doc-8 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — GARANTÍA DE INMUTABILIDADE TOTAL**: cero modificación de
**calquera** ficheiro .ts. Tódolos 2195 tests + typecheck + builds
deben pasar **exactamente igual** que antes.

**0.11 — Modificacións MASTER cirúrxicas**: cada cambio aplica
sobre seccións específicas. Cero reescritura masiva.

**0.12 — Verificación post-edits OBRIGATORIA**:
```bash
pnpm turbo run typecheck --force          # 23/23 (cero cambio)
pnpm turbo run test --force                # cero cambio
```

---

## 1. IDENTIFICACIÓN

Sub-fase **doc-8** de Yggdrasil Forge. **Sub-fase de DOCUMENTACIÓN
PURA** post-Fase 8.

**Pezas (4 grupos)**:

**Grupo A — Anexo A.6 nova subsección (1 sección NOVA en MASTER)**:
1. Engadir nova sección **"A.6.X Leccións estruturais da Fase 8"**
   con 5 leccións (8.1 L1, 8.1 L2, 8.1 L3, 8.3 L1, 8.6.a L1).

**Grupo B — Marcador "🎉 FASE 8 PECHADA" (modificación cirúrxica
en MASTER)**:
2. Localizar a sección onde o MASTER lista as fases pechadas
   ("Fase 2 PECHADA. Fase 3 PECHADA. Fase 4 PECHADA. ... 🎉 FASE 7
   PECHADA OFICIALMENTE").
3. **Engadir** "🎉 FASE 8 PECHADA OFICIALMENTE" + métricas Fase
   8 finais (13 sub-fases, 51 consecutivas sen rollback, +15
   ErrorCodes, +3 paquetes activos, +~700 tests, 5 leccións
   estruturais capturadas).

**Grupo C — Contadores actualizados (modificacións cirúrxicas
en MASTER)**:
4. Actualizar contador de **Cadea** desde "3.0 → 5.3: 18 sub-fases"
   ao actual: **"3.0 → 8.8: 51 sub-fases consecutivas pechadas
   sen rollback"**.
5. Actualizar contador **ErrorCodes**: o último valor "57" debe
   actualizarse a **"76"** (+19: 15 da Fase 8 cas familias YGG_PL,
   YGG_B, YGG_RO + outros engadidos en sub-fases previas non
   trackeadas no MASTER).
6. Actualizar **paquetes activos**: documentar que tras Fase 8,
   son **7 paquetes activos** (common, core, storage, react,
   plugins, search, validators).

**Grupo D — DT-14 status update + housekeeping**:
7. Actualizar entrada de **DT-14** no MASTER: cambiar status a
   "Aplicado en 3 paquetes (@plugins en 8.5.a, @search en 8.6.a,
   @validators en 8.7.a); 12 paquetes scaffold pendentes ata
   activación".
8. `.changeset/doc-8-master.md` (NOVO).
9. `CHANGELOG.md` (MODIFICADO; nova `## [Unreleased]`).

**Total: 3 ficheiros tocados** (1 MODIFICADO substancial: MASTER.md;
1 NOVO: changeset; 1 MODIFICADO: CHANGELOG).

**Cero modificación de**:
- Calquera ficheiro .ts.
- Configs (package.json, tsconfig, tsup, vitest).
- Tests existentes (~2195 totais).
- `pnpm-lock.yaml`.
- README dos paquetes.
- `.github/`, scripts.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `2bee085`, verificada
empíricamente)**.

### Métricas Fase 8 finais (verificadas empíricamente)

**Sub-fases pechadas (13)**:
| Sub-fase | Aportación | Commit |
|---|---|---|
| 8.1 | BuildSerializer + UrlSerializer + 3 ErrorCodes B001-B003 | `760c11d` |
| 8.2 | SnapshotManager + LoadoutManager + 8 APIs + 3 ErrorCodes B004-B006 | `ad80454` |
| 8.3 REVISED | Respec extension (costPercent + nodeIdOrIds; +1 ErrorCode B007) | `357b69b` |
| 8.4.a | PluginManager standalone + 4 APIs + 2 ErrorCodes PL001-PL002 | `df7c696` |
| 8.4.b.i | HookRunner standalone con 8 hooks | `0f9ab45` |
| 8.4.b.ii | PluginAPI + PluginEngineHandle real + 4 ErrorCodes PL003-PL006 | `7adb1a2` |
| 8.4.c | Hooks integration en TreeEngine + 1 ErrorCode PL007 | `5baefa6` |
| 8.5.a | @plugins package + HistoryPlugin | `60a4404` |
| 8.5.b | DebugPlugin | `b8576c7` |
| 8.6.a | @search package + SearchEngine standalone | `22b0204` |
| 8.6.b | SearchPlugin + README | `0222885` |
| 8.7.a | @validators package + ValidatorEngine + 6 regras estruturais | `04e713c` |
| 8.7.b | 3 regras complexas + TreeEngine.validatePedagogically via IoC | `580f53f` |
| **8.8** | Read-only mode completion (3 checks + 18 tests) | `2bee085` |

**Tests totais por paquete (verificados empíricamente con `pnpm test`)**:
| Paquete | Tests |
|---|---|
| core | **1691** |
| common | 60 |
| storage | 193 |
| react | 116 |
| plugins | 35 |
| search | 32 |
| validators | 68 |
| **TOTAL** | **2195** |

**ErrorCodes (verificado empíricamente)**:
- **Total: 76** (76 entradas en `packages/common/src/errors/codes.ts`).
- **Engadidos en Fase 8: 15** (7 YGG_PL + 7 YGG_B + 1 YGG_RO).

**Paquetes activos: 7** (common, core, storage, react, plugins,
search, validators).

**Paquetes scaffold pendentes: 12** (analytics, cli, devtools, diff,
exporters, heatmap, i18n, importers, multitenancy, neo4j, stats,
themes, webhooks — todos teñen smoke.test.ts + placeholder VERSION
+ SEN DT-14 fix).

### As 5 leccións estruturais capturadas

**Lección 8.1 L1 — Conflitos de nomes en re-exports root barrel**:
- **Contexto**: Durante 8.1 (BuildSerializer + UrlSerializer),
  Executor descubriu que un nome de export xenérico colidía con
  exports previos do barrel.
- **Aprendizaxe**: verificar collisions antes de prescribir exports
  en root barrels. Usar nomes específicos (e.g., `BuildSerializer`
  cero `Serializer`).
- **Mitigación**: en briefings futuros, T0.2 verifica os exports
  root previos con `grep "^export" packages/.../src/index.ts`.

**Lección 8.1 L2 — Acceso a internals do TreeEngine**:
- **Contexto**: Durante 8.1, prescribiu `this.treeDef` directo
  cando o patrón establecido é `this.store.getTreeDef()`.
- **Aprendizaxe**: TreeEngine ten ~2270 liñas + ~35+ métodos.
  Acceso a internals require verificación empírica do patrón.
- **Mitigación**: T0.2 grep patrón `this\.store\.getTreeDef\|this\.treeDef`
  para confirmar acceso correcto antes de prescribir.

**Lección 8.1 L3 — Código prescrito é fonte de verdade**:
- **Contexto**: Durante 8.1, prosa describía un patrón pero código
  prescribía outro. Executor seguiu o código (correcto) cero a
  prosa.
- **Aprendizaxe**: cando briefings teñen prosa + código prescrito,
  o **código é fonte de verdade**.
- **Mitigación**: explicitamente documentado nos briefings posteriores;
  cero confusión.

**Lección 8.3 L1 — Grep específico de método vs xenérico**:
- **Contexto**: Durante 8.3, Director prescribiu `engine.respec(nodeId)`
  como API nova baseado en grep xenérico. Realidade: o método xa
  existía con ~150 liñas + 19 tests dependentes. Executor parou e
  escalou.
- **Aprendizaxe**: cando verificar que un método **non existe**
  nunha clase grande (~2000+ liñas), usar grep específico da
  definición: `^  async <methodName>\(`. Cero confiar en grep
  xenérico que pode coincidir con referencias en comentarios,
  imports, tipos, etc.
- **Mitigación**: rediseño cirúrxico backward-compat con `respec(nodeIdOrIds?,
  opts?)`. Cero rollback (capturado antes do commit).

**Lección 8.6.a L1 — Verificar campos exactos de tipos**:
- **Contexto**: Durante 8.6.a (SearchEngine), Director prescribiu
  `node.name` para indexación. Realidade: `NodeDef.label` (cero
  `name`). Executor detectou + adaptou con `flattenLocalized()` +
  engadiu test específico (#21) para LocalizedString Record.
- **Aprendizaxe**: cando prescribir APIs ou campos de tipos
  existentes (NodeDef, EdgeDef, etc.), **verificar empíricamente
  os nomes exactos** dos campos via grep do tipo. Cero asumir
  nomes comúns como `name` que poden ser `label`, `title`, etc.
- **Mitigación**: en briefings posteriores (8.7.a, 8.7.b), T0.2
  inclúe verificación empírica explícita dos tipos antes de
  codificar. Aplicado con éxito en 8.7.b para Cost structure.

**Esta é a lección máis valiosa da Fase 8** porque é un corolario
de 8.3 L1 aplicado a tipos en lugar de métodos, e marca o patrón
de **verificación empírica empezando por T0.2** que será replicado
en futuras fases.

### Estructura actual do Anexo A.6 (verificada)

**Sección A.6 do MASTER** ten subseccións sobre **OUTRAS** leccións
históricas (Immer/caches/selectors). **Cero confundir** con as
leccións 8.x L1 que son sobre verificación empírica.

**Decisión do director**: nova subsección dedicada cunha
nomenclatura clara para evitar confusión. Proposta: **"A.6.8
Leccións estruturais da Fase 8 — verificación empírica"**.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `2bee085` (sub-fase 8.8 — read-only
  mode completion).
- **2195 tests monorepo limpos** (1691 core + 60 + 193 + 116 + 35
  + 32 + 68).
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- **76 ErrorCodes**.
- **🎉 51 sub-fases consecutivas sen rollback** (récord histórico
  desde 3.0).
- **7 paquetes activos** + 12 scaffold pendentes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Documentar oficialmente o peche da Fase 8 no MASTER mediante 4
modificacións cirúrxicas + 1 sección nova: (1) engadir sección
**"A.6.8 Leccións estruturais da Fase 8 — verificación empírica"**
con as 5 leccións capturadas (8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1
con contexto, aprendizaxe e mitigación detalladas); (2) **engadir
marcador "🎉 FASE 8 PECHADA OFICIALMENTE"** ao Anexo A coa lista
das 13 sub-fases + métricas finais (51 sub-fases consecutivas
sen rollback, +15 ErrorCodes Fase 8, +3 paquetes activos, +~700
tests Fase 8); (3) **actualizar contadores globais** (cadea
documentada 3.0→5.3 obsoleta → 3.0→8.8 51 sub-fases; ErrorCodes
57→76; paquetes activos a 7); (4) **actualizar status DT-14**
(aplicado en 3 paquetes; 12 scaffold pendentes). **Cero modificación
de calquera ficheiro .ts**, configs, tests, ou README dos paquetes.
**Risco MOI BAIXO**: documentación pura cero impacto en testes
ou builds.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (1)**:
- `.changeset/doc-8-master.md`.

**MODIFICADOS (2)**:
- `docs/architecture/MASTER.md` (modificacións cirúrxicas; +~250
  liñas).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 3 ficheiros tocados** (1 NOVO + 2 MODIFICADOS).

### 5.2 — Sección nova A.6.8 (FIXADO; engadir ao final do A.6)

**Localizar** o final da sección A.6 (probable está antes de A.7
ou outro Anexo). **Engadir despois** das subseccións A.6
existentes (que tratan Immer/caches/selectors):

```markdown
### A.6.8 — Leccións estruturais da Fase 8 — verificación empírica

Durante a Fase 8 (8.1 → 8.8, 13 sub-fases) capturáronse **5
leccións estruturais** sobre verificación empírica antes de
prescribir cambios. Tódalas foron incorporadas como mandato firme
nos briefings posteriores e aplicadas con éxito (cero rollbacks
en Fase 8).

#### 8.1 L1 — Conflitos de nomes en re-exports root barrel

**Contexto**: Durante 8.1 (BuildSerializer + UrlSerializer),
prescribiu un nome xenérico que colidía con exports previos no
barrel root.

**Aprendizaxe**: Verificar collisions antes de prescribir exports
en root barrels.

**Mitigación**: En briefings posteriores, T0.2 verifica os exports
root previos con `grep "^export" packages/.../src/index.ts`. Usar
nomes específicos (e.g., `BuildSerializer` cero `Serializer`).

#### 8.1 L2 — Acceso a internals do TreeEngine

**Contexto**: TreeEngine ten ~2270 liñas + ~35+ métodos. Acceso
a internals require verificación empírica do patrón establecido
(`this.store.getTreeDef()` vs `this.treeDef` directo).

**Aprendizaxe**: cero asumir patróns de acceso a internals sen
grep prévio.

**Mitigación**: T0.2 inclúe verificación do patrón actual antes
de prescribir.

#### 8.1 L3 — Código prescrito é fonte de verdade

**Contexto**: Cando briefings teñen prosa descriptiva + código
prescrito, ambos poden estar dessincronizados. Executor de 8.1
seguiu correctamente o código.

**Aprendizaxe**: o **código prescrito é fonte de verdade**; a
prosa é descritiva.

**Mitigación**: documentado explícitamente no setup dos briefings
posteriores.

#### 8.3 L1 — Grep específico de método vs xenérico

**Contexto**: Durante 8.3, prescribiu `engine.respec(nodeId)` como
API nova baseado en grep xenérico (cero matches). Realidade: o
método xa existía con ~150 liñas + 19 tests dependentes. Executor
parou e escalou.

**Aprendizaxe**: cando verificar que un método **non existe** nunha
clase grande, usar grep específico da definición:
`^  async <methodName>\(`. Cero confiar en grep xenérico que pode
coincidir con referencias en comentarios, imports, tipos, etc.

**Mitigación**: rediseño cirúrxico backward-compat con
`respec(nodeIdOrIds?, opts?)` (8.3 REVISED). Cero rollback
(capturado antes do commit). **Esta lección levou ao patrón actual
de T0.2 con verificacións empíricas explícitas**.

#### 8.6.a L1 — Verificar campos exactos de tipos (corolario de 8.3 L1)

**Contexto**: Durante 8.6.a (SearchEngine), prescribiu `node.name`
para indexación. Realidade: `NodeDef.label` é `LocalizedString`
(cero `name`). Executor detectou + adaptou con `flattenLocalized()`
+ engadiu test específico para LocalizedString Record.

**Aprendizaxe**: cando prescribir APIs ou campos de tipos
existentes (NodeDef, EdgeDef, Cost, etc.), **verificar empíricamente
os nomes exactos** dos campos via grep do tipo. Cero asumir nomes
comúns como `name` que poden ser `label`, `title`, etc.

**Mitigación**: T0.2 inclúe verificación empírica dos tipos
ANTES de codificar. Aplicado con éxito en 8.7.a (NodeDef.label,
EdgeDef.source/target) e 8.7.b (Cost.amount).

**Esta é a lección máis valiosa da Fase 8**: é un corolario de
8.3 L1 aplicado a tipos en lugar de métodos, e marca o patrón de
**verificación empírica como primeira tarefa de calquera sub-fase**.

#### Patrón global emerxente

As 5 leccións converxen nun **patrón único**:
> Cero prescribir cambios sobre código existente sen primeiro
> verificar empíricamente o estado actual (campos, métodos,
> exports, patróns de acceso). T0.2 é a fase de verificación
> empírica obrigatoria en cada sub-fase.

Este patrón será o **estándar para a Fase 9** e seguintes.
```

### 5.3 — Marcador "🎉 FASE 8 PECHADA" no Anexo A (FIXADO)

**Localizar** a sección onde o MASTER lista as fases pechadas:
```
**Tag `phase-1-closed`** en `1290378`. **Fase 2 PECHADA. Fase 3
PECHADA. Fase 4 PECHADA. Fase 5 PECHADA. Fase 6 PECHADA. 🎉 FASE 7
PECHADA OFICIALMENTE (12/12 sub-fases + 1 hixiene de código; cadea
3.0 → hixiene = 36 sub-fases consecutivas con cero rollbacks).**
```

**Substituír por**:
```
**Tag `phase-1-closed`** en `1290378`. **Fase 2 PECHADA. Fase 3
PECHADA. Fase 4 PECHADA. Fase 5 PECHADA. Fase 6 PECHADA. Fase 7
PECHADA (12/12 sub-fases + 1 hixiene de código). 🎉 FASE 8 PECHADA
OFICIALMENTE (13/13 sub-fases; cadea 3.0 → 8.8 = 51 sub-fases
consecutivas con cero rollbacks — RÉCORD HISTÓRICO).**

**Métricas Fase 8 finais (8.1–8.8):**
- **13 sub-fases pechadas**: 8.1, 8.2, 8.3 (REVISED tras
  escalación), 8.4.a, 8.4.b.i, 8.4.b.ii, 8.4.c, 8.5.a, 8.5.b,
  8.6.a, 8.6.b, 8.7.a, 8.7.b, 8.8.
- **Rollbacks**: 0.
- **Escalacións resoltas sen rollback**: 1 (8.3 ORIXINAL → 8.3
  REVISED).
- **Cadea consecutiva desde 3.0**: **51 sub-fases sen rollback**.
- **ErrorCodes engadidos**: +15 (familia YGG_PL: PL001-PL007;
  familia YGG_B: B001-B007; familia YGG_RO: RO001). Total: 57 →
  76.
- **Paquetes activos engadidos**: +3 (@yggdrasil-forge/plugins,
  @yggdrasil-forge/search, @yggdrasil-forge/validators). Total:
  4 → 7.
- **Tests engadidos**: ~+700 totais. Total monorepo: 2195.
  - core: 1691 (+18 en 8.8 + integration en 8.4.c).
  - validators: 68 (NOVO en 8.7.a + 8.7.b).
  - search: 32 (NOVO en 8.6.a + 8.6.b).
  - plugins: 35 (NOVO en 8.5.a + 8.5.b).
- **Funcionalidades clave entregadas**:
  - Plugin system completo end-to-end (PluginManager + HookRunner
    + PluginAPI + 8 hooks integration en TreeEngine).
  - 2 plugins oficiais (HistoryPlugin + DebugPlugin).
  - SearchEngine + SearchPlugin con algoritmo custom (cero deps
    externas).
  - ValidatorEngine + 9 built-in rules (6 estruturais + 3
    pedagóxicas).
  - **Inversion of Control pattern** establecido
    (TreeEngine.validatePedagogically).
  - Read-only mode completo (8 métodos bloqueados).
  - Snapshots + Loadouts + Builds share links.
  - Respec extension (costPercent + nodeIdOrIds backward-compat).
- **5 leccións estruturais capturadas** (ver A.6.8): 8.1 L1/L2/L3
  + 8.3 L1 + 8.6.a L1.
- **DT-14 fix aplicado en 3 paquetes** (proactivo); 12 scaffold
  pendentes.
- **🎉 ZERO ROLLBACKS** en toda a Fase 8.
```

### 5.4 — Contadores globais a actualizar (FIXADO)

**Localizar** as seccións obsoletas. **Actualizacións cirúrxicas**:

#### 5.4.a — Cadea consecutiva

**Antes** (en MASTER, líñas próximas a "Cadea 3.0 → 5.3: 18
sub-fases"):
```
Cadea 3.0 → 5.3: 18 sub-fases consecutivas pechadas con cero
verification.
```

**Despois** (engadir nova entrada SEN borrar histórico):
```
Cadea 3.0 → 5.3: 18 sub-fases consecutivas pechadas con cero
verification.
**Cadea 3.0 → 8.8: 51 sub-fases consecutivas pechadas con cero
rollbacks (récord histórico tras Fase 8).**
```

#### 5.4.b — ErrorCodes

**Antes** (en MASTER, líñas con resumo total):
```
**Total: 57 ErrorCodes. ...**
```

**Despois** (substituír):
```
**Total: 76 ErrorCodes. Familia YGG_R nova en 3.6.a, familia
YGG_L nova en 4.1, +6 entradas en YGG_E durante Fase 5
(SUBTREE_DEPTH_EXCEEDED, ...), +8 entradas en YGG_E durante Fase
6 (TREE_REGISTRY_*, APPLY_CHANGES_FAILED, QUOTA_*, PERMISSION_DENIED),
+15 entradas en Fase 8: familia YGG_PL nova con 7 codes
(PL001-PL007 para Plugins), familia YGG_B nova con 7 codes
(B001-B007 para Builds), familia YGG_RO nova con 1 code (RO001
READ_ONLY_VIOLATION).**
```

#### 5.4.c — Paquetes activos

Engadir nova sección breve no Anexo A (despois das métricas Fase
8):
```
**Paquetes activos tras Fase 8**: 7 (de 15 totais):
- common (codificado completo).
- core (~2700+ liñas, 1691 tests).
- storage (193 tests).
- react (116 tests).
- plugins (NOVO en 8.5; 35 tests; HistoryPlugin + DebugPlugin).
- search (NOVO en 8.6; 32 tests; SearchEngine + SearchPlugin).
- validators (NOVO en 8.7; 68 tests; ValidatorEngine + 9 regras).

**Paquetes scaffold pendentes**: 12 (analytics, cli, devtools,
diff, exporters, heatmap, i18n, importers, multitenancy, neo4j,
stats, themes, webhooks). Todos teñen smoke.test.ts + placeholder
VERSION. DT-14 fix require aplicarse a cada un cando se active.
```

### 5.5 — DT-14 status update (FIXADO)

**Localizar** entrada DT-14 no MASTER.

**Antes** (probable):
```
| DT-14 | tsup `dts: {composite: false, incremental: false}`
necesario en paquetes que dependen de common (composite=true).
Cazado en 3.4 para storage. Outros 17 paquetes scaffold terán o
mesmo problema cando se lles engada código real. **Plan**: propagar
fix nun ciclo de hardening futuro ou paquete por paquete cando
active cada un. | Aberta non bloqueante |
```

**Despois** (substituír status):
```
| DT-14 | tsup `dts: {composite: false, incremental: false}`
necesario en paquetes que dependen de common (composite=true).
Cazado en 3.4 para storage. **Aplicado proactivamente en 3
paquetes durante Fase 8**: @plugins (8.5.a), @search (8.6.a),
@validators (8.7.a). **12 paquetes scaffold pendentes** (analytics,
cli, devtools, diff, exporters, heatmap, i18n, importers,
multitenancy, neo4j, stats, themes, webhooks); fix aplicará cando
se active cada un (patrón establecido). | Aberta non bloqueante;
parcialmente resolta en Fase 8 |
```

### 5.6 — Cero modificación doutros aspectos do MASTER

**Garantía dura**:
- Cero modificar seccións históricas (Fases 1-7 manteñen contidos
  intactos).
- Cero modificar listados de ficheiros, plans de release, ou outras
  secciones non relacionadas con Fase 8.
- Cero modificar seccións A.6 existentes (Immer/caches/selectors).
  Engadir nova A.6.8 separada.

### 5.7 — Lección 8.3 L1 aplicada (a esta propia sub-fase)

T0.2 verifica empíricamente:
- Localización exacta das seccións a modificar.
- Cero crear sección A.6.8 se xa existe outra con ese nome
  (evitar duplicado).
- Localización exacta do marcador "🎉 FASE 7 PECHADA" para inxección
  do marcador Fase 8 inmediatamente despois.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| Sección A.6.8 nova | Markdown | docs/architecture/MASTER.md | +~120 |
| Marcador "🎉 FASE 8 PECHADA" | Markdown | docs/architecture/MASTER.md | +~50 |
| Contadores actualizados | Markdown | docs/architecture/MASTER.md | +~20 (4 puntos) |
| DT-14 status update | Markdown | docs/architecture/MASTER.md | +~5 |
| .changeset | YAML+md | .changeset/doc-8-master.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~25 |

**Total estimado**: ~225 liñas en MASTER + 31 housekeeping.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (1)**:
- `.changeset/doc-8-master.md`

**MODIFICADOS (2)**:
- `docs/architecture/MASTER.md`
- `CHANGELOG.md`

**Total: 3 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera ficheiro .ts.
- Configs (package.json, tsconfig, tsup, vitest).
- Tests existentes (~2195 totais).
- READMEs dos paquetes.
- `pnpm-lock.yaml`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

**Markdown**: usar headings xerárquicos coherentes (## / ### /
####). Listas con `-`. Códigos inline con backticks.

**Emojis**: usados con moderación; só nos marcadores oficiais
(🎉 para fases pechadas; ✅ para itens completados).

**Citas literais** de commits, paquetes, e ErrorCodes con backticks
(e.g., `2bee085`, `@yggdrasil-forge/plugins`, `YGG_PL007`).

**Numbers/contadores** precisos: 76 ErrorCodes, 51 sub-fases, 7
paquetes activos, 2195 tests.

**Cero estilos floridos**: técnico e directo.

---

## 9. QUE NON FACER

- ❌ Modificar **calquera ficheiro .ts**.
- ❌ Modificar configs (package.json, tsconfig, tsup, vitest).
- ❌ Modificar tests.
- ❌ Modificar READMEs dos paquetes.
- ❌ Modificar `pnpm-lock.yaml`.
- ❌ Borrar contidos históricos do MASTER (Fases 1-7).
- ❌ Modificar seccións A.6 existentes (Immer/caches/selectors).
- ❌ Crear sub-fase doc-1, doc-2 etc. para Fases pasadas (DIFERIDO).
- ❌ Engadir contadores duplicados (substituír cirúrxicamente).
- ❌ Engadir leccións doutras Fases (8 only).
- ❌ Cambiar a numeración existente das DT.
- ❌ Modificar entradas doutras DT (só DT-14).
- ❌ Crear ficheiros novos fora de .changeset.
- ❌ Esquecer marcador "🎉 FASE 8 PECHADA OFICIALMENTE".
- ❌ Reescribir o Anexo A enteiro (modificacións cirúrxicas).

---

## 10. TAREFAS (T0–T6)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `2bee085` como
HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar estructura MASTER:
grep -n "^### A\.6" docs/architecture/MASTER.md | head -10
# Esperado: subseccións A.6 existentes (Immer/caches/selectors)
# que NON debemos modificar.

# Localizar marcador "FASE 7 PECHADA" actual:
grep -n "FASE 7 PECHADA" docs/architecture/MASTER.md

# Localizar contador "Cadea 3.0 → 5.3":
grep -n "Cadea 3\.0 →" docs/architecture/MASTER.md

# Localizar entrada DT-14:
grep -n "^| DT-14" docs/architecture/MASTER.md

# Confirmar 76 ErrorCodes:
grep -cE "^  [A-Z_]+\s*=" packages/common/src/errors/codes.ts
# Esperado: 76

# Confirmar tests baseline:
for pkg in core common storage react plugins search validators; do
  count=$(pnpm --filter "@yggdrasil-forge/$pkg" test 2>&1 | grep -oE "[0-9]+ passed" | head -1)
  echo "$pkg: $count"
done
# Esperado: 1691 / 60 / 193 / 116 / 35 / 32 / 68
```

**T0.3** — Baseline (cero cambio esperado):
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 23/23
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir sección A.6.8 nova ao MASTER

Aplicar §5.2 literal. **Localizar o final** das subseccións A.6
existentes (ou despois da última se cero claro) + **engadir nova
subsección** A.6.8.

**Cero modificar** as A.6 existentes.

### T2 — Engadir marcador "🎉 FASE 8 PECHADA" + métricas

Aplicar §5.3 literal. **Substituír** o párrafo existente cas Fases
pechadas + **engadir** métricas Fase 8 finais inmediatamente
despois.

### T3 — Actualizar contadores globais

Aplicar §5.4.a, §5.4.b, §5.4.c literal:
- Cadea: engadir entrada 3.0→8.8 sen borrar histórico.
- ErrorCodes: substituír total 57 → 76 + detalle familias Fase 8.
- Paquetes activos: engadir nova sección breve con listado.

### T4 — Actualizar DT-14 status

Aplicar §5.5 literal. **Substituír** a entrada actual de DT-14
cas modificacións de status.

### T5 — Verificación post-edits

```bash
# Verificar que cero código foi modificado:
git diff --name-only origin/main..HEAD | grep -vE "MASTER\.md|CHANGELOG\.md|\.changeset"
# Esperado: cero matches.

# Verificar que typecheck + tests seguen pasando intactos:
pnpm turbo run typecheck --force                          # 23/23
pnpm turbo run test --force                               # 2195 totais inchanged

# Verificar nova subsección presente:
grep -n "^### A\.6\.8" docs/architecture/MASTER.md
# Esperado: 1 match (nova).

# Verificar marcador presente:
grep -n "FASE 8 PECHADA OFICIALMENTE" docs/architecture/MASTER.md
# Esperado: 1 match (novo).

# Verificar contador actualizado:
grep -n "76 ErrorCodes" docs/architecture/MASTER.md
# Esperado: 1+ match.
```

### T6 — Changeset + CHANGELOG + commit + push

`.changeset/doc-8-master.md`:
```
---
'@yggdrasil-forge/core': patch
---

docs(master): close Fase 8 officially + consolidate 5 structural lessons + update counters (sub-phase doc-8)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Documentation
- **🎉 FASE 8 PECHADA OFICIALMENTE** no MASTER (Anexo A): 13 sub-fases
  (8.1, 8.2, 8.3 REVISED, 8.4.a/b.i/b.ii/c, 8.5.a/b, 8.6.a/b,
  8.7.a/b, 8.8) + métricas finais (51 sub-fases consecutivas sen
  rollback desde 3.0, +15 ErrorCodes, +3 paquetes activos, +~700
  tests, 5 leccións estruturais capturadas).
- **Nova sección A.6.8** "Leccións estruturais da Fase 8 —
  verificación empírica" no MASTER. Consolida as 5 leccións
  capturadas durante Fase 8:
  - 8.1 L1: Conflitos de nomes en re-exports root barrel.
  - 8.1 L2: Acceso a internals do TreeEngine (this.store.X vs
    direct).
  - 8.1 L3: Código prescrito é fonte de verdade.
  - 8.3 L1: Grep específico de método vs xenérico en clases
    grandes.
  - 8.6.a L1: Verificar campos exactos de tipos (corolario de
    8.3 L1).
- **Patrón global emerxente** documentado: "verificación empírica
  como primeira tarefa de calquera sub-fase" (T0.2 obrigatoria).
- **Contadores globais actualizados**:
  - Cadea: 3.0 → 8.8 = **51 sub-fases consecutivas sen rollback**
    (récord histórico).
  - ErrorCodes: 57 → **76** (+15 da Fase 8: 7 YGG_PL, 7 YGG_B,
    1 YGG_RO).
  - Paquetes activos: 4 → **7** (engadidos @plugins, @search,
    @validators).
- **DT-14 status update**: aplicado proactivamente en 3 paquetes
  (@plugins, @search, @validators) durante Fase 8; 12 scaffold
  pendentes ata activación.

### Note
- Sub-fase **doc-8** é unha sub-fase de **DOCUMENTACIÓN PURA**.
  **Cero modificación de ficheiros .ts**, configs, tests, ou
  READMEs.
- **Cero impacto** en typecheck, tests, builds, ou cobertura.
  2195 tests monorepo inchanged.
- **Risco MOI BAIXO**: modificación cirúrxica do MASTER en 4
  puntos específicos + 1 nova subsección.
- Cero novidades arquitectónicas; resumen documental do que xa
  está implementado.
- **🎯 Próximo paso**: Fase 9 ou release 0.1.0-alpha. Tódalas
  leccións estruturais consolidadas son reutilizables para
  futuras fases.
```

Commit Conventional:
`docs(master): close Fase 8 officially + consolidate 5 structural lessons + update counters (sub-phase doc-8)`

Push directo a `origin/main` (base `2bee085`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE doc-8 — COMPLETADA E EN origin/main ═══
🎉 FASE 8 PECHADA OFICIALMENTE NO MASTER
✅ Commit <hash> en origin/main (base 2bee085)
✅ Nova sección A.6.8 engadida ao MASTER:
   - 5 leccións estruturais Fase 8 (8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1)
   - Patrón global emerxente: verificación empírica T0.2 obrigatoria
✅ Marcador "🎉 FASE 8 PECHADA OFICIALMENTE" engadido no Anexo A:
   - 13 sub-fases listadas (8.1 → 8.8)
   - Métricas finais (51 sub-fases consecutivas sen rollback)
   - ErrorCodes 57 → 76 (+15)
   - Paquetes activos 4 → 7 (+3)
   - Tests engadidos: +~700
✅ Contadores globais actualizados (4 puntos):
   - Cadea 3.0 → 8.8: 51 sub-fases
   - ErrorCodes: 76
   - Paquetes activos: 7 (lista detallada)
   - DT-14 status: aplicado en 3 paquetes
✅ T0.2 verificación empírica (lección 8.3 L1):
   - Subseccións A.6 existentes confirmadas (Immer/caches/selectors;
     NON modificadas)
   - Marcador FASE 7 localizado para inxección post-
   - Contadores actuais verificados (76 ErrorCodes, 2195 tests)
✅ T5 verificación dura:
   - Cero ficheiros .ts modificados
   - Cero configs modificadas
   - Cero tests modificados (~2195 inchanged)
   - Typecheck: 23/23 INTACTOS
   - Tódolos paquetes pasan tests INTACTOS
✅ CERO impacto en código
✅ CERO modificación de README dos paquetes
✅ CERO deps de npm
✅ CERO modificación de pnpm-lock.yaml
✅ 3 ficheiros tocados: MASTER.md (modif) + CHANGELOG.md (modif)
   + .changeset/doc-8-master.md (novo)
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   🎉 FASE 8 OFICIALMENTE PECHADA NO MASTER.
   🎯 RÉCORD HISTÓRICO documentado: 51 sub-fases consecutivas sen
     rollback desde 3.0.
   - 5 leccións estruturais consolidadas + reutilizables para
     futuras fases.
   - Patrón "verificación empírica T0.2" establecido como estándar.
   - 12 paquetes scaffold restantes; DT-14 fix patrón establecido.
   - Próximo paso: Fase 9 ou release 0.1.0-alpha.
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit: 3 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA Fase 9 ou release 0.1.0-alpha.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing doc-8. **SUB-FASE DE DOCUMENTACIÓN PURA**
post-Fase 8. Marca oficialmente o peche da Fase 8 no MASTER mediante
4 modificacións cirúrxicas + 1 nova subsección dedicada (A.6.8)
con as 5 leccións estruturais capturadas durante Fase 8. **Risco
MOI BAIXO**: cero modificación de calquera ficheiro .ts, configs,
tests, ou READMEs. 3 ficheiros tocados (1 NOVO + 2 MODIFICADOS).
Cero impacto en typecheck, tests (2195 inchanged), builds, ou
cobertura. Lección 8.3 L1 aplicada con rigor en T0.2 (verificar
estructura MASTER antes de modificar).*

*🎉 **PUNTO DE INFLEXIÓN HISTÓRICO**: con esta sub-fase, a Fase 8
quedará oficialmente pechada e o proxecto entrará en estado
documental impecable para empezar Fase 9 ou release 0.1.0-alpha.
Tódalas 5 leccións estruturais consolidadas son reutilizables
para futuras fases. O patrón "verificación empírica T0.2 obrigatoria"
queda establecido como estándar do proxecto.*

*Métricas Fase 8 finais documentadas:
- 13 sub-fases pechadas (8.1 → 8.8).
- 0 rollbacks.
- 1 escalación resolta sen rollback (8.3 → 8.3 REVISED).
- Cadea 3.0 → 8.8 = 51 sub-fases consecutivas (récord).
- +15 ErrorCodes (76 totais).
- +3 paquetes activos (7 totais).
- +~700 tests (2195 totais).
- 5 leccións estruturais (8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1).
- DT-14 aplicado en 3/15 paquetes scaffold.*
