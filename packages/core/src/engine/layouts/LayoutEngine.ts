// ── INICIO: LayoutEngine interface ──
import type { Result } from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { LayoutResult } from './LayoutResult.js'

/**
 * Contrato común para todos os layouts.
 *
 * Un LayoutEngine é stateless e puro: dado un TreeDef devolve un
 * LayoutResult con posicións concretas para nodos, paths para edges,
 * e bounds da caixa contedora. Cero efectos secundarios.
 *
 * Cada implementación rexístrase no LayoutEngineRegistry baixo o seu
 * `type` (string) que coincide co `LayoutConfig.type` do TreeDef.
 *
 * Para implementacións concretas ver IdentityLayout (4.1) e os
 * layouts específicos de sub-fases posteriores (RadialLayout 4.2,
 * TreeLayout 4.3, CustomLayout 4.4).
 */
export interface LayoutEngine {
  /**
   * Identificador do tipo de layout. Coincide con LayoutConfig.type
   * dos TreeDefs que este engine procesa.
   * Ex: 'radial', 'tree', 'custom'.
   */
  readonly type: string

  /**
   * Calcula o layout para un TreeDef dado.
   *
   * Devolve Result para permitir fallos limpos (ex: configuración
   * malformada, dependencias inválidas). Cero asincronía: layouts
   * son cálculos puros e síncronos.
   */
  compute(treeDef: TreeDef): Result<LayoutResult>
}
// ── FIN: LayoutEngine interface ──
