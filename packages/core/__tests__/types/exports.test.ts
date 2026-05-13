// ── INICIO: tests de exports ──
// Verifica que os módulos públicos exportan o esperado.
// Os tipos puros non son testables en runtime: comprobamos só
// constantes/funcións e que os módulos novos non rompen imports.

import { describe, expect, it } from 'vitest'
import * as core from '../../src/index.js'

describe('@yggdrasil-forge/core public exports', () => {
  describe('1.2 — foundations', () => {
    it('exports VERSION', () => {
      expect(core.VERSION).toBe('0.0.0')
    })

    it('exports Result helpers', () => {
      expect(typeof core.ok).toBe('function')
      expect(typeof core.err).toBe('function')
      expect(typeof core.isOk).toBe('function')
      expect(typeof core.isErr).toBe('function')
      expect(typeof core.unwrap).toBe('function')
      expect(typeof core.unwrapOr).toBe('function')
    })

    it('exports freezeNodeDef', () => {
      expect(typeof core.freezeNodeDef).toBe('function')
    })

    it('re-exports error utilities from common', () => {
      expect(core.ErrorCode).toBeDefined()
      expect(typeof core.YggdrasilError).toBe('function')
      expect(typeof core.isYggdrasilError).toBe('function')
      expect(typeof core.getErrorMessage).toBe('function')
    })
  })

  describe('1.3 — wave 2 types', () => {
    it('Resource type is structurally valid', () => {
      const resource: core.Resource = {
        id: 'xp',
        label: { gl: 'Experiencia', es: 'Experiencia', en: 'XP' },
        initial: 0,
        max: 1000,
        refundable: true,
        refundPercent: 100,
      }
      expect(resource.id).toBe('xp')
      expect(resource.refundable).toBe(true)
    })

    it('Cost type is structurally valid', () => {
      const cost: core.Cost = { resourceId: 'xp', amount: 100 }
      expect(cost.amount).toBe(100)
    })

    it('Budget type is structurally valid', () => {
      const budget: core.Budget = { resources: { xp: 1250, sp: 3 } }
      expect(budget.resources.xp).toBe(1250)
    })

    it('I18nConfig is structurally valid', () => {
      const config: core.I18nConfig = {
        defaultLocale: 'gl',
        fallbackLocale: 'en',
      }
      expect(config.defaultLocale).toBe('gl')
    })

    it('UnlockCondition supports all known types', () => {
      const conditions: core.UnlockCondition[] = [
        { type: 'node_unlocked', nodeId: 'a' },
        { type: 'node_maxed', nodeId: 'a' },
        { type: 'node_state', nodeId: 'a', state: 'unlocked' },
        { type: 'nodes_count', count: 3 },
        { type: 'nodes_count', count: 3, scope: 'cluster_1' },
        { type: 'resource_min', resourceId: 'xp', amount: 100 },
        { type: 'tier_min', nodeId: 'a', tier: 2 },
        { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
        { type: 'tag_count', tag: 'social', count: 5 },
        { type: 'progress_min', nodeId: 'a', percent: 50 },
        { type: 'subtree_completion', subtreeId: 'cluster_1', percent: 80 },
        { type: 'stat_min', statId: 'damage', amount: 100 },
        { type: 'time_after', timestamp: 1715347200000 },
        { type: 'time_before', timestamp: 1715347200000 },
        { type: 'custom', evaluator: 'my-evaluator' },
      ]
      expect(conditions).toHaveLength(15)
    })

    it('UnlockRule supports all/any/none combinators and atomic conditions', () => {
      const allRule: core.UnlockRule = {
        type: 'all',
        conditions: [{ type: 'node_unlocked', nodeId: 'a' }],
      }
      const anyRule: core.UnlockRule = {
        type: 'any',
        conditions: [{ type: 'resource_min', resourceId: 'xp', amount: 100 }],
      }
      const noneRule: core.UnlockRule = {
        type: 'none',
        conditions: [{ type: 'node_unlocked', nodeId: 'forbidden' }],
      }
      const atomic: core.UnlockRule = { type: 'node_unlocked', nodeId: 'a' }

      expect(allRule.type).toBe('all')
      expect(anyRule.type).toBe('any')
      expect(noneRule.type).toBe('none')
      expect(atomic.type).toBe('node_unlocked')
    })

    it('EventMap keys are referenceable', () => {
      const knownEvents: core.EventName[] = [
        'unlock',
        'lock',
        'stateChange',
        'budgetChange',
        'statChange',
        'progressChange',
        'respec',
        'buildLoaded',
        'subtreeEntered',
        'treeChanged',
        'nodeExpired',
        'externalProgressSynced',
        'pluginError',
        'error',
        'auditEntry',
      ]
      expect(knownEvents).toHaveLength(15)
    })

    it('Plugin interface accepts a minimal valid plugin', () => {
      const plugin: core.Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        apiVersion: '1.0.0',
        install() {
          // no-op
        },
      }
      expect(plugin.id).toBe('test-plugin')
    })

    it('Plugin accepts permissions and optional uninstall', () => {
      const plugin: core.Plugin = {
        id: 'test-plugin-2',
        name: 'Test Plugin 2',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['read_state', 'register_hooks', 'custom-permission'],
        install() {
          // no-op
        },
        uninstall() {
          // no-op
        },
      }
      expect(plugin.permissions).toContain('read_state')
      expect(plugin.permissions).toContain('custom-permission')
      expect(typeof plugin.uninstall).toBe('function')
    })

    it('PluginLogLevel accepts the expected levels', () => {
      const levels: core.PluginLogLevel[] = ['debug', 'info', 'warn', 'error']
      expect(levels).toHaveLength(4)
    })
  })
})
// ── FIN: tests de exports ──
