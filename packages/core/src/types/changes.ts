// ── INICIO: TreeChange types ──
// Operacións declarativas para modificar a TreeDef en runtime.
// Aplícanse mediante engine.applyChanges([...]).

import type { EdgeDef } from './edge.js'
import type { NodeDef } from './node.js'
import type { Resource } from './resources.js'
import type { GroupDef, LayoutConfig } from './tree.js'

/**
 * Cambios permitidos en modify_node.
 * Excluímos id e type: non se poden modificar.
 */
export type ModifyNodeChanges = Omit<Partial<NodeDef>, 'id' | 'type'>

/**
 * Cambios permitidos en modify_edge.
 * Excluímos id, source e target.
 */
export type ModifyEdgeChanges = Omit<Partial<EdgeDef>, 'id' | 'source' | 'target'>

/**
 * Cambio declarativo na TreeDef.
 */
export type TreeChange =
  | { readonly type: 'add_node'; readonly node: NodeDef }
  | {
      readonly type: 'remove_node'
      readonly nodeId: string
      readonly cascadeEdges?: boolean
    }
  | {
      readonly type: 'modify_node'
      readonly nodeId: string
      readonly changes: ModifyNodeChanges
    }
  | { readonly type: 'rename_node_id'; readonly oldId: string; readonly newId: string }
  | { readonly type: 'add_edge'; readonly edge: EdgeDef }
  | { readonly type: 'remove_edge'; readonly edgeId: string }
  | {
      readonly type: 'modify_edge'
      readonly edgeId: string
      readonly changes: ModifyEdgeChanges
    }
  | { readonly type: 'add_group'; readonly group: GroupDef }
  | { readonly type: 'remove_group'; readonly groupId: string }
  | {
      readonly type: 'modify_group'
      readonly groupId: string
      readonly changes: Partial<GroupDef>
    }
  | { readonly type: 'add_resource'; readonly resource: Resource }
  | { readonly type: 'modify_layout'; readonly changes: Partial<LayoutConfig> }
// ── FIN: TreeChange types ──
