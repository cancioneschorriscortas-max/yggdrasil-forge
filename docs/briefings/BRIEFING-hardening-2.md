# BRIEFING — SUB-FASE hardening-2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEGUNDA do ciclo de hardening pre-release 0.1.0-alpha**.
> Resolve **DT-25** (briefings Fases 4-8 non trackeados en
> `docs/briefings/`).
>
> **Pure documentación**: copia masiva de briefings históricos
> que **xa existen como ficheiros físicos** (39 no zip que Agarfal
> ten en local + 5 desta sesión producidos polo Director actual).
>
> **Decisións confirmadas polo director**:
> - **Cero crear ficheiros desde cero**: briefings existen físicamente;
>   Agarfal copíaos á árbore de traballo do repo antes do commit.
> - **Convención NOVA**: tódolos briefings futuros trackearánse
>   automaticamente en `docs/briefings/` como parte da súa propia
>   sub-fase. **Cero DT-25 nunca máis** (sección nova en MASTER §A.5).
> - **44 ficheiros NOVOS** totais en docs/briefings/:
>   - 38 desde o zip de Agarfal (Fases 4-8 históricos).
>   - 5 desta sesión (8.5.b, 8.7.a, 8.7.b, doc-8, hardening-1).
>   - 1 este mesmo briefing (hardening-2).
> - **DT-25 → RESOLTA** no MASTER.
> - **Naming mixto preservado**: briefings pre-6_2 usan dot
>   (`BRIEFING-X.Y.md`); briefings desde 6_2 usan underscore
>   (`BRIEFING-X_Y.md`). Cero renomeo retrocompatible (preservar
>   git history).
>
> **Risco MOI BAIXO**: pure documentación. Cero código modificado.
> Cero tests modificados. Cero impacto en typecheck/build.
>
> **Aliñado con DT-25 do MASTER**: *"commit único `docs: briefings
> phases 4+5+6` ao peche definitivo de Fase 6 (tras 6.5). Cero
> impacto funcional, só housekeeping."*
>
> 8.4.b.ii recuperado polo Agarfal (briefing intacto en local).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`** (cero novos esperados; só
verificación de baseline).

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE hardening-2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE hardening-2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: cero impacto (cero código).

**0.11 — c8 ignore**: cero aplicable.

**0.12 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 ficheiros .ts modificados**.
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 cambios funcionais**.
- Tódolos **2195 tests** deben seguir pasando **exactamente igual**.

**0.13 — Cero crear ficheiros .md desde cero**: tódolos briefings
xa existen como ficheiros. **Agarfal copia** os 44 ficheiros á
working tree do repo ANTES do commit. **Executor verifica + commit**.

**0.14 — Operación de copia masiva**: o briefing prescribe a
ubicación dos 44 ficheiros + o destino exacto. Agarfal executa a
copia manualmente (cero risco; pure operación de filesystem).

**0.15 — Convención NOVA**: estableceuse no MASTER §A.5 como
estándar permanente. Briefings futuros tráckanse automáticamente.

---

## 1. IDENTIFICACIÓN

Sub-fase **hardening-2** de Yggdrasil Forge. **SEGUNDA do ciclo
de hardening pre-release 0.1.0-alpha**. Resolve DT-25.

**Pezas (5 grupos)**:

**Grupo A — Copiar 38 briefings do zip de Agarfal a `docs/briefings/`
(38 NOVOS)**:

Procedencia: zip de Agarfal en local (descomprimido).

```
BRIEFING-4.1.md
BRIEFING-4.2.md
BRIEFING-4.3.md
BRIEFING-4.4.md
BRIEFING-4.5.md
BRIEFING-4.6.md
BRIEFING-5.1.md
BRIEFING-5.2.md
BRIEFING-5.3.md
BRIEFING-6.1.md
BRIEFING-6_2.md
BRIEFING-6_3.md
BRIEFING-6_4.md
BRIEFING-6_5.md
BRIEFING-7_1.md
BRIEFING-7_2.md
BRIEFING-7_3.md
BRIEFING-7_4.md
BRIEFING-7_5.md
BRIEFING-7_6.md
BRIEFING-7_7.md
BRIEFING-7_8.md
BRIEFING-7_9.md
BRIEFING-7_10.md
BRIEFING-7_11.md
BRIEFING-HIGIENE-7.md
BRIEFING-8_1.md
BRIEFING-8_2.md
BRIEFING-8_3.md
BRIEFING-8_3_REVISED.md
BRIEFING-8_4_a.md
BRIEFING-8_4_b_i.md
BRIEFING-8_4_b_ii.md
BRIEFING-8_4_c.md
BRIEFING-8_5_a.md
BRIEFING-8_6_a.md
BRIEFING-8_6_b.md
BRIEFING-8_8.md
```

