// ── INICIO: tests server entry ──
import { describe, expect, it } from 'vitest'

describe('server entry point', () => {
  it('exporta SkillTreeStatic, computeLayout e serializeForClient', async () => {
    const server = await import('../src/server.js')
    expect('SkillTreeStatic' in server).toBe(true)
    expect('computeLayout' in server).toBe(true)
    expect('serializeForClient' in server).toBe(true)
  })

  it('non exporta pezas client-only', async () => {
    const server = await import('../src/server.js')
    expect('SkillTree' in server).toBe(false)
    expect('ThemeProvider' in server).toBe(false)
    expect('useSkillTree' in server).toBe(false)
    expect('minimal' in server).toBe(false)
  })

  it('SkillTreeStatic é unha función', async () => {
    const server = await import('../src/server.js')
    expect(typeof server.SkillTreeStatic).toBe('function')
  })
})
// ── FIN: tests server entry ──
