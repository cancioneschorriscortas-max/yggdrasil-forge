// ── INICIO: EnumWidget ──
// Widget para `kind:'enum'`. **Commit inmediato** (Briefing 7.5c-i).
//
// **7.5c-U**: usa o **Select propio** para (a) contraste lexible sobre
// o chrome escuro e (b) mostrar **labels localizados** en vez de
// valores crus. Resolve os labels desde `NODE_TYPE_LABELS` /
// `NODE_SHAPE_LABELS` (mapas headless en @editor-core). Para enums
// non recoñecidos (ex.: futuros), cae ao valor cru.

import {
  NODE_SHAPE_LABELS,
  NODE_TYPE_LABELS,
  getNodeShapeLabel,
  getNodeTypeDescribe,
  getNodeTypeLabel,
} from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'
import { Select, type SelectOption } from './Select.js'

export interface EnumWidgetProps {
  /** Contexto para saber que mapa de localización usar. */
  readonly enumKind?: 'nodeType' | 'nodeShape' | 'raw'
  readonly id: string
  readonly value: string | undefined
  readonly options: readonly string[]
  readonly disabled?: boolean
  readonly onCommit: (next: string) => void
  readonly ariaLabel?: string
}

function pickText(loc: unknown): string | undefined {
  if (loc === undefined || loc === null) return undefined
  if (typeof loc === 'string') return loc
  const obj = loc as { gl?: string; en?: string }
  return obj.gl ?? obj.en
}

function resolveOption(kind: EnumWidgetProps['enumKind'], value: string): SelectOption {
  switch (kind) {
    case 'nodeType': {
      const label = getNodeTypeLabel(value as never)
      const describe = getNodeTypeDescribe(value as never)
      return { value, label, ...(describe !== undefined && { describe }) }
    }
    case 'nodeShape': {
      const label = getNodeShapeLabel(value as never)
      const entry = (NODE_SHAPE_LABELS as Record<string, { describe?: unknown } | undefined>)[value]
      const describe = pickText(entry?.describe)
      return { value, label, ...(describe !== undefined && { describe }) }
    }
    default:
      return { value, label: value }
  }
}

export function EnumWidget({
  enumKind = 'raw',
  id,
  value,
  options,
  disabled,
  onCommit,
  ariaLabel,
}: EnumWidgetProps): JSX.Element {
  const selectOptions: SelectOption[] = options.map((v) => resolveOption(enumKind, v))
  return (
    <Select
      id={id}
      value={value}
      options={selectOptions}
      {...(disabled !== undefined && { disabled })}
      onChange={onCommit}
      {...(ariaLabel !== undefined && { ariaLabel })}
    />
  )
}

// Marca imports usados só polos maps (para non ter unused-vars con biome).
void NODE_TYPE_LABELS
