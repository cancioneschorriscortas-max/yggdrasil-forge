import { act, render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
// ── INICIO: tests SkillTreeAnnouncer ──
import { describe, expect, it, vi } from 'vitest'
import { SkillTreeAnnouncer } from '../src/SkillTreeAnnouncer.js'

function makeTreeDef(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [{ id: 'a', type: 'small', label: 'A' }],
    edges: [],
    layout: { type: 'custom' },
  }
}

function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}

describe('SkillTreeAnnouncer', () => {
  it('renderiza live region invisible con role=status e aria-live', () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(<SkillTreeAnnouncer engine={engine} />)
    const region = q(container, 'output')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
    const style = (region as HTMLElement).style
    expect(style.position).toBe('absolute')
  })

  it('subscribe a engine.on unlock no mount', () => {
    const engine = new TreeEngine(makeTreeDef())
    const onSpy = vi.spyOn(engine, 'on')
    render(<SkillTreeAnnouncer engine={engine} />)
    const unlockCalls = onSpy.mock.calls.filter(([ev]) => ev === 'unlock')
    expect(unlockCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('subscribe a engine.on lock no mount', () => {
    const engine = new TreeEngine(makeTreeDef())
    const onSpy = vi.spyOn(engine, 'on')
    render(<SkillTreeAnnouncer engine={engine} />)
    const lockCalls = onSpy.mock.calls.filter(([ev]) => ev === 'lock')
    expect(lockCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('cleanup (unsubscribe) no unmount', () => {
    const engine = new TreeEngine(makeTreeDef())
    const unsubFn = vi.fn()
    vi.spyOn(engine, 'on').mockReturnValue(unsubFn)
    const { unmount } = render(<SkillTreeAnnouncer engine={engine} />)
    unmount()
    // 2 subscricións (unlock + lock) → 2 calls a unsubFn
    expect(unsubFn).toHaveBeenCalledTimes(2)
  })

  it('mensaxe default en locale gl tras unlock', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(<SkillTreeAnnouncer engine={engine} locale="gl" />)
    await act(async () => {
      await engine.unlock('a')
    })
    const region = q(container, 'output')
    expect(region.textContent).toContain('a')
    expect(region.textContent).toContain('desbloqueado')
  })

  it('formatMessage override', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(
      <SkillTreeAnnouncer engine={engine} formatMessage={(ev, id) => `CUSTOM ${ev} ${id}`} />,
    )
    await act(async () => {
      await engine.unlock('a')
    })
    const region = q(container, 'output')
    expect(region.textContent).toBe('CUSTOM unlock a')
  })
})

describe('SkillTreeAnnouncer — locale e evento lock (hixiene)', () => {
  it('anuncio en castelán cando locale="es" (unlock + lock)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(<SkillTreeAnnouncer engine={engine} locale="es" />)
    await act(async () => {
      await engine.unlock('a')
    })
    const region = q(container, 'output')
    expect(region.textContent).toContain('desbloqueado')
    await act(async () => {
      await engine.lock('a')
    })
    expect(region.textContent).toContain('bloqueado')
  })

  it('anuncio en inglés cando locale="en" (unlock + lock)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(<SkillTreeAnnouncer engine={engine} locale="en" />)
    await act(async () => {
      await engine.unlock('a')
    })
    const region = q(container, 'output')
    expect(region.textContent).toContain('unlocked')
    await act(async () => {
      await engine.lock('a')
    })
    expect(region.textContent).toContain('locked')
  })

  it('evento lock dispara announcement en locale gl', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(<SkillTreeAnnouncer engine={engine} locale="gl" />)
    await act(async () => {
      await engine.unlock('a')
    })
    await act(async () => {
      await engine.lock('a')
    })
    const region = q(container, 'output')
    expect(region.textContent).toContain('bloqueado')
  })

  it('formatMessage override con evento lock', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const { container } = render(
      <SkillTreeAnnouncer engine={engine} formatMessage={(ev, id) => `CUSTOM ${ev} ${id}`} />,
    )
    await act(async () => {
      await engine.unlock('a')
    })
    await act(async () => {
      await engine.lock('a')
    })
    const region = q(container, 'output')
    expect(region.textContent).toBe('CUSTOM lock a')
  })
})
// ── FIN: tests SkillTreeAnnouncer ──