**Grupo B — Copiar 5 briefings desta sesión (de
`/mnt/user-data/outputs/`) a `docs/briefings/` (5 NOVOS)**:

Procedencia: produccióis do Director nesta sesión (Claude.ai
session).

```
BRIEFING-8_5_b.md
BRIEFING-8_7_a.md
BRIEFING-8_7_b.md
BRIEFING-doc-8.md
BRIEFING-hardening-1.md
```

**Grupo C — Auto-trackear este propio briefing (1 NOVO)**:

```
BRIEFING-hardening-2.md
```

Procedencia: este mesmo documento (Agarfal pega o contido nun
ficheiro local; despois copia a docs/briefings/).

**Grupo D — Actualizar MASTER.md (modificacións cirúrxicas)**:
1. **Actualizar entrada DT-25**: cambiar status a "RESOLTA en
   hardening-2".
2. **Engadir convención nova**: nova entrada en §A.5 (ou despois)
   establecendo "tracking de briefings na propia sub-fase".

**Grupo E — Housekeeping**:
1. **NOVO** `.changeset/hardening-2-briefings-tracking.md`.
2. **MODIFICADO** `CHANGELOG.md` (nova `## [Unreleased]`).

**Total: 47 ficheiros tocados** (44 NOVOS .md + 1 NOVO .changeset +
2 MODIFICADOS: MASTER + CHANGELOG).

**Cero modificación de**:
- Calquera ficheiro .ts (~2195 tests inchanged).
- Configs (tsconfig, tsup, vitest).
- Tests existentes.
- Outros paquetes.
- `pnpm-lock.yaml`.
- READMEs.
- Os 40 briefings existentes en docs/briefings/ (Fases 0-3;
  intactos).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `7e408d8`, verificada
empíricamente)**.

### Estado actual docs/briefings/ (verificado)

**40 briefings actuais** (Fases 0-3). Listado en
`docs/briefings/` ordenado:

```
BRIEFING-1.11.md, BRIEFING-1.12.md, BRIEFING-1.13.md,
BRIEFING-1.14.md, BRIEFING-2.1.b.md, BRIEFING-2.1.md,
BRIEFING-2.2.b.md, BRIEFING-2.2.md, BRIEFING-2.3.b.md,
BRIEFING-2.3.md, BRIEFING-2.4.b.md, BRIEFING-2.4.c.md,
BRIEFING-2.4.d.md, BRIEFING-2.4.e.md, BRIEFING-2.4.md,
BRIEFING-2.5.md, BRIEFING-2.6.fix.md, BRIEFING-2.6.fix2.md,
BRIEFING-2.6.md, BRIEFING-3.0.md, BRIEFING-3.1.md,
BRIEFING-3.2.a.md, BRIEFING-3.2.b.md, BRIEFING-3.3.md,
BRIEFING-3.4.md, BRIEFING-3.5.md, BRIEFING-3.6.a.md,
BRIEFING-3.6.b.md, BRIEFING_0.2_TYPESCRIPT_BIOME_DX.md,
BRIEFING_0.3_VITEST_CI.md, BRIEFING_0.4_FOUNDATIONAL_PACKAGES.md,
BRIEFING_0.5_CATALOG_CHANGESETS_PACKAGES.md,
BRIEFING_1.2_CORE_TYPES_WAVE_1.md,
BRIEFING_1.3_CORE_TYPES_WAVE_2.md,
BRIEFING_1.4_CORE_TYPES_WAVE_3.md,
BRIEFING_1.5_ENGINE_PRIMITIVES.md, BRIEFING_1.6_STATESTORE.md,
BRIEFING_1.7_CHANGETRACKER.md, BRIEFING_1.8_UNLOCKRESOLVER.md,
BRIEFING_1.9_DEPENDENCYGRAPH_CYCLEDETECTOR.md
```

### Comparación zip vs docs/briefings/ (verificada empíricamente)

```
40 idénticos (xa en docs/briefings/; cero require acción)
0 diferentes (cero conflictos)
38 NOVOS (a engadir desde zip)
```

