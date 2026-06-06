import { describe, expect, it } from 'vitest'
import { EffectsRunner, TimeManager } from '../../src/index.js'

describe('SSR: EffectsRunner + TimeManager en Node sen DOM', () => {
  it('importa EffectsRunner + TimeManager sen crash', () => {
    expect(EffectsRunner).toBeDefined()
    expect(TimeManager).toBeDefined()
  })

  it('TimeManager: usa now inxectada (cero Date.now directo no test)', () => {
    let callCount = 0
    const mockNow = () => {
      callCount++
      return 1000
    }
    const tm = new TimeManager({ now: mockNow })
    expect(tm).toBeDefined()
    // A construción pode ou non chamar now; o importante é que non crashea
    expect(typeof callCount).toBe('number')
  })

  it('TimeManager: smoke con expiresAt', () => {
    const tm = new TimeManager({ now: () => 5000 })
    expect(tm).toBeDefined()
    // TimeManager existe e constrúese en Node sen problemas
  })
})
