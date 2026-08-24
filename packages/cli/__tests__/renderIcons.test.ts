// ── INICIO: test render de iconas oficiais (fix pos-1.0) ──
// ygg render debe debuxar as ICONAS dos sets oficiais (logic-*/norse-*),
// non o id como texto de fallback (informe do dono na portada 1.0).
import { describe, expect, it } from 'vitest'
import { renderDocumentText } from '../src/renderCmd.js'

const DOC = JSON.stringify({
  tree: {
    id: 'icona',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Icona' },
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'A' }, icon: 'logic-key', position: { x: 0, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  },
  editor: { formatVersion: '1.0.0' },
})

describe('ygg render — sets de iconas oficiais rexistrados', () => {
  it('★ logic-key renderiza como <path> da icona, non como texto do id', () => {
    const result = renderDocumentText(DOC)
    expect(result.ok).toBe(true)
    const svg = result.output ?? ''
    // O path real de logic-key (da fonte única do set).
    expect(svg).toContain('M11 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6')
    // E o id NON aparece como texto de fallback.
    expect(svg).not.toContain('>logic-key<')
  })
})
// ── FIN: test render de iconas oficiais ──
