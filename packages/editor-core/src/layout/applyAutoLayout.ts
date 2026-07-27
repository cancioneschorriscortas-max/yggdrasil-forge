// ── INICIO: applyAutoLayout (7.16, Cambio 1) ──
// «Dispor» headless: executa un motor de layout de @core UNHA vez e
// devolve os comandos `moveNode` que COCEN as posicións en
// `node.position` (decisión de deseño: cocer, non vivir — o layout
// vivo chocaría co drag e coa filosofía "retocas o que a máquina
// propón"). `layout.type` do documento queda como está ('custom').
//
// O chamador aplica os comandos nunha transacción → UN undo devolve
// todas as posicións previas dun golpe.
//
// Determinista: mesma árbore + mesmo algo → mesmas posicións (os
// catro motores son puros; asertado en test).

import { type Locale, getErrorMessage, resolveLocalized } from '@yggdrasil-forge/common'
import {
  ClusteredRadialLayout,
  ConstellationLayout,
  ErrorCode,
  LayoutEngineRegistry,
  RadialLayout,
  type Result,
  type TreeDef,
  TreeLayout,
  YggdrasilError,
  computeLayout,
  err,
  ok,
} from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import { moveNode } from '../command/commands/index.js'
import type { EditorDocument } from '../document/EditorDocument.js'
import { type AutoLayoutAlgo, defaultLayoutConfig } from './defaultLayoutConfigs.js'

export type { AutoLayoutAlgo } from './defaultLayoutConfigs.js'
export { AUTO_LAYOUT_ALGOS } from './defaultLayoutConfigs.js'

export interface ApplyAutoLayoutOptions {
  readonly locale?: Locale
}

/**
 * Registry local cos 4 motores que «Dispor» expón. NON se depende do
 * `createDefaultLayoutRegistry` de @react (editor-core é headless);
 * os motores son clases públicas de @core.
 */
function createEditorLayoutRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry()
    .register(new RadialLayout())
    .register(new TreeLayout())
    .register(new ClusteredRadialLayout())
    .register(new ConstellationLayout())
}

/**
 * Calcula o layout `algo` para o documento e devolve un `moveNode`
 * por CADA nodo coa súa posición nova (tamén os que xa tiñan posición
 * — dispor é dispor). `err` propaga o erro do motor, nunca o silencia.
 */
export function applyAutoLayout(
  doc: EditorDocument,
  algo: AutoLayoutAlgo,
  options?: ApplyAutoLayoutOptions,
): Result<readonly Command[]> {
  const locale: Locale = options?.locale ?? 'gl'
  // TreeDef efémero co layout do algoritmo — o documento NON se toca.
  const ephemeral: TreeDef = { ...doc.tree, layout: defaultLayoutConfig(algo, doc.tree) }
  const computed = computeLayout(ephemeral, createEditorLayoutRegistry(), locale)
  if (!computed.ok) return computed

  const commands: Command[] = []
  for (const node of doc.tree.nodes) {
    const position = computed.value.nodes.get(node.id)
    if (position === undefined) {
      // Defensivo: un motor que non coloque TODOS os nodos é un erro
      // honesto, non un layout a medias.
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_TREE_DEF,
          getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
            details: `o motor "${algo}" non devolveu posición para o nodo "${node.id}" (${resolveLocalized(node.label, locale)})`,
          }),
        ),
      )
    }
    commands.push(moveNode(node.id, position))
  }
  return ok(commands)
}
// ── FIN: applyAutoLayout ──