### Naming mixto convencional (verificado)

**Antes de 6_2**: usan **dot** (`BRIEFING-X.Y.md`).
- Ex: `BRIEFING-6.1.md`.

**Desde 6_2 en adiante**: usan **underscore** (`BRIEFING-X_Y.md`).
- Ex: `BRIEFING-6_2.md`, `BRIEFING-7_1.md`, `BRIEFING-8_4_c.md`.

**Decisión do director**: **preservar naming mixto**. Cero renomeo
retrocompatible. Razón: preserva git history e refrexa a evolución
do proxecto. **Cero estandarizar**.

### Procedencia dos 5 briefings desta sesión

Producidos polo Director actual nesta sesión Claude.ai. Atópanse
en `/mnt/user-data/outputs/`:
- BRIEFING-8_5_b.md (~XXX liñas; DebugPlugin).
- BRIEFING-8_7_a.md (~1604 liñas; ValidatorEngine + 6 regras).
- BRIEFING-8_7_b.md (~1389 liñas; 3 regras complexas + IoC).
- BRIEFING-doc-8.md (~887 liñas; peche MASTER post-Fase 8).
- BRIEFING-hardening-1.md (~968 liñas; StorageAdapter move).

**Agarfal descárgaos** via Claude.ai chat actual (a sesión actual)
ANTES de executar hardening-2.

### Convención nova para o futuro

**A partires de hardening-2**, todos os briefings producidos polo
Director **trackearánse automaticamente** en `docs/briefings/`
como parte da súa propia sub-fase. **Iso evita** que DT-25 reaparezca.

**Documentado** no MASTER §A.5 (ou sección equivalente).

### DT-25 alíñase con esta solución

Texto orixinal de DT-25:
> *"Briefings de Fases 4, 5 e 6 (ata 6.3) non están trackeados nun
> commit `docs:` consolidado (paralelo a `1fe9374` que rexistrou
> os de Fase 3). Anotado como pendente nos peches A.9.c e A.9.d.
> **Plan**: commit único `docs: briefings phases 4+5+6` ao peche
> definitivo de Fase 6 (tras 6.5). Cero impacto funcional, só
> housekeeping."*

**hardening-2 amplía o scope**: cero só Fases 4-6 (xa trackeadas
en zip), tamén Fases 7 + 8.1-8.8 + hardening-1 + esta propia
hardening-2.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `7e408d8` (hardening-1; StorageAdapter
  → @common).
- **2195 tests monorepo limpos**.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 76 ErrorCodes.
- **53 sub-fases consecutivas sen rollback** (récord; +1 tras
  hardening-1).
- 7 paquetes activos.
- 40 briefings en docs/briefings/ (Fases 0-3).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Resolver DT-25 mediante copia masiva de **44 briefings históricos**
a `docs/briefings/` (**38 desde o zip de Agarfal** = Fases 4-8.4.c
+ HIGIENE-7 + 8.5.a + 8.6.a/b + 8.8; **5 desde
`/mnt/user-data/outputs/`** = 8.5.b + 8.7.a + 8.7.b + doc-8 +
hardening-1; **1 deste mesmo briefing** = hardening-2); actualizar
**entrada DT-25 no MASTER** marcándoa como RESOLTA en hardening-2;
**engadir nova convención** en §A.5 do MASTER establecendo que
tódolos briefings futuros trackearánse automaticamente en
`docs/briefings/` como parte da súa propia sub-fase (evita
reaparecer DT-25). **Pure documentación**: cero código modificado,
cero tests modificados, cero impacto en typecheck/build. **2195
tests inchanged**. **47 ficheiros tocados** (44 NOVOS + 1 NOVO
.changeset + 2 MODIFICADOS: MASTER.md + CHANGELOG.md). **Convención
preservada**: naming mixto (dot pre-6_2; underscore desde 6_2).
**Risco MOI BAIXO**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS — 44 briefings + 1 changeset = 45**:

