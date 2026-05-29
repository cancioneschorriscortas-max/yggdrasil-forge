// ── INICIO: tests de Result ──
import { describe, expect, it } from 'vitest'
import {
  ErrorCode,
  type Result,
  YggdrasilError,
  err,
  isErr,
  isOk,
  ok,
  unwrap,
  unwrapOr,
} from '../src/index.js'

describe('ok', () => {
  it('devolve un Result co flag ok:true e o valor', () => {
    const result = ok(42)
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it('devolve un Result con valor string', () => {
    const result = ok('hello')
    expect(result).toEqual({ ok: true, value: 'hello' })
  })

  it('devolve un Result con valor obxecto', () => {
    const result = ok({ id: 1, name: 'test' })
    expect(result).toEqual({ ok: true, value: { id: 1, name: 'test' } })
  })
})

describe('err', () => {
  it('devolve un Result co flag ok:false e o error', () => {
    const error = new Error('algo fallou')
    const result = err(error)
    expect(result).toEqual({ ok: false, error })
  })

  it('devolve un Result con erro xenérico', () => {
    const result = err('erro en string')
    expect(result).toEqual({ ok: false, error: 'erro en string' })
  })
})

describe('isOk', () => {
  it('devolve true para un Result exitoso', () => {
    expect(isOk(ok(42))).toBe(true)
  })

  it('devolve false para un Result fallido', () => {
    expect(isOk(err(new Error('fallo')))).toBe(false)
  })
})

describe('isErr', () => {
  it('devolve true para un Result fallido', () => {
    expect(isErr(err(new Error('fallo')))).toBe(true)
  })

  it('devolve false para un Result exitoso', () => {
    expect(isErr(ok(42))).toBe(false)
  })
})

describe('unwrap', () => {
  it('devolve o valor cando o Result é exitoso', () => {
    expect(unwrap(ok(99))).toBe(99)
  })

  it('lanza o error cando o Result é fallido', () => {
    const error = new Error('erro de unwrap')
    expect(() => unwrap(err(error))).toThrow('erro de unwrap')
  })
})

describe('unwrapOr', () => {
  it('devolve o valor cando o Result é exitoso', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5)
  })

  it('devolve o fallback cando o Result é fallido', () => {
    expect(unwrapOr(err(new Error('fallo')), 99)).toBe(99)
  })
})

describe('type narrowing', () => {
  it('isOk permite acceder a value de forma segura', () => {
    const result: Result<number> = ok(7)
    if (isOk(result)) {
      // TypeScript debe permitir acceder a result.value sen erro
      expect(result.value).toBe(7)
    } else {
      throw new Error('Non debería chegar aquí')
    }
  })

  it('isErr permite acceder a error de forma segura', () => {
    const result: Result<number> = err(new Error('test'))
    if (isErr(result)) {
      expect(result.error.message).toBe('test')
    } else {
      throw new Error('Non debería chegar aquí')
    }
  })
})

describe('integración con YggdrasilError', () => {
  it('Result<T, YggdrasilError> funciona con un YggdrasilError real', () => {
    const yggError = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'Nodo non atopado')
    const result: Result<string, YggdrasilError> = err(yggError)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
      expect(result.error.message).toBe('Nodo non atopado')
    }
  })

  it('ok result con YggdrasilError como tipo de error pero sen erro real', () => {
    const result: Result<string, YggdrasilError> = ok('éxito')
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe('éxito')
  })
})
// ── FIN: tests de Result ──
