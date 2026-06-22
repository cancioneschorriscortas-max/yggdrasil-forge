// ── INICIO: TimeManager ──
// Peza standalone que evalúa restricións temporais dun nodo. Sub-fase
// 2.3: NON está integrada a TreeEngine (iso é 2.3.b). Tampouco agenda
// nada nin fai polling: só ofrece tres consultas puras a partir dun
// `now: () => number` inxectado.
//
// Alcance EXACTO (briefing 2.3 §5.3):
//   - `startsAt` (UTC ms): se now < startsAt → 'pending'.
//   - `expiresAt` (UTC ms): se now >= expiresAt → 'expired'.
//   - `expiresAtCalendar` ({date,time,timezone}): mesma semántica que
//     `expiresAt` pero resólvese a UTC ms vía Intl.DateTimeFormat.
//     Prevalece sobre `expiresAt` se ambos están definidos (§5.5).
//
// FÓRA de alcance (trátanse como ausentes, briefing §5.3):
//   - `cooldownMs`, `reCertifyAfterMs`, `validForMs` → ignorados
//     silenciosamente. A súa implementación require modelo de estado
//     adicional (lastUnlockedAt, etc.) e queda diferida.
//
// Clock virtual obrigatorio (§5.2): TimeManager NUNCA chama a
// `Date.now()` directamente. Toda lectura do reloxo pasa por
// `context.now()`. En produción adoita ser `Date.now` (a integración
// con TreeEngine en 2.3.b decidirao); en tests, función mockeable.
//
// `TimeManagerOptions` (§5.9): nesta sub-fase **ignórase** agás
// `enabled`, e mesmo `enabled` non altera `evaluate` (devolve sempre o
// TimeStatus correcto). A semántica completa (gating de
// `checkIntervalMs`, `leadTimeMs`, `timezone` por defecto) defínese en
// 2.3.b cando o TreeEngine programe checks.

import type { Locale } from '@yggdrasil-forge/common'
import type { TimeConstraints, TimeManagerOptions } from '../types/index.js'

// ── INICIO: tipos públicos ──

/**
 * Contexto inxectado no TimeManager.
 *
 * - `now`: función que devolve o instante actual en UTC ms. Permite
 *   inxección para tests e SSR. En produción adoita ser `Date.now`.
 * - `options`: opcións de configuración (ver §5.9). Ignoradas nesta
 *   sub-fase standalone; consérvanse no contexto para que a API non
 *   cambie ao cablear en 2.3.b.
 * - `locale`: locale activa. Inclúese por consistencia coas outras
 *   pezas standalone (StatComputer, EffectsRunner); o TimeManager non
 *   produce mensaxes localizadas nesta sub-fase.
 */
export interface TimeManagerContext {
  readonly now: () => number
  readonly options?: TimeManagerOptions
  readonly locale: Locale
}

/**
 * Estado temporal dun nodo segundo as súas constraints.
 *
 * - `permanent`: o nodo non ten restricións temporais aplicables (ou
 *   tódolos campos relevantes están ausentes / non son finitos / son
 *   defectuosos como TZ inválida). O TimeManager non opina.
 * - `pending`: o nodo aínda non comezou (now < startsAt). Inclúe o
 *   propio `startsAt` para que o consumidor poida programar checks.
 * - `active`: o nodo está dentro da súa xanela. Se ten caducidade
 *   resoluble inclúese en `expiresAt`.
 * - `expired`: o nodo pasou a súa caducidade. Inclúe `expiredAt` (o
 *   instante a partir do cal está expirado).
 */
export type TimeStatus =
  | { readonly kind: 'permanent' }
  | { readonly kind: 'pending'; readonly startsAt: number }
  | { readonly kind: 'active'; readonly expiresAt?: number }
  | { readonly kind: 'expired'; readonly expiredAt: number }

// ── FIN: tipos públicos ──

export class TimeManager {
  private readonly context: TimeManagerContext

  constructor(context: TimeManagerContext) {
    this.context = context
  }

  /**
   * Avalía o status temporal das constraints "agora mesmo" segundo
   * `context.now()`. Cero efectos secundarios; API total (sempre
   * devolve un TimeStatus válido).
   */
  evaluate(constraints: TimeConstraints | undefined): TimeStatus {
    return this.evaluateAt(constraints, this.context.now())
  }

