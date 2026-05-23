// ── INICIO: tests de TimeManager ──
// Suite unitaria do TimeManager (sub-fase 2.3). Cubre o alcance
// ACOTADO ás caducidades (startsAt / expiresAt / expiresAtCalendar)
// segundo briefing 2.3 §5.3-§5.8. Cooldown/recertify/validFor están
// fóra de alcance e deben ser ignorados.
//
// Patrón: `now` é unha función mockeable; cada test constrúe un
// TimeManager con `now` fixado a un instante e verifica o status
// resultante. Cero `Date.now()` real.

import { describe, expect, it } from 'vitest'
import { TimeManager } from '../../src/engine/index.js'
import type { TimeManagerContext, TimeStatus } from '../../src/engine/index.js'
import type { TimeConstraints } from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

/**
 * Constrúe un TimeManager cun `now` fixo (en UTC ms). Pasa `locale`
 * por defecto a 'gl' (irrelevante nesta sub-fase, esixido polo
 * contexto).
 */
function makeManager(nowMs: number): TimeManager {
  const ctx: TimeManagerContext = {
    now: () => nowMs,
    locale: 'gl',
  }
  return new TimeManager(ctx)
}

// ───────────────────────────────────────────────
// Constraints undefined / vacías → 'permanent'
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — constraints ausentes', () => {
  it('devolve permanent cando constraints é undefined', () => {
    const tm = makeManager(1_000_000)
    expect(tm.evaluate(undefined)).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('devolve permanent cando todos os campos relevantes están undefined', () => {
    const tm = makeManager(1_000_000)
    const constraints: TimeConstraints = {}
    expect(tm.evaluate(constraints)).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('devolve permanent cando só hai campos fóra de alcance (cooldown/recertify/validFor)', () => {
    // Briefing §5.3: cooldownMs/reCertifyAfterMs/validForMs ignóranse.
    const tm = makeManager(1_000_000)
    const constraints: TimeConstraints = {
      cooldownMs: 10_000,
      reCertifyAfterMs: 30_000,
      validForMs: 5_000,
    }
    expect(tm.evaluate(constraints)).toEqual<TimeStatus>({ kind: 'permanent' })
  })
})

// ───────────────────────────────────────────────
// startsAt: 'pending' / 'active'
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — startsAt', () => {
  it('devolve pending con startsAt no payload cando now < startsAt', () => {
    const tm = makeManager(500)
    const result = tm.evaluate({ startsAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'pending', startsAt: 1_000 })
  })

  it('devolve active sen expiresAt cando startsAt está no pasado e non hai caducidade', () => {
    const tm = makeManager(2_000)
    const result = tm.evaluate({ startsAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'active' })
  })

  it('devolve active no instante exacto de startsAt (límite inclusivo)', () => {
    const tm = makeManager(1_000)
    const result = tm.evaluate({ startsAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'active' })
  })
})

// ───────────────────────────────────────────────
// expiresAt: 'active' con caducidade / 'expired'
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — expiresAt', () => {
  it('devolve active con expiresAt no payload cando startsAt pasado e expiresAt futuro', () => {
    const tm = makeManager(1_500)
    const result = tm.evaluate({ startsAt: 1_000, expiresAt: 2_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: 2_000 })
  })

  it('devolve expired cando expiresAt está no pasado', () => {
    const tm = makeManager(3_000)
    const result = tm.evaluate({ expiresAt: 2_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 2_000 })
  })

  it('devolve expired no instante exacto de expiresAt (límite inclusivo)', () => {
    const tm = makeManager(2_000)
    const result = tm.evaluate({ expiresAt: 2_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 2_000 })
  })

  it('devolve active con expiresAt cando só hai expiresAt (sen startsAt) e está no futuro', () => {
    const tm = makeManager(1_000)
    const result = tm.evaluate({ expiresAt: 2_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: 2_000 })
  })
})

