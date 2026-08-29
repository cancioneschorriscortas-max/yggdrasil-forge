// ── INICIO: fume do bundle embebible en QuickJS (17.7) ──
// A porta que converte «corre en Jint/puerts/GodotJS» de promesa en
// contrato: o bundle IIFE execútase nun intérprete JS REAL sen DOM
// (QuickJS via quickjs-emscripten) e a mesma árbore da galería toma
// as mesmas decisións ca no editor. Se o core (ou immer/zod) empeza a
// depender de APIs de navegador ou de Node, isto cae — e debe caer.
//
// Nota async: `unlock` devolve unha Promise; en QuickJS as promesas
// resólvense pumpando `executePendingJobs()` (o mesmo que fará o
// host de calquera motor).

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getQuickJS } from 'quickjs-emscripten'
import { describe, expect, it } from 'vitest'

const BUNDLE = path.resolve(__dirname, '../dist/yggdrasil-core.global.js')
const PANADEIRO = readFileSync(
  path.resolve(__dirname, '../../../examples/gallery/panadeiro.json'),
  'utf8',
)

describe('bundle embebible — fume en QuickJS (17.7)', () => {
  it('a árbore da galería decide igual dentro dun intérprete sen DOM', async () => {
    expect(existsSync(BUNDLE), 'falta dist/yggdrasil-core.global.js — corre o build antes').toBe(
      true,
    )
    const QuickJS = await getQuickJS()
    const vm = QuickJS.newContext()
    try {
      // 1. Cargar o bundle (define o global YggdrasilCore).
      const load = vm.evalCode(readFileSync(BUNDLE, 'utf8'))
      if (load.error) {
        const msg = vm.dump(load.error)
        load.error.dispose()
        throw new Error(`o bundle non carga en QuickJS: ${JSON.stringify(msg)}`)
      }
      load.value.dispose()

      // 2. Construír o motor e facer as comprobacións SÍNCRONAS.
      const syncProbe = vm.evalCode(`
        const doc = ${PANADEIRO};
        const engine = new YggdrasilCore.TreeEngine(doc.tree, { locale: 'gl' });
        const check = engine.canUnlock('masa_dulce');
        globalThis.__engine = engine;
        JSON.stringify({
          budget: engine.getBudget().resources['fariña'],
          allowed: check.ok ? check.value.allowed : null,
          // reason chega xa resolta á locale do motor (string).
          reason: check.ok ? (check.value.reason ?? null) : null,
        })
      `)
      if (syncProbe.error) {
        const msg = vm.dump(syncProbe.error)
        syncProbe.error.dispose()
        throw new Error(`sonda síncrona fallou: ${JSON.stringify(msg)}`)
      }
      const sync = JSON.parse(vm.dump(syncProbe.value) as string)
      syncProbe.value.dispose()

      // Valores CONCRETOS, os mesmos que decide o editor: fariña
      // inicial 0 → masa_dulce (custo 1 fariña) non desbloqueable,
      // coa razón localizada.
      expect(sync.budget).toBe(0)
      expect(sync.allowed).toBe(false)
      expect(sync.reason).toContain('fariña')

      // 3. O camiño ASYNC: grantResource + unlock, pumpando as jobs.
      const asyncProbe = vm.evalCode(`
        globalThis.__result = null;
        __engine.grantResource('fariña', 1)
          .then(() => __engine.unlock('masa_dulce'))
          .then((r) => {
            globalThis.__result = JSON.stringify({
              ok: r.ok,
              state: __engine.getNodeState('masa_dulce').state,
              budget: __engine.getBudget().resources['fariña'],
            });
          });
        'lanzado'
      `)
      if (asyncProbe.error) {
        const msg = vm.dump(asyncProbe.error)
        asyncProbe.error.dispose()
        throw new Error(`sonda async fallou: ${JSON.stringify(msg)}`)
      }
      asyncProbe.value.dispose()
      vm.runtime.executePendingJobs()

      const read = vm.evalCode('globalThis.__result')
      const result = JSON.parse(vm.dump(read.value) as string)
      read.value.dispose()

      // Desbloqueado, custo cobrado (1 → 0): a MESMA decisión.
      expect(result.ok).toBe(true)
      expect(result.state).toBe('unlocked')
      expect(result.budget).toBe(0)
    } finally {
      vm.dispose()
    }
  })
})
// ── FIN: fume do bundle embebible ──
