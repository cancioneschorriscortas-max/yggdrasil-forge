import { describe, expect, it } from 'vitest'
import { ProgressManager, StatComputer, TreeEngine } from '../../src/index.js'
import { createSimpleTreeDef } from './_helpers.js'

describe('SSR: Engine core en Node sen DOM', () => {
  it('importa TreeEngine + ProgressManager + StatComputer sen crash', () => {
    expect(TreeEngine).toBeDefined()
    expect(ProgressManager).toBeDefined()
    expect(StatComputer).toBeDefined()
  })

  it('TreeEngine: construír + getTreeDef en Node', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new TreeEngine(treeDef)
    expect(engine.getTreeDef()).toBeDefined()
    expect(engine.getTreeDef().id).toBe('ssr-test')
  })

  it('TreeEngine: getNodeState en Node', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new TreeEngine(treeDef)
    const nodeState = engine.getNodeState('root')
    // null se non está desbloqueado aínda
    expect(nodeState === null || typeof nodeState === 'object').toBe(true)
  })

  it('TreeEngine: unlock dunha noda simple en Node', async () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new TreeEngine(treeDef)
    // root non ten prereqs, debería ser desbloqueable
    const canResult = engine.canUnlock('root')
    expect(canResult.ok).toBe(true)
    const unlockResult = await engine.unlock('root')
    expect(unlockResult.ok).toBe(true)
  })

  it('TreeEngine: getAuditLog devolve entries sen crash', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new TreeEngine(treeDef, { audit: { enabled: true } })
    const log = engine.getAuditLog()
    expect(Array.isArray(log)).toBe(true)
  })

  it('TreeEngine: lock + getState en Node', async () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new TreeEngine(treeDef)
    await engine.unlock('root')
    const lockResult = await engine.lock('root')
    expect(lockResult.ok).toBe(true)
  })
})