// ───────────────────────────────────────────────
// Xanela negativa (startsAt > expiresAt) — §5.6
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — xanela negativa (startsAt > expiresAt)', () => {
  // Briefing §5.6: 'active' nunca se alcanza nestes casos.
  it('now anterior a ambos → pending', () => {
    const tm = makeManager(500)
    const result = tm.evaluate({ startsAt: 2_000, expiresAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'pending', startsAt: 2_000 })
  })

  it('now posterior a ambos → expired', () => {
    const tm = makeManager(3_000)
    const result = tm.evaluate({ startsAt: 2_000, expiresAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 1_000 })
  })

  it('now entre expiresAt e startsAt (caso patolóxico): expired prevalece sobre pending', () => {
    // Caso impossible logicamente: startsAt=2000, expiresAt=1000, now=1500.
    // 1500 >= 1000 (expiresAt) → 'expired' (a comprobación de expired
    // ten prioridade en evaluateAt). Documentado en §5.6 como esperado.
    const tm = makeManager(1_500)
    const result = tm.evaluate({ startsAt: 2_000, expiresAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 1_000 })
  })
})

// ───────────────────────────────────────────────
// expiresAtCalendar (TZ-aware) — §5.5
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — expiresAtCalendar', () => {
  it('resolve calendar válida (Europe/Madrid CEST UTC+2) e devolve expired se now > resolvido', () => {
    // 2026-09-01 09:00 Europe/Madrid (CEST) = 2026-09-01 07:00 UTC
    const expectedUtc = Date.UTC(2026, 8, 1, 7, 0, 0)
    const tm = makeManager(expectedUtc + 1_000) // 1 segundo despois
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: '2026-09-01',
        time: '09:00',
        timezone: 'Europe/Madrid',
      },
    })
    expect(result.kind).toBe('expired')
    if (result.kind === 'expired') {
      expect(result.expiredAt).toBe(expectedUtc)
    }
  })

  it('resolve calendar válida e devolve active con expiresAt se now < resolvido', () => {
    // Mesma data; now 1 hora antes
    const expectedUtc = Date.UTC(2026, 8, 1, 7, 0, 0)
    const tm = makeManager(expectedUtc - 3_600_000)
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: '2026-09-01',
        time: '09:00',
        timezone: 'Europe/Madrid',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: expectedUtc })
  })

  it('resolve calendar TZ-aware con DST de inverno (Madrid CET UTC+1)', () => {
    // 2026-12-15 09:00 Europe/Madrid (CET) = 2026-12-15 08:00 UTC
    const expectedUtc = Date.UTC(2026, 11, 15, 8, 0, 0)
    const tm = makeManager(expectedUtc - 60_000) // 1 min antes
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: '2026-12-15',
        time: '09:00',
        timezone: 'Europe/Madrid',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: expectedUtc })
  })

  it('admite o formato HH:MM:SS (con segundos)', () => {
    const expectedUtc = Date.UTC(2026, 5, 1, 12, 30, 45)
    const tm = makeManager(expectedUtc - 1_000)
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: '2026-06-01',
        time: '12:30:45',
        timezone: 'UTC',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: expectedUtc })
  })

  it('TZ inválida → calendar tratado como ausente (caer a expiresAt ou permanent)', () => {
    // §5.6: TZ inválida → resolveCalendarToMs devolve NaN → tratado
    // como ausente. Sen outros campos, o resultado é 'permanent'.
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: '2026-09-01',
        time: '09:00',
        timezone: 'Mars/Olympus',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('data malformada → calendar tratado como ausente', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: 'not-a-date',
        time: '09:00',
        timezone: 'Europe/Madrid',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('hora malformada → calendar tratado como ausente', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({
      expiresAtCalendar: {
        date: '2026-09-01',
        time: 'nope',
        timezone: 'Europe/Madrid',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('calendar defectuoso + expiresAt válido → cae a expiresAt', () => {
    // §5.6: calendar NaN → ausente → úsase expiresAt.
    const tm = makeManager(5_000)
    const result = tm.evaluate({
      expiresAt: 3_000,
      expiresAtCalendar: {
        date: '2026-09-01',
        time: '09:00',
        timezone: 'Bad/Zone',
      },
    })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 3_000 })
  })
})

// ───────────────────────────────────────────────
// Prevalencia calendar > UTC ms — §5.5
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — prevalencia expiresAtCalendar sobre expiresAt', () => {
  it('usa o valor resolvido do calendar e ignora expiresAt cando ambos están definidos', () => {
    // Calendar resolve a 2026-09-01 07:00 UTC. expiresAt poñémolo
    // moito antes (1970) para que se notara a diferenza se se usase.
    const calendarUtc = Date.UTC(2026, 8, 1, 7, 0, 0)
    const tm = makeManager(calendarUtc - 60_000) // 1 min antes do calendar
    const result = tm.evaluate({
      expiresAt: 1_000, // se este se usase, daría 'expired' xa
      expiresAtCalendar: {
        date: '2026-09-01',
        time: '09:00',
        timezone: 'Europe/Madrid',
      },
    })
    // Como prevalece o calendar, o nodo está active (now < calendarUtc).
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: calendarUtc })
  })
})

