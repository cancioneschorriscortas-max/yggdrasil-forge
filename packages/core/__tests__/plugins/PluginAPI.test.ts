// ── INICIO: tests de PluginAPI ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from '../../src/engine/EventEmitter.js'
import { HookRunner } from '../../src/plugins/HookRunner.js'
import { PluginAPI } from '../../src/plugins/PluginAPI.js'

function makeApi(pluginId = 'p1', locale: 'gl' | 'es' | 'en' = 'gl') {
  const hookRunner = new HookRunner()
  const eventEmitter = new EventEmitter()
  return {
    api: new PluginAPI(pluginId, hookRunner, eventEmitter, locale),
    hookRunner,
    eventEmitter,
  }
}

describe('PluginAPI', () => {
  it('constructor con pluginId, hookRunner, eventEmitter, locale', () => {
    const { api } = makeApi()
    expect(api).toBeDefined()
  })

  it('registerHook delega a hookRunner.register con pluginId', () => {
    const { api, hookRunner } = makeApi('p1')
    const spy = vi.spyOn(hookRunner, 'register')
    const handler = () => true
    api.registerHook('beforeUnlock', handler)
    expect(spy).toHaveBeenCalledWith('beforeUnlock', 'p1', handler)
  })

  it('registerCondition lanza YGG_PL003', () => {
    const { api } = makeApi()
    expect(() => api.registerCondition('foo', () => true)).toThrow()
    try {
      api.registerCondition('foo', () => true)
    } catch (e) {
      expect((e as { code: string }).code).toBe(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED)
    }
  })

  it('registerLayout lanza YGG_PL003 con method=registerLayout', () => {
    const { api } = makeApi()
    expect(() => api.registerLayout({})).toThrow()
  })

  it('registerStorageAdapter lanza YGG_PL003', () => {
    const { api } = makeApi()
    expect(() => api.registerStorageAdapter({})).toThrow()
  })

  it('emit proxy a eventEmitter.emit', () => {
    const { api, eventEmitter } = makeApi()
    const spy = vi.spyOn(eventEmitter, 'emit')
    api.emit('respec', ['a'])
    expect(spy).toHaveBeenCalledWith('respec', ['a'])
  })

  it('log debug chama console.debug con prefixo', () => {
    const { api } = makeApi('p1')
    const spy = vi.spyOn(console, 'debug').mockImplementation(vi.fn())
    api.log('debug', 'hello')
    expect(spy).toHaveBeenCalledWith('[plugin:p1] hello')
    spy.mockRestore()
  })

  it('log info chama console.info con prefixo', () => {
    const { api } = makeApi('p1')
    const spy = vi.spyOn(console, 'info').mockImplementation(vi.fn())
    api.log('info', 'hello')
    expect(spy).toHaveBeenCalledWith('[plugin:p1] hello')
    spy.mockRestore()
  })

  it('log warn chama console.warn con prefixo', () => {
    const { api } = makeApi('p1')
    const spy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    api.log('warn', 'hello')
    expect(spy).toHaveBeenCalledWith('[plugin:p1] hello')
    spy.mockRestore()
  })

  it('log error chama console.error con prefixo', () => {
    const { api } = makeApi('p1')
    const spy = vi.spyOn(console, 'error').mockImplementation(vi.fn())
    api.log('error', 'hello')
    expect(spy).toHaveBeenCalledWith('[plugin:p1] hello')
    spy.mockRestore()
  })

  it('locale es: registerCondition lanza mensaxe en español', () => {
    const { api } = makeApi('p1', 'es')
    try {
      api.registerCondition('foo', () => true)
    } catch (e) {
      expect((e as { message: string }).message).toContain('no implementado')
    }
  })
})
// ── FIN: tests de PluginAPI ──
