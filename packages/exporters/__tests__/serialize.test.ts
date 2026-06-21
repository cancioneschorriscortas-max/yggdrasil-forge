// ── INICIO: tests F9.4 — serialización (JSON/YAML) ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { exportTreeToJson, exportTreeToYaml } from '../src/index.js'

const tree: TreeDef = {
  id: 't',
  schemaVersion: '1.0.0',
  version: '1.0.0',
  label: 'T',
  nodes: [{ id: 'a', type: 'small', label: 'A' }],
  edges: [],
  layout: { type: 'identity' },
}

describe('exportTreeToJson', () => {
  it('round-trip: JSON.parse(export) iguala o TreeDef', () => {
    expect(JSON.parse(exportTreeToJson(tree))).toEqual(tree)
  })

  it('pretty=false produce saída compacta (sen saltos de liña)', () => {
    expect(exportTreeToJson(tree, { pretty: false })).not.toContain('\n')
  })

  it('respeta indent custom', () => {
    expect(exportTreeToJson(tree, { indent: 4 })).toContain('\n    "id"')
  })

  it('por defecto é pretty con indent 2', () => {
    const out = exportTreeToJson(tree)
    expect(out).toContain('\n  "id"')
  })
})

describe('exportTreeToYaml', () => {
  it('round-trip: parseYaml(export) iguala o TreeDef', () => {
    expect(parseYaml(exportTreeToYaml(tree))).toEqual(tree)
  })
})
// ── FIN: tests F9.4 (exporters) ──