  /**
   * Avalía o status temporal das constraints nun instante específico
   * (UTC ms). Útil para "que pasará dentro de X ms?". Cero efectos
   * secundarios; API total.
   *
   * Algoritmo (briefing §5.4):
   *   1. Resolver `expiresAt` efectivo: prevalece `expiresAtCalendar`
   *      se está definido e resoluble; senón `expiresAt` se é finito.
   *   2. Resolver `startsAt` efectivo: o do campo se é finito.
   *   3. Se ningún dos dous é aplicable → 'permanent'.
   *   4. Se hai `expiresAt` efectivo e `atMs >= expiresAt` → 'expired'.
   *      (Ten preferencia sobre 'pending' por seguridade: unha xanela
   *      negativa con now no medio resolverase aquí ou no paso 5.)
   *   5. Se hai `startsAt` efectivo e `atMs < startsAt` → 'pending'.
   *   6. Senón → 'active' (con `expiresAt?` se aplica).
   */
  evaluateAt(constraints: TimeConstraints | undefined, atMs: number): TimeStatus {
    if (constraints === undefined) {
      return { kind: 'permanent' }
    }

    const startsAt = pickFinite(constraints.startsAt)
    const expiresAt = resolveEffectiveExpiry(constraints)

    // Se non hai ningún dos dous campos aplicables, o TimeManager
    // non opina sobre este nodo (§5.4 status 'permanent').
    if (startsAt === undefined && expiresAt === undefined) {
      return { kind: 'permanent' }
    }

    // Comprobación de expiración: ten prioridade sobre 'pending'. Nun
    // caso patolóxico de xanela negativa (startsAt > expiresAt) e
    // atMs > expiresAt, isto devolve 'expired'; se atMs < startsAt,
    // pasa ao bloque 'pending' (§5.6 documenta este comportamento).
    if (expiresAt !== undefined && atMs >= expiresAt) {
      return { kind: 'expired', expiredAt: expiresAt }
    }

    if (startsAt !== undefined && atMs < startsAt) {
      return { kind: 'pending', startsAt }
    }

    // 'active' con `expiresAt?` só se hai caducidade resolvida. Sen
    // ela, o status é simplemente "activo permanente dende startsAt".
    if (expiresAt !== undefined) {
      return { kind: 'active', expiresAt }
    }
    return { kind: 'active' }
  }

  /**
   * Devolve o instante UTC ms máis próximo *no futuro estrito* no que
   * o status do nodo podería cambiar segundo as constraints actuais e
   * `context.now()`. Útil en 2.3.b para programar `setTimeout`
   * precisos en lugar de pollings.
   *
   * Candidatos (§5.8):
   *   - `startsAt` se está no futuro estrito (> now).
   *   - `expiresAt` efectivo (calendar > UTC ms, §5.5) se está no
   *     futuro estrito.
   *
   * Devolve o **mínimo** dos candidatos válidos, ou `null` se ningún
   * está no futuro (ex: nodo permanente, ou xa expirado).
   */
  nextTransitionAt(constraints: TimeConstraints | undefined): number | null {
    if (constraints === undefined) {
      return null
    }

    const now = this.context.now()
    const startsAt = pickFinite(constraints.startsAt)
    const expiresAt = resolveEffectiveExpiry(constraints)

    let best: number | null = null
    if (startsAt !== undefined && startsAt > now) {
      best = startsAt
    }
    if (expiresAt !== undefined && expiresAt > now) {
      if (best === null || expiresAt < best) {
        best = expiresAt
      }
    }
    return best
  }
}

// ── INICIO: helpers a nivel de módulo ──

/**
 * Devolve `value` se é un número finito, ou `undefined` en caso
 * contrario (NaN, ±Infinity, undefined). Briefing §5.6: valores non
 * finitos trátanse como ausentes.
 */
function pickFinite(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  return Number.isFinite(value) ? value : undefined
}

/**
 * Calcula o `expiresAt` efectivo aplicando a prevalencia
 * `expiresAtCalendar > expiresAt` (briefing §5.5).
 *
 *   - Se `expiresAtCalendar` está definido e resólvese a un UTC ms
 *     finito, devolve ese valor (e ignora `expiresAt`).
 *   - Se `expiresAtCalendar` non se pode resolver (TZ inválida, data
 *     malformada → NaN), trátase como ausente e cae a `expiresAt`
 *     (§5.6).
 *   - Se `expiresAt` é finito, devólvese.
 *   - En calquera outro caso, `undefined`.
 */
