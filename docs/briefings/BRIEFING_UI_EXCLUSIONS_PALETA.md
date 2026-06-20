# BRIEFING — UI: iconas de exclusión + paleta de estados por defecto

> **4º Arquitecto (Director) → Executor.**
> Dous arranxos de UI no demo: (1) **as exclusións no Inspector** marcábanse
> sempre con **✗** (lese como "teste fracasado" cando é unha **relación** de
> incompatibilidade) → trato distinto: símbolo de conflito + estado activo vs
> só-declarado, e **bidireccional** vía `getEffectiveExclusions` (xa no motor);
> (2) **paleta de estados por defecto** distinguible (gris/cián/ámbar/verde/
> morado + vermello incompatible). **Só demo** (cero `@core`/`@react`). **Human
> visual check.** Sen changeset.

---

## 1. Estado á entrada (verificado polo Director, HEAD `8523a05`)

- `engine.getEffectiveExclusions(nodeId): readonly string[]` **xa existe** (fix
  bidireccional) → exclusións propias ∪ inversas.
- `ConditionInspector` (demo) compón as exclusións dende `node.exclusions` e
  márcaas con **✗** sempre.
- Hai tokens de cor por estado (anel: `nodeLocked/Unlockable/Unlocked/Maxed/
  InProgress`) e fill por estado (`nodeFill*`, Sub-fase 1). O tema do demo
  (presetDarkClean / Paladín) define os actuais.

## 2. Modelo (NON discutible)

### 2.1 Exclusións no Inspector (claridade)
- Usar `engine.getEffectiveExclusions(selectedNodeId)` (non `node.exclusions`)
  → mostra conflitos **en ambas direccións**.
- Por cada nodo en conflito, distinguir:
  - **Conflito ACTIVO** (o outro nodo está `unlocked|maxed`): símbolo ⛔ +
    cor de incompatible (`#ef4444`) + texto «Incompatible con <label> (desbloqueado)».
  - **Só declarado** (o outro non está activo): símbolo ⚔️ + cor neutra +
    «Incompatible con <label>».
- **NON usar ✗** para exclusións (resérvase ✗ para condicións de prerequisito).

### 2.2 Paleta de estados por defecto (distinguible)
```
nodeLocked      #5b6b86   (gris azulado)
nodeUnlockable  #22d3ee   (cián)
nodeInProgress  #f59e0b   (ámbar)
nodeUnlocked    #4ade80   (verde)
nodeMaxed       #a855f7   (morado)
incompatible    #ef4444   (vermello)
```
- `nodeFillLocked` a un **escuro apagado**. Os demais fills discretos.

## 3. Engadido por Agarfal (opción B aprobada)

Dous fixes adicionais sinalados na captura previa pero non incluídos no
briefing orixinal:
- Veredicto cando o nodo **xa está unlocked**: caixa neutra «✓ Xa desbloqueado»
  en vez de caixa vermella "Non se pode".
- Reasons do motor con `"<resourceId>"` cru: resolver ao label localizado
  ("level" → "Nivel") no demo, sen tocar motor.

---

*Briefing UI · Exclusións + paleta. 4º Arquitecto. A incompatibilidade non é un erro, é unha elección. 🌳*