Categoría 1 — Briefings históricos do zip de Agarfal (38):
```
docs/briefings/BRIEFING-4.1.md
docs/briefings/BRIEFING-4.2.md
docs/briefings/BRIEFING-4.3.md
docs/briefings/BRIEFING-4.4.md
docs/briefings/BRIEFING-4.5.md
docs/briefings/BRIEFING-4.6.md
docs/briefings/BRIEFING-5.1.md
docs/briefings/BRIEFING-5.2.md
docs/briefings/BRIEFING-5.3.md
docs/briefings/BRIEFING-6.1.md
docs/briefings/BRIEFING-6_2.md
docs/briefings/BRIEFING-6_3.md
docs/briefings/BRIEFING-6_4.md
docs/briefings/BRIEFING-6_5.md
docs/briefings/BRIEFING-7_1.md
docs/briefings/BRIEFING-7_2.md
docs/briefings/BRIEFING-7_3.md
docs/briefings/BRIEFING-7_4.md
docs/briefings/BRIEFING-7_5.md
docs/briefings/BRIEFING-7_6.md
docs/briefings/BRIEFING-7_7.md
docs/briefings/BRIEFING-7_8.md
docs/briefings/BRIEFING-7_9.md
docs/briefings/BRIEFING-7_10.md
docs/briefings/BRIEFING-7_11.md
docs/briefings/BRIEFING-HIGIENE-7.md
docs/briefings/BRIEFING-8_1.md
docs/briefings/BRIEFING-8_2.md
docs/briefings/BRIEFING-8_3.md
docs/briefings/BRIEFING-8_3_REVISED.md
docs/briefings/BRIEFING-8_4_a.md
docs/briefings/BRIEFING-8_4_b_i.md
docs/briefings/BRIEFING-8_4_b_ii.md
docs/briefings/BRIEFING-8_4_c.md
docs/briefings/BRIEFING-8_5_a.md
docs/briefings/BRIEFING-8_6_a.md
docs/briefings/BRIEFING-8_6_b.md
docs/briefings/BRIEFING-8_8.md
```

Categoría 2 — Briefings desta sesión (5):
```
docs/briefings/BRIEFING-8_5_b.md
docs/briefings/BRIEFING-8_7_a.md
docs/briefings/BRIEFING-8_7_b.md
docs/briefings/BRIEFING-doc-8.md
docs/briefings/BRIEFING-hardening-1.md
```

Categoría 3 — Auto-tracking deste briefing (1):
```
docs/briefings/BRIEFING-hardening-2.md
```

Categoría 4 — Housekeeping (1):
```
.changeset/hardening-2-briefings-tracking.md
```

**MODIFICADOS (2)**:
- `docs/architecture/MASTER.md` (DT-25 status + nova convención).
- `CHANGELOG.md` (nova `## [Unreleased]`).

**Total: 47 ficheiros tocados** (44 NOVOS + 1 changeset NOVO + 2
MODIFICADOS).

### 5.2 — Proceso de copia (FIXADO)

**Pasos previos** (Agarfal antes de pasar ao Executor):

**Paso 1**: Descomprimir zip en local.
```bash
# Onde teña o zip:
unzip briefings.zip -d /tmp/ygg-briefings-zip
```

**Paso 2**: Descargar 5 briefings desta sesión:
- BRIEFING-8_5_b.md
- BRIEFING-8_7_a.md
- BRIEFING-8_7_b.md
- BRIEFING-doc-8.md
- BRIEFING-hardening-1.md

Vía Claude.ai (sesión actual): present_files xa os mostrou; Agarfal
descárgaos a `/tmp/ygg-briefings-session/` (ou onde queira).

**Paso 3**: Gardar este mesmo briefing (hardening-2) como ficheiro.

**Paso 4 (Executor)**: copia masiva á working tree:
```bash
cd /c/Users/tajes/proxectos/yggdrasil-forge

# Copiar 38 briefings do zip (cero sobreescribir os existentes; pero
# como xa verificamos que cero solapan, podemos copiar todos):
cp /tmp/ygg-briefings-zip/BRIEFING-4.*.md docs/briefings/
cp /tmp/ygg-briefings-zip/BRIEFING-5.*.md docs/briefings/
cp /tmp/ygg-briefings-zip/BRIEFING-6.1.md docs/briefings/
cp /tmp/ygg-briefings-zip/BRIEFING-6_*.md docs/briefings/
cp /tmp/ygg-briefings-zip/BRIEFING-7_*.md docs/briefings/
cp /tmp/ygg-briefings-zip/BRIEFING-HIGIENE-7.md docs/briefings/
cp /tmp/ygg-briefings-zip/BRIEFING-8_*.md docs/briefings/

# Copiar 5 desta sesión:
cp /tmp/ygg-briefings-session/BRIEFING-8_5_b.md docs/briefings/
cp /tmp/ygg-briefings-session/BRIEFING-8_7_a.md docs/briefings/
cp /tmp/ygg-briefings-session/BRIEFING-8_7_b.md docs/briefings/
cp /tmp/ygg-briefings-session/BRIEFING-doc-8.md docs/briefings/
cp /tmp/ygg-briefings-session/BRIEFING-hardening-1.md docs/briefings/

# Copiar este propio briefing (hardening-2):
cp /tmp/ygg-briefings-session/BRIEFING-hardening-2.md docs/briefings/
```

