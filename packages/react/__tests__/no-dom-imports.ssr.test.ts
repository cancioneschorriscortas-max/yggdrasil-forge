// Tests SSR regression guard para packages/react: verifican que os
// ficheiros server-safe non acceden a window.X, document.X, ou
// navigator.X. Baseado no precedente packages/core/__tests__/ssr/
// no-dom-imports.ssr.test.ts (4.6 SSR verification).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// vitest executa desde packages/react/
const SRC_ROOT = join(process.cwd(), 'src')

/**
 * Ficheiros que deben ser SSR-safe. Importados directamente ou
 * transitivamente desde o entry /server. Cero acceso a DOM globals.
 *
 * Nota sobre SkillNode: ten 'use client' + useRef + setTimeout
 * desde 7.10. Pero cero window/document/navigator no código.
 * setTimeout é global Node.js + browser (cero prefixo). OK server-safe.
 */
const SERVER_SAFE_FILES = [
  'SkillTreeStatic.tsx',
  'serializeForClient.ts',
  'server.ts',
  'SkillNode.tsx',
  'SkillEdge.tsx',
  'MeshOverlay.tsx',
  'svg-helpers.ts',
  'animations.ts',
  'createDefaultLayoutRegistry.ts',
]

function readFile(name: string): string {
  return readFileSync(join(SRC_ROOT, name), 'utf-8')
}

function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed === '' ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*')
  )
}

function findViolations(pattern: RegExp): string[] {
  const violations: string[] = []
  for (const fname of SERVER_SAFE_FILES) {
    const content = readFile(fname)
    const lines = content.split('\n')
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx]
      if (line === undefined || isCommentOrEmpty(line)) continue
      if (pattern.test(line)) {
        violations.push(`${fname}:${idx + 1}: ${line.trim()}`)
      }
    }
  }
  return violations
}

describe('SSR regression guard: server-safe files non acceden a DOM globals', () => {
  it('cero ficheiro server-safe accede a window.X (excepto comentarios)', () => {
    expect(findViolations(/\bwindow\s*\./)).toEqual([])
  })

  it('cero ficheiro server-safe accede a document.X (excepto comentarios)', () => {
    expect(findViolations(/\bdocument\s*\./)).toEqual([])
  })

  it('cero ficheiro server-safe accede a navigator.X (excepto comentarios)', () => {
    expect(findViolations(/\bnavigator\s*\./)).toEqual([])
  })
})
