'use client'

import type { NodeInstance, TreeEngine } from '@yggdrasil-forge/core'
// ── INICIO: SkillTreeAnnouncer ──
import { type JSX, useEffect, useState } from 'react'

export interface SkillTreeAnnouncerProps {
  /** Engine cuyos eventos de unlock/lock serán anunciados. */
  readonly engine: TreeEngine

  /**
   * Locale para as mensaxes default. Soporta 'gl', 'es', 'en'.
   * Outros valores → fallback 'en'. Default 'en' (consistente coa
   * convención DEFAULT_LOCALE de @yggdrasil-forge/common).
   */
  readonly locale?: 'gl' | 'es' | 'en'

  /**
   * Override opcional do formateado de mensaxes. Recibe o tipo de
   * evento e o nodeId, devolve a mensaxe final. Se non se pasa,
   * usa o map default por locale.
   */
  readonly formatMessage?: (event: 'unlock' | 'lock', nodeId: string) => string
}

/**
 * Compoñente público que renderiza unha live region ARIA invisible
 * e anuncia eventos de `unlock` e `lock` do engine. Útil para
 * accesibilidade (lectores de pantalla notifican o cambio sen requerir
 * que o usuario navege ata o nodo afectado).
 *
 * O contedor é visible para lectores de pantalla pero invisible
 * visualmente (técnica `sr-only` aplicada inline).
 */
export function SkillTreeAnnouncer({
  engine,
  locale = 'en',
  formatMessage,
}: SkillTreeAnnouncerProps): JSX.Element {
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const handleUnlock = (nodeId: string, _instance: NodeInstance): void => {
      setMessage(
        formatMessage !== undefined
          ? formatMessage('unlock', nodeId)
          : formatDefault('unlock', nodeId, locale),
      )
    }

    const handleLock = (nodeId: string, _instance: NodeInstance): void => {
      setMessage(
        formatMessage !== undefined
          ? formatMessage('lock', nodeId)
          : formatDefault('lock', nodeId, locale),
      )
    }

    const unsubUnlock = engine.on('unlock', handleUnlock)
    const unsubLock = engine.on('lock', handleLock)

    return () => {
      unsubUnlock()
      unsubLock()
    }
  }, [engine, locale, formatMessage])

  return (
    <output className="yf-announcer" aria-live="polite" aria-atomic="true" style={SR_ONLY_STYLE}>
      {message}
    </output>
  )
}

/**
 * Mensaxes default por locale. Fallback 'en' para locales non
 * soportadas.
 */
const DEFAULT_MESSAGES = {
  gl: {
    unlock: (nodeId: string): string => `Nodo ${nodeId} desbloqueado`,
    lock: (nodeId: string): string => `Nodo ${nodeId} bloqueado`,
  },
  es: {
    unlock: (nodeId: string): string => `Nodo ${nodeId} desbloqueado`,
    lock: (nodeId: string): string => `Nodo ${nodeId} bloqueado`,
  },
  en: {
    unlock: (nodeId: string): string => `Node ${nodeId} unlocked`,
    lock: (nodeId: string): string => `Node ${nodeId} locked`,
  },
} as const

function formatDefault(
  event: 'unlock' | 'lock',
  nodeId: string,
  locale: 'gl' | 'es' | 'en',
): string {
  return DEFAULT_MESSAGES[locale][event](nodeId)
}

/**
 * Estilo inline para ocultar visualmente pero manter accesible para
 * lectores de pantalla (patrón sr-only). Cero clase CSS adicional.
 */
const SR_ONLY_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const
// ── FIN: SkillTreeAnnouncer ──
