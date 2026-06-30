// ── INICIO: StructuredEditor ──
// Router de sub-editores estruturados.
//
// Para cada descriptor `kind:'structured'`, resolve o sub-editor por
// `of`. Os campos non implementados na fase 1 (`tiers`, `costPerTier`,
// `prerequisites`) caen ao `StructuredSummaryWidget` (lectura).

import type { Cost, Effect, NodeDef, Resource } from '@yggdrasil-forge/core'
import type { PropertyType } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'
import { StructuredSummaryWidget } from '../widgets/StructuredSummaryWidget.js'
import { CostEditor } from './CostEditor.js'
import { EffectsEditor } from './EffectsEditor.js'
import { ExclusionsEditor } from './ExclusionsEditor.js'

export interface StructuredEditorProps {
  readonly typeInfo: Extract<PropertyType, { kind: 'structured' }>
  readonly value: unknown
  readonly currentNode: NodeDef
  readonly allNodes: readonly NodeDef[]
  readonly resources: readonly Resource[] | undefined
  readonly onCommit: (next: unknown) => void
}

export function StructuredEditor({
  typeInfo,
  value,
  currentNode,
  allNodes,
  resources,
  onCommit,
}: StructuredEditorProps): JSX.Element {
  switch (typeInfo.of) {
    case 'exclusions':
      return (
        <ExclusionsEditor
          value={value as readonly string[] | undefined}
          currentNodeId={currentNode.id}
          allNodes={allNodes}
          onCommit={(next) => onCommit(next)}
        />
      )
    case 'cost':
      return (
        <CostEditor
          value={value as readonly Cost[] | undefined}
          resources={resources}
          onCommit={(next) => onCommit(next)}
        />
      )
    case 'effects':
      return (
        <EffectsEditor
          value={value as readonly Effect[] | undefined}
          resources={resources}
          allNodeIds={allNodes.map((n) => n.id)}
          onCommit={(next) => onCommit(next)}
        />
      )
    // Fase 2: prerequisites (UnlockRule aniñada).
    // En fase 1: resumo de lectura.
    case 'prerequisites':
    case 'tiers':
    case 'costPerTier':
      return <StructuredSummaryWidget of={typeInfo.of} value={value} />
    default: {
      // Exhaustividade: se PropertyType.structured.of medra, TS falla aquí.
      const _exhaust: never = typeInfo.of
      void _exhaust
      return <StructuredSummaryWidget of={typeInfo.of as string} value={value} />
    }
  }
}
// ── FIN: StructuredEditor ──