**Verificación pre-commit**:
```bash
ls docs/briefings/ | wc -l
# Esperado: 84 (40 existentes + 44 novos)

ls docs/briefings/BRIEFING-{4,5,6,7,8}*.md docs/briefings/BRIEFING-HIGIENE-7.md \
   docs/briefings/BRIEFING-doc-8.md docs/briefings/BRIEFING-hardening-1.md \
   docs/briefings/BRIEFING-hardening-2.md | wc -l
# Esperado: 44
```

### 5.3 — Modificación MASTER.md (FIXADO)

**Modificación 1**: actualizar entrada DT-25.

**Antes** (entrada actual):
```
| DT-25 | Briefings de Fases 4, 5 e 6 (ata 6.3) non están trackeados
nun commit `docs:` consolidado (paralelo a `1fe9374` que rexistrou
os de Fase 3). Anotado como pendente nos peches A.9.c e A.9.d.
**Plan**: commit único `docs: briefings phases 4+5+6` ao peche
definitivo de Fase 6 (tras 6.5). Cero impacto funcional, só
housekeeping. | Aberta non bloqueante, cosmética |
```

**Despois** (substituír):
```
| DT-25 | Briefings de Fases 4, 5 e 6 (ata 6.3) non están trackeados
nun commit `docs:` consolidado. **PECHADA en hardening-2 (<hash>)**:
o autor recuperou os 38 briefings de Fases 4-8 en local + Director
aportou 5 desta sesión + este propio briefing hardening-2. 84
briefings totais trackeados en `docs/briefings/`. **Convención
nova establecida** en §A.5 para evitar reaparecer: todo briefing
futuro tráckase na súa propia sub-fase. | **PECHADA en hardening-2** |
```

**Modificación 2**: engadir nova convención en §A.5 (ou despois;
buscar localización exacta).

**Localizar** sección §A.5 (Evolución do executor). **Engadir
despois** unha nova subsección:

```markdown
### A.5.2 — Convención de tracking de briefings (desde hardening-2)

Tras hardening-2 (DT-25 PECHADA), establécese a seguinte convención
permanente:

**Todo briefing producido polo Director debe copiarse a
`docs/briefings/` como parte da súa propia sub-fase**, antes do
commit. Naming permitido:
- **Dot** (`BRIEFING-X.Y.md`): pre-6_2 (histórico).
- **Underscore** (`BRIEFING-X_Y.md`): desde 6_2 en adiante
  (convención actual).

Cero renomeo retrocompatible (preserva git history e refrexa
evolución do proxecto).

Esta convención evita que DT-25 reaparezca en sub-fases futuras.
Briefings producidos pero non trackeados desde hardening-2 en
adiante considéranse erro de proceso.
```

### 5.4 — Verificación pure documentación

**Garantía dura**:
- **0 ficheiros .ts modificados** (cero código).
- **0 tests novos**.
- **0 tests modificados**.
- **0 ErrorCodes**.
- **0 modificacións de configs**.
- **0 modificacións de outros paquetes**.
- **2195 tests** pasan inchanged.
- **Typecheck 23/23** inchanged.
- **Build** inchanged.
- **Cobertura** inchanged.

### 5.5 — Naming mixto preservado

Tódolos 44 ficheiros novos manteñen o seu nome orixinal **exactamente**:
- `BRIEFING-4.1.md` (dot — pre-6_2).
- `BRIEFING-6_2.md` (underscore — desde 6_2).
- `BRIEFING-HIGIENE-7.md` (formato especial; preservar).
- `BRIEFING-8_3_REVISED.md` (REVISED; preservar).
- `BRIEFING-hardening-1.md`, `BRIEFING-hardening-2.md` (formato
  hardening; preservar).
- `BRIEFING-doc-8.md` (formato doc; preservar).

**Cero renomeo**. **Cero estandarización**.

