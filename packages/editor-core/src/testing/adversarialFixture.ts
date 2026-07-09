// ── INICIO: adversarialFixture ──
// Fixture de PROBAS: dato deseñado a propósito para forzar camiños
// pouco transitados. NON é API de produto — non a importes desde
// código de aplicación real, só desde tests (propios ou doutros
// paquetes que queiran esta cobertura).
//
// **Por que existe (briefing 7.13)**: dous bugs recentes (locale
// gl/en invisible no canvas; zoom raro por bounds inestables)
// levaban aí dende sempre, pero só saíron cando o dono usou datos
// distintos ao panadeiro (a única fixture "amable" usada ata agora,
// con coordinateBounds explícito e labels dunha soa locale — ambos
// defaults "afortunados" que agochaban os bugs). Esta fixture
// completa deliberadamente o contrario: sen coordinateBounds, labels
// bilingües en TODOS os niveis, e as ramas de datos que os composites
// e validadores adoitan esquecer.
//
// Non substitúe o panadeiro (que segue sendo o dato de referencia
// "normal" para demos/exemplos); complementa cubrindo o que o
// panadeiro nunca exercita.

import type { EditorDocument } from '../document/EditorDocument.js'
import { createEditorDocument } from '../document/EditorDocument.js'

import type { Resource, TreeDef } from '@yggdrasil-forge/core'

/**
 * Árbore adversarial. Elementos deliberados (ver briefing 7.13
 * Cambio 4 para o porqué de cada un):
 *
 * - **Sen `coordinateBounds`** no meta (créase á parte, en
 *   {@link adversarialDocument}) — camiño do bug do zoom.
 * - **Labels bilingües** `{gl, en}` en árbore, nodos e recursos —
 *   camiño do bug do locale.
 * - 2 recursos, un `refundable` con `refundPercent`.
 * - Un nodo con `maxTier` + `costPerTier` (array denso, 3 rangos).
 * - Un par de `exclusions` simétricas.
 * - `prerequisites` con grupos `any` E `none` — as ramas que
 *   `buildConnect` (7.11) explicitamente NON toca.
 * - `tags` + `theme.regions` con DÚAS rexións (unha compartida por
 *   dous nodos).
 * - Un nodo con `color` propio (override — cf. Annex A.6.17).
 * - Un nodo SEN `position` (IdentityLayout cae a (0,0); confirma que
 *   non rompe nada consumir esta fixture).
 */
export function adversarialTreeDef(): TreeDef {
  return {
    id: 'adversarial',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Árbore adversarial', en: 'Adversarial Tree' },
    description: {
      gl: 'Fixture de proba deseñada para forzar camiños pouco transitados.',
      en: 'Test fixture designed to force rarely-exercised paths.',
    },
    author: 'Yggdrasil Forge',
    resources: [
      { id: 'ouro', label: { gl: 'Ouro', en: 'Gold' }, initial: 10, max: 99 },
      {
        id: 'cristal',
        label: { gl: 'Cristal', en: 'Crystal' },
        initial: 0,
        max: 20,
        refundable: true,
        refundPercent: 50,
      },
    ],
    nodes: [
      {
        id: 'raiz',
        type: 'keystone',
        label: { gl: 'Raíz', en: 'Root' },
        position: { x: 0, y: 0 },
        tags: ['guerreiro'],
      },
      {
        id: 'con-tier',
        type: 'notable',
        label: { gl: 'Con rango', en: 'With tier' },
        position: { x: 120, y: 0 },
        maxTier: 3,
        costPerTier: [
          [{ resourceId: 'ouro', amount: 1 }],
          [{ resourceId: 'ouro', amount: 2 }],
          [{ resourceId: 'ouro', amount: 3 }],
        ],
        exclusions: ['exclusivo-a'],
      },
      {
        id: 'exclusivo-a',
        type: 'small',
        label: { gl: 'Exclusivo A', en: 'Exclusive A' },
        position: { x: 240, y: 0 },
        exclusions: ['con-tier'],
      },
      {
        id: 'grupo-any',
        type: 'small',
        label: { gl: 'Grupo Any', en: 'Group Any' },
        position: { x: 0, y: 120 },
        prerequisites: {
          type: 'any',
          conditions: [
            { type: 'node_unlocked', nodeId: 'raiz' },
            { type: 'resource_min', resourceId: 'ouro', amount: 5 },
          ],
        },
      },
      {
        id: 'grupo-none',
        type: 'small',
        label: { gl: 'Grupo None', en: 'Group None' },
        position: { x: 120, y: 120 },
        prerequisites: {
          type: 'none',
          conditions: [{ type: 'node_unlocked', nodeId: 'exclusivo-a' }],
        },
        tags: ['sur'],
      },
      {
        id: 'con-cor',
        type: 'small',
        label: { gl: 'Con cor propia', en: 'With own color' },
        position: { x: 240, y: 120 },
        color: '#ff00ff',
        tags: ['guerreiro', 'sur'],
      },
      {
        id: 'sen-posicion',
        type: 'small',
        label: { gl: 'Sen posición', en: 'No position' },
      },
    ],
    edges: [
      { id: 'e1', source: 'raiz', target: 'con-tier', type: 'dependency' },
      { id: 'e2', source: 'con-tier', target: 'grupo-any', type: 'dependency' },
    ],
    layout: { type: 'custom' },
  } as TreeDef
}

/**
 * Documento completo (tree + meta) coa fixture adversarial. Meta
 * inclúe `theme.regions` (dúas rexións, unha compartida por
 * 'con-cor' e 'grupo-none' via tag 'sur') pero **deliberadamente
 * NON** `coordinateBounds` — é o camiño exacto do bug do zoom.
 */
export function adversarialDocument(): EditorDocument {
  return createEditorDocument(adversarialTreeDef(), {
    theme: {
      nodeFills: { locked: '#c8c4bb', unlocked: '#7cb37c' },
      regions: [
        { id: 'rexion-guerreiro', label: 'Guerreiro', tag: 'guerreiro', color: '#c8875f' },
        { id: 'rexion-sur', label: 'Sur', tag: 'sur', color: '#5f9ec8' },
      ],
    },
  })
}

/** Só os dous recursos, para tests que precisen a lista solta. */
export function adversarialResources(): readonly Resource[] {
  return adversarialTreeDef().resources ?? []
}
// ── FIN: adversarialFixture ──
