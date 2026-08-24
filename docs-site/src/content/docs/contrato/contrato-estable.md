---
title: O contrato estable
description: Que promete o 1.x e que non — o formato como produto, os niveis de estabilidade por capa, e a política de versións.
sidebar:
  order: 3
---

**O produto é o formato.** As apps, os renderers e os editores cambian; o dato que describes hoxe ten que seguir cargando dentro de anos. Por iso o compromiso de estabilidade do 1.x defínese por capas, da máis dura á máis branda:

## 1. O contrato do dato — estable 1.x (a promesa dura)

| Peza | Promesa |
|---|---|
| **JSON Schema publicado** (`schema/yggdrasil-document.schema.json`) | Un documento válido en 1.0 segue sendo válido en calquera 1.x. Campos novos só de forma **aditiva e opcional**. |
| **Semántica de desbloqueo** (`UnlockRule`, condicións, exclusións, rangos, recursos, efectos) | O mesmo documento produce as mesmas decisións de desbloqueo en calquera 1.x. |
| **Serialización** (`{ tree, editor }`, `serializeDocument`/`deserializeDocument`) | Round-trip garantido; o que se garda en 1.0 ábrese en calquera 1.x. |

**Cambios rompedores só cunha major** (2.0) — e a política de soporte cobre a major actual e a previa (MASTER §61). O gate de deriva do schema (test que compara o publicado cos tipos reais) é o mecanismo, non a promesa: se diverxen, a CI falla.

## 2. A API do motor — estable

`TreeEngine`, os tipos do dominio (`TreeDef`, `NodeDef`, `EdgeDef`, `Effect`…), os motores de layout e o rexistro (`LayoutEngineRegistry`) en `@yggdrasil-forge/core`, e a API do CLI `ygg`: **semver estrito**. Minor = só API nova; patch = só arranxos. As APIs levan marcas de nivel (`@stable`, `@experimental`, `@deprecated`, `@internal` — MASTER §60): o que non estea marcado `@experimental` está coberto pola promesa.

## 3. O renderer — estable, con marxe visual

`@yggdrasil-forge/react` (SkillTree, temas, iconas, viewport): a **API** segue semver estrito; o **pixel exacto** non é contrato — melloras visuais que non cambian a API poden entrar en minor (un tema pode afinar un ton; a túa configuración segue valendo).

## 4. A capa de aplicación — evoluciona máis rápido

`@yggdrasil-forge/editor-core` e `@yggdrasil-forge/editor-react` son a capa de **aplicación** (o editor): versiónanse co grupo pero aínda son privados, e a súa superficie pode moverse máis rápido mentres o Studio medra. Se constrúes sobre eles, ancora versións. O que o editor **produce** — o documento — está coberto pola promesa dura da sección 1: nada do que o editor evolucione pode romper os teus ficheiros.

## En que confiar, en resumo

- **Confía no ficheiro**: é o contrato. Xérao con IA, gárdao anos, cárgao onde queiras.
- **Confía en `core` e no CLI**: semver estrito.
- **Confía na API de `react`**, non no píxel.
- **Ancora `editor-*`** se constrúes sobre eles.

O detalle do formato está en [conceptos](../conceptos/) e [o ficheiro e o schema](../ficheiro-e-schema/).
