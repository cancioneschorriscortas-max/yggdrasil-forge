// ── INICIO: tests de generateId ──
import { beforeEach, describe, expect, it } from 'vitest'
import { generateId, resetIdCounter } from '../../src/utils/index.js'

describe('generateId', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  it('includes the prefix', () => {
    expect(generateId('audit')).toMatch(/^audit_/)
    expect(generateId('build')).toMatch(/^build_/)
  })

  it('generates unique ids', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId('test'))
    }
    expect(ids.size).toBe(1000)
  })

  it('generates ids with the expected structure', () => {
    const id = generateId('node')
    const parts = id.split('_')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('node')
  })

  it('resetIdCounter resets the internal counter', () => {
    const first = generateId('x')
    resetIdCounter()
    const afterReset = generateId('x')
    // O segundo segmento (counter) debe ser '0' tras reset
    expect(afterReset.split('_')[2]).toBe('0')
    expect(first.split('_')[2]).toBe('0') // tamén era 0 porque beforeEach resetea
  })
})
// ── FIN: tests de generateId ──
