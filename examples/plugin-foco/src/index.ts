// Demo executable do tutorial: `pnpm --filter @yggdrasil-forge-examples/plugin-foco start`
import { resolveLocalized } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'
import { TreeEngine } from '@yggdrasil-forge/core'
import { createFocoPlugin } from './focoPlugin.js'

const tree: TreeDef = {
  id: 'aula',
  schemaVersion: '1.0.0',
  version: '1.0.0',
  label: { gl: 'A aula' },
  nodes: [
    {
      id: 'letras',
      type: 'small',
      label: { gl: 'Letras' },
      position: { x: 0, y: 0 },
      supportsProgress: true,
      progressSource: { type: 'manual' },
    },
    { id: 'numeros', type: 'small', label: { gl: 'Números' }, position: { x: 120, y: 0 } },
  ],
  edges: [],
  layout: { type: 'custom' },
}

const engine = new TreeEngine(tree, { locale: 'gl' })
const installed = await engine.registerPlugin(createFocoPlugin())
if (!installed.ok) throw new Error(`plugin non instalado: ${installed.error.message}`)

// Empeza un exercicio: "letras" queda a medias (in_progress).
engine.setProgress('letras', 60)

// A UI pregunta: podo empezar "números"? O plugin EXPLICA que non.
const check = engine.canUnlock('numeros')
if (check.ok) {
  console.log(`canUnlock('numeros') → allowed: ${String(check.value.allowed)}`)
  if (check.value.reason !== undefined) {
    console.log(`  razón: ${resolveLocalized(check.value.reason, 'gl')}`)
  }
}

// E se o intenta igual? O plugin VETA.
const intento = await engine.unlock('numeros')
console.log(`unlock('numeros') → ${intento.ok ? 'PASOU (mal!)' : `vetado (${intento.error.code})`}`)

// Remata o exercicio: o foco libérase e "números" xa pode.
engine.setProgress('letras', 100)
const despois = await engine.unlock('numeros')
console.log(`tras rematar "letras": unlock('numeros') → ${despois.ok ? 'ok' : 'FALLO'}`)