### 5.6 — Cero solapamento con existentes

Verificado empíricamente: **0 ficheiros do zip solapan** cos 40
existentes en docs/briefings/. **Cero risco de sobreescribir**.

### 5.7 — Lección 8.6.a L1 aplicada

T0.2 verifica empíricamente:
- 40 briefings actuais en docs/briefings/ confirmados.
- 44 ficheiros a engadir confirmados (lista explícita en §5.1).
- Cero solapamento (verificado polo director con `diff`).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Cantidade |
|---|---|---|
| Copiar 38 briefings do zip a docs/briefings/ | Copia | 38 |
| Copiar 5 briefings da sesión a docs/briefings/ | Copia | 5 |
| Copiar BRIEFING-hardening-2.md (este) a docs/briefings/ | Copia | 1 |
| MASTER DT-25 → PECHADA | Modificación cirúrxica | 1 entrada |
| MASTER §A.5.2 (convención nova) | Nova sección | ~20 liñas |
| .changeset/hardening-2-briefings-tracking.md | NOVO | ~6 liñas |
| CHANGELOG.md nova [Unreleased] | MODIFICADO | ~30 liñas |

**Total estimado**: ~80.000 liñas (suma de tódolos briefings copiados;
non se contan como "código novo" porque son artefactos pre-existentes).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (45)**:
- 44 ficheiros `.md` en `docs/briefings/` (38 zip + 5 sesión + 1
  este briefing).
- 1 ficheiro `.changeset/hardening-2-briefings-tracking.md`.

**MODIFICADOS (2)**:
- `docs/architecture/MASTER.md`.
- `CHANGELOG.md`.

**Total: 47 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera ficheiro .ts.
- Configs (tsconfig, tsup, vitest, package.json).
- Tests existentes.
- READMEs.
- `pnpm-lock.yaml`.
- Os 40 briefings xa en docs/briefings/ (Fases 0-3).
- Outros paquetes.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

**Markdown**: tódolos briefings copiados manteñense **byte-by-byte
idénticos** ás versións orixinais. Cero modificación de contido.

**Naming**: preservar formato orixinal (dot, underscore, especiais).

**MASTER**: modificacións cirúrxicas; cero reescritura masiva.

---

## 9. QUE NON FACER

- ❌ Renomear briefings históricos (preservar naming mixto).
- ❌ Modificar contido dos briefings copiados.
- ❌ Reescribir briefings antigos a formato máis recente.
- ❌ Crear briefings desde cero (todos xa existen).
- ❌ Modificar **calquera ficheiro .ts**.
- ❌ Modificar configs (tsconfig, tsup, vitest, package.json).
- ❌ Modificar tests (existentes ou crear novos).
- ❌ Modificar os 40 briefings xa en docs/briefings/ (Fases 0-3).
- ❌ Borrar briefings.
- ❌ Mover briefings a outras carpetas.
- ❌ Sobreescribir ficheiros existentes (cero solapamento verificado).
- ❌ Engadir documentación adicional (READMEs, etc.) nesta sub-fase.
- ❌ Modificar outros paquetes.
- ❌ Engadir deps de npm.
- ❌ Engadir ErrorCodes.
- ❌ Engadir lóxica calquera.
- ❌ Crear test files.
- ❌ Modificar `pnpm-lock.yaml`.
- ❌ Engadir branchin scripts en root.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T6)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `7e408d8` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar 40 briefings existentes:
ls docs/briefings/ | wc -l
# Esperado: 40

# Confirmar que Agarfal copiou os 44 ficheiros novos:
ls docs/briefings/BRIEFING-4.*.md 2>/dev/null | wc -l
# Esperado: 6 (4.1 a 4.6)

ls docs/briefings/BRIEFING-5.*.md 2>/dev/null | wc -l
# Esperado: 3 (5.1 a 5.3)

ls docs/briefings/BRIEFING-6*.md 2>/dev/null | wc -l
# Esperado: 5 (6.1 + 6_2 a 6_5)

ls docs/briefings/BRIEFING-7_*.md 2>/dev/null | wc -l
# Esperado: 11 (7_1 a 7_11)

ls docs/briefings/BRIEFING-HIGIENE-7.md 2>/dev/null
# Esperado: existe

