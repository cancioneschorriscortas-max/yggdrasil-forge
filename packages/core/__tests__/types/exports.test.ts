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

  describe('1.4 — wave 3 types', () => {
    it('Effect supports all variants structurally', () => {
      const effects: core.Effect[] = [
        { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 },
        { type: 'modify_stat', statId: 'damage', op: '+', amount: 5 },
        { type: 'modify_node_state', nodeId: 'x', state: 'unlocked' },
        { type: 'set_node_visibility', nodeId: 'x', visible: false },
        { type: 'unlock_node', nodeId: 'x' },
        { type: 'set_progress', nodeId: 'x', percent: 75 },
        { type: 'trigger_event', eventName: 'achievement', irreversible: true },
        {
          type: 'conditional',
          condition: { type: 'node_unlocked', nodeId: 'a' },
          // biome-ignore lint/suspicious/noThenProperty: 'then' is a valid Effect DSL field
          then: [{ type: 'unlock_node', nodeId: 'b' }],
        },
        { type: 'composite', effects: [{ type: 'unlock_node', nodeId: 'x' }] },
        { type: 'plugin', pluginId: 'my-plugin', params: { foo: 'bar' } },
      ]
      expect(effects).toHaveLength(10)
    })

    it('TimeConstraints supports UTC, relative, and calendar modes', () => {
      const utc: core.TimeConstraints = { expiresAt: 1715347200000 }
      const relative: core.TimeConstraints = {
        validForMs: 365 * 24 * 60 * 60 * 1000,
        cooldownMs: 60000,
        reCertifyAfterMs: 365 * 24 * 60 * 60 * 1000,
      }
      const calendar: core.TimeConstraints = {
        expiresAtCalendar: {
          date: '2027-05-10',
          time: '23:59:59',
          timezone: 'Europe/Madrid',
        },
      }
      expect(utc.expiresAt).toBe(1715347200000)
      expect(relative.validForMs).toBeGreaterThan(0)
      expect(calendar.expiresAtCalendar?.timezone).toBe('Europe/Madrid')
    })

    it('StatContribution supports all ops and perTier/conditions', () => {
      const ops: core.StatContributionOp[] = ['+', '-', '*', '/', 'min', 'max', 'set']
      expect(ops).toHaveLength(7)
      const contribution: core.StatContribution = {
        statId: 'damage',
        op: '+',
        value: 5,
        perTier: true,
        conditions: [{ type: 'node_unlocked', nodeId: 'sharp_blade' }],
      }
      expect(contribution.perTier).toBe(true)
    })

    it('AuthConfig supports all auth modes', () => {
      const configs: core.AuthConfig[] = [
        { type: 'none' },
        { type: 'bearer', token: 'static-token' },
        { type: 'bearer', tokenProvider: 'moodle-token' },
        { type: 'apikey', header: 'X-API-Key', key: 'static-key' },
        { type: 'apikey', header: 'X-API-Key', keyProvider: 'my-provider' },
        { type: 'basic', username: 'u', password: 'p' },
        { type: 'custom', requestHandlerId: 'my-handler' },
      ]
      expect(configs).toHaveLength(7)
    })

    it('ProgressSourceConfig supports all 5 source types', () => {
      const sources: core.ProgressSourceConfig[] = [
        { type: 'manual' },
        { type: 'remote', endpoint: 'https://api.example.com', intervalMs: 30000 },
        { type: 'callback', handlerId: 'my-handler' },
        { type: 'event', eventName: 'lesson.completed' },
        {
          type: 'computed',
          dependsOn: ['video_1', 'quiz_1', 'practice_1'],
          formula: 'avg',
        },
      ]
      expect(sources).toHaveLength(5)
    })

    it('Build type is structurally valid', () => {
      const build: core.Build = {
        id: 'build-001',
        treeId: 'panadeiro',
        treeVersion: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: {
          nodes: {},
          budget: { resources: {} },
        },
      }
      expect(build.id).toBe('build-001')
      expect(build.state.budget.resources).toEqual({})
    })

    it('AuditAction supports all action types', () => {
      const actions: core.AuditAction[] = [
        { type: 'node_unlocked', nodeId: 'x', tier: 1 },
        { type: 'node_locked', nodeId: 'x' },
        { type: 'progress_updated', nodeId: 'x', from: 0, to: 50 },
        { type: 'respec', nodeIds: ['a', 'b'] },
        { type: 'build_imported', source: 'url' },
        { type: 'tree_loaded', treeId: 'panadeiro' },
        { type: 'tree_changed', changes: [] },
        { type: 'node_expired', nodeId: 'cert_gdpr' },
        { type: 'progress_synced_external', nodeId: 'video_1', from: 50, to: 100 },
        { type: 'custom', name: 'my-action', data: { foo: 'bar' } },
      ]
      expect(actions).toHaveLength(10)
    })

    it('TreeChange supports all change types including rename_node_id', () => {
      const changes: core.TreeChange[] = [
        { type: 'add_node', node: { id: 'x', type: 'small', label: 'X' } },
        { type: 'remove_node', nodeId: 'x', cascadeEdges: true },
        { type: 'modify_node', nodeId: 'x', changes: { label: 'Updated' } },
        { type: 'rename_node_id', oldId: 'old', newId: 'new' },
        { type: 'add_edge', edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' } },
        { type: 'remove_edge', edgeId: 'e1' },
        { type: 'modify_edge', edgeId: 'e1', changes: { weight: 2 } },
        { type: 'add_group', group: { id: 'g1', label: 'G1' } },
        { type: 'remove_group', groupId: 'g1' },
        { type: 'modify_group', groupId: 'g1', changes: { color: '#fff' } },
        { type: 'add_resource', resource: { id: 'gold', label: 'Gold', initial: 0 } },
        { type: 'modify_layout', changes: { type: 'radial' } },
      ]
      expect(changes).toHaveLength(12)
    })

    it('NodeDef now accepts concrete types instead of unknown', () => {
      const node: core.NodeDef = {
        id: 'panadeiro_forno',
        type: 'cluster',
        label: { gl: 'Forno', es: 'Horno', en: 'Oven' },
        cost: [{ resourceId: 'xp', amount: 100 }],
        effects: [{ type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 }],
        prerequisites: {
          type: 'all',
          conditions: [{ type: 'node_unlocked', nodeId: 'panadeiro_inicio' }],
        },
        timeConstraints: { validForMs: 365 * 24 * 60 * 60 * 1000 },
        statContributions: [{ statId: 'cocina', op: '+', value: 5 }],
      }
      expect(node.cost?.[0]?.resourceId).toBe('xp')
      expect(node.effects?.[0]?.type).toBe('modify_resource')
    })

    it('TreeDef accepts concrete resources and i18n', () => {
      const tree: core.TreeDef = {
        id: 'panadeiro',
        schemaVersion: '1.0.0',
        version: '1.0.0',
        label: 'Panadeiro',
        nodes: [],
        edges: [],
        layout: { type: 'radial' },
        resources: [{ id: 'xp', label: 'XP', initial: 0 }],
        startingBudget: { resources: { xp: 0 } },
        i18n: { defaultLocale: 'gl', fallbackLocale: 'en' },
        stats: [{ id: 'cocina', label: 'Cocina', initial: 0 }],
      }
      expect(tree.resources?.[0]?.id).toBe('xp')
      expect(tree.startingBudget?.resources.xp).toBe(0)
    })

    it('EngineMetrics has all expected fields', () => {
      const metrics: core.EngineMetrics = {
        unlocksTotal: 0,
        locksTotal: 0,
        respecsTotal: 0,
        errorsTotal: 0,
        applyChangesTotal: 0,
        treeChangesPerSecond: 0,
        avgUnlockTime: 0,
        avgLayoutTime: 0,
        avgPathfindTime: 0,
        avgStatComputeTime: 0,
        nodeCount: 0,
        edgeCount: 0,
        pluginCount: 0,
        estimatedMemoryBytes: 0,
        cacheHitRate: 0,
        cacheSize: 0,
        externalProgressSourcesActive: 0,
        pendingExternalSyncs: 0,
      }
      expect(metrics.unlocksTotal).toBe(0)
    })
  })
})
// ── FIN: tests de exports ──
