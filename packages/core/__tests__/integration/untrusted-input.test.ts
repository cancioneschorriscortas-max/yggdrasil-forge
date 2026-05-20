// ── INICIO: integración — entrada non confiable (1.18) ──
// JSON malformado, TreeDef estruturalmente inválido, schemaVersion non
// soportada, tipos non recoñecidos polo schema → fromJSON devolve err co
// código correcto, NUNCA lanza, estado nunca se crea.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import {
  jsonWithBadSchemaVersion,
  jsonWithUnknownNodeType,
  malformedJson,
  structurallyInvalidJson,
} from './fixtures.js'

describe('integración — entrada non confiable', () => {
  it('JSON malformado → err INVALID_TREE_DEF, sen lanzar', () => {
    // Capturamos o resultado dentro do bloque non-throws para evitar
    // forwarding non-null assertions (biome lint/style/noNonNullAssertion).
    let captured: ReturnType<typeof TreeEngine.fromJSON> | undefined
    expect(() => {
      captured = TreeEngine.fromJSON(malformedJson)
    }).not.toThrow()
    expect(captured).toBeDefined()
    if (captured !== undefined && !captured.ok) {
      expect(captured.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
    } else {
      // Forzar o fallo do test se o resultado non é o esperado.
      expect(captured?.ok).toBe(false)
    }
  })

  it('JSON con estrutura incorrecta → err INVALID_TREE_DEF, sen lanzar', () => {
    const r = TreeEngine.fromJSON(structurallyInvalidJson)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
    }
  })

  it('JSON con schemaVersion non soportada → err SCHEMA_VERSION_UNSUPPORTED', () => {
    const r = TreeEngine.fromJSON(jsonWithBadSchemaVersion())
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.SCHEMA_VERSION_UNSUPPORTED)
    }
  })

  it('JSON con NodeType non recoñecido polo schema → err INVALID_TREE_DEF', () => {
    const r = TreeEngine.fromJSON(jsonWithUnknownNodeType())
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
    }
  })

  it('fromJSON con locale custom propaga ao engine construído', () => {
    const validJson = JSON.stringify({
      id: 't',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'T',
      nodes: [],
      edges: [],
      layout: { type: 'radial' },
    })
    const r = TreeEngine.fromJSON(validJson, { locale: 'en' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.getLocale()).toBe('en')
    }
  })
})
// ── FIN: integración — entrada non confiable (1.18) ──
