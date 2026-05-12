// ── INICIO: tests de errors ──
import { describe, expect, it } from 'vitest'
import {
  ERROR_MESSAGES,
  ErrorCode,
  SUPPORTED_LOCALES,
  YggdrasilError,
  getErrorMessage,
  isYggdrasilError,
} from '../src/index.js'

describe('ErrorCode', () => {
  it('contains all expected codes', () => {
    expect(ErrorCode.NODE_NOT_FOUND).toBe('YGG_E001')
    expect(ErrorCode.PREREQUISITES_NOT_MET).toBe('YGG_E003')
    expect(ErrorCode.READ_ONLY_VIOLATION).toBe('YGG_RO001')
  })
})

describe('ERROR_MESSAGES', () => {
  it('has a message for every error code in every supported locale', () => {
    for (const code of Object.values(ErrorCode)) {
      const messages = ERROR_MESSAGES[code]
      expect(messages, `Missing messages for ${code}`).toBeDefined()
      for (const locale of SUPPORTED_LOCALES) {
        expect(messages[locale], `Missing ${locale} translation for ${code}`).toBeDefined()
        expect(messages[locale]).not.toBe('')
      }
    }
  })
})

describe('YggdrasilError', () => {
  it('creates error with code and message', () => {
    const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'Node X missing')
    expect(err.code).toBe(ErrorCode.NODE_NOT_FOUND)
    expect(err.message).toBe('Node X missing')
    expect(err.name).toBe('YggdrasilError')
  })

  it('supports context', () => {
    const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'Missing', {
      context: { nodeId: 'forno' },
    })
    expect(err.context).toEqual({ nodeId: 'forno' })
  })

  it('supports cause chaining', () => {
    const original = new Error('original failure')
    const err = new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'Read failed', {
      cause: original,
    })
    expect(err.cause).toBe(original)
  })

  it('is an instance of Error', () => {
    const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'x')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(YggdrasilError)
  })

  describe('toJSON', () => {
    it('serializes basic error', () => {
      const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'msg')
      const json = err.toJSON()
      expect(json.name).toBe('YggdrasilError')
      expect(json.code).toBe(ErrorCode.NODE_NOT_FOUND)
      expect(json.message).toBe('msg')
    })

    it('includes context if present', () => {
      const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'msg', {
        context: { nodeId: 'x' },
      })
      const json = err.toJSON()
      expect(json.context).toEqual({ nodeId: 'x' })
    })

    it('serializes cause chain (YggdrasilError)', () => {
      const inner = new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'inner')
      const outer = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'outer', {
        cause: inner,
      })
      const json = outer.toJSON()
      expect(json.cause).toBeDefined()
      expect((json.cause as { code?: string }).code).toBe(ErrorCode.STORAGE_READ_FAILED)
    })

    it('serializes cause chain (plain Error)', () => {
      const inner = new Error('plain error')
      const outer = new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'outer', {
        cause: inner,
      })
      const json = outer.toJSON()
      expect(json.cause).toBeDefined()
      expect((json.cause as { name?: string }).name).toBe('Error')
      expect((json.cause as { message?: string }).message).toBe('plain error')
    })

    it('result is JSON-stringifiable', () => {
      const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'msg', {
        context: { nodeId: 'x' },
      })
      const str = JSON.stringify(err.toJSON())
      const parsed = JSON.parse(str) as { code: string }
      expect(parsed.code).toBe(ErrorCode.NODE_NOT_FOUND)
    })
  })
})

describe('isYggdrasilError', () => {
  it('returns true for YggdrasilError instances', () => {
    const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'x')
    expect(isYggdrasilError(err)).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isYggdrasilError(new Error('x'))).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(isYggdrasilError(null)).toBe(false)
    expect(isYggdrasilError(undefined)).toBe(false)
    expect(isYggdrasilError({})).toBe(false)
    expect(isYggdrasilError('string')).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('returns localized message in gl', () => {
    const msg = getErrorMessage(ErrorCode.NODE_NOT_FOUND, 'gl', { nodeId: 'forno' })
    expect(msg).toBe('O nodo "forno" non existe na árbore')
  })

  it('returns localized message in es', () => {
    const msg = getErrorMessage(ErrorCode.NODE_NOT_FOUND, 'es', { nodeId: 'forno' })
    expect(msg).toBe('El nodo "forno" no existe en el árbol')
  })

  it('returns localized message in en', () => {
    const msg = getErrorMessage(ErrorCode.NODE_NOT_FOUND, 'en', { nodeId: 'forno' })
    expect(msg).toBe('Node "forno" does not exist in the tree')
  })

  it('falls back to en for unsupported locale', () => {
    const msg = getErrorMessage(ErrorCode.NODE_NOT_FOUND, 'fr', { nodeId: 'x' })
    expect(msg).toBe('Node "x" does not exist in the tree')
  })

  it('handles missing context', () => {
    const msg = getErrorMessage(ErrorCode.CYCLE_DETECTED, 'gl')
    expect(msg).toBe('Detectouse un ciclo de dependencias na árbore')
  })

  it('handles numeric context values', () => {
    const msg = getErrorMessage(ErrorCode.INSUFFICIENT_RESOURCES, 'en', {
      needed: 10,
      resourceId: 'xp',
      available: 5,
    })
    expect(msg).toBe('Insufficient resources: need 10 of "xp", have 5')
  })
})
describe('getErrorMessage edge cases', () => {
  it('handles context values that are not string or number', () => {
    const msg = getErrorMessage(ErrorCode.NODE_NOT_FOUND, 'en', {
      nodeId: { toString: () => 'objeto' } as unknown as string,
    })
    expect(msg).toBe('Node "objeto" does not exist in the tree')
  })
})

describe('YggdrasilError stack', () => {
  it('toJSON includes stack when present', () => {
    const err = new YggdrasilError(ErrorCode.NODE_NOT_FOUND, 'msg')
    const json = err.toJSON()
    expect(json.stack).toBeDefined()
  })
})
// ── FIN: tests de errors ──