// ───────────────────────────────────────────────
// Valores non finitos (§5.6)
// ───────────────────────────────────────────────

describe('TimeManager.evaluate — valores non finitos tratados como ausentes', () => {
  it('expiresAt = NaN → tratado como ausente (permanent se nada máis)', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({ expiresAt: Number.NaN })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('expiresAt = Infinity → tratado como ausente', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({ expiresAt: Number.POSITIVE_INFINITY })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('startsAt = NaN + expiresAt válido → tratado como ausente (vai por expiresAt)', () => {
    const tm = makeManager(500)
    const result = tm.evaluate({ startsAt: Number.NaN, expiresAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: 1_000 })
  })

  it('startsAt = -Infinity → tratado como ausente', () => {
    const tm = makeManager(500)
    const result = tm.evaluate({ startsAt: Number.NEGATIVE_INFINITY, expiresAt: 1_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'active', expiresAt: 1_000 })
  })
})

// ───────────────────────────────────────────────
// Clock virtual inxectado (§5.2)
// ───────────────────────────────────────────────

describe('TimeManager — clock virtual inxectado', () => {
  it('dous TimeManager con `now` distintos devolven status distinto para os mesmos constraints', () => {
    // Test crítico de §5.2: o reloxo virtual é inxectable.
    const tmEarly = makeManager(500)
    const tmLate = makeManager(2_500)
    const constraints: TimeConstraints = { startsAt: 1_000, expiresAt: 2_000 }
    expect(tmEarly.evaluate(constraints)).toEqual<TimeStatus>({
      kind: 'pending',
      startsAt: 1_000,
    })
    expect(tmLate.evaluate(constraints)).toEqual<TimeStatus>({
      kind: 'expired',
      expiredAt: 2_000,
    })
  })

  it('evaluate delega en evaluateAt(constraints, context.now())', () => {
    // Verifica indirectamente que evaluate usa context.now() (non
    // Date.now() directo) comparando ambas chamadas.
    const tm = makeManager(1_500)
    const constraints: TimeConstraints = { startsAt: 1_000, expiresAt: 2_000 }
    expect(tm.evaluate(constraints)).toEqual(tm.evaluateAt(constraints, 1_500))
  })

  it('un mesmo constraint avaliado en tres instantes dá tres status distintos', () => {
    const tm = makeManager(0) // o `now` do contexto non se usa con evaluateAt
    const constraints: TimeConstraints = { startsAt: 1_000, expiresAt: 2_000 }
    expect(tm.evaluateAt(constraints, 500)).toEqual<TimeStatus>({
      kind: 'pending',
      startsAt: 1_000,
    })
    expect(tm.evaluateAt(constraints, 1_500)).toEqual<TimeStatus>({
      kind: 'active',
      expiresAt: 2_000,
    })
    expect(tm.evaluateAt(constraints, 2_500)).toEqual<TimeStatus>({
      kind: 'expired',
      expiredAt: 2_000,
    })
  })
})

// ───────────────────────────────────────────────
// nextTransitionAt (§5.8)
// ───────────────────────────────────────────────

describe('TimeManager.nextTransitionAt', () => {
  it('devolve null cando constraints é undefined', () => {
    const tm = makeManager(1_000)
    expect(tm.nextTransitionAt(undefined)).toBeNull()
  })

  it('devolve null cando constraints está vacío', () => {
    const tm = makeManager(1_000)
    expect(tm.nextTransitionAt({})).toBeNull()
  })

  it('devolve startsAt cando só hai startsAt no futuro', () => {
    const tm = makeManager(500)
    expect(tm.nextTransitionAt({ startsAt: 1_000 })).toBe(1_000)
  })

  it('devolve expiresAt cando só hai expiresAt no futuro', () => {
    const tm = makeManager(500)
    expect(tm.nextTransitionAt({ expiresAt: 2_000 })).toBe(2_000)
  })

  it('devolve o menor cando ambos están no futuro', () => {
    const tm = makeManager(500)
    expect(tm.nextTransitionAt({ startsAt: 1_000, expiresAt: 2_000 })).toBe(1_000)
  })

  it('devolve null cando todos os candidatos están no pasado', () => {
    const tm = makeManager(5_000)
    expect(tm.nextTransitionAt({ startsAt: 1_000, expiresAt: 2_000 })).toBeNull()
  })

  it('ignora startsAt pasado e devolve expiresAt futuro', () => {
    const tm = makeManager(1_500)
    expect(tm.nextTransitionAt({ startsAt: 1_000, expiresAt: 2_000 })).toBe(2_000)
  })

  it('usa o expiresAt resolvido do calendar (prevalencia §5.5)', () => {
    const calendarUtc = Date.UTC(2026, 8, 1, 7, 0, 0)
    const tm = makeManager(calendarUtc - 60_000)
    const result = tm.nextTransitionAt({
      expiresAt: 1_000, // pasado e ignorado pola prevalencia do calendar
      expiresAtCalendar: {
        date: '2026-09-01',
        time: '09:00',
        timezone: 'Europe/Madrid',
      },
    })
    expect(result).toBe(calendarUtc)
  })

  it('ignora candidatos no instante exacto de now (futuro estrito)', () => {
    // §5.8: "futuro estrito" (> now). Un candidato igual a now NON
    // conta como transición futura (xa está acontecendo).
    const tm = makeManager(1_000)
    expect(tm.nextTransitionAt({ startsAt: 1_000 })).toBeNull()
    expect(tm.nextTransitionAt({ expiresAt: 1_000 })).toBeNull()
  })

  it('ignora valores non finitos', () => {
    const tm = makeManager(500)
    expect(
      tm.nextTransitionAt({ startsAt: Number.NaN, expiresAt: Number.POSITIVE_INFINITY }),
    ).toBeNull()
  })
})

// ───────────────────────────────────────────────
// Fóra de alcance ignorados (§5.3)
// ───────────────────────────────────────────────

describe('TimeManager — cooldown/recertify/validFor fóra de alcance', () => {
  it('nodo só con cooldownMs → permanent (briefing §5.3)', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({ cooldownMs: 10_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('nodo só con reCertifyAfterMs → permanent', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({ reCertifyAfterMs: 30_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('nodo só con validForMs → permanent', () => {
    const tm = makeManager(1_000_000)
    const result = tm.evaluate({ validForMs: 5_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'permanent' })
  })

  it('expiresAt + cooldownMs → ignora cooldown, aplica só expiresAt', () => {
    const tm = makeManager(3_000)
    const result = tm.evaluate({ expiresAt: 2_000, cooldownMs: 99_999 })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 2_000 })
  })

  it('nextTransitionAt ignora cooldown/recertify/validFor', () => {
    const tm = makeManager(500)
    expect(
      tm.nextTransitionAt({
        cooldownMs: 10_000,
        reCertifyAfterMs: 30_000,
        validForMs: 5_000,
      }),
    ).toBeNull()
  })
})

// ───────────────────────────────────────────────
// Options ignoradas nesta sub-fase (§5.9)
// ───────────────────────────────────────────────

describe('TimeManager — TimeManagerOptions ignoradas en standalone', () => {
  it('enabled: false NON cambia o resultado de evaluate (§5.9: a semántica defínese en 2.3.b)', () => {
    const ctx: TimeManagerContext = {
      now: () => 3_000,
      locale: 'gl',
      options: {
        enabled: false,
        checkIntervalMs: 1_000,
        leadTimeMs: 500,
        timezone: 'Europe/Madrid',
      },
    }
    const tm = new TimeManager(ctx)
    const result = tm.evaluate({ expiresAt: 2_000 })
    expect(result).toEqual<TimeStatus>({ kind: 'expired', expiredAt: 2_000 })
  })
})

// ── FIN: tests de TimeManager ──
