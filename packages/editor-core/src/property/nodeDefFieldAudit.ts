// ── INICIO: nodeDefFieldAudit ──
// **Gate arquitectural (Briefing 7.5c-T §3)** — garantía de que
// cada campo de `NodeDef` está clasificado como *usado* ou
// *deprecado*. Se `NodeDef` engade un campo sen aparecer en ningunha
// das dúas tuplas, o typecheck falla. Cero ambigüidade sobre
// "esquecín se este campo se usa ou non".
//
// **Mesmo patrón** que o gate manifesto-descriptor de effects
// (`SUPPORTED_EFFECT_TYPES` / `UNSUPPORTED_EFFECT_TYPES`). Cada un
// destes gates é un dique arquitectural que **obriga a intencionalidade**
// no dominio.
//
// **Detonante histórico** (7.5c-T): `NodeDef.tier` estivo declarado no
// schema durante meses sen ningún uso no runtime. Só se destapou
// cando o Inspector empezou a exponer cada campo como widget editable
// e Agarfal preguntou "nivel 35 con maxTier 3?".
//
// **Como estender**:
//   - Se engades un campo NOVO a `NodeDef` que xa se usa nalgures:
//     amádeo a `USED_NODEDEF_FIELDS`.
//   - Se engades un campo NOVO como placeholder futuro:
//     amádeo a `DEPRECATED_NODEDEF_FIELDS` con JSDoc `@deprecated`
//     no schema (marcando "sen efecto no runtime").
//   - Se atopas un campo existente que xa non se usa:
//     movalo a `DEPRECATED_NODEDEF_FIELDS` (retirar do runtime é
//     breaking → agarda a un major).

import type { NodeDef } from '@yggdrasil-forge/core'

// ── USED: campos cuxo uso está verificado ──
//
// Cada un está lido nalgún módulo de `@core` (runtime, engine, layout)
// ou en `@react` (renderer, inspector do skill tree) ou en `@search`.
// Non necesariamente en TODOS os módulos; basta con un uso REAL,
// non tests.
export const USED_NODEDEF_FIELDS = [
  'id',
  'type',
  'label',
  'description',
  'content',
  'color',
  'icon',
  'shape',
  'size',
  'position',
  'group',
  'subtreeId',
  'subtreeOverrides',
  'maxTier',
  // NOTA (7.5c-T): `tiers` está aquí por indicación explícita do
  // Arquitecto ("`tiers` fican, relacionan con `maxTier`, o sistema
  // real de rangos"), pero o Executor NON atopou usos en runtime nin
  // en @react. Podería ser candidato futuro a auditoría específica.
  'tiers',
  'cost',
  'costPerTier',
  'effects',
  'prerequisites',
  'exclusions',
  'tags',
  'searchKeywords',
  'metadata',
  'progressSource',
  'progressMilestones',
  'supportsProgress',
  'statContributions',
  'timeConstraints',
] as const

// ── DEPRECATED: campos `@deprecated` no schema, sen retirar por
// razóns de compatibilidade (retiralos é breaking → maior futuro) ──
export const DEPRECATED_NODEDEF_FIELDS = [
  // `tier`: cero lecturas no runtime confirmadas por grep (7.5c-T).
  // O rango actual do usuario vive en `state.currentTier` (runtime),
  // e o límite en `maxTier`. Retirado do Inspector en 7.5c-T; queda
  // no schema para non romper datos existentes.
  'tier',
] as const

// ── Type-test de cobertura completa ──
// Se `NodeDef` engade/quita un campo sen actualizar as tuplas, o
// typecheck falla. Iso obriga a decidir *conscientemente* a que
// grupo pertence.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false

const _fieldsCoverNodeDef: Equals<
  keyof NodeDef,
  (typeof USED_NODEDEF_FIELDS)[number] | (typeof DEPRECATED_NODEDEF_FIELDS)[number]
> = true
void _fieldsCoverNodeDef
// ── FIN: nodeDefFieldAudit ──