function resolveEffectiveExpiry(constraints: TimeConstraints): number | undefined {
  if (constraints.expiresAtCalendar !== undefined) {
    const resolved = resolveCalendarToMs(constraints.expiresAtCalendar)
    if (Number.isFinite(resolved)) {
      return resolved
    }
    // Calendar defectuoso: tratamos como ausente e tentamos UTC ms.
  }
  return pickFinite(constraints.expiresAt)
}

/**
 * Converte `{date: 'YYYY-MM-DD', time: 'HH:MM[:SS]', timezone:
 * 'IANA/zone'}` a UTC ms aplicando o offset que a TZ ten nese
 * instante (briefing §5.5).
 *
 * Algoritmo:
 *   1. Parsea date+time e constrúe un "guess" `Date.UTC(...)` como
 *      se os campos fosen UTC.
 *   2. Usa `Intl.DateTimeFormat` con `formatToParts` para descubrir
 *      a que "wall time" corresponde ese UTC ms na TZ pedida.
 *   3. A diferenza dá o offset; aplícase para obter o UTC ms real.
 *   4. Repítese a corrección unha vez para manexar transicións DST
 *      onde a primeira estimación cae no offset incorrecto.
 *
 * Devolve `NaN` se:
 *   - O formato de `date` ou `time` non encaixa.
 *   - A `timezone` é inválida (constructor de Intl lanza).
 * En todos estes casos, `resolveEffectiveExpiry` trátao como ausente
 * (§5.6). Cero excepcións propagadas.
 *
 * Nota: para horas inexistentes (DST spring-forward gap) o algoritmo
 * devolve un valor determinístico baseado no offset previo á
 * transición; non é responsabilidade desta sub-fase resolver esa
 * ambigüidade (deíxase para 2.3.b se aparece como requisito).
 */
function resolveCalendarToMs(cal: {
  readonly date: string
  readonly time: string
  readonly timezone: string
}): number {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cal.date)
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(cal.time)
  if (dateMatch === null || timeMatch === null) {
    return Number.NaN
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const second = timeMatch[3] !== undefined ? Number(timeMatch[3]) : 0

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  /* v8 ignore start -- defensivo: Date.UTC só devolve NaN con argumentos
     non-numéricos; os números pasados aquí proveñen de matches de regex
     numéricos previos, polo que sempre son finitos. */
  if (Number.isNaN(utcGuess)) {
    return Number.NaN
  }
  /* v8 ignore stop */

  // Intentamos construír o formatter; se a TZ é inválida, Intl lanza
  // un RangeError que capturamos e convertemos a NaN (§5.6).
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: cal.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return Number.NaN
  }

  // Offset que a TZ ten para un instante UTC dado: diferenza entre
  // o "wall time" da TZ e o UTC ms.
  const offsetAt = (ms: number): number => {
    const parts = formatter.formatToParts(new Date(ms))
    let y = 0
    let mo = 0
    let d = 0
    let h = 0
    let mi = 0
    let s = 0
    for (const part of parts) {
      switch (part.type) {
        case 'year':
          y = Number(part.value)
          break
        case 'month':
          mo = Number(part.value)
          break
        case 'day':
          d = Number(part.value)
          break
        case 'hour':
          // Intl pode devolver '24' para medianoite nalgunhas locales;
          // normalizamos a 0 para que Date.UTC non rebote.
          /* v8 ignore start -- defensivo: Intl moderno (V8) devolve '00'
             para medianoite, non '24'. Rama existe por compatibilidade
             histórica con locales que devolvían 24. */
          h = Number(part.value) === 24 ? 0 : Number(part.value)
          /* v8 ignore stop */
          break
        case 'minute':
          mi = Number(part.value)
          break
        case 'second':
          s = Number(part.value)
          break
        // outros tipos (literal, etc.) ignóranse.
      }
    }
    const asUTC = Date.UTC(y, mo - 1, d, h, mi, s)
    return asUTC - ms
  }

  // Primeira aproximación: restamos o offset que aplica no UTC guess.
  const offset1 = offsetAt(utcGuess)
  const candidate = utcGuess - offset1
  // Corrección para DST: o offset no candidato pode ser distinto.
  const offset2 = offsetAt(candidate)
  return candidate - (offset2 - offset1)
}

// ── FIN: helpers a nivel de módulo ──
// ── FIN: TimeManager ──
