// ── INICIO: StructuredEditor ──
// Router de sub-editores estruturados.
//
// Para cada descriptor `kind:'structured'`, resolve o sub-editor por
// `of`. `tiers` está retirado (7.5c-T2, UNIMPLEMENTED). `prerequisites`
// editable en 7.5c-ii fase 2. `costPerTier` editable en 7.5f.

import type { Cost, Effect, NodeDef, Resource, StatDef, UnlockRule } from '@yggdrasil-forge/core'
import type { PropertyType } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'
import { StructuredSummaryWidget } from '../widgets/StructuredSummaryWidget.js'
import { CostEditor } from './CostEditor.js'
import { CostPerTierEditor } from './CostPerTierEditor.js'
import { EffectsEditor } from './EffectsEditor.js'
import { ExclusionsEditor } from './ExclusionsEditor.js'
import { PrerequisitesEditor } from './PrerequisitesEditor.js'

export interface StructuredEditorProps {
  readonly typeInfo: Extract<PropertyType, { kind: 'structured' }>
  readonly value: unknown
  readonly currentNode: NodeDef
  readonly allNodes: readonly NodeDef[]
  readonly resources: readonly Resource[] | undefined
  readonly stats: readonly StatDef[] | undefined
  readonly onCommit: (next: unknown) => void
}

export function StructuredEditor({
  typeInfo,
  value,
  currentNode,
  allNodes,
  resources,
  stats,
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
    case 'prerequisites':
      return (
        <PrerequisitesEditor
          value={value as UnlockRule | undefined}
          currentNode={currentNode}
          allNodes={allNodes}
          resources={resources}
          stats={stats}
          onCommit={(next) => onCommit(next)}
        />
      )
    case 'costPerTier':
      return (
        <CostPerTierEditor
          value={value as readonly (readonly Cost[])[] | undefined}
          maxTier={currentNode.maxTier}
          resources={resources}
          onCommit={(next) => onCommit(next)}
        />
      )
    // `tiers` retirado en 7.5c-T2 (UNIMPLEMENTED). Case defensivo.
    case 'tiers':
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