ls docs/briefings/BRIEFING-8_*.md 2>/dev/null | wc -l
# Esperado: 13 (8_1, 8_2, 8_3, 8_3_REVISED, 8_4_a, 8_4_b_i, 8_4_b_ii,
# 8_4_c, 8_5_a, 8_5_b, 8_6_a, 8_6_b, 8_7_a, 8_7_b, 8_8)
# (Total real esperado: 15, contando 8_5_b, 8_7_a, 8_7_b. Verificar.)

ls docs/briefings/BRIEFING-doc-8.md 2>/dev/null
ls docs/briefings/BRIEFING-hardening-1.md 2>/dev/null
ls docs/briefings/BRIEFING-hardening-2.md 2>/dev/null
# Esperado: todos existen

# Total final esperado:
ls docs/briefings/ | wc -l
# Esperado: 84 (40 previos + 44 novos)
```

**Se algún ficheiro falta** → **ESCALAR** (Agarfal cero copiou
correctamente).

### T1 — Verificar cero modificación de ficheiros existentes

```bash
# Os 40 briefings das Fases 0-3 deben estar INCHANGED:
git status docs/briefings/BRIEFING-1*.md docs/briefings/BRIEFING-2*.md \
  docs/briefings/BRIEFING-3*.md docs/briefings/BRIEFING_*.md
# Esperado: tódolos "untracked" ou "unchanged" pero NUNCA modified.

# Os ficheiros novos aparecen como "untracked":
git status docs/briefings/ | head -20
# Esperado: lista de 44 ficheiros "untracked" (con prefix ??).
```

### T2 — Modificar MASTER.md

Aplicar §5.3 literal:
- Modificación 1: substituír entrada DT-25.
- Modificación 2: engadir §A.5.2 nova subsección.

### T3 — Crear .changeset/hardening-2-briefings-tracking.md

```
---
'@yggdrasil-forge/core': patch
---

docs(briefings): track 44 historical briefings in docs/briefings/ (DT-25 RESOLTA; hardening-2)
```

### T4 — git add masivo + verificación pre-commit

```bash
# Engadir tódolos ficheiros novos + modificacións:
git add docs/briefings/
git add docs/architecture/MASTER.md
git add .changeset/hardening-2-briefings-tracking.md
git add CHANGELOG.md

# Verificar staged:
git status
# Esperado:
#   modified:   docs/architecture/MASTER.md
#   modified:   CHANGELOG.md
#   new file:   .changeset/hardening-2-briefings-tracking.md
#   new file:   docs/briefings/BRIEFING-4.1.md
#   new file:   docs/briefings/BRIEFING-4.2.md
#   ... (44 ficheiros docs/briefings/...)
```

### T5 — Verificación baseline (cero impacto en código)

```bash
# Typecheck inchanged:
pnpm turbo run typecheck --force                          # 23/23

# Tests inchanged:
pnpm turbo run test --force
# Esperado: tódolos paquetes pasan iguais (2195 totais).
```

**Se algún teste falla → ESCALAR**. Cero esperado porque cero código
foi modificado.

### T6 — CHANGELOG + commit + push

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Documentation
- **DT-25 RESOLTA**: 44 briefings históricos engadidos a
  `docs/briefings/`:
  - **38 briefings das Fases 4-8** (recuperados polo autor en
    local): BRIEFING-4.1 a 4.6, BRIEFING-5.1 a 5.3, BRIEFING-6.1
    + 6_2 a 6_5, BRIEFING-7_1 a 7_11, BRIEFING-HIGIENE-7,
    BRIEFING-8_1, 8_2, 8_3, 8_3_REVISED, 8_4_a, 8_4_b_i,
    8_4_b_ii, 8_4_c, 8_5_a, 8_6_a, 8_6_b, 8_8.
  - **5 briefings desta sesión** (8.4.c → hardening-1):
    BRIEFING-8_5_b, BRIEFING-8_7_a, BRIEFING-8_7_b,
    BRIEFING-doc-8, BRIEFING-hardening-1.
  - **1 este propio briefing**: BRIEFING-hardening-2.
- **84 briefings totais trackeados** en `docs/briefings/` (de ~84
  producidos historicamente; cero perdidos).
- **Convención nova** establecida en MASTER §A.5.2: tódolos
  briefings futuros trackearánse automaticamente en
  `docs/briefings/` como parte da súa propia sub-fase. Evita
  reaparecer DT-25.
- DT-25 status actualizado a **PECHADA** no MASTER.

### Note
- Sub-fase **hardening-2**. SEGUNDA do ciclo de hardening pre-release
  0.1.0-alpha.
- **Pure documentación**: cero código modificado, cero tests
  modificados, cero impacto en typecheck/build/cobertura.
- **2195 tests pasan inchanged**.
- **Naming mixto preservado**: pre-6_2 dot (`BRIEFING-X.Y.md`),
  desde 6_2 underscore (`BRIEFING-X_Y.md`). Cero renomeo
  retrocompatible (preserva git history).
- **Cero solapamento** con os 40 briefings existentes (Fases 0-3):
  verificado empíricamente polo director con `diff`.
- **Recuperación histórica**: tódolos briefings producidos polo
  proxecto (de 0.2 ata hardening-2) están agora trackeados.
- 54 sub-fases consecutivas sen rollback tras hardening-2.
- **Próximas sub-fases hardening pre-release**:
  - hardening-3 (READMEs paquetes scaffold).
  - hardening-4 (opcional; DT-15, DT-24 cosmética).
- **DT abertas restantes tras hardening-2**: 13 (de 14; DT-25
  RESOLTA).
```

