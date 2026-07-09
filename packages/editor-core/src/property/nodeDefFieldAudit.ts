// ── INICIO: nodeDefFieldAudit ──
// **Gate arquitectural** — garantía de que cada campo de `NodeDef`
// está clasificado nun de **tres estados**. Se `NodeDef` engade un
// campo sen aparecer en ningunha das tuplas, o typecheck falla.
//
// **★ Paralelismo explícito co manifesto de effects**:
//   USED_NODEDEF_FIELDS         ↔  SUPPORTED_EFFECT_TYPES
//   UNIMPLEMENTED_NODEDEF_FIELDS ↔  UNSUPPORTED_EFFECT_TYPES
//   DEPRECATED_NODEDEF_FIELDS   ↔  (non ten equivalente aínda; efectos non
//                                    deprecaron ningún)
//
// **Mesma filosofía**: o schema non oculta fantasmas — decláraos.
//   - `USED`: campo lido nalgures (runtime, engine, layout, renderer, search).
//   - `UNIMPLEMENTED`: feature declarada no schema pero **motor ignórao**.
//     Non expoñer no editor ata implementalo (o análogo de `modify_stat`).
//   - `DEPRECATED`: legado a retirar nun major futuro. Detéctase polo
//     JSDoc `@deprecated`; aquí listámolos explicitamente polo type-test.
//
// **Historial**:
//   - 7.5c-T (introdución do gate): 2 estados (USED + DEPRECATED). `tier`
//     movido a DEPRECATED. `tiers` en USED cunha NOTA provisional porque
//     o Executor non atopara usos pero o Arquitecto pediu non tocalo.
//   - 7.5c-T2 (este ficheiro): 3 estados. `tiers` reclasificado como
//     UNIMPLEMENTED (F9.1 declarada, non implementada). A nota
//     provisional retirada.
//
// **Como estender**:
//   - Campo NOVO xa usado polo runtime/renderer/search → `USED_NODEDEF_FIELDS`.
//   - Campo NOVO como placeholder de feature futura → `UNIMPLEMENTED_NODEDEF_FIELDS`
//     + JSDoc `@remarks` no schema explicando por que non se implementou.
//   - Campo existente que xa non se usa → `DEPRECATED_NODEDEF_FIELDS`
//     + JSDoc `@deprecated` no schema (retirar do runtime é breaking →
//     espera a un major).

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
  'iconScale',
  'shape',
  'size',
  'position',
  'group',
  'subtreeId',
  'subtreeOverrides',
  'maxTier',
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

// ── UNIMPLEMENTED: feature declarada, motor ignórao ──
//
// **Non se expón no editor** — sería confundir ao autor con algo que
// non ten efecto. Cando se implemente no runtime, movese aquí a
// `USED` + reintróducese o descriptor no `nodePropertyRegistry`.
export const UNIMPLEMENTED_NODEDEF_FIELDS = [
  // `tiers` (F9.1): `NodeTierInfo[]` con etiquetas/descricións por
  // rango. Grep exhaustivo en @core/engine, @core/runtime, @react,
  // @search: cero lecturas efectivas (só self-references en comentarios
  // do propio node.ts). Retirado do Inspector en 7.5c-T2. Cando se
  // implemente F9.1, moverase aquí a USED.
  'tiers',
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

// ── Type-test de cobertura completa (tres estados) ──
// Se `NodeDef` engade/quita un campo sen actualizar as tuplas, o
// typecheck falla. Iso obriga a decidir *conscientemente* a que
// grupo pertence: USED, UNIMPLEMENTED, ou DEPRECATED.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false

const _fieldsCoverNodeDef: Equals<
  keyof NodeDef,
  | (typeof USED_NODEDEF_FIELDS)[number]
  | (typeof UNIMPLEMENTED_NODEDEF_FIELDS)[number]
  | (typeof DEPRECATED_NODEDEF_FIELDS)[number]
> = true
void _fieldsCoverNodeDef
// ── FIN: nodeDefFieldAudit ──