Commit Conventional:
`docs(briefings): track 44 historical briefings in docs/briefings/ (DT-25 RESOLTA; hardening-2)`

Push directo a `origin/main` (base `7e408d8`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE hardening-2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 7e408d8)
✅ DT-25 RESOLTA: 44 briefings históricos engadidos
✅ Pure documentación (cero código modificado):
   - 38 briefings das Fases 4-8 (zip Agarfal)
   - 5 briefings desta sesión (8.5.b, 8.7.a, 8.7.b, doc-8, hardening-1)
   - 1 este propio briefing (hardening-2)
   - Total: 84 briefings en docs/briefings/ (de 40 previos)
✅ MASTER.md atualizado:
   - DT-25 status: PECHADA en hardening-2
   - §A.5.2 nova: convención tracking permanente
✅ Naming mixto preservado (dot pre-6_2; underscore desde 6_2)
✅ Cero solapamento con briefings existentes (0 conflits)
✅ T0.2 verificación empírica:
   - 40 briefings previos confirmados intactos
   - 44 ficheiros novos confirmados
   - Cero modificacións funcionais
✅ T5 verificación dura:
   - Typecheck: 23/23 successful
   - Tests: 2195 INCHANGED
   - Cobertura: inchanged
   - Builds: inchanged
✅ CERO ficheiros .ts modificados
✅ CERO tests modificados
✅ CERO ErrorCodes
✅ CERO modificacións de configs ou outros paquetes
✅ CERO deps de npm
✅ GREP ANTI-PLACEHOLDER: cero coincidencias en novo MASTER content
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - SEGUNDA sub-fase do ciclo hardening pre-release 0.1.0-alpha.
   - 54 sub-fases consecutivas sen rollback.
   - DT-25 PECHADA: histórico completo recuperado (84 briefings
     trackeados; cero perdas).
   - Convención permanente establecida (§A.5.2): briefings
     futuros tráckanse na súa propia sub-fase.
   - DTs abertas restantes: 13 (de 14).
   - Próximas sub-fases: hardening-3 (READMEs scaffold).
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit: 47 ficheiros (45 NOVOS + 2 MODIFICADOS)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE hardening-3 (READMEs paquetes scaffold).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing hardening-2. **SEGUNDA do ciclo de hardening
pre-release 0.1.0-alpha**. Resolve DT-25 mediante copia masiva de
44 briefings históricos a `docs/briefings/`. **Pure documentación**:
cero código, cero tests, cero impacto en typecheck/build. 47
ficheiros tocados (45 NOVOS + 2 MODIFICADOS). 2195 tests inchanged.
Risco MOI BAIXO.*

*🎉 **HISTÓRICO COMPLETO RECUPERADO**: dos ~84 briefings producidos
historicamente, **84 trackeados** en docs/briefings/ tras esta
sub-fase. Cero perdas (Agarfal recuperou 8.4.b.ii que pensábamos
perdido). Convención nova evita reaparición de DT-25.*

*Decisións críticas documentadas:
- Cero crear ficheiros desde cero (todos existen en local).
- Naming mixto preservado (dot/underscore segundo época).
- DT-25 PECHADA via copy + documentación de convención permanente.
- Tracking automático en cada sub-fase futura (§A.5.2 do MASTER).
- Cero solapamento (verificado empíricamente).
- Pure documentación (cero impacto código).*
